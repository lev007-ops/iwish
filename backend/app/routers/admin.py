import datetime as dt
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..auth import (
    ADMIN_COOKIE,
    ADMIN_MAX_AGE,
    check_login_allowed,
    make_admin_token,
    require_admin,
    verify_password,
)
from ..config import settings
from ..db import get_db
from ..holidays import next_occurrence
from ..images import MAX_UPLOAD_BYTES, BadImage, delete_upload, exists, save_upload, thumb_name
from ..models import Gift, Guest, Holiday, Like, gift_holidays
from ..schemas import (
    GiftAdminOut,
    GiftIn,
    GuestIn,
    GuestOut,
    HolidayAdminOut,
    HolidayIn,
    LoginIn,
    UploadOut,
)
from ..serialize import gift_public_fields

router = APIRouter(prefix="/api/admin")
protected = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


# ---------- auth ----------


@router.post("/login", status_code=204)
def login(body: LoginIn, request: Request, response: Response):
    check_login_allowed(request)
    if not verify_password(request, body.password):
        raise HTTPException(401, "Неверный пароль")
    response.set_cookie(
        ADMIN_COOKIE,
        make_admin_token(),
        max_age=ADMIN_MAX_AGE,
        httponly=True,
        samesite="strict",
        secure=settings.cookie_secure,
        path="/",
    )


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(ADMIN_COOKIE, path="/")


@protected.get("/me")
def me():
    return {"ok": True}


# ---------- holidays ----------


def _holiday_out(h: Holiday, gift_count: int, today: dt.date) -> HolidayAdminOut:
    out = HolidayAdminOut.model_validate(h)
    out.next_date = next_occurrence(h, today)
    out.gift_count = gift_count
    return out


def _gift_counts(db: Session) -> dict[int, int]:
    rows = db.execute(
        select(gift_holidays.c.holiday_id, func.count())
        .join(Gift, Gift.id == gift_holidays.c.gift_id)
        .where(Gift.archived.is_(False))
        .group_by(gift_holidays.c.holiday_id)
    ).all()
    return dict(rows)


@protected.get("/holidays", response_model=list[HolidayAdminOut])
def list_holidays(db: Session = Depends(get_db)):
    today = dt.date.today()
    counts = _gift_counts(db)
    items = [_holiday_out(h, counts.get(h.id, 0), today) for h in db.scalars(select(Holiday))]
    # Upcoming first (by next date), finished ones at the end (newest first).
    items.sort(
        key=lambda h: (h.next_date is None, h.next_date or dt.date.max, -h.date.toordinal())
    )
    return items


@protected.post("/holidays", response_model=HolidayAdminOut, status_code=201)
def create_holiday(body: HolidayIn, db: Session = Depends(get_db)):
    h = Holiday(**body.model_dump())
    db.add(h)
    db.commit()
    return _holiday_out(h, 0, dt.date.today())


@protected.put("/holidays/{holiday_id}", response_model=HolidayAdminOut)
def update_holiday(holiday_id: int, body: HolidayIn, db: Session = Depends(get_db)):
    h = db.get(Holiday, holiday_id)
    if h is None:
        raise HTTPException(404, "Праздник не найден")
    for k, v in body.model_dump().items():
        setattr(h, k, v)
    db.commit()
    return _holiday_out(h, _gift_counts(db).get(h.id, 0), dt.date.today())


@protected.delete("/holidays/{holiday_id}", status_code=204)
def delete_holiday(holiday_id: int, db: Session = Depends(get_db)):
    h = db.get(Holiday, holiday_id)
    if h is not None:
        db.delete(h)
        db.commit()


# ---------- gifts ----------


def _gift_out(g: Gift, like_count: int) -> GiftAdminOut:
    return GiftAdminOut(
        **gift_public_fields(g),
        desire=g.desire,
        archived=g.archived,
        photo_file=g.photo_file,
        photo_url=g.photo_url,
        holiday_ids=sorted(h.id for h in g.holidays),
        like_count=like_count,
    )


def _like_count(db: Session, gift_id: int) -> int:
    return db.scalar(select(func.count()).where(Like.gift_id == gift_id)) or 0


def _apply_gift(db: Session, g: Gift, body: GiftIn) -> None:
    data = body.model_dump(exclude={"holiday_ids"}, mode="json")
    if data["photo_file"] and data["photo_file"] != g.photo_file and not exists(data["photo_file"]):
        raise HTTPException(422, "Загруженное фото не найдено, загрузите его снова")
    if data["photo_file"]:
        data["photo_url"] = None
    old_file = g.photo_file
    for k, v in data.items():
        setattr(g, k, v)
    ids = set(body.holiday_ids)
    holidays = db.scalars(select(Holiday).where(Holiday.id.in_(ids))).all() if ids else []
    if len(holidays) != len(ids):
        raise HTTPException(422, "Некоторые праздники не найдены")
    g.holidays = list(holidays)
    if old_file and old_file != g.photo_file:
        delete_upload(old_file)


@protected.get("/gifts", response_model=list[GiftAdminOut])
def list_gifts(db: Session = Depends(get_db)):
    counts = dict(
        db.execute(select(Like.gift_id, func.count()).group_by(Like.gift_id)).all()
    )
    gifts = db.scalars(
        select(Gift)
        .options(selectinload(Gift.holidays))
        .order_by(Gift.archived, Gift.desire.desc(), Gift.created_at.desc())
    ).all()
    return [_gift_out(g, counts.get(g.id, 0)) for g in gifts]


@protected.post("/gifts", response_model=GiftAdminOut, status_code=201)
def create_gift(body: GiftIn, db: Session = Depends(get_db)):
    g = Gift()
    _apply_gift(db, g, body)
    db.add(g)
    db.commit()
    return _gift_out(g, 0)


@protected.put("/gifts/{gift_id}", response_model=GiftAdminOut)
def update_gift(gift_id: int, body: GiftIn, db: Session = Depends(get_db)):
    g = db.get(Gift, gift_id)
    if g is None:
        raise HTTPException(404, "Подарок не найден")
    _apply_gift(db, g, body)
    db.commit()
    return _gift_out(g, _like_count(db, g.id))


@protected.delete("/gifts/{gift_id}", status_code=204)
def delete_gift(gift_id: int, db: Session = Depends(get_db)):
    g = db.get(Gift, gift_id)
    if g is not None:
        photo = g.photo_file
        db.delete(g)
        db.commit()
        delete_upload(photo)


@protected.post("/uploads", response_model=UploadOut, status_code=201)
async def upload_photo(file: UploadFile = File(...)):
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Файл больше 15 МБ")
    try:
        name = save_upload(data)
    except BadImage as e:
        raise HTTPException(422, str(e)) from None
    return UploadOut(photo_file=name, photo=f"/uploads/{name}", thumb=f"/uploads/{thumb_name(name)}")


# ---------- guests (personal links) ----------


def _guest_rows(db: Session, guest_id: str | None = None) -> list[GuestOut]:
    q = select(Guest).order_by(Guest.created_at.desc())
    if guest_id:
        q = q.where(Guest.id == guest_id)
    return [GuestOut.model_validate(g, from_attributes=True) for g in db.scalars(q)]


@protected.get("/guests", response_model=list[GuestOut])
def list_guests(db: Session = Depends(get_db)):
    return _guest_rows(db)


@protected.post("/guests", response_model=GuestOut, status_code=201)
def create_guest(body: GuestIn, db: Session = Depends(get_db)):
    token = secrets.token_urlsafe(6)
    while db.get(Guest, token) is not None:
        token = secrets.token_urlsafe(6)
    db.add(Guest(id=token, name=body.name))
    db.commit()
    return _guest_rows(db, token)[0]


@protected.put("/guests/{guest_id}", response_model=GuestOut)
def update_guest(guest_id: str, body: GuestIn, db: Session = Depends(get_db)):
    g = db.get(Guest, guest_id)
    if g is None:
        raise HTTPException(404, "Ссылка не найдена")
    g.name = body.name
    db.commit()
    return _guest_rows(db, guest_id)[0]


@protected.delete("/guests/{guest_id}", status_code=204)
def delete_guest(guest_id: str, db: Session = Depends(get_db)):
    g = db.get(Guest, guest_id)
    if g is not None:
        db.delete(g)
        db.commit()

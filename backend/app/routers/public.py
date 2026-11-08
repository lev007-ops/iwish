import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from ..auth import GUEST_COOKIE, LONG_MAX_AGE, cookie_kwargs, is_admin
from ..db import get_db
from ..holidays import upcoming
from ..models import Device, Gift, Guest, Holiday, Like, Reservation, utcnow
from ..schemas import GiftPublicOut, HolidayPublicOut, PublicState
from ..serialize import gift_public_fields

router = APIRouter()

_LAST_SEEN_GRANULARITY = dt.timedelta(minutes=5)


def get_device(request: Request, db: Session = Depends(get_db)) -> Device:
    """The visitor's device row, created on first use. The id comes from the cookie middleware."""
    device_id: str = request.state.device_id
    device = db.get(Device, device_id)
    now = utcnow()
    if device is None:
        device = Device(id=device_id, created_at=now, last_seen_at=now)
        db.add(device)
    elif now - device.last_seen_at > _LAST_SEEN_GRANULARITY:
        device.last_seen_at = now

    guest_id = request.cookies.get(GUEST_COOKIE)
    if guest_id and device.guest_id != guest_id and db.get(Guest, guest_id):
        device.guest_id = guest_id
    try:
        db.commit()
    except IntegrityError:  # two parallel first requests from the same device
        db.rollback()
        device = db.get(Device, device_id)
        if device is None:
            raise
    return device


def _visible_gift(db: Session, gift_id: int) -> Gift:
    gift = db.get(Gift, gift_id)
    if gift is None or gift.archived:
        raise HTTPException(404, "Подарок не найден")
    return gift


@router.get("/g/{token}", include_in_schema=False)
def personal_link(token: str, request: Request, db: Session = Depends(get_db)):
    """Personal link from a QR code: remember the guest id in a cookie and go to the page."""
    resp = RedirectResponse("/", status_code=303)
    guest = db.get(Guest, token)
    if guest is not None:
        resp.set_cookie(GUEST_COOKIE, guest.id, **cookie_kwargs(LONG_MAX_AGE))
    return resp


@router.get("/api/public/state", response_model=PublicState)
def public_state(
    request: Request,
    today: dt.date | None = Query(
        default=None, description="Visitor's local date; the server picks the holiday by it"
    ),
    db: Session = Depends(get_db),
    device: Device = Depends(get_device),
):
    today = today or dt.date.today()

    guest_name = None
    guest_id = request.cookies.get(GUEST_COOKIE)
    if guest_id:
        guest = db.get(Guest, guest_id)
        guest_name = guest.name if guest else None

    holidays = db.scalars(select(Holiday)).all()
    found = upcoming(holidays, today)

    q = (
        select(Gift)
        .where(Gift.archived.is_(False))
        .options(selectinload(Gift.reservation))
        .order_by(Gift.desire.desc(), Gift.created_at.desc(), Gift.id.desc())
    )
    holiday_out = None
    if found:
        holiday, occ = found
        holiday_out = HolidayPublicOut(
            id=holiday.id,
            name=holiday.name,
            emoji=holiday.emoji,
            description=holiday.description,
            theme=holiday.theme,
            date=occ,
        )
        q = q.where(Gift.holidays.any(Holiday.id == holiday.id))
    gifts = db.scalars(q).all()

    liked_ids = set(
        db.scalars(select(Like.gift_id).where(Like.device_id == device.id)).all()
    )

    owner = is_admin(request)

    def reservation_state(g: Gift) -> str:
        # Reservations are a secret from the list owner, even on the public page.
        if owner or g.reservation is None:
            return "none"
        return "mine" if g.reservation.device_id == device.id else "other"

    out = [
        GiftPublicOut(
            **gift_public_fields(g),
            liked=g.id in liked_ids,
            reservation=reservation_state(g),
            rank=i,
        )
        for i, g in enumerate(gifts)
    ]
    # Liked first; within each group keep the desire order (sort is stable).
    out.sort(key=lambda g: not g.liked)
    return PublicState(guest_name=guest_name, viewer_is_owner=owner, holiday=holiday_out, gifts=out)


@router.put("/api/public/gifts/{gift_id}/like", status_code=204)
def like(gift_id: int, db: Session = Depends(get_db), device: Device = Depends(get_device)):
    _visible_gift(db, gift_id)
    if db.get(Like, (device.id, gift_id)) is None:
        db.add(Like(device_id=device.id, gift_id=gift_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()


@router.delete("/api/public/gifts/{gift_id}/like", status_code=204)
def unlike(gift_id: int, db: Session = Depends(get_db), device: Device = Depends(get_device)):
    like_ = db.get(Like, (device.id, gift_id))
    if like_ is not None:
        db.delete(like_)
        db.commit()


@router.put("/api/public/gifts/{gift_id}/reservation", status_code=204)
def reserve(
    gift_id: int,
    request: Request,
    db: Session = Depends(get_db),
    device: Device = Depends(get_device),
):
    # Checked before anything else: a 409 would tell the owner the gift is taken.
    if is_admin(request):
        raise HTTPException(403, "Владелец списка не может бронировать подарки")
    _visible_gift(db, gift_id)
    existing = db.get(Reservation, gift_id)
    if existing is not None:
        if existing.device_id == device.id:
            return
        raise HTTPException(409, "Этот подарок уже кто-то выбрал")
    db.add(Reservation(gift_id=gift_id, device_id=device.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Этот подарок уже кто-то выбрал") from None


@router.delete("/api/public/gifts/{gift_id}/reservation", status_code=204)
def unreserve(
    gift_id: int,
    request: Request,
    db: Session = Depends(get_db),
    device: Device = Depends(get_device),
):
    # 204-vs-403 would also reveal whether someone reserved the gift.
    if is_admin(request):
        raise HTTPException(403, "Владелец списка не может бронировать подарки")
    existing = db.get(Reservation, gift_id)
    if existing is None:
        return
    if existing.device_id != device.id:
        raise HTTPException(403, "Снять бронь может только тот, кто её поставил")
    db.delete(existing)
    db.commit()

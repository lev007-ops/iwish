import io

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


def make_holiday(admin, **kw):
    body = {"name": "ДР", "emoji": "🎂", "date": "2026-12-01", "theme": "birthday", **kw}
    r = admin.post("/api/admin/holidays", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def make_gift(admin, **kw):
    r = admin.post("/api/admin/gifts", json={"name": "Gift", **kw})
    assert r.status_code == 201, r.text
    return r.json()


def test_admin_requires_login(client):
    assert client.get("/api/admin/gifts").status_code == 401
    assert client.post("/api/admin/login", json={"password": "nope"}).status_code == 401
    assert client.post("/api/admin/login", json={"password": "secret"}).status_code == 204
    assert client.get("/api/admin/gifts").status_code == 200
    client.post("/api/admin/logout")
    assert client.get("/api/admin/gifts").status_code == 401


def test_login_rate_limited(client):
    for _ in range(8):
        client.post("/api/admin/login", json={"password": "nope"})
    assert client.post("/api/admin/login", json={"password": "secret"}).status_code == 429


def test_public_state_hides_desire_and_sorts(admin):
    hol = make_holiday(admin)
    other = make_holiday(admin, name="Later", date="2027-06-01")
    low = make_gift(admin, name="low", desire=1, holiday_ids=[hol["id"]])
    high = make_gift(admin, name="high", desire=5, holiday_ids=[hol["id"]])
    make_gift(admin, name="elsewhere", desire=5, holiday_ids=[other["id"]])
    make_gift(admin, name="archived", desire=5, holiday_ids=[hol["id"]], archived=True)

    guest = TestClient(app)
    r = guest.get("/api/public/state", params={"today": "2026-11-08"})
    assert r.status_code == 200
    data = r.json()
    assert data["holiday"]["id"] == hol["id"]
    assert [g["name"] for g in data["gifts"]] == ["high", "low"]
    for g in data["gifts"]:
        assert "desire" not in g
    assert "desire" not in r.text

    # Liked gifts go first for this device only.
    assert guest.put(f"/api/public/gifts/{low['id']}/like").status_code == 204
    data = guest.get("/api/public/state", params={"today": "2026-11-08"}).json()
    assert [g["name"] for g in data["gifts"]] == ["low", "high"]
    assert data["gifts"][0]["liked"] is True

    other_guest = TestClient(app)
    data = other_guest.get("/api/public/state", params={"today": "2026-11-08"}).json()
    assert [g["name"] for g in data["gifts"]] == ["high", "low"]

    # The admin sees the like count.
    gifts = {g["name"]: g for g in admin.get("/api/admin/gifts").json()}
    assert gifts["low"]["like_count"] == 1
    assert gifts["high"]["like_count"] == 0

    assert guest.delete(f"/api/public/gifts/{low['id']}/like").status_code == 204
    data = guest.get("/api/public/state", params={"today": "2026-11-08"}).json()
    assert [g["name"] for g in data["gifts"]] == ["high", "low"]
    _ = high


def test_holiday_selection_uses_client_date(admin):
    a = make_holiday(admin, name="A", date="2026-11-08")
    make_holiday(admin, name="B", date="2026-11-09")
    pub = TestClient(app)
    assert pub.get("/api/public/state", params={"today": "2026-11-08"}).json()["holiday"]["id"] == a["id"]
    assert pub.get("/api/public/state", params={"today": "2026-11-09"}).json()["holiday"]["name"] == "B"
    assert pub.get("/api/public/state", params={"today": "2026-11-10"}).json()["holiday"] is None


def test_no_holiday_shows_all_active_gifts(admin):
    make_gift(admin, name="x")
    data = TestClient(app).get("/api/public/state", params={"today": "2026-11-08"}).json()
    assert data["holiday"] is None
    assert [g["name"] for g in data["gifts"]] == ["x"]


def test_reservations(admin):
    gift = make_gift(admin)
    a, b = TestClient(app), TestClient(app)
    a.get("/api/public/state")
    b.get("/api/public/state")
    url = f"/api/public/gifts/{gift['id']}/reservation"
    assert a.put(url).status_code == 204
    assert b.put(url).status_code == 409
    assert b.delete(url).status_code == 403
    assert a.get("/api/public/state").json()["gifts"][0]["reservation"] == "mine"
    assert b.get("/api/public/state").json()["gifts"][0]["reservation"] == "other"
    assert "reserv" not in admin.get("/api/admin/gifts").text
    assert a.delete(url).status_code == 204
    assert b.get("/api/public/state").json()["gifts"][0]["reservation"] == "none"


def test_reservations_hidden_from_owner_on_public_page(admin):
    gift = make_gift(admin)
    guest = TestClient(app)
    url = f"/api/public/gifts/{gift['id']}/reservation"
    assert guest.put(url).status_code == 204

    state = admin.get("/api/public/state").json()
    assert state["viewer_is_owner"] is True
    assert state["gifts"][0]["reservation"] == "none"
    # Status codes must not leak the reservation either.
    assert admin.put(url).status_code == 403
    assert admin.delete(url).status_code == 403
    assert guest.get("/api/public/state").json()["viewer_is_owner"] is False


def test_personal_link_sets_cookie_and_greets(admin):
    guest = admin.post("/api/admin/guests", json={"name": "Маша"}).json()
    visitor = TestClient(app)
    r = visitor.get(f"/g/{guest['id']}", follow_redirects=False)
    assert r.status_code == 303
    assert visitor.cookies.get("iwish_guest") == guest["id"]
    assert visitor.get("/api/public/state").json()["guest_name"] == "Маша"

    # Renaming takes effect because the cookie stores the id, not the name.
    admin.put(f"/api/admin/guests/{guest['id']}", json={"name": "Мария"})
    assert visitor.get("/api/public/state").json()["guest_name"] == "Мария"
    guests = admin.get("/api/admin/guests").json()
    assert guests[0]["device_count"] == 1

    # Unknown token: no cookie.
    v2 = TestClient(app)
    v2.get("/g/unknown", follow_redirects=False)
    assert v2.cookies.get("iwish_guest") is None


def test_device_cookie_always_set(client):
    r = client.get("/api/public/state")
    assert "iwish_device" in r.cookies


def test_upload_and_gift_photo(admin):
    buf = io.BytesIO()
    Image.new("RGB", (800, 400), "red").save(buf, "PNG")
    r = admin.post("/api/admin/uploads", files={"file": ("a.png", buf.getvalue(), "image/png")})
    assert r.status_code == 201, r.text
    up = r.json()
    assert admin.get(up["photo"]).status_code == 200
    assert admin.get(up["thumb"]).status_code == 200

    gift = make_gift(admin, photo_file=up["photo_file"])
    assert gift["photo"] == up["photo"]
    admin.delete(f"/api/admin/gifts/{gift['id']}")
    assert admin.get(up["photo"]).status_code == 404

    bad = admin.post("/api/admin/uploads", files={"file": ("a.png", b"not an image", "image/png")})
    assert bad.status_code == 422


def test_gift_validation(admin):
    g = make_gift(admin, price_min=500, price_max=100, currency="rub", link="https://ozon.ru/x")
    assert (g["price_min"], g["price_max"], g["currency"]) == (100, 500, "RUB")
    assert admin.post("/api/admin/gifts", json={"name": "x", "desire": 6}).status_code == 422
    assert admin.post("/api/admin/gifts", json={"name": "x", "link": "javascript:alert(1)"}).status_code == 422
    assert admin.post("/api/admin/gifts", json={"name": "x", "holiday_ids": [999]}).status_code == 422

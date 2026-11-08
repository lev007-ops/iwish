import hmac
import time
import uuid
from collections import defaultdict, deque

from fastapi import HTTPException, Request
from itsdangerous import BadSignature, URLSafeTimedSerializer

from .config import settings

ADMIN_COOKIE = "iwish_admin"
DEVICE_COOKIE = "iwish_device"
GUEST_COOKIE = "iwish_guest"

ADMIN_MAX_AGE = 30 * 24 * 3600
LONG_MAX_AGE = 5 * 365 * 24 * 3600

_serializer = URLSafeTimedSerializer(settings.secret_key, salt="iwish-admin")

# --- login brute-force protection (in-memory, single process) ---
_FAIL_WINDOW = 15 * 60
_FAIL_LIMIT = 8
_failures: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def check_login_allowed(request: Request) -> None:
    q = _failures[_client_ip(request)]
    now = time.monotonic()
    while q and now - q[0] > _FAIL_WINDOW:
        q.popleft()
    if len(q) >= _FAIL_LIMIT:
        raise HTTPException(429, "Слишком много попыток, попробуйте позже")


def verify_password(request: Request, password: str) -> bool:
    ok = hmac.compare_digest(password.encode(), settings.admin_password.encode())
    if not ok:
        _failures[_client_ip(request)].append(time.monotonic())
    return ok


def make_admin_token() -> str:
    return _serializer.dumps({"admin": True})


def is_admin(request: Request) -> bool:
    token = request.cookies.get(ADMIN_COOKIE)
    if not token:
        return False
    try:
        _serializer.loads(token, max_age=ADMIN_MAX_AGE)
    except BadSignature:
        return False
    return True


def require_admin(request: Request) -> None:
    if not is_admin(request):
        raise HTTPException(401, "Требуется вход")


def valid_device_id(value: str | None) -> bool:
    if not value:
        return False
    try:
        return str(uuid.UUID(value)) == value
    except ValueError:
        return False


def cookie_kwargs(max_age: int) -> dict:
    return {
        "max_age": max_age,
        "httponly": True,
        "samesite": "lax",
        "secure": settings.cookie_secure,
        "path": "/",
    }

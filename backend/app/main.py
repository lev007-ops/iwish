import logging
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .auth import DEVICE_COOKIE, LONG_MAX_AGE, cookie_kwargs, valid_device_id
from .config import settings
from .routers import admin, public

log = logging.getLogger("iwish")

app = FastAPI(title="iWish", docs_url=None, redoc_url=None, openapi_url=None)

if settings.admin_password == "admin" or settings.secret_key == "dev-secret-change-me":
    log.warning("ADMIN_PASSWORD / SECRET_KEY use insecure defaults — set them in .env")


@app.middleware("http")
async def device_cookie(request: Request, call_next):
    """Every visitor gets a stable device id cookie (used for likes and reservations)."""
    device_id = request.cookies.get(DEVICE_COOKIE)
    is_new = not valid_device_id(device_id)
    if is_new:
        device_id = str(uuid.uuid4())
    request.state.device_id = device_id
    response = await call_next(request)
    if is_new and not request.url.path.startswith(("/uploads/", "/assets/")):
        response.set_cookie(DEVICE_COOKIE, device_id, **cookie_kwargs(LONG_MAX_AGE))
    return response


@app.get("/api/health", include_in_schema=False)
def health():
    return {"ok": True}


app.include_router(public.router)
app.include_router(admin.router)
app.include_router(admin.protected)


class CachedStatic(StaticFiles):
    def __init__(self, *args, cache_control: str, **kwargs):
        super().__init__(*args, **kwargs)
        self._cache_control = cache_control

    def file_response(self, *args, **kwargs):
        resp = super().file_response(*args, **kwargs)
        resp.headers["Cache-Control"] = self._cache_control
        return resp


# Uploaded file names are random and never reused, so they can be cached forever.
app.mount(
    "/uploads",
    CachedStatic(
        directory=settings.uploads_dir, cache_control="public, max-age=31536000, immutable"
    ),
    name="uploads",
)

static_dir: Path | None = settings.static_dir
if static_dir and (static_dir / "index.html").is_file():
    static_root = static_dir.resolve()
    if (static_root / "assets").is_dir():
        app.mount(
            "/assets",
            CachedStatic(
                directory=static_root / "assets",
                cache_control="public, max-age=31536000, immutable",
            ),
            name="assets",
        )

    @app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404)
        candidate = (static_root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(static_root):
            return FileResponse(candidate)
        return FileResponse(static_root / "index.html", headers={"Cache-Control": "no-cache"})

import secrets
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from .config import settings

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
FULL_SIZE = 1600
THUMB_SIZE = 240

Image.MAX_IMAGE_PIXELS = 60_000_000


class BadImage(ValueError):
    pass


def thumb_name(photo_file: str) -> str:
    return photo_file.removesuffix(".webp") + "_t.webp"


def save_upload(data: bytes) -> str:
    """Normalize an uploaded image to WebP (+ square thumbnail). Returns the file name."""
    from io import BytesIO

    try:
        img = Image.open(BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise BadImage("Файл не похож на изображение") from e

    img = ImageOps.exif_transpose(img)
    img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")

    name = secrets.token_urlsafe(12) + ".webp"
    full = img.copy()
    full.thumbnail((FULL_SIZE, FULL_SIZE))
    full.save(settings.uploads_dir / name, "WEBP", quality=85, method=4)

    thumb = ImageOps.fit(img, (THUMB_SIZE, THUMB_SIZE), Image.Resampling.LANCZOS)
    thumb.save(settings.uploads_dir / thumb_name(name), "WEBP", quality=80, method=4)
    return name


def delete_upload(photo_file: str | None) -> None:
    if not photo_file:
        return
    for n in (photo_file, thumb_name(photo_file)):
        p: Path = settings.uploads_dir / n
        if p.parent == settings.uploads_dir:
            p.unlink(missing_ok=True)


def exists(photo_file: str) -> bool:
    return (settings.uploads_dir / photo_file).is_file()

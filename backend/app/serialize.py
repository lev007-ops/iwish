from .images import thumb_name
from .models import Gift


def photo_urls(g: Gift) -> tuple[str | None, str | None]:
    if g.photo_file:
        return f"/uploads/{g.photo_file}", f"/uploads/{thumb_name(g.photo_file)}"
    if g.photo_url:
        return g.photo_url, g.photo_url
    return None, None


def gift_public_fields(g: Gift) -> dict:
    photo, thumb = photo_urls(g)
    return {
        "id": g.id,
        "name": g.name,
        "description": g.description,
        "price_min": g.price_min,
        "price_max": g.price_max,
        "price_approx": g.price_approx,
        "currency": g.currency,
        "photo": photo,
        "thumb": thumb,
        "link": g.link,
    }

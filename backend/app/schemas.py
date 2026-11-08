import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

Theme = Literal[
    "none",
    "new_year",
    "birthday",
    "valentine",
    "feb23",
    "march8",
    "halloween",
    "anniversary",
]


def _blank_to_none(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


# ---------- Holidays ----------


class HolidayIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    emoji: str = Field(default="🎉", min_length=1, max_length=32)
    date: dt.date
    description: str | None = Field(default=None, max_length=5000)
    repeats_yearly: bool = False
    theme: Theme = "none"

    _strip = field_validator("description", mode="before")(_blank_to_none)

    @field_validator("name", "emoji")
    @classmethod
    def _strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class HolidayAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    emoji: str
    date: dt.date
    description: str | None
    repeats_yearly: bool
    theme: Theme
    next_date: dt.date | None = None
    gift_count: int = 0


class HolidayPublicOut(BaseModel):
    id: int
    name: str
    emoji: str
    description: str | None
    theme: Theme
    date: dt.date  # the upcoming occurrence


# ---------- Gifts ----------


class GiftIn(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    description: str | None = Field(default=None, max_length=10000)
    price_min: float | None = Field(default=None, ge=0)
    price_max: float | None = Field(default=None, ge=0)
    price_approx: bool = False
    currency: str | None = Field(default=None, max_length=8)
    photo_file: str | None = Field(default=None, max_length=255, pattern=r"^[A-Za-z0-9_-]+\.webp$")
    photo_url: HttpUrl | None = None
    link: HttpUrl | None = None
    desire: int = Field(default=3, ge=1, le=5)
    archived: bool = False
    holiday_ids: list[int] = []

    _strip = field_validator(
        "description", "currency", "photo_file", "photo_url", "link", mode="before"
    )(_blank_to_none)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("currency")
    @classmethod
    def _upper_currency(cls, v: str | None) -> str | None:
        return v.upper() if v else v

    @model_validator(mode="after")
    def _check_range(self):
        if self.price_min is None and self.price_max is not None:
            self.price_min, self.price_max = self.price_max, None
        if (
            self.price_min is not None
            and self.price_max is not None
            and self.price_max < self.price_min
        ):
            self.price_min, self.price_max = self.price_max, self.price_min
        if self.price_max is not None and self.price_max == self.price_min:
            self.price_max = None
        return self


class GiftPublicBase(BaseModel):
    id: int
    name: str
    description: str | None
    price_min: float | None
    price_max: float | None
    price_approx: bool
    currency: str | None
    photo: str | None
    thumb: str | None
    link: str | None


class GiftAdminOut(GiftPublicBase):
    desire: int
    archived: bool
    photo_file: str | None
    photo_url: str | None
    holiday_ids: list[int]
    like_count: int


class GiftPublicOut(GiftPublicBase):
    """Public view. Never carries the desire level."""

    liked: bool
    reservation: Literal["none", "mine", "other"]
    rank: int  # position in the desire order (0 = most wanted); the level itself stays hidden


# ---------- Guests (personal links) ----------


class GuestIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v


class GuestOut(BaseModel):
    id: str
    name: str
    created_at: dt.datetime


# ---------- Misc ----------


class LoginIn(BaseModel):
    password: str


class UploadOut(BaseModel):
    photo_file: str
    photo: str
    thumb: str


class PublicState(BaseModel):
    guest_name: str | None
    # The list owner (admin cookie) is viewing: reservations are masked and can't be made.
    viewer_is_owner: bool
    holiday: HolidayPublicOut | None
    gifts: list[GiftPublicOut]

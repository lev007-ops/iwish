import datetime as dt

from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.UTC).replace(tzinfo=None)


gift_holidays = Table(
    "gift_holidays",
    Base.metadata,
    Column("gift_id", ForeignKey("gifts.id", ondelete="CASCADE"), primary_key=True),
    Column("holiday_id", ForeignKey("holidays.id", ondelete="CASCADE"), primary_key=True),
)


class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    emoji: Mapped[str] = mapped_column(String(32), default="🎉")
    date: Mapped[dt.date]
    description: Mapped[str | None] = mapped_column(Text)
    repeats_yearly: Mapped[bool] = mapped_column(Boolean, default=False)
    theme: Mapped[str] = mapped_column(String(32), default="none")
    created_at: Mapped[dt.datetime] = mapped_column(default=utcnow)

    gifts: Mapped[list["Gift"]] = relationship(
        secondary=gift_holidays, back_populates="holidays"
    )


class Gift(Base):
    __tablename__ = "gifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(300))
    description: Mapped[str | None] = mapped_column(Text)
    price_min: Mapped[float | None] = mapped_column(Float)
    price_max: Mapped[float | None] = mapped_column(Float)
    price_approx: Mapped[bool] = mapped_column(Boolean, default=False)
    currency: Mapped[str | None] = mapped_column(String(8))
    photo_file: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(String(2048))
    link: Mapped[str | None] = mapped_column(String(2048))
    desire: Mapped[int] = mapped_column(Integer, default=3)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    holidays: Mapped[list[Holiday]] = relationship(
        secondary=gift_holidays, back_populates="gifts"
    )
    likes: Mapped[list["Like"]] = relationship(
        back_populates="gift", cascade="all, delete-orphan", passive_deletes=True
    )
    reservation: Mapped["Reservation | None"] = relationship(
        back_populates="gift", cascade="all, delete-orphan", passive_deletes=True
    )


class Guest(Base):
    """A named personal link. The id is the random token used in the URL."""

    __tablename__ = "guests"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[dt.datetime] = mapped_column(default=utcnow)

    devices: Mapped[list["Device"]] = relationship(back_populates="guest")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    guest_id: Mapped[str | None] = mapped_column(
        ForeignKey("guests.id", ondelete="SET NULL")
    )
    created_at: Mapped[dt.datetime] = mapped_column(default=utcnow)
    last_seen_at: Mapped[dt.datetime] = mapped_column(default=utcnow)

    guest: Mapped[Guest | None] = relationship(back_populates="devices")


class Like(Base):
    __tablename__ = "likes"

    device_id: Mapped[str] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"), primary_key=True
    )
    gift_id: Mapped[int] = mapped_column(
        ForeignKey("gifts.id", ondelete="CASCADE"), primary_key=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(default=utcnow)

    gift: Mapped[Gift] = relationship(back_populates="likes")


class Reservation(Base):
    """"I'll give this" mark. One per gift; hidden from the admin on purpose."""

    __tablename__ = "reservations"

    gift_id: Mapped[int] = mapped_column(
        ForeignKey("gifts.id", ondelete="CASCADE"), primary_key=True
    )
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"))
    created_at: Mapped[dt.datetime] = mapped_column(default=utcnow)

    gift: Mapped[Gift] = relationship(back_populates="reservation")

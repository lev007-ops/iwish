import datetime as dt
from collections.abc import Iterable

from .models import Holiday


def _in_year(d: dt.date, year: int) -> dt.date:
    try:
        return d.replace(year=year)
    except ValueError:  # Feb 29 in a non-leap year
        return dt.date(year, 2, 28)


def next_occurrence(h: Holiday, today: dt.date) -> dt.date | None:
    """The holiday's next date on or after `today`, or None if it is over."""
    if h.date >= today:
        return h.date
    if not h.repeats_yearly:
        return None
    occ = _in_year(h.date, today.year)
    if occ < today:
        occ = _in_year(h.date, today.year + 1)
    return occ


def upcoming(holidays: Iterable[Holiday], today: dt.date) -> tuple[Holiday, dt.date] | None:
    best: tuple[Holiday, dt.date] | None = None
    for h in holidays:
        occ = next_occurrence(h, today)
        if occ is None:
            continue
        if best is None or (occ, h.id) < (best[1], best[0].id):
            best = (h, occ)
    return best

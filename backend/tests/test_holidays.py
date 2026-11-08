import datetime as dt

from app.holidays import next_occurrence, upcoming
from app.models import Holiday


def h(id_, date, yearly=False):
    return Holiday(id=id_, name=str(id_), date=date, repeats_yearly=yearly)


D = dt.date


def test_one_off_future_and_past():
    assert next_occurrence(h(1, D(2026, 12, 31)), D(2026, 11, 8)) == D(2026, 12, 31)
    assert next_occurrence(h(1, D(2026, 11, 8)), D(2026, 11, 8)) == D(2026, 11, 8)
    assert next_occurrence(h(1, D(2026, 1, 1)), D(2026, 11, 8)) is None


def test_yearly_rolls_over():
    birthday = h(1, D(1990, 3, 15), yearly=True)
    assert next_occurrence(birthday, D(2026, 11, 8)) == D(2027, 3, 15)
    assert next_occurrence(birthday, D(2026, 3, 15)) == D(2026, 3, 15)
    assert next_occurrence(birthday, D(2026, 1, 1)) == D(2026, 3, 15)


def test_yearly_feb29():
    leap = h(1, D(2024, 2, 29), yearly=True)
    assert next_occurrence(leap, D(2026, 1, 1)) == D(2026, 2, 28)
    assert next_occurrence(leap, D(2027, 12, 1)) == D(2028, 2, 29)


def test_upcoming_picks_nearest():
    hs = [
        h(1, D(2026, 12, 31), yearly=True),
        h(2, D(2000, 11, 20), yearly=True),
        h(3, D(2026, 1, 1)),
    ]
    found = upcoming(hs, D(2026, 11, 8))
    assert found is not None
    assert found[0].id == 2 and found[1] == D(2026, 11, 20)
    assert upcoming([h(3, D(2026, 1, 1))], D(2026, 11, 8)) is None

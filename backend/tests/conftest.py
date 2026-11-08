import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="iwish-test-")
os.environ["DATA_DIR"] = _tmp
os.environ["ADMIN_PASSWORD"] = "secret"
os.environ["SECRET_KEY"] = "test-key"
os.environ.pop("STATIC_DIR", None)

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import auth  # noqa: E402
from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _migrate():
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    command.upgrade(cfg, "head")


@pytest.fixture(autouse=True)
def _clean_db():
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    auth._failures.clear()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin(client):
    r = client.post("/api/admin/login", json={"password": "secret"})
    assert r.status_code == 204
    return client

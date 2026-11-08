# iWish — список желаний

Публичная страница с ближайшим праздником, живым отсчётом и списком подарков плюс админка для управления.
Работает на `iwish.bariakh.ru`.

## Развёртывание

```bash
cp .env.example .env
# заполните ADMIN_PASSWORD и SECRET_KEY (openssl rand -hex 32)
docker compose up -d --build
```

Compose публикует единственный порт `127.0.0.1:${APP_PORT:-8080}`. Caddy на хосте проксирует на него домен, пример в `Caddyfile.example`:

```
iwish.bariakh.ru {
 encode zstd gzip
 reverse_proxy 127.0.0.1:8080
}
```

Миграции применяются автоматически при старте контейнера (`alembic upgrade head`).
База SQLite и загруженные фото лежат в volume `iwish-data` (`/data` в контейнере).

Резервная копия:

```bash
docker compose exec app python -c "import sqlite3; s=sqlite3.connect('/data/iwish.db'); d=sqlite3.connect('/data/backup.db'); s.backup(d)"
docker compose cp app:/data ./backup-$(date +%F)
```

Админка: `https://iwish.bariakh.ru/admin`.

## Разработка

```bash
# backend
cd backend
uv venv --python 3.13 .venv && uv pip install -r requirements-dev.txt --python .venv/bin/python
.venv/bin/alembic upgrade head
ADMIN_PASSWORD=admin .venv/bin/uvicorn app.main:app --reload   # :8000

# frontend (проксирует /api, /uploads, /g на :8000)
cd frontend && npm install && npm run dev                       # :5173
```

Тесты и проверки:

```bash
cd backend && .venv/bin/python -m pytest
cd frontend && npm run build && npm run lint
```

Новая миграция после изменения моделей:

```bash
cd backend && .venv/bin/alembic revision --autogenerate -m "описание"
```

## Как это устроено

- **Ближайший праздник** выбирает сервер по дате устройства гостя (`?today=YYYY-MM-DD`). Для ежегодных праздников берётся следующее наступление, 29 февраля в невисокосный год становится 28-м. Отсчёт до 00:00 считается на клиенте в часовом поясе устройства. В день праздника запускается конфетти.
- **Оформление** праздника (`theme`) задаёт CSS-переменные на `<html data-holiday=…>`: фон, акцентные цвета, шрифт заголовков и плавающие декорации. Для каждого оформления есть светлый и тёмный вариант.
- **Cookie:**
  - `iwish_device` — UUID устройства, выдаётся каждому посетителю, на нём держатся лайки и брони.
  - `iwish_guest` — id персональной ссылки (не имя), её ставит `/g/<id>`.
  - `iwish_admin` — подписанная сессия админа на 30 дней.
- **Приватность:**
  - Степень желания не попадает в публичный API, наружу отдаётся только порядок (`rank`).
  - Лайки видит только сам гость, админ видит их количество.
  - Брони («я подарю это») видят только гости, в админ-API их нет.
- **QR-открытки** рисуются в браузере (`qr-code-styling` + canvas): PNG 1080×1440 с именем или отдельный QR в SVG.

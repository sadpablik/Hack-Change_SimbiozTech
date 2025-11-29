FROM python:3.12 AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_NO_CACHE_DIR=off

WORKDIR /app

COPY requirements.txt ./

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic

RUN mkdir -p models

EXPOSE 8000

CMD sh -c "echo 'Waiting for database...' && sleep 5 && echo 'Running migrations...' && alembic upgrade head && echo 'Starting application...' && uvicorn app.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 300 --timeout-graceful-shutdown 300"

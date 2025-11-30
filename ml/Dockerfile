FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_NO_CACHE_DIR=off

RUN groupadd -r mluser && useradd -r -g mluser mluser

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY inference.py ./
COPY app.py ./

RUN mkdir -p models && \
    chown -R mluser:mluser /app

USER mluser

EXPOSE 8001

CMD ["python", "app.py"]

# Backend API

FastAPI бэкенд для анализа тональности текстов.

## Быстрый старт

### Через Docker Compose (рекомендуется)

```bash
docker-compose up -d
```

API будет доступен на http://localhost:8000

### Локально

1. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

2. Создайте `.env` файл:
   ```bash
   cp .env.example .env
   ```

3. Запустите PostgreSQL и примените миграции:
   ```bash
   alembic upgrade head
   ```

4. Запустите сервер:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Endpoints

- **Документация:** http://localhost:8000/docs
- **Health check:** http://localhost:8000/api/health
- **Предсказание:** POST `/api/predict`
- **Валидация:** POST `/api/validate`
- **Скачать результаты:** GET `/api/download/predicted/{prediction_id}`
- **Список предсказаний:** GET `/api/predictions/list`

## Миграции

```bash
# Создать миграцию
alembic revision --autogenerate -m "описание"

# Применить миграции
alembic upgrade head

# Откатить миграцию
alembic downgrade -1
```

## Структура

```
backend/
├── app/
│   ├── api/          # API endpoints
│   ├── core/         # Конфигурация и БД
│   ├── models/       # SQLAlchemy модели
│   ├── schemas/      # Pydantic схемы
│   └── services/     # Бизнес-логика
├── alembic/          # Миграции БД
└── requirements.txt  # Зависимости
```

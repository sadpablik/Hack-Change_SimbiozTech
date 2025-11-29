# Анализатор тональности отзывов

Веб-приложение для анализа тональности текстов с использованием ML-моделей.

## Быстрый старт

### Требования

- Docker
- Git

### Установка и запуск

1. **Клонируйте репозиторий:**
   ```bash
   git clone <repository-url>
   cd Hack-Change_SimbiozTech
   ```

2. **Создайте файл `.env` из примера:**
   ```bash
   cp .env.example .env
   ```

3. **Запустите проект через Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Дождитесь запуска всех сервисов** (миграции БД применяются автоматически)

5. **Откройте в браузере:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API документация: http://localhost:8000/docs

### Остановка

```bash
docker-compose down
```

### Пересборка после изменений

```bash
docker-compose up -d --build
```

## Структура проекта

- `backend/` - FastAPI бэкенд
- `frontend/` - React фронтенд
- `docker-compose.yml` - конфигурация Docker Compose

## Дополнительная информация

Подробная документация находится в `backend/README.md` и `frontend/README.md`.

## Pre-commit

Для разработки рекомендуется установить pre-commit хуки:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

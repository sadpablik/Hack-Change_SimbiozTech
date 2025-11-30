# Анализатор тональности отзывов

Веб-приложение для анализа тональности текстов с использованием ML-модели RuBERT.

## Требования

- **Docker** версии 20.10 или выше
- **Docker Compose** версии 2.0 или выше
- **Git**
- **Минимум 2 GB RAM** для локальной разработки

## Пошаговая инструкция по запуску

### Шаг 1: Клонирование репозитория

```bash
git clone <repository-url>
cd Hack-Change_SimbiozTech
```

### Шаг 2: Создание файла .env

Создайте файл `.env` в корне проекта (в той же директории, где находится `docker-compose.yml`).

**Способ 1: Создание вручную**

```bash
touch .env
```

Затем откройте файл в текстовом редакторе и скопируйте содержимое из раздела "Описание переменных окружения" ниже.

**Способ 2: Копирование шаблона (если есть .env.example)**

```bash
cp .env.example .env
```

### Шаг 3: Настройка переменных окружения

Откройте файл `.env` и заполните все необходимые переменные. Минимальная конфигурация для локального запуска:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hack_change
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/hack_change

MODEL_PATH=models/sentiment_model
ML_SERVICE_URL=http://ml:8001
ML_SERVICE_PORT=8001

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=false

VITE_API_URL=http://localhost:8000
```

**Важно:** Для production окружения измените все пароли и секретные ключи на безопасные значения.

### Шаг 4: Запуск проекта

```bash
docker compose up -d
```

Эта команда:
- Соберет Docker образы для всех сервисов
- Запустит PostgreSQL, MinIO, Backend, ML сервис и Frontend
- Применит миграции базы данных автоматически
- Дождется готовности всех сервисов

### Шаг 5: Проверка запуска

Дождитесь запуска всех сервисов (обычно 1-2 минуты). Проверьте статус:

```bash
docker compose ps
```

Все сервисы должны быть в статусе `Up` и `healthy`.

### Шаг 6: Доступ к приложению

Откройте в браузере:

- **Frontend:** http://localhost:3000
- **Backend API документация:** http://localhost:8000/docs
- **ML Service API документация:** http://localhost:8001/docs
- **MinIO Console:** http://localhost:9001 (логин/пароль из `.env`)

## Описание переменных окружения

### База данных PostgreSQL

| Переменная | Описание | Пример значения | Обязательная |
|-----------|----------|-----------------|--------------|
| `POSTGRES_USER` | Имя пользователя PostgreSQL | `postgres` | Да |
| `POSTGRES_PASSWORD` | Пароль пользователя PostgreSQL | `postgres` | Да |
| `POSTGRES_DB` | Имя базы данных | `hack_change` | Да |
| `DATABASE_URL` | Полный URL подключения к БД | `postgresql+asyncpg://postgres:postgres@db:5432/hack_change` | Да |

**Формат DATABASE_URL:** `postgresql+asyncpg://{USER}:{PASSWORD}@db:5432/{DB_NAME}`

### Backend сервис

| Переменная | Описание | Пример значения | Обязательная | По умолчанию |
|-----------|----------|-----------------|--------------|--------------|
| `MODEL_PATH` | Путь к ML модели (относительно `ml/`) | `models/sentiment_model` | Да | - |
| `ML_SERVICE_URL` | URL ML сервиса (для Docker используйте имя сервиса) | `http://ml:8001` | Да | - |
| `ML_SERVICE_PORT` | Порт ML сервиса | `8001` | Нет | `8001` |
| `MAX_FILE_SIZE_MB` | Максимальный размер загружаемого файла в MB | `500` | Нет | `500` |
| `MAX_TEXT_LENGTH` | Максимальная длина текста в символах | `10000` | Нет | `10000` |
| `MAX_BATCH_SIZE` | Максимальное количество строк для обработки | `100000` | Нет | `100000` |
| `CORS_ORIGINS` | Разрешенные CORS origins через запятую | `http://localhost:3000,http://127.0.0.1:3000` | Нет | `http://localhost:3000,http://127.0.0.1:3000` |

### MinIO (объектное хранилище)

| Переменная | Описание | Пример значения | Обязательная | По умолчанию |
|-----------|----------|-----------------|--------------|--------------|
| `MINIO_ROOT_USER` | Имя администратора MinIO | `minioadmin` | Нет | `minioadmin` |
| `MINIO_ROOT_PASSWORD` | Пароль администратора MinIO | `minioadmin` | Нет | `minioadmin` |
| `MINIO_ENDPOINT` | Адрес MinIO сервера (для Docker используйте имя сервиса) | `minio:9000` | Да | - |
| `MINIO_ACCESS_KEY` | Access key для MinIO | `minioadmin` | Да | - |
| `MINIO_SECRET_KEY` | Secret key для MinIO | `minioadmin` | Да | - |
| `MINIO_SECURE` | Использовать HTTPS для MinIO | `false` | Нет | `false` |

**Важно:** В production измените `MINIO_ROOT_PASSWORD`, `MINIO_ACCESS_KEY` и `MINIO_SECRET_KEY` на безопасные значения.

### Frontend

| Переменная | Описание | Пример значения | Обязательная | По умолчанию |
|-----------|----------|-----------------|--------------|--------------|
| `VITE_API_URL` | URL Backend API для фронтенда | `http://localhost:8000` | Нет | `http://localhost:8000` |

## Использование

### Анализ CSV файла

1. Откройте http://localhost:3000
2. Выберите режим "Предсказание"
3. Загрузите CSV файл с колонкой `text` (опционально `src`)
4. Настройте предобработку текста
5. Нажмите "Начать анализ"
6. Дождитесь завершения обработки
7. Скачайте результаты или просмотрите их в интерфейсе

### Формат входного CSV

```csv
text,src
"Отличный товар, рекомендую!",geo
"Не понравилось качество",rureviews
```

### Формат выходного CSV

```csv
text,src,pred_label,pred_proba
"Отличный товар, рекомендую!",geo,1,"[0.1, 0.8, 0.1]"
"Не понравилось качество",rureviews,2,"[0.2, 0.1, 0.7]"
```

**Расшифровка:**
- `pred_label`: 0=нейтральная, 1=положительная, 2=негативная
- `pred_proba`: вероятности для каждого класса [нейтральная, положительная, негативная]

### Валидация модели

1. Загрузите CSV файл с колонками `text` и `label`
2. Выберите режим "Валидация"
3. Нажмите "Начать валидацию"
4. Просмотрите метрики (Macro-F1, confusion matrix, метрики по классам)

## Управление сервисами

### Остановка

```bash
docker compose down
```

### Остановка с удалением данных

```bash
docker compose down -v
```

**Внимание:** Это удалит все данные из базы данных и MinIO!

### Пересборка после изменений

```bash
docker compose up -d --build
```

### Просмотр логов

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f ml
docker compose logs -f frontend
```

### Перезапуск сервиса

```bash
docker compose restart backend
docker compose restart ml
docker compose restart frontend
```

## Устранение неполадок

### Сервисы не запускаются

1. Проверьте, что порты 3000, 8000, 8001, 5432, 9000, 9001 свободны
2. Проверьте логи: `docker compose logs`
3. Убедитесь, что Docker имеет достаточно памяти (минимум 8GB)
4. Проверьте корректность файла `.env`

### ML сервис падает с ошибкой OOM

Увеличьте лимит памяти в `docker-compose.yml`:

```yaml
ml:
  mem_limit: 10g
  mem_reservation: 4g
```

### База данных не подключается

1. Проверьте, что PostgreSQL контейнер запущен: `docker compose ps db`
2. Проверьте переменные `POSTGRES_*` и `DATABASE_URL` в `.env`
3. Проверьте логи: `docker compose logs db`

### Frontend не подключается к Backend

1. Проверьте переменную `VITE_API_URL` в `.env`
2. Перезапустите frontend: `docker compose restart frontend`
3. Очистите кэш браузера

### Ошибки при загрузке файлов

1. Проверьте значение `MAX_FILE_SIZE_MB` в `.env`
2. Убедитесь, что файл не превышает установленный лимит
3. Проверьте формат CSV файла

## Структура проекта

```
Hack-Change_SimbiozTech/
├── backend/              # FastAPI бэкенд
│   ├── app/             # Код приложения
│   ├── alembic/         # Миграции БД
│   └── requirements.txt
├── frontend/            # React фронтенд
│   ├── src/
│   └── package.json
├── ml/                  # ML сервис
│   ├── models/          # Обученные модели
│   ├── inference.py
│   └── requirements.txt
├── docker-compose.yml
└── .env                 # Переменные окружения (создается вручную)
```

## Технические детали

### Сервисы

- **Frontend** (3000): React приложение с TypeScript
- **Backend** (8000): FastAPI сервис
- **ML Service** (8001): FastAPI сервис для анализа тональности
- **PostgreSQL** (5432): База данных
- **MinIO** (9000-9001): Объектное хранилище

### Производительность

- **CPU:** ~100-120ms на текст
- **GPU:** ~20-40ms на текст
- **Оптимальный размер батча:** 128 для CPU, 512 для GPU

### Требования к ресурсам

**Локальная разработка:**
- ML сервис: 2GB RAM
- Backend: ~512MB RAM
- Frontend: ~256MB RAM
- PostgreSQL: ~256MB RAM
- MinIO: ~256MB RAM
- **Итого:** ~3-4GB RAM

**Бесплатный хостинг:**
- ML сервис: 1-2GB RAM
- Backend: 256-512MB RAM
- **Итого:** 1.5-2.5GB RAM

## Разработка

### Локальная разработка Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Локальная разработка Frontend

```bash
cd frontend
npm install
npm run dev
```

### Локальная разработка ML сервиса

```bash
cd ml
pip install -r requirements.txt
python app.py
```

**Примечание:** Для локальной разработки необходимо запустить PostgreSQL и MinIO через Docker Compose.

## Соответствие техническим требованиям

✅ **Модель на обычном железе:** RuBERT-base (~683MB), работает на CPU/GPU  
✅ **Быстрое выполнение:** Оптимизированный инференс, ~100-120ms на текст (CPU)  
✅ **Бесплатный хостинг:** Требования к памяти 1.5-2.5GB (в пределах лимитов)

## Лицензия

Проект разработан для хакатона Hack-Change.

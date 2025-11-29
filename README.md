# Анализатор тональности отзывов

Веб-приложение для анализа тональности текстов с использованием ML-модели RuBERT.

## Требования

- **Docker** версии 20.10 или выше
- **Docker Compose** версии 2.0 или выше
- **Git**
- **Минимум 2 GB RAM** для локальной разработки
- **Для бесплатного хостинга:** 512 MB - 2 GB RAM (Railway, Render, HuggingFace Spaces)

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd Hack-Change_SimbiozTech
```

### 2. Настройка окружения

Создайте файл `.env` в корне проекта:

```bash
# База данных
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hack_change
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/hack_change

# ML сервис
MODEL_PATH=./models/rubert-finetuned

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# Frontend
VITE_API_URL=http://localhost:8000
```

### 3. Загрузка ML модели

Модель должна находиться в директории `ml/models/rubert-finetuned/`.

**Вариант 1: Использование предобученной модели (уже включена в проект)**
- Модель уже находится в `ml/models/rubert-finetuned/`
- Никаких дополнительных действий не требуется

**Вариант 2: Обучение собственной модели**

1. Подготовьте данные обучения:
   - Разместите файл `train.csv` в `ml/data/train.csv`
   - CSV должен содержать колонки:
     - `text` - текст отзыва
     - `label` - метка тональности (0=нейтральная, 1=положительная, 2=негативная)

2. Обучите модель:
   ```bash
   cd ml
   python train_model.py
   ```

3. Модель будет сохранена в `ml/models/rubert-finetuned/`

### 4. Запуск проекта

```bash
docker compose up -d
```

Эта команда:
- Соберет Docker образы для всех сервисов
- Запустит PostgreSQL, MinIO, Backend, ML сервис и Frontend
- Применит миграции базы данных автоматически
- Дождется готовности всех сервисов

### 5. Проверка работоспособности

Дождитесь запуска всех сервисов (обычно 1-2 минуты). Проверьте статус:

```bash
docker compose ps
```

Все сервисы должны быть в статусе `Up` и `healthy`.

### 6. Доступ к приложению

- **Frontend (веб-интерфейс):** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Backend API документация:** http://localhost:8000/docs
- **ML Service API:** http://localhost:8001
- **ML Service API документация:** http://localhost:8001/docs
- **MinIO Console:** http://localhost:9001
  - Логин: `minioadmin`
  - Пароль: `minioadmin`

## Использование

### Анализ CSV файла

1. Откройте http://localhost:3000 в браузере
2. Выберите режим "Предсказание"
3. Загрузите CSV файл с колонкой `text` (и опционально `src` для источника)
4. При необходимости отключите предобработку текста
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

Где:
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

### Пересборка после изменений кода

```bash
docker compose up -d --build
```

### Просмотр логов

```bash
# Все сервисы
docker compose logs -f

# Конкретный сервис
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

## Структура проекта

```
Hack-Change_SimbiozTech/
├── backend/              # FastAPI бэкенд
│   ├── app/             # Код приложения
│   ├── alembic/         # Миграции БД
│   └── requirements.txt # Python зависимости
├── frontend/            # React фронтенд
│   ├── src/             # Исходный код
│   └── package.json     # Node.js зависимости
├── ml/                  # ML сервис
│   ├── models/          # Обученные модели
│   ├── inference.py     # Код инференса
│   └── requirements.txt # Python зависимости
├── docker-compose.yml   # Конфигурация Docker Compose
└── .env                 # Переменные окружения
```

## Технические детали

### Сервисы

- **Frontend** (порт 3000): React приложение с TypeScript
- **Backend** (порт 8000): FastAPI сервис для обработки запросов
- **ML Service** (порт 8001): FastAPI сервис для анализа тональности
- **PostgreSQL** (порт 5432): База данных для хранения результатов
- **MinIO** (порты 9000-9001): Объектное хранилище для CSV файлов

### Производительность

- **CPU:** ~100-120ms на текст
- **GPU:** ~20-40ms на текст
- **Оптимальный размер батча:** 128 для CPU, 512 для GPU
- **Обработка 60000 строк:** ~1.5-2 часа на CPU, ~20-40 минут на GPU

### Ограничения и требования к ресурсам

**Локальная разработка:**
- ML сервис: 2GB RAM (лимит в docker-compose.yml)
- Backend: ~512MB RAM
- Frontend: ~256MB RAM
- PostgreSQL: ~256MB RAM
- MinIO: ~256MB RAM
- **Итого:** ~3-4GB RAM

**Бесплатный хостинг (Railway, Render, HuggingFace Spaces):**
- ML сервис: 1-2GB RAM (достаточно для RuBERT-base)
- Backend: 256-512MB RAM
- Frontend: можно деплоить отдельно на Vercel/Netlify
- **Итого:** 1.5-2.5GB RAM (в пределах лимитов бесплатных планов)

**Особенности:**
- Модель RuBERT-base: ~683MB (компактная, подходит для CPU-only)
- Оптимизированный инференс с батчингом (128 для CPU, 512 для GPU)
- Автоматическое разбиение больших батчей на оптимальные чанки
- Максимальный размер батча: 10000 текстов

## Устранение неполадок

### Сервисы не запускаются

1. Проверьте, что порты 3000, 8000, 8001, 5432, 9000, 9001 свободны
2. Проверьте логи: `docker compose logs`
3. Убедитесь, что Docker имеет достаточно памяти (минимум 8GB)

### ML сервис падает с ошибкой OOM

Увеличьте лимит памяти в `docker-compose.yml`:
```yaml
ml:
  mem_limit: 10g
  mem_reservation: 4g
```

### База данных не подключается

1. Проверьте, что PostgreSQL контейнер запущен: `docker compose ps db`
2. Проверьте переменные окружения в `.env`
3. Проверьте логи: `docker compose logs db`

### Frontend не подключается к Backend

1. Проверьте переменную `VITE_API_URL` в `.env`
2. Перезапустите frontend: `docker compose restart frontend`
3. Очистите кэш браузера

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

## Деплой на бесплатный хостинг

Проект оптимизирован для деплоя на бесплатные платформы (Railway, Render, HuggingFace Spaces).

**Требования к ресурсам:**
- ML сервис: 1-2GB RAM (достаточно для RuBERT-base)
- Backend: 256-512MB RAM
- **Итого:** 1.5-2.5GB RAM (в пределах лимитов бесплатных планов)

Информация о деплое включена в раздел "Деплой на бесплатный хостинг" выше.

## Соответствие техническим требованиям

✅ **Модель на обычном железе:** RuBERT-base (~683MB), работает на CPU/GPU  
✅ **Быстрое выполнение:** Оптимизированный инференс, ~100-120ms на текст (CPU)  
✅ **Бесплатный хостинг:** Требования к памяти 1.5-2.5GB (в пределах лимитов)

## Лицензия

Проект разработан для хакатона Hack-Change.


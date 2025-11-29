# Frontend

React приложение для анализа тональности текстов.

## Быстрый старт

### Через Docker Compose (рекомендуется)

```bash
docker-compose up -d
```

Приложение будет доступно на http://localhost:3000

### Локально

1. Установите зависимости:
   ```bash
   npm install
   ```

2. Создайте `.env` файл:
   ```bash
   VITE_API_URL=http://localhost:8000
   ```

3. Запустите dev сервер:
   ```bash
   npm run dev
   ```

## Сборка для production

```bash
npm run build
```

## Структура

```
frontend/
├── src/
│   ├── components/    # React компоненты
│   ├── pages/        # Страницы приложения
│   ├── services/     # API клиент
│   ├── utils/       # Утилиты
│   └── styles/      # Стили
└── package.json     # Зависимости
```

## Основные страницы

- `/` - Главная (загрузка файлов и анализ)
- `/results` - Результаты анализа
- `/history` - История анализов
- `/validation` - Валидация модели
- `/help` - Помощь

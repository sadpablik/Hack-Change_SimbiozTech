# Frontend для анализа тональности

Веб-интерфейс для системы анализа тональности текстов, построенный на React + TypeScript + Vite.

## Технологии

- **React 18** + **TypeScript** - основной фреймворк
- **Vite** - сборщик и dev server
- **Tailwind CSS** - стилизация
- **Recharts** - графики и визуализация
- **React Router** - навигация
- **Axios** - HTTP клиент
- **PapaParse** - работа с CSV
- **React Dropzone** - drag-n-drop загрузка

## Быстрый старт

### Локальная разработка

1. **Установите зависимости:**
   ```bash
   npm install
   ```

2. **Запустите dev server:**
   ```bash
   npm run dev
   ```

   Приложение будет доступно по адресу: http://localhost:3000

3. **Убедитесь, что бэкенд запущен** на http://localhost:8000

### Через Docker

```bash
docker-compose up frontend
```

## Переменные окружения

Переменные окружения настраиваются в корневом `.env` файле проекта:

```env
VITE_API_URL=http://localhost:8000
```

Скопируйте `.env.example` в корне проекта в `.env` и настройте переменные.

## Сборка для production

```bash
npm run build
```

Собранные файлы будут в папке `dist/`.

Для preview production build:

```bash
npm run preview
```

## Структура проекта

```
frontend/
├── public/           # Статические файлы
├── src/
│   ├── components/   # React компоненты
│   │   ├── common/   # Общие компоненты
│   │   ├── upload/   # Компоненты загрузки
│   │   ├── analysis/ # Компоненты анализа
│   │   ├── dashboard/# Компоненты дашборда
│   │   └── validation/# Компоненты валидации
│   ├── pages/        # Страницы приложения
│   ├── services/     # API клиент и сервисы
│   ├── hooks/        # React hooks
│   ├── types/        # TypeScript типы
│   ├── utils/        # Утилиты
│   └── styles/       # Стили
├── package.json
└── vite.config.ts
```

## Основные функции

- ✅ Загрузка CSV файлов с drag-n-drop
- ✅ Preview первых строк перед загрузкой
- ✅ Батч-анализ с progress bar
- ✅ Фильтрация результатов (по классу, уверенности, источнику)
- ✅ Поиск по тексту
- ✅ Ручная корректировка меток
- ✅ Экспорт результатов в CSV
- ✅ Валидация с macro-F1 и confusion matrix
- ✅ Дашборд со статистикой и графиками
- ✅ Dark/Light mode
- ✅ Responsive дизайн (mobile, tablet, desktop)
- ✅ Toast уведомления

## API интеграция

Все API вызовы находятся в `src/services/api.ts`. Бэкенд должен быть доступен по адресу, указанному в `VITE_API_URL`.

## Разработка

### Добавление нового компонента

1. Создайте файл в соответствующей папке `src/components/`
2. Экспортируйте компонент
3. Импортируйте и используйте в нужной странице

### Добавление нового API метода

1. Добавьте метод в `src/services/api.ts`
2. Добавьте соответствующий тип в `src/types/index.ts` (если нужно)
3. Используйте в компонентах через `apiClient`

## Тестирование

Приложение протестировано на:
- Chrome (latest)
- Firefox (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Лицензия

MIT

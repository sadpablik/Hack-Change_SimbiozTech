export function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Помощь и документация
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Инструкции по использованию системы анализа тональности
        </p>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Формат CSV файлов
          </h2>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              CSV файл должен содержать обязательную колонку <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">text</code> с
              текстами для анализа.
            </p>
            <p>Опциональные колонки:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">source</code> - источник текста
              </li>
              <li>
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">label</code> - истинная метка класса (0, 1, или 2) для валидации
              </li>
            </ul>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-mono text-sm">
                text,source,label<br />
                "Отличный продукт!",review,2<br />
                "Не понравилось",review,0<br />
                "Нормально",review,1
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Примеры файлов для скачивания:
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/sample_reviews.csv"
                  download
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Скачать полный пример (с labels)
                </a>
                <a
                  href="/sample_reviews_without_labels.csv"
                  download
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Скачать пример (без labels)
                </a>
                <a
                  href="/sample_reviews_minimal.csv"
                  download
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Скачать минимальный пример
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Пошаговая инструкция
          </h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
            <li>Загрузите CSV файл с отзывами через drag-n-drop или кнопку выбора</li>
            <li>Проверьте preview первых строк файла</li>
            <li>Нажмите "Загрузить файл" для создания сессии анализа</li>
            <li>Нажмите "Начать анализ" для обработки всех текстов</li>
            <li>Просмотрите результаты на странице анализа</li>
            <li>Используйте фильтры для поиска нужных результатов</li>
            <li>При необходимости скорректируйте метки вручную</li>
            <li>Экспортируйте результаты в CSV</li>
          </ol>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Macro-F1 метрика
          </h2>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              Macro-F1 - это среднее арифметическое F1-скор для всех классов. Это метрика качества
              классификации, которая учитывает как точность (precision), так и полноту (recall).
            </p>
            <p>Формула расчета:</p>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="font-mono text-sm">
                Для каждого класса i ∈ {'{0, 1, 2}'}:<br />
                Precision_i = TP_i / (TP_i + FP_i)<br />
                Recall_i = TP_i / (TP_i + FN_i)<br />
                F1_i = 2 × (Precision_i × Recall_i) / (Precision_i + Recall_i)<br />
                <br />
                Macro-F1 = (F1_0 + F1_1 + F1_2) / 3
              </p>
            </div>
            <p>
              Где TP (True Positive) - правильно предсказанные, FP (False Positive) - ложные
              срабатывания, FN (False Negative) - пропущенные случаи.
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Классы тональности
          </h2>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-red-500 rounded"></span>
              <span>
                <strong>0 - Негативный</strong>: отрицательная тональность
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-gray-500 rounded"></span>
              <span>
                <strong>1 - Нейтральный</strong>: нейтральная тональность
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-green-500 rounded"></span>
              <span>
                <strong>2 - Позитивный</strong>: положительная тональность
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">FAQ</h2>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <p className="font-semibold mb-1">Какой максимальный размер файла?</p>
              <p>Максимальный размер CSV файла: 10MB</p>
            </div>
            <div>
              <p className="font-semibold mb-1">Можно ли исправить предсказания модели?</p>
              <p>
                Да, на странице результатов вы можете кликнуть на метку и установить правильное
                значение вручную.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Как экспортировать результаты?</p>
              <p>
                На странице результатов нажмите кнопку "Скачать CSV" для экспорта всех данных.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

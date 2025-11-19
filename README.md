# 🤖 HR Recruiter Agent - Andromeda

Интеллектуальный HR-агент на базе ElizaOS с 15-летним опытом подбора персонала. Автоматизирует процесс рекрутинга: от поиска кандидатов до аналитики воронки найма.

## ✨ Основные возможности

### 🔍 Автоматический поиск кандидатов

- **Telegram канал [@it_vakansii_jobs](https://t.me/it_vakansii_jobs)** - чтение и парсинг резюме в реальном времени
- **Веб-поиск** - поиск резюме на hh.ru, LinkedIn, Habr Career через API
- **Умные фильтры** - по профессии, уровню, локации, зарплате

### 💬 Работа с кандидатами

- Общение через Telegram, WhatsApp, Discord
- Автоматическая отправка анкет и тестовых заданий
- Оценка кандидатов на основе ответов и резюме
- Планирование собеседований с созданием календарных событий

### 📊 Аналитика и отчетность

- Отслеживание воронки найма
- Аналитика по источникам кандидатов
- Формирование отчетов о процессе рекрутинга

### 🧠 База знаний

- Документация AI HR Platform (модули: AI Hiring, AI Onboarding, AI Learning, AI Culture, AI Assistant)
- Автоматическая загрузка и индексация резюме (PDF, MD, TXT)
- RAG (Retrieval-Augmented Generation) для точных ответов

## 🚀 Быстрый старт

### Требования

- Node.js 18+ или Bun
- Telegram аккаунт (для интеграции с @it_vakansii_jobs)
- API ключи для AI провайдеров (Google/OpenAI)

### Установка

```bash
# 1. Клонируйте репозиторий
git clone <your-repo-url> andromeda
cd andromeda

# 2. Установите зависимости
bun install

# 3. Настройте .env (см. env.example.txt)
cp env.example.txt .env
nano .env  # Добавьте ваши API ключи
```

### Минимальная конфигурация .env

```bash
# Google AI (для LLM и embeddings)
GOOGLE_API_KEY=your_google_api_key_here
EMBEDDING_PROVIDER=google
TEXT_PROVIDER=google

# Telegram (для чтения канала @it_vakansii_jobs)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_telegram_api_hash
TELEGRAM_PHONE=+79001234567
```

📖 **Подробная инструкция по настройке Telegram**: см. [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md)

### Запуск

```bash
# Очистить старые данные (опционально)
rm -rf .eliza .elizadb

# Запустить агента в режиме разработки
bun run dev
```

При первом запуске Telegram может запросить **код подтверждения** из SMS.

## 💡 Примеры использования

### Поиск кандидатов в Telegram канале

```
Пользователь: Найди frontend разработчиков в канале it_vakansii_jobs

Агент: 🔍 Читаю резюме из канала @it_vakansii_jobs...
       ✅ Найдено резюме: 15

       📋 Топ-10 кандидатов:
       1. Иван Иванов
          💼 Senior Frontend Developer
          📊 Senior
          📍 Москва
          💰 от 250 000 ₽
          🛠️ React, TypeScript, Next.js, GraphQL
          🔗 https://t.me/it_vakansii_jobs/12345
       ...
```

### Поиск с фильтрами

```
Пользователь: Поищи middle React разработчиков в Питере

Агент: [автоматически фильтрует по уровню "middle" и локации "Питер"]
```

### Информация о кандидате из базы знаний

```
Пользователь: Расскажи о кандидате Сергее Боронине

Агент: Сейчас найду информацию в его резюме...

       Сергей Боронин имеет обширный опыт работы:
       • 2018-2020: Senior Developer в компании ABC Tech
       • 2020-2022: Lead Engineer в XYZ Solutions
       ...
```

### Вопросы о платформе

```
Пользователь: Расскажи про модуль AI Hiring

Агент: AI Hiring - это ключевой модуль платформы для автоматизации подбора персонала...
       [использует документацию из базы знаний]
```

## 🛠️ Development

```bash
# Режим разработки с hot-reloading
bun run dev

# Сборка проекта
bun run build

# Проверка типов
bun run type-check

# Форматирование кода
bun run format

# Тестирование
bun run test
```

## Testing

ElizaOS employs a dual testing strategy:

1. **Component Tests** (`src/__tests__/*.test.ts`)

   - Run with Bun's native test runner
   - Fast, isolated tests using mocks
   - Perfect for TDD and component logic

2. **E2E Tests** (`src/__tests__/e2e/*.e2e.ts`)
   - Run with ElizaOS custom test runner
   - Real runtime with actual database (PGLite)
   - Test complete user scenarios

### Test Structure

```
src/
  __tests__/              # All tests live inside src
    *.test.ts            # Component tests (use Bun test runner)
    e2e/                 # E2E tests (use ElizaOS test runner)
      project-starter.e2e.ts  # E2E test suite
      README.md          # E2E testing documentation
  index.ts               # Export tests here: tests: [ProjectStarterTestSuite]
```

### Running Tests

- `elizaos test` - Run all tests (component + e2e)
- `elizaos test component` - Run only component tests
- `elizaos test e2e` - Run only E2E tests

### Writing Tests

Component tests use bun:test:

```typescript
// Unit test example (__tests__/config.test.ts)
describe("Configuration", () => {
  it("should load configuration correctly", () => {
    expect(config.debug).toBeDefined();
  });
});

// Integration test example (__tests__/integration.test.ts)
describe("Integration: Plugin with Character", () => {
  it("should initialize character with plugins", async () => {
    // Test interactions between components
  });
});
```

E2E tests use ElizaOS test interface:

```typescript
// E2E test example (e2e/project.test.ts)
export class ProjectTestSuite implements TestSuite {
  name = "project_test_suite";
  tests = [
    {
      name: "project_initialization",
      fn: async (runtime) => {
        // Test project in a real runtime
      },
    },
  ];
}

export default new ProjectTestSuite();
```

The test utilities in `__tests__/utils/` provide helper functions to simplify writing tests.

## 📁 Структура проекта

```
andromeda/
├── src/
│   ├── character.ts              # Определение HR Recruiter агента
│   ├── plugin.ts                 # Базовый плагин (actions, services)
│   ├── telegram-jobs-plugin.ts   # Плагин для чтения @it_vakansii_jobs
│   ├── index.ts                  # Точка входа
│   └── __tests__/                # Тесты (component + e2e)
├── docs/
│   ├── AI Platform with ElizaOS Agents.md  # Документация платформы
│   └── Боронин Сергей.pdf                  # Пример резюме
├── .env                          # Конфигурация (НЕ коммитить!)
├── env.example.txt               # Пример конфигурации
├── TELEGRAM_SETUP.md             # Инструкция по настройке Telegram
└── README.md                     # Этот файл
```

## 🔌 Плагины

### Встроенные плагины ElizaOS

- `@elizaos/plugin-sql` - База данных (SQLite/PostgreSQL)
- `@elizaos/plugin-knowledge` - База знаний (RAG)
- `@elizaos/plugin-telegram` - Интеграция с Telegram
- `@elizaos/plugin-web-search` - Поиск в интернете
- `@elizaos/plugin-google-genai` - Google Gemini (LLM + embeddings)
- `@elizaos/plugin-openai` - OpenAI (опционально)
- `@elizaos/plugin-openrouter` - OpenRouter (опционально)

### Кастомные плагины

- `hr-recruiter-plugin` (`src/plugin.ts`)

  - ✅ `SEARCH_CANDIDATES` - Поиск кандидатов через web-search
  - ✅ `GREET_BASIC` - Приветствие кандидатов
  - ✅ `HELLO_WORLD` - Пример action

- `telegram-jobs-plugin` (`src/telegram-jobs-plugin.ts`)
  - ✅ `TelegramJobsService` - Сервис для чтения канала
  - ✅ `SEARCH_TELEGRAM_JOBS` - Поиск резюме в @it_vakansii_jobs
  - ✅ Автоматический парсинг: имя, должность, уровень, локация, зарплата, навыки
  - ✅ Кэширование результатов (1 час)

## ⚙️ Конфигурация

### character.ts

Настройка личности, плагинов, базы знаний:

```typescript
export const character: Character = {
  name: "HR Recruiter",
  plugins: [
    "@elizaos/plugin-sql",
    "@elizaos/plugin-knowledge",
    "@elizaos/plugin-telegram", // Для чтения каналов
    // ...
  ],
  knowledge: [
    { path: "./docs/AI Platform with ElizaOS Agents.md" },
    { path: "./docs/Боронин Сергей.pdf" },
  ],
  settings: {
    embeddingModel: "text-embedding-004", // Google
    model: "gemini-1.5-flash", // Google
    knowledge: {
      contextualize: false, // Отключить для экономии токенов
      chunkSize: 512, // Размер чанков
      chunkOverlap: 50, // Перекрытие чанков
    },
  },
  // ...
};
```

### .env

Все секретные ключи и настройки (см. `env.example.txt`).

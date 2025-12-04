#!/bin/bash

# Скрипт для проверки готовности к деплою

echo "🔍 Проверка готовности к деплою..."
echo ""

ERRORS=0
WARNINGS=0

# Проверка наличия .env файла
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден"
    echo "   Создайте .env на основе env.example.txt"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Файл .env найден"
fi

# Проверка обязательных переменных
REQUIRED_VARS=(
    "GOOGLE_API_KEY"
    "SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "TELEGRAM_API_ID"
    "TELEGRAM_API_HASH"
    "TELEGRAM_PHONE"
)

echo ""
echo "📋 Проверка обязательных переменных окружения:"

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env 2>/dev/null || [ -n "${!var}" ]; then
        echo "✅ $var"
    else
        echo "❌ $var - не установлена"
        ERRORS=$((ERRORS + 1))
    fi
done

# Проверка TELEGRAM_SESSION (предупреждение, не ошибка)
if grep -q "^TELEGRAM_SESSION=" .env 2>/dev/null || [ -n "${TELEGRAM_SESSION}" ]; then
    echo "✅ TELEGRAM_SESSION"
else
    echo "⚠️  TELEGRAM_SESSION - не установлена (получите после первого запуска)"
    WARNINGS=$((WARNINGS + 1))
fi

# Проверка наличия Dockerfile
echo ""
echo "🐳 Проверка Docker конфигурации:"

if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile найден"
else
    echo "❌ Dockerfile не найден"
    ERRORS=$((ERRORS + 1))
fi

# Проверка git статуса
echo ""
echo "📦 Проверка Git репозитория:"

if command -v git &> /dev/null; then
    if git status &> /dev/null; then
        UNCOMMITTED=$(git status --porcelain | wc -l)
        if [ "$UNCOMMITTED" -eq 0 ]; then
            echo "✅ Все изменения закоммичены"
        else
            echo "⚠️  Есть незакоммиченные изменения ($UNCOMMITTED файлов)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "⚠️  Git репозиторий не инициализирован"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "⚠️  Git не установлен"
    WARNINGS=$((WARNINGS + 1))
fi

# Проверка сборки
echo ""
echo "🔨 Проверка сборки:"

if [ -d "dist" ]; then
    echo "✅ Папка dist существует"
    if [ -f "dist/src/index.js" ]; then
        echo "✅ Собранный файл найден"
    else
        echo "⚠️  dist/src/index.js не найден - запустите 'bun run build'"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "⚠️  Папка dist не найдена - запустите 'bun run build'"
    WARNINGS=$((WARNINGS + 1))
fi

# Итоги
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Итоги проверки:"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ Всё готово к деплою!"
    echo ""
    echo "🚀 Следующие шаги:"
    echo "   1. Запустите: git push origin main"
    echo "   2. Откройте https://railway.app"
    echo "   3. Следуйте инструкциям в DEPLOY_QUICKSTART.md"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Готово к деплою, но есть предупреждения ($WARNINGS)"
    echo ""
    echo "💡 Рекомендуется исправить предупреждения перед деплоем"
    exit 0
else
    echo "❌ Найдено ошибок: $ERRORS, предупреждений: $WARNINGS"
    echo ""
    echo "🔧 Исправьте ошибки перед деплоем"
    exit 1
fi


# Синица 🐦

Telegram Mini App — кликер с синицей.

## Возможности

- Тапай по синице и зарабатывай монеты
- Синица толстеет по мере прогресса
- Покупай скины в магазине
- Приглашай друзей и получай бонусы
- Профиль и статистика

## Стек

- React + TypeScript + Vite
- Telegram Web App SDK
- Supabase (Auth, Database, Edge Functions)

## Быстрый старт

```bash
# Установка
npm install

# Скопируй env
cp .env.example .env
# Заполни VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

# Запуск
npm run dev
```

## Структура

```
src/
  components/   — UI-компоненты
  pages/        — Страницы (Game, Shop, Friends, Profile)
  hooks/        — Хуки (useGame, useBalance, useUser)
  lib/          — supabase клиент и утилиты
  types/        — TypeScript типы

supabase/
  migrations/   — SQL-схема
  functions/    — Edge Functions (tap, buy-skin, transfer-coins)
```

## Telegram Bot

1. Создай бота через @BotFather
2. Настрой Web App URL на твой деплой
3. Включи Inline Mode при необходимости

## Деплой

Можно задеплоить на Vercel / Netlify / Cloudflare Pages.

Для Supabase Edge Functions:

```bash
supabase functions deploy tap
supabase functions deploy buy-skin
supabase functions deploy transfer-coins
```

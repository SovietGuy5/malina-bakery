# Медовый Дом — GitHub + Supabase

Каталог остаётся в Google Sheets.
Frontend размещается на GitHub Pages.
Заказы сохраняются в Supabase.
Supabase Edge Function отправляет заказ в Telegram.

## Файлы

- index.html — сайт
- supabase/schema.sql — таблицы Supabase
- supabase/functions/create-order/index.ts — backend
- SUPABASE_SETUP.txt — настройки

Папку assets/ нужно заполнить существующими картинками сайта из старого проекта.

## GitHub Pages

Загрузить index.html и assets/ в корень репозитория.
Включить Settings -> Pages -> Deploy from branch -> main -> /root.

Перед публикацией изменить SUPABASE_FUNCTION_URL в index.html.

## Supabase

1. Создать проект.
2. Выполнить supabase/schema.sql в SQL Editor.
3. Создать Edge Function create-order из index.ts.
4. Задать secrets: BOT_TOKEN, GROUP_CHAT_ID, SHEET_ID, SHEET_NAME.
5. Убедиться, что бот добавлен в Telegram-группу и имеет право отправлять сообщения.
6. Проверить заказ из Telegram Mini App.

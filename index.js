/**
 * Medovy Dom — Telegram order backend
 * Cloudflare Worker
 *
 * Cloudflare Secrets:
 *
 * BOT_TOKEN
 * ADMIN_CHAT_ID
 *
 * ADMIN_CHAT_ID должен быть ID TELEGRAM-ГРУППЫ.
 * Для супергруппы обычно выглядит примерно так:
 * -1001234567890
 */

const cors = {
  "Access-Control-Allow-Origin": "https://sovietguy5.github.io",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors,
    },
  });
}


// ======================================================
// TELEGRAM
// ======================================================

async function telegram(env, method, payload) {
  if (!env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN не настроен в Cloudflare");
  }

  if (!env.ADMIN_CHAT_ID) {
    throw new Error("ADMIN_CHAT_ID не настроен в Cloudflare");
  }

  const url =
    `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      `Telegram: ${result.description || "Unknown Telegram error"}`
    );
  }

  return result;
}


// ======================================================
// ЭКРАНИРОВАНИЕ HTML
// ======================================================

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// ======================================================
// ФОРМАТ ЦЕНЫ
// ======================================================

function formatPrice(value) {
  return (
    Number(value || 0).toLocaleString("ru-RU") +
    " ₽"
  );
}


// ======================================================
// ПРИЁМ ЗАКАЗА
// ======================================================

async function order(request, env) {

  // Проверяем Origin
  const origin = request.headers.get("Origin") || "";

  if (
    env.WEBAPP_ORIGIN &&
    origin &&
    origin !== env.WEBAPP_ORIGIN
  ) {
    return json(
      {
        ok: false,
        error: "Origin not allowed",
      },
      403
    );
  }


  // Проверяем настройки Telegram
  if (!env.BOT_TOKEN) {
    return json(
      {
        ok: false,
        error: "BOT_TOKEN не настроен в Cloudflare",
      },
      500
    );
  }

  if (!env.ADMIN_CHAT_ID) {
    return json(
      {
        ok: false,
        error: "ADMIN_CHAT_ID не настроен в Cloudflare",
      },
      500
    );
  }


  // Проверяем ID группы
  const chatId = String(env.ADMIN_CHAT_ID).trim();

  if (!chatId.startsWith("-100")) {
    return json(
      {
        ok: false,
        error:
          "ADMIN_CHAT_ID должен быть ID Telegram-супергруппы и обычно начинаться с -100",
      },
      500
    );
  }


  // Получаем заказ
  let data;

  try {
    data = await request.json();
  } catch {
    return json(
      {
        ok: false,
        error: "Некорректный JSON",
      },
      400
    );
  }


  // Проверяем корзину
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return json(
      {
        ok: false,
        error: "Корзина пуста",
      },
      400
    );
  }


  // Проверяем имя и телефон
  if (!data.name || !data.phone) {
    return json(
      {
        ok: false,
        error: "Не указаны имя или телефон",
      },
      400
    );
  }


  // ====================================================
  // ФОРМИРУЕМ СПИСОК ТОВАРОВ
  // ====================================================

  const lines = data.items
    .map((item) => {

      const name = escapeHtml(item.name || "Товар");

      const qty = Number(item.qty) || 1;

      const price = Number(item.price) || 0;

      const total = price * qty;

      return (
        `• ${name} × ${qty} — ${formatPrice(total)}`
      );
    })
    .join("\n");


  // ====================================================
  // ФОРМИРУЕМ СООБЩЕНИЕ
  // ====================================================

  let text =
    `<b>🍰 НОВЫЙ ЗАКАЗ — МЕДОВЫЙ ДОМ</b>\n\n` +

    `<b>Товары:</b>\n` +
    `${lines}\n\n` +

    `<b>Итого:</b> ${formatPrice(data.total)}\n\n` +

    `<b>Клиент:</b> ${escapeHtml(data.name)}\n` +

    `<b>Телефон:</b> ${escapeHtml(data.phone)}\n` +

    `<b>Получение:</b> ${escapeHtml(
      data.method || "Самовывоз"
    )}`;


  if (data.address) {
    text +=
      `\n<b>Адрес:</b> ${escapeHtml(data.address)}`;
  }


  if (data.date) {
    text +=
      `\n<b>Дата:</b> ${escapeHtml(data.date)}`;
  }


  if (data.comment) {
    text +=
      `\n<b>Комментарий:</b> ${escapeHtml(data.comment)}`;
  }


  // ====================================================
  // ОТПРАВЛЯЕМ В ГРУППУ
  // ====================================================

  try {

    await telegram(
      env,
      "sendMessage",
      {
        chat_id: chatId,

        text: text,

        parse_mode: "HTML",

        disable_web_page_preview: true,
      }
    );

  } catch (error) {

    console.error(
      "Telegram error:",
      error.message
    );

    return json(
      {
        ok: false,
        error: error.message,
      },
      500
    );
  }


  // ====================================================
  // УСПЕШНЫЙ ОТВЕТ
  // ====================================================

  return json({
    ok: true,
    message: "Заказ отправлен в Telegram-группу",
  });
}


// ======================================================
// TELEGRAM WEBHOOK
// ======================================================

async function telegramWebhook(request, env) {

  let update;

  try {
    update = await request.json();
  } catch {
    return json(
      {
        ok: false,
        error: "Invalid Telegram update",
      },
      400
    );
  }


  const message = update.message;


  if (
    message &&
    message.chat &&
    message.chat.id
  ) {

    const chatId = String(message.chat.id);


    // Команда /id
    if (
      message.text === "/id" ||
      message.text === "/start"
    ) {

      await telegram(
        env,
        "sendMessage",
        {
          chat_id: chatId,

          text:
            `🆔 ID этого чата:\n\n` +
            `<code>${chatId}</code>\n\n` +

            `Для группы это значение можно ` +
            `использовать как ADMIN_CHAT_ID.`,
            
          parse_mode: "HTML",
        }
      );
    }
  }


  return json({
    ok: true,
  });
}


// ======================================================
// CLOUDFLARE WORKER
// ======================================================

export default {

  async fetch(request, env) {

    try {

      // -----------------------------------------------
      // CORS PREFLIGHT
      // -----------------------------------------------

      if (request.method === "OPTIONS") {

        return new Response(null, {
          status: 204,
          headers: cors,
        });

      }


      const url = new URL(request.url);


      // -----------------------------------------------
      // GET /
      // -----------------------------------------------

      if (
        request.method === "GET" &&
        url.pathname === "/"
      ) {

        return json({
          ok: true,
          service: "Medovy Dom Telegram API",
          status: "online",
        });

      }


      // -----------------------------------------------
      // GET /health
      // -----------------------------------------------

      if (
        request.method === "GET" &&
        url.pathname === "/health"
      ) {

        return json({
          ok: true,
          service: "Medovy Dom Telegram API",
          status: "online",
        });

      }


      // -----------------------------------------------
      // POST /
      // ЗАКАЗ С САЙТА
      // -----------------------------------------------

      if (
        request.method === "POST" &&
        url.pathname === "/"
      ) {

        return await order(
          request,
          env
        );

      }


      // -----------------------------------------------
      // POST /order
      // Оставляем старый адрес тоже
      // -----------------------------------------------

      if (
        request.method === "POST" &&
        url.pathname === "/order"
      ) {

        return await order(
          request,
          env
        );

      }


      // -----------------------------------------------
      // POST /telegram-webhook
      // -----------------------------------------------

      if (
        request.method === "POST" &&
        url.pathname === "/telegram-webhook"
      ) {

        return await telegramWebhook(
          request,
          env
        );

      }


      // -----------------------------------------------
      // NOT FOUND
      // -----------------------------------------------

      return json(
        {
          ok: false,
          error: "Not found",
          path: url.pathname,
          method: request.method,
        },
        404
      );


    } catch (error) {

      console.error(
        "Worker error:",
        error
      );

      return json(
        {
          ok: false,
          error:
            error.message ||
            "Server error",
        },
        500
      );

    }

  },

};

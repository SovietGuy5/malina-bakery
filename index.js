/**
 * Medovy Dom Telegram order backend for Cloudflare Workers.
 *
 * Secrets:
 * BOT_TOKEN
 * ADMIN_CHAT_ID
 *
 * Optional:
 * WEBAPP_ORIGIN
 */

const cors = {
  "Access-Control-Allow-Origin": "https://sovietguy5.github.io",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...cors,
    },
  });

async function tg(env, method, payload) {
  const r = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const j = await r.json();

  if (!j.ok) {
    throw new Error(j.description || "Telegram API error");
  }

  return j;
}

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function format(n) {
  return Number(n || 0).toLocaleString("ru-RU") + " ₽";
}

async function order(request, env) {
  // Проверяем источник запроса
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

  // Читаем JSON заказа
  const data = await request.json();

  // Проверяем корзину
  if (!data.items?.length) {
    return json(
      {
        ok: false,
        error: "Корзина пуста",
      },
      400
    );
  }

  // Проверяем обязательные данные
  if (!data.name || !data.phone) {
    return json(
      {
        ok: false,
        error: "Не указаны имя или телефон",
      },
      400
    );
  }

  // Формируем список товаров
  const lines = data.items
    .map((i) => {
      const qty = Number(i.qty) || 1;
      const price = Number(i.price) || 0;
      const total = price * qty;

      return `• ${esc(i.name)} × ${qty} — ${format(total)}`;
    })
    .join("\n");

  // Формируем сообщение для Telegram
  const text =
    `<b>🍰 Новый заказ — Медовый Дом</b>\n\n` +
    `${lines}\n\n` +
    `<b>Итого:</b> ${format(data.total)}\n\n` +
    `<b>Клиент:</b> ${esc(data.name)}\n` +
    `<b>Телефон:</b> ${esc(data.phone)}\n` +
    `<b>Получение:</b> ${esc(data.method || "Самовывоз")}` +
    (data.address
      ? `\n<b>Адрес:</b> ${esc(data.address)}`
      : "") +
    (data.date
      ? `\n<b>Дата:</b> ${esc(data.date)}`
      : "") +
    (data.comment
      ? `\n<b>Комментарий:</b> ${esc(data.comment)}`
      : "");

  // Отправляем заказ в Telegram
  await tg(env, "sendMessage", {
    chat_id: env.ADMIN_CHAT_ID,
    text,
    parse_mode: "HTML",
  });

  return json({
    ok: true,
    message: "Заказ успешно отправлен",
  });
}

async function webhook(request, env) {
  const update = await request.json();
  const msg = update.message;

  if (
    msg?.chat?.id &&
    (msg.text === "/start" || msg.text === "/id")
  ) {
    await tg(env, "sendMessage", {
      chat_id: msg.chat.id,
      text:
        `Ваш Telegram chat ID: <code>${msg.chat.id}</code>\n\n` +
        `Если это аккаунт владельца, укажите этот ID ` +
        `в секрете ADMIN_CHAT_ID.`,
      parse_mode: "HTML",
    });
  }

  return json({
    ok: true,
  });
}

export default {
  async fetch(request, env) {
    try {
      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: cors,
        });
      }

      const u = new URL(request.url);

      // Проверка Worker
      if (
        request.method === "GET" &&
        (u.pathname === "/" || u.pathname === "/health")
      ) {
        return json({
          ok: true,
          service: "Medovy Dom Telegram API",
        });
      }

      // Заказ с обычного сайта
      if (
        request.method === "POST" &&
        (u.pathname === "/" || u.pathname === "/order")
      ) {
        return await order(request, env);
      }

      // Telegram webhook
      if (
        request.method === "POST" &&
        u.pathname === "/telegram-webhook"
      ) {
        return await webhook(request, env);
      }

      return json(
        {
          ok: false,
          error: "Not found",
        },
        404
      );
    } catch (e) {
      console.error("Worker error:", e);

      return json(
        {
          ok: false,
          error: e.message || "Server error",
        },
        500
      );
    }
  },
};

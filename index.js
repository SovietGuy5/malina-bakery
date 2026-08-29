/**
 * Medovy Dom — Cloudflare Worker
 *
 * Secrets в Cloudflare:
 * BOT_TOKEN
 * GROUP_CHAT_ID
 *
 * Routes:
 * GET  /health
 * GET  /debug
 * POST /order
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};


/* =========================
   JSON RESPONSE
========================= */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors,
    },
  });
}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


/* =========================
   FORMAT PRICE
========================= */

function formatPrice(value) {
  return (
    Number(value || 0).toLocaleString("ru-RU") + " ₽"
  );
}


/* =========================
   TELEGRAM API
========================= */

async function sendTelegram(env, text) {

  if (!env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is not configured");
  }

  if (!env.GROUP_CHAT_ID) {
    throw new Error("GROUP_CHAT_ID is not configured");
  }

  const telegramUrl =
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      chat_id: env.GROUP_CHAT_ID,
      text: text,
      parse_mode: "HTML",
    }),
  });


  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Telegram returned invalid response");
  }


  if (!response.ok || !result.ok) {

    console.error("Telegram API error:", result);

    throw new Error(
      result.description ||
      "Telegram API error"
    );
  }


  return result;
}


/* =========================
   CREATE ORDER
========================= */

async function handleOrder(request, env) {

  /*
   * Проверяем настройки
   */

  if (!env.BOT_TOKEN) {
    return json(
      {
        ok: false,
        error: "BOT_TOKEN is not configured",
      },
      500
    );
  }


  if (!env.GROUP_CHAT_ID) {
    return json(
      {
        ok: false,
        error: "GROUP_CHAT_ID is not configured",
      },
      500
    );
  }


  /*
   * Получаем JSON
   */

  let data;

  try {

    data = await request.json();

  } catch {

    return json(
      {
        ok: false,
        error: "Invalid JSON",
      },
      400
    );
  }


  /*
   * Проверяем корзину
   */

  if (
    !data.items ||
    !Array.isArray(data.items) ||
    data.items.length === 0
  ) {

    return json(
      {
        ok: false,
        error: "Корзина пуста",
      },
      400
    );
  }


  /*
   * Формируем товары
   */

  const products = data.items
    .map((item) => {

      const name =
        escapeHtml(
          item.name || "Товар"
        );

      const qty =
        Number(item.qty) || 1;

      const price =
        Number(item.price) || 0;

      const total =
        price * qty;


      return (
        `• ${name} × ${qty} — ` +
        `${formatPrice(total)}`
      );

    })
    .join("\n");


  /*
   * Основной текст заказа
   *
   * ВАЖНО:
   * Здесь именно LET, потому что ниже
   * мы добавляем адрес, дату и комментарий.
   */

  let text =
    `<b>🍰 НОВЫЙ ЗАКАЗ — МЕДОВЫЙ ДОМ</b>\n\n` +

    `<b>Заказ:</b>\n` +

    `${products}\n\n` +

    `<b>Итого:</b> ` +
    `${formatPrice(data.total)}\n\n` +

    `<b>Клиент:</b> ` +
    `${escapeHtml(
      data.name || "Не указано"
    )}\n` +

    `<b>Телефон:</b> ` +
    `${escapeHtml(
      data.phone || "Не указано"
    )}\n` +

    `<b>Получение:</b> ` +
    `${escapeHtml(
      data.method || "Самовывоз"
    )}`;


  /*
   * Адрес
   */

  if (data.address) {

    text +=
      `\n<b>Адрес:</b> ` +
      `${escapeHtml(data.address)}`;

  }


  /*
   * Дата
   */

  if (data.date) {

    text +=
      `\n<b>Дата:</b> ` +
      `${escapeHtml(data.date)}`;

  }


  /*
   * Комментарий
   */

  if (data.comment) {

    text +=
      `\n<b>Комментарий:</b> ` +
      `${escapeHtml(data.comment)}`;

  }


  /*
   * Отправляем в Telegram-группу
   */

  await sendTelegram(
    env,
    text
  );


  /*
   * Ответ сайту
   */

  return json({
    ok: true,
    message: "Заказ отправлен",
  });
}


/* =========================
   WORKER
========================= */

export default {

  async fetch(request, env) {

    try {

      /*
       * CORS PREFLIGHT
       */

      if (request.method === "OPTIONS") {

        return new Response(null, {
          status: 204,
          headers: cors,
        });

      }


      const url =
        new URL(request.url);


      /*
       * HEALTH CHECK
       *
       * GET /health
       */

      if (
        url.pathname === "/health" &&
        request.method === "GET"
      ) {

        return json({
          ok: true,
          service: "Medovy Dom API",
        });

      }


      /*
       * DEBUG
       *
       * GET /debug
       *
       * Показывает, видит ли Worker
       * секреты Cloudflare.
       *
       * Значения секретов НЕ показываются.
       */

      if (
        url.pathname === "/debug" &&
        request.method === "GET"
      ) {

        return json({

          ok: true,

          debug: {

            hasBotToken:
              Boolean(env.BOT_TOKEN),

            hasGroupChatId:
              Boolean(env.GROUP_CHAT_ID),

            groupChatIdType:
              typeof env.GROUP_CHAT_ID,

          },

        });

      }


      /*
       * ORDER
       *
       * POST /order
       */

      if (
        url.pathname === "/order" &&
        request.method === "POST"
      ) {

        return await handleOrder(
          request,
          env
        );

      }


      /*
       * ROOT
       */

      if (
        url.pathname === "/" &&
        request.method === "GET"
      ) {

        return json({
          ok: true,
          service: "Medovy Dom Telegram API",
          endpoints: [
            "GET /health",
            "GET /debug",
            "POST /order",
          ],
        });

      }


      /*
       * NOT FOUND
       */

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

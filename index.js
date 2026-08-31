// ============================================================
// MEDOVY DOM — TELEGRAM WORKER
// ============================================================
//
// Функции:
//   GET  /
//   GET  /health
//   POST /order
//   POST /telegram-webhook
//
// Worker отвечает только за:
//   1. Приём заказов с сайта / Telegram Mini App
//   2. Отправку заказов в Telegram-группу
//   3. Команды Telegram-бота
//
// Каталог и админка работают через Supabase.
// ============================================================


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type",
  "Access-Control-Allow-Methods":
    "GET, POST, OPTIONS",
  "Access-Control-Max-Age":
    "86400",
};


// ============================================================
// JSON
// ============================================================

function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        ...corsHeaders,
      },
    }
  );

}


// ============================================================
// TELEGRAM API
// ============================================================

async function telegram(
  env,
  method,
  payload
) {

  if (!env.BOT_TOKEN) {

    throw new Error(
      "BOT_TOKEN is not configured"
    );

  }


  const response = await fetch(

    `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,

    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(payload),
    }

  );


  const result =
    await response.json();


  if (!result.ok) {

    throw new Error(
      result.description ||
      "Telegram API error"
    );

  }


  return result;

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value = "") {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    );

}


// ============================================================
// FORMAT PRICE
// ============================================================

function formatPrice(value) {

  return (
    Number(value || 0)
      .toLocaleString("ru-RU") +
    " ₽"
  );

}


// ============================================================
// ORDER
// ============================================================

async function handleOrder(
  request,
  env
) {

  if (!env.GROUP_CHAT_ID) {

    return json(
      {
        ok: false,

        error:
          "GROUP_CHAT_ID is not configured",
      },

      500
    );

  }


  let data;


  try {

    data =
      await request.json();

  } catch {

    return json(
      {
        ok: false,

        error:
          "Invalid JSON",
      },

      400
    );

  }


  // ----------------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------------

  if (
    !Array.isArray(
      data.items
    ) ||
    data.items.length === 0
  ) {

    return json(
      {
        ok: false,

        error:
          "Корзина пуста",
      },

      400
    );

  }


  if (
    !data.name ||
    !data.phone
  ) {

    return json(
      {
        ok: false,

        error:
          "Не указаны имя или телефон",
      },

      400
    );

  }


  // ----------------------------------------------------------
  // PRODUCTS
  // ----------------------------------------------------------

  const lines =
    data.items
      .map(item => {

        const name =
          escapeHtml(
            item.name ||
            "Товар"
          );


        const quantity =
          Number(
            item.qty
          ) || 1;


        const price =
          Number(
            item.price
          ) || 0;


        const total =
          price * quantity;


        return (
          `• ${name} × ${quantity} — ` +
          `${formatPrice(total)}`
        );

      })

      .join("\n");


  // ----------------------------------------------------------
  // MESSAGE
  // ----------------------------------------------------------

  let text =
    "<b>🍰 НОВЫЙ ЗАКАЗ — МЕДОВЫЙ ДОМ</b>\n\n";


  text +=
    "<b>📦 Заказ:</b>\n";


  text +=
    lines;


  text +=
    "\n\n";


  text +=
    `<b>💰 Итого:</b> ` +
    `${formatPrice(data.total)}\n\n`;


  text +=
    "<b>👤 Клиент:</b>\n";


  text +=
    escapeHtml(
      data.name
    );


  text +=
    "\n";


  text +=
    "<b>📞 Телефон:</b>\n";


  text +=
    escapeHtml(
      data.phone
    );


  text +=
    "\n\n";


  text +=
    "<b>🚚 Получение:</b> " +
    escapeHtml(
      data.method ||
      "Самовывоз"
    );


  if (data.address) {

    text +=
      "\n<b>📍 Адрес:</b> " +
      escapeHtml(
        data.address
      );

  }


  if (data.date) {

    text +=
      "\n<b>📅 Дата:</b> " +
      escapeHtml(
        data.date
      );

  }


  if (data.comment) {

    text +=
      "\n<b>💬 Комментарий:</b> " +
      escapeHtml(
        data.comment
      );

  }


  // ----------------------------------------------------------
  // TELEGRAM
  // ----------------------------------------------------------

  const result =
    await telegram(
      env,

      "sendMessage",

      {
        chat_id:
          env.GROUP_CHAT_ID,

        text,

        parse_mode:
          "HTML",
      }
    );


  return json({

    ok: true,

    telegram_message_id:
      result.result?.message_id ||
      null,

    message:
      "Заказ отправлен в Telegram-группу",

  });

}


// ============================================================
// BOT /START
// ============================================================

async function handleStart(
  message,
  env
) {

  const chatId =
    message.chat.id;


  // ----------------------------------------------------------
  // URLS
  // ----------------------------------------------------------

  /*
   * Эти два значения нужно задать
   * в Cloudflare Worker Variables.
   *
   * SHOP_URL
   * ADMIN_URL
   */

  const shopUrl =
    env.SHOP_URL ||
    "https://sovietguy5.github.io";


  const adminUrl =
    env.ADMIN_URL ||
    "https://sovietguy5.github.io/admin.html";


  // ----------------------------------------------------------
  // КЛАВИАТУРА
  // ----------------------------------------------------------

  const keyboard = {

    inline_keyboard: [

      [
        {
          text:
            "🍰 Открыть магазин",

          web_app: {
            url:
              shopUrl,
          },
        },
      ],

      [
        {
          text:
            "🔐 Админка",

          web_app: {
            url:
              adminUrl,
          },
        },
      ],

    ],

  };


  // ----------------------------------------------------------
  // MESSAGE
  // ----------------------------------------------------------

  const firstName =
    message.from?.first_name ||
    "друг";


  const text =
    `Привет, ${escapeHtml(firstName)}! 👋\n\n` +
    `Добро пожаловать в <b>Медовый Дом</b> 🍰\n\n` +
    `Выбери нужный раздел:`;


  await telegram(

    env,

    "sendMessage",

    {
      chat_id:
        chatId,

      text,

      parse_mode:
        "HTML",

      reply_markup:
        keyboard,
    }

  );

}


// ============================================================
// BOT /ADMIN
// ============================================================

async function handleAdmin(
  message,
  env
) {

  const telegramId =
    message.from?.id;


  // ----------------------------------------------------------
  // ADMIN ID
  // ----------------------------------------------------------

  const adminId =
    383814452;


  if (
    Number(telegramId) !==
    adminId
  ) {

    await telegram(

      env,

      "sendMessage",

      {
        chat_id:
          message.chat.id,

        text:
          "⛔ У вас нет доступа к админке.",

      }

    );


    return;

  }


  // ----------------------------------------------------------
  // ADMIN URL
  // ----------------------------------------------------------

  const adminUrl =
    env.ADMIN_URL ||
    "https://sovietguy5.github.io/admin.html";


  await telegram(

    env,

    "sendMessage",

    {

      chat_id:
        message.chat.id,

      text:
        "<b>🔐 Панель администратора</b>\n\n" +
        "Управление каталогом товаров:",

      parse_mode:
        "HTML",

      reply_markup: {

        inline_keyboard: [

          [

            {
              text:
                "🔐 Открыть админку",

              web_app: {
                url:
                  adminUrl,
              },

            },

          ],

        ],

      },

    }

  );

}


// ============================================================
// /ID
// ============================================================

async function handleId(
  message,
  env
) {

  const chat =
    message.chat;


  await telegram(

    env,

    "sendMessage",

    {

      chat_id:
        chat.id,

      text:
        `<b>Telegram Chat ID</b>\n\n` +
        `<code>${chat.id}</code>\n\n` +
        `Тип чата: <code>${escapeHtml(
          chat.type
        )}</code>`,

      parse_mode:
        "HTML",

    }

  );

}


// ============================================================
// WEBHOOK
// ============================================================

async function handleWebhook(
  request,
  env
) {

  let update;


  try {

    update =
      await request.json();

  } catch {

    return json({
      ok: true,
    });

  }


  const message =
    update.message;


  if (!message) {

    return json({
      ok: true,
    });

  }


  const text =
    String(
      message.text ||
      ""
    )
      .trim();


  // ----------------------------------------------------------
  // /START
  // ----------------------------------------------------------

  if (
    text === "/start"
  ) {

    await handleStart(
      message,
      env
    );

  }


  // ----------------------------------------------------------
  // /ADMIN
  // ----------------------------------------------------------

  else if (
    text === "/admin"
  ) {

    await handleAdmin(
      message,
      env
    );

  }


  // ----------------------------------------------------------
  // /ID
  // ----------------------------------------------------------

  else if (
    text === "/id"
  ) {

    await handleId(
      message,
      env
    );

  }


  return json({
    ok: true,
  });

}


// ============================================================
// MAIN
// ============================================================

export default {

  async fetch(
    request,
    env
  ) {

    try {

      // ------------------------------------------------------
      // CORS
      // ------------------------------------------------------

      if (
        request.method ===
        "OPTIONS"
      ) {

        return new Response(
          null,

          {
            status: 204,

            headers:
              corsHeaders,
          }
        );

      }


      const url =
        new URL(
          request.url
        );


      // ------------------------------------------------------
      // HEALTH
      // ------------------------------------------------------

      if (
        request.method ===
          "GET" &&
        (
          url.pathname ===
            "/" ||

          url.pathname ===
            "/health"
        )
      ) {

        return json({

          ok: true,

          service:
            "Medovy Dom Telegram API",

        });

      }


      // ------------------------------------------------------
      // ORDER
      // ------------------------------------------------------

      if (
        request.method ===
          "POST" &&

        (
          url.pathname ===
            "/order" ||

          url.pathname ===
            "/"
        )
      ) {

        return await handleOrder(
          request,
          env
        );

      }


      // ------------------------------------------------------
      // TELEGRAM WEBHOOK
      // ------------------------------------------------------

      if (
        request.method ===
          "POST" &&

        url.pathname ===
          "/telegram-webhook"
      ) {

        return await handleWebhook(
          request,
          env
        );

      }


      // ------------------------------------------------------
      // NOT FOUND
      // ------------------------------------------------------

      return json(

        {
          ok: false,

          error:
            "Not found",

          path:
            url.pathname,

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
            error instanceof Error
              ? error.message
              : "Server error",

        },

        500

      );

    }

  },

};


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors,
    },
  });
}


// ======================================================
// TELEGRAM API
// ======================================================

async function telegram(env, method, payload) {

  if (!env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(
      result.description || "Telegram API error"
    );
  }

  return result;
}


// ======================================================
// HELPERS
// ======================================================

function esc(value = "") {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


function format(value) {

  return (
    Number(value || 0)
      .toLocaleString("ru-RU") +
    " ₽"
  );

}


// ======================================================
// ORDER
// ======================================================

async function order(request, env) {

  if (!env.GROUP_CHAT_ID) {

    return json(
      {
        ok: false,
        error: "GROUP_CHAT_ID is not configured",
      },
      500
    );

  }


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


  if (
    !data.items ||
    !Array.isArray(data.items)
  ) {

    return json(
      {
        ok: false,
        error: "Некорректная корзина",
      },
      400
    );

  }


  if (data.items.length === 0) {

    return json(
      {
        ok: false,
        error: "Корзина пуста",
      },
      400
    );

  }


  if (!data.name || !data.phone) {

    return json(
      {
        ok: false,
        error: "Не указаны имя или телефон",
      },
      400
    );

  }


  const lines = data.items
    .map((item) => {

      const name =
        esc(item.name || "Товар");

      const qty =
        Number(item.qty) || 1;

      const price =
        Number(item.price) || 0;

      const total =
        price * qty;

      return (
        `• ${name} × ${qty} — ${format(total)}`
      );

    })
    .join("\n");


  let text = "";

  text +=
    "<b>🍰 НОВЫЙ ЗАКАЗ — МЕДОВЫЙ ДОМ</b>\n\n";

  text += "<b>📦 Заказ:</b>\n";

  text += lines;

  text += "\n\n";

  text +=
    `<b>💰 Итого:</b> ${format(data.total)}\n\n`;

  text += "<b>👤 Клиент:</b>\n";

  text += esc(data.name);

  text += "\n";

  text += "<b>📞 Телефон:</b>\n";

  text += esc(data.phone);

  text += "\n\n";

  text +=
    `<b>🚚 Получение:</b> ${esc(
      data.method || "Самовывоз"
    )}`;


  if (data.address) {

    text +=
      `\n<b>📍 Адрес:</b> ${esc(
        data.address
      )}`;

  }


  if (data.date) {

    text +=
      `\n<b>📅 Дата:</b> ${esc(
        data.date
      )}`;

  }


  if (data.comment) {

    text +=
      `\n<b>💬 Комментарий:</b> ${esc(
        data.comment
      )}`;

  }


  await telegram(
    env,
    "sendMessage",
    {
      chat_id: env.GROUP_CHAT_ID,
      text,
      parse_mode: "HTML",
    }
  );


  return json({
    ok: true,
    message:
      "Заказ отправлен в Telegram-группу",
  });

}


// ======================================================
// WEBHOOK
// ======================================================

async function webhook(request, env) {

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


  const chat =
    message.chat;


  if (
    message.text === "/id" ||
    message.text === "/start"
  ) {

    await telegram(
      env,
      "sendMessage",
      {
        chat_id: chat.id,

        text:
          `<b>Telegram Chat ID</b>\n\n` +
          `<code>${chat.id}</code>\n\n` +
          `Тип чата: <code>${esc(
            chat.type
          )}</code>`,

        parse_mode: "HTML",
      }
    );

  }


  return json({
    ok: true,
  });

}


// ======================================================
// MAIN
// ======================================================

export default {

  async fetch(request, env) {

    try {

      // CORS
      if (
        request.method === "OPTIONS"
      ) {

        return new Response(null, {
          status: 204,
          headers: cors,
        });

      }


      const url =
        new URL(request.url);


      // HEALTH
      if (
        request.method === "GET" &&
        (
          url.pathname === "/" ||
          url.pathname === "/health"
        )
      ) {

        return json({
          ok: true,
          service:
            "Medovy Dom Telegram API",
        });

      }


      // ORDER
      if (
        request.method === "POST" &&
        (
          url.pathname === "/" ||
          url.pathname === "/order"
        )
      ) {

        return await order(
          request,
          env
        );

      }


      // WEBHOOK
      if (
        request.method === "POST" &&
        url.pathname ===
          "/telegram-webhook"
      ) {

        return await webhook(
          request,
          env
        );

      }


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

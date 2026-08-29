const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

async function sendTelegram(env, text) {
  if (!env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN is not configured");
  }

  if (!env.GROUP_CHAT_ID) {
    throw new Error("GROUP_CHAT_ID is not configured");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.GROUP_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || "Telegram API error"
    );
  }

  return result;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPrice(value) {
  return (
    Number(value || 0).toLocaleString("ru-RU") + " ₽"
  );
}

async function handleOrder(request, env) {
  const data = await request.json();

  if (!data.items || !data.items.length) {
    return json(
      {
        ok: false,
        error: "Корзина пуста",
      },
      400
    );
  }

  const products = data.items
    .map((item) => {
      const name = escapeHtml(item.name || "Товар");
      const qty = Number(item.qty) || 1;
      const price = Number(item.price) || 0;
      const total = price * qty;

      return `• ${name} × ${qty} — ${formatPrice(total)}`;
    })
    .join("\n");

  const text =
    `<b>🍰 НОВЫЙ ЗАКАЗ — МЕДОВЫЙ ДОМ</b>\n\n` +

    `<b>Заказ:</b>\n` +
    `${products}\n\n` +

    `<b>Итого:</b> ${formatPrice(data.total)}\n\n` +

    `<b>Клиент:</b> ${escapeHtml(
      data.name || "Не указано"
    )}\n` +

    `<b>Телефон:</b> ${escapeHtml(
      data.phone || "Не указано"
    )}\n` +

    `<b>Получение:</b> ${escapeHtml(
      data.method || "Самовывоз"
    )}`;

  if (data.address) {
    text += `\n<b>Адрес:</b> ${escapeHtml(data.address)}`;
  }

  if (data.date) {
    text += `\n<b>Дата:</b> ${escapeHtml(data.date)}`;
  }

  if (data.comment) {
    text += `\n<b>Комментарий:</b> ${escapeHtml(data.comment)}`;
  }

  await sendTelegram(env, text);

  return json({
    ok: true,
  });
}

export default {
  async fetch(request, env) {
    try {
      /*
       * CORS preflight
       */
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: cors,
        });
      }

      const url = new URL(request.url);

      /*
       * Проверка Worker
       *
       * https://...workers.dev/health
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
       * Проверка Telegram
       *
       * https://...workers.dev/debug
       */
      if (
        url.pathname === "/debug" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,
          debug: {
            hasBotToken: Boolean(env.BOT_TOKEN),
            hasGroupChatId: Boolean(env.GROUP_CHAT_ID),
            groupChatIdType: typeof env.GROUP_CHAT_ID,
          },
        });
      }

      /*
       * СОЗДАНИЕ ЗАКАЗА
       *
       * POST /order
       */
      if (
        url.pathname === "/order" &&
        request.method === "POST"
      ) {
        return await handleOrder(request, env);
      }

      /*
       * Всё остальное
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
      console.error("Worker error:", error);

      return json(
        {
          ok: false,
          error: error.message || "Server error",
        },
        500
      );
    }
  },
};

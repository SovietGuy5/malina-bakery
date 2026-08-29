js
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sovietguy5.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Обработка CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    // Приём заказа
    if (url.pathname === "/order" && request.method === "POST") {
      try {
        const order = await request.json();

        // Проверка обязательных полей
        if (!order.name || !order.phone || !order.order) {
          return json(
            {
              ok: false,
              error: "Не заполнены обязательные поля",
            },
            400
          );
        }

        // Отправка заказа в Telegram-группу
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: env.ADMIN_CHAT_ID,
              text:
                `🛒 НОВЫЙ ЗАКАЗ\n\n` +
                `👤 Имя: ${order.name}\n` +
                `📞 Телефон: ${order.phone}\n\n` +
                `📦 Заказ:\n${order.order}`,
            }),
          }
        );

        const telegramResult = await telegramResponse.json();

        if (!telegramResponse.ok || !telegramResult.ok) {
          console.error("Telegram error:", telegramResult);

          return json(
            {
              ok: false,
              error: "Telegram Bot API error",
            },
            500
          );
        }

        return json({
          ok: true,
        });
      } catch (error) {
        console.error("Server error:", error);

        return json(
          {
            ok: false,
            error: "Ошибка сервера",
          },
          500
        );
      }
    }

    return json({
      ok: true,
      service: "Medovy Dom Telegram API",
    });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

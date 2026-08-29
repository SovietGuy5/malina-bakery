const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sovietguy5.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/order" && request.method === "POST") {
      try {
        const order = await request.json();

        if (!order.name  !order.phone  !order.order) {
          return json(
            { ok: false, error: "Не заполнены обязательные поля" },
            400
          );
        }

        const telegramResponse = await fetch(
          https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: env.ADMIN_CHAT_ID,
              text: order.order,
            }),
          }
        );

        const telegramResult = await telegramResponse.json();

        if (!telegramResponse.ok || !telegramResult.ok) {
          console.error("Telegram error:", telegramResult);

          return json(
            { ok: false, error: "Telegram Bot API error" },
            500
          );
        }

        return json({ ok: true });
      } catch (error) {
        console.error(error);

        return json(
          { ok: false, error: "Ошибка сервера" },
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

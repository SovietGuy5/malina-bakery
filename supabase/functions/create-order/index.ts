import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value: number) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}

function priceNum(value: string) {
  const digits = String(value || "").replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = Number(digits.replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// RFC4180-ish CSV parser. Handles quoted cells and commas/newlines inside quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function csvToObjects(csv: string) {
  const rows = parseCsv(csv);
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  return rows
    .slice(1)
    .filter((r) => r.some((v) => v.trim() !== ""))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = (r[i] ?? "").trim();
      });
      return obj;
    });
}

async function getSheetProducts() {
  const sheetId = Deno.env.get("SHEET_ID");
  const sheetName = Deno.env.get("SHEET_NAME") || "Каталог";

  if (!sheetId) {
    throw new Error("SHEET_ID is not configured");
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Sheets error: ${response.status}`);
  }

  const csv = await response.text();
  const rows = csvToObjects(csv);

  return rows
    .map((r) => ({
      name: r["Название"] || "",
      category: r["Категория"] || "",
      description: r["Описание"] || "",
      weight: r["Вес"] || "",
      price: priceNum(r["Цена"] || ""),
      image: r["Картинка"] || "",
      tag: r["Метка"] || "",
      inStock: r["В наличии"] || "Да",
    }))
    .filter((p) => p.name);
}

function isOutOfStock(value: string) {
  const v = String(value || "Да").trim().toLowerCase();

  return [
    "нет",
    "no",
    "false",
    "0",
    "нет в наличии",
    "отсутствует",
    "out of stock",
    "закончился",
    "закончилось",
  ].includes(v) || /нет.*налич/i.test(v);
}

// Telegram WebApp initData validation.
// Telegram secret key = HMAC-SHA256("WebAppData", bot_token)
// data_check_string = sorted key=value pairs excluding hash.
async function validateTelegramInitData(initData: string, botToken: string) {
  if (!initData) {
    throw new Error("Telegram initData is missing");
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash) {
    throw new Error("Telegram initData hash is missing");
  }

  const pairs: string[] = [];

  for (const [key, value] of params.entries()) {
    if (key !== "hash") {
      pairs.push(`${key}=${value}`);
    }
  }

  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const encoder = new TextEncoder();

  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const secretBytes = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(botToken),
  );

  const secret = new Uint8Array(secretBytes);

  const dataKey = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const hashBytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      dataKey,
      encoder.encode(dataCheckString),
    ),
  );

  const expectedHash = Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expectedHash !== receivedHash.toLowerCase()) {
    throw new Error("Invalid Telegram initData");
  }

  const authDate = Number(params.get("auth_date") || 0);
  const maxAge = 24 * 60 * 60;

  if (!authDate || Math.floor(Date.now() / 1000) - authDate > maxAge) {
    throw new Error("Telegram initData is expired");
  }

  let user = null;

  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    throw new Error("Invalid Telegram user data");
  }

  if (!user?.id) {
    throw new Error("Telegram user is missing");
  }

  return user;
}

async function telegram(method: string, payload: Record<string, unknown>) {
  const botToken = Deno.env.get("BOT_TOKEN");

  if (!botToken) {
    throw new Error("BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.description || "Telegram API error");
  }

  return result;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const botToken = Deno.env.get("BOT_TOKEN");
  const groupChatId = Deno.env.get("GROUP_CHAT_ID");

  if (!supabaseUrl || !serviceRoleKey || !botToken || !groupChatId) {
    return json({
      ok: false,
      error: "Supabase Function secrets are not fully configured",
    }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const data = await request.json();

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return json({ ok: false, error: "Корзина пуста" }, 400);
    }

    if (!data.name || !data.phone) {
      return json({
        ok: false,
        error: "Не указаны имя или телефон",
      }, 400);
    }

    // Обязательная серверная проверка Telegram.
    const telegramUser = await validateTelegramInitData(
      data.initData || "",
      botToken,
    );

    const products = await getSheetProducts();

    let total = 0;
    const verifiedItems: Array<{
      name: string;
      price: number;
      qty: number;
      subtotal: number;
    }> = [];

    for (const rawItem of data.items) {
      const name = String(rawItem?.name || "").trim();
      const qty = Math.max(1, Math.min(99, Math.floor(Number(rawItem?.qty) || 0)));

      if (!name || !qty) {
        return json({ ok: false, error: "Некорректный товар в корзине" }, 400);
      }

      const product = products.find(
        (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
      );

      if (!product) {
        return json({
          ok: false,
          error: `Товар «${name}» больше недоступен. Обновите страницу.`,
        }, 409);
      }

      if (isOutOfStock(product.inStock)) {
        return json({
          ok: false,
          error: `Товар «${name}» сейчас нет в наличии.`,
        }, 409);
      }

      const subtotal = product.price * qty;
      total += subtotal;

      verifiedItems.push({
        name: product.name,
        price: product.price,
        qty,
        subtotal,
      });
    }

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .upsert({
        telegram_id: telegramUser.id,
        username: telegramUser.username || null,
        first_name: telegramUser.first_name || null,
        last_name: telegramUser.last_name || null,
        language: data.language || null,
      }, { onConflict: "telegram_id" })
      .select("id")
      .single();

    if (userError) throw userError;

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        telegram_id: telegramUser.id,
        user_id: userRow.id,
        customer_name: String(data.name).trim(),
        phone: String(data.phone).trim(),
        method: String(data.method || "Самовывоз"),
        address: String(data.address || "").trim() || null,
        pickup_date: String(data.date || "").trim() || null,
        comment: String(data.comment || "").trim() || null,
        total,
        status: "new",
      })
      .select("id, order_number")
      .single();

    if (orderError) throw orderError;

    const itemRows = verifiedItems.map((item) => ({
      order_id: orderRow.id,
      product_name: item.name,
      price: item.price,
      quantity: item.qty,
      subtotal: item.subtotal,
    }));

    const { error: itemError } = await supabase
      .from("order_items")
      .insert(itemRows);

    if (itemError) throw itemError;

    let text = "";
    text += "<b>🍰 НОВЫЙ ЗАКАЗ — МЕДОВЫЙ ДОМ</b>\n\n";
    text += `<b>🧾 Заказ:</b> #${orderRow.order_number}\n\n`;
    text += "<b>📦 Заказ:</b>\n";

    for (const item of verifiedItems) {
      text += `• ${esc(item.name)} × ${item.qty} — ${money(item.subtotal)}\n`;
    }

    text += `\n<b>💰 Итого:</b> ${money(total)}\n\n`;
    text += "<b>👤 Клиент:</b>\n";
    text += `${esc(data.name)}\n`;
    text += `<b>📞 Телефон:</b> ${esc(data.phone)}\n\n`;
    text += `<b>🚚 Получение:</b> ${esc(data.method || "Самовывоз")}`;

    if (data.address) {
      text += `\n<b>📍 Адрес:</b> ${esc(data.address)}`;
    }

    if (data.date) {
      text += `\n<b>📅 Дата:</b> ${esc(data.date)}`;
    }

    if (data.comment) {
      text += `\n<b>💬 Комментарий:</b> ${esc(data.comment)}`;
    }

    text += "\n\n<b>Telegram:</b> ";
    text += telegramUser.username
      ? `@${esc(telegramUser.username)}`
      : `ID ${telegramUser.id}`;

    let telegramMessageId: number | null = null;

    try {
      const tgResult = await telegram("sendMessage", {
        chat_id: groupChatId,
        text,
        parse_mode: "HTML",
      });

      telegramMessageId = tgResult?.result?.message_id ?? null;

      await supabase
        .from("orders")
        .update({
          telegram_sent: true,
          telegram_message_id: telegramMessageId,
          status: "new",
        })
        .eq("id", orderRow.id);
    } catch (telegramError) {
      await supabase
        .from("orders")
        .update({
          status: "telegram_error",
        })
        .eq("id", orderRow.id);

      throw telegramError;
    }

    return json({
      ok: true,
      order_id: orderRow.id,
      order_number: orderRow.order_number,
      total,
      message: "Заказ отправлен в Telegram-группу",
    });
  } catch (error) {
    console.error(error);

    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Server error",
    }, 500);
  }
});

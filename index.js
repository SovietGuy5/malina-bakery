/** Medovy Dom Telegram order backend for Cloudflare Workers.
 * Secrets: BOT_TOKEN, ADMIN_CHAT_ID. Optional: WEBAPP_ORIGIN.
 * Routes: POST /order, POST /telegram-webhook, GET /health
 */
const cors = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': '*', 
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400' 
};
const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers: { 'content-type':'application/json; charset=utf-8', ...cors } });

async function verifyTelegramInitData(initData, botToken) {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');
  const dataCheck = [...params.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${k}=${v}`).join('\n');
  const secretKey = await crypto.subtle.importKey('raw', new TextEncoder().encode('WebAppData'), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));
  const key = await crypto.subtle.importKey('raw', secret, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataCheck));
  const got = [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
  if (got !== hash) return null;
  const userRaw = params.get('user');
  try { return userRaw ? JSON.parse(userRaw) : null; } catch { return null; }
}

async function tg(env, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
  const j = await r.json(); if (!j.ok) throw new Error(j.description || 'Telegram API error'); return j;
}

function esc(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function format(n){ return Number(n||0).toLocaleString('ru-RU')+' ₽'; }

async function order(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (env.WEBAPP_ORIGIN && origin && origin !== env.WEBAPP_ORIGIN) return json({error:'Origin not allowed'},403);
  const data = await request.json();
  const user = await verifyTelegramInitData(data.initData, env.BOT_TOKEN);
  if (!user) return json({error:'Telegram authorization failed'},401);
  if (!data.items?.length) return json({error:'Корзина пуста'},400);
  
  const lines = data.items.map(i => `• ${esc(i.name)} × ${Number(i.qty)||1} — ${format((Number(i.price)||0)*(Number(i.qty)||1))}`).join('\n');
  const tgUser = [user.first_name,user.last_name].filter(Boolean).join(' ') || user.username || String(user.id);
  
  const text = `<b>🍰 Новый заказ — Медовый Дом</b>\n\n${lines}\n\n<b>Итого:</b> ${format(data.total)}\n\n<b>Клиент:</b> ${esc(data.name)}\n<b>Telegram:</b> ${esc(tgUser)}${user.username ? ` (@${esc(user.username)})` : ''}\n<b>ID:</b> <code>${user.id}</code>\n<b>Телефон:</b> ${esc(data.phone)}\n<b>Получение:</b> ${esc(data.method || 'Самовывоз')}${data.address ? `\n<b>Адрес:</b> ${esc(data.address)}` : ''}${data.date ? `\n<b>Дата:</b> ${esc(data.date)}` : ''}${data.comment ? `\n<b>Комментарий:</b> ${esc(data.comment)}` : ''}`;
  
  await tg(env,'sendMessage',{chat_id:env.ADMIN_CHAT_ID,text,parse_mode:'HTML'});
  return json({ok:true});
}

async function webhook(request, env) {
  const update = await request.json();
  const msg = update.message;
  if (msg?.chat?.id && (msg.text === '/start' || msg.text === '/id')) {
    await tg(env,'sendMessage',{chat_id:msg.chat.id,text:`Ваш Telegram chat ID: <code>${msg.chat.id}</code>\n\nЕсли это аккаунт владельца, укажите этот ID в секретe ADMIN_CHAT_ID.`,parse_mode:'HTML'});
  }
  return json({ok:true});
}

export default { 
  async fetch(request, env) { 
    try { 
      if(request.method==='OPTIONS') return new Response(null,{headers:cors}); 
      const u=new URL(request.url); 
      if(u.pathname==='/health') return json({ok:true}); 
      if(request.method==='POST'&&u.pathname==='/order') return order(request,env); 
      if(request.method==='POST'&&u.pathname==='/telegram-webhook') return webhook(request,env); 
      return json({error:'Not found'},404); 
    } catch(e) { 
      return json({error:e.message||'Server error'},500); 
    } 
  } 
};

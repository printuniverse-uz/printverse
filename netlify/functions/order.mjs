// Netlify Function: принимает заявку с формы сайта и отправляет её в Telegram-бот.
//
// ВАЖНО: секреты НЕ хранятся в этом файле. Задаются в панели Netlify:
//   Site configuration → Environment variables:
//     TELEGRAM_BOT_TOKEN — токен бота от @BotFather (вида 123456789:AA...)
//     TELEGRAM_CHAT_ID   — id чата, куда приходят заявки (ваш чат с ботом или группа)
//
// Файл кладётся в netlify/functions/order.mjs рядом с index.html.
// После деплоя доступен на сайте по адресу /api/order (см. config ниже).

export const config = { path: "/api/order" };

const MAX = 500; // максимальная длина поля

const clip = (s, n = MAX) => String(s ?? "").slice(0, n);

export default async (req) => {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  let d;
  try {
    d = await req.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // honeypot: скрытое поле формы заполняют только спам-боты
  if (clip(d.company)) return json({ ok: true });

  const name = clip(d.name).trim();
  const contact = clip(d.contact).trim();
  if (!name || !contact) return json({ ok: false, error: "empty" }, 400);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return json({ ok: false, error: "not_configured" }, 500);

  const text =
    "Новая заявка с сайта\n" +
    "Имя: " + name + "\n" +
    "Контакт: " + contact +
    (d.link ? "\nСсылка на модельку: " + clip(d.link) : "") +
    (d.desc ? "\nЗадача: " + clip(d.desc) : "") +
    (d.model ? "\nМодель из калькулятора: " + clip(d.model) : "");

  try {
    const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!r.ok) return json({ ok: false, error: "telegram_" + r.status }, 502);
  } catch {
    return json({ ok: false, error: "network" }, 502);
  }
  return json({ ok: true });
};

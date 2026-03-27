/**
 * Da Enzo – Telegram Benachrichtigungen
 * Mit Inline-Buttons für Bestätigung/Ablehnung
 * 
 * .env Variablen:
 *   TELEGRAM_BOT_TOKEN=7123456789:AAH...
 *   TELEGRAM_CHAT_IDS=109125703,ENZOS_ID  (komma-getrennt)
 */

const https = require('https');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '').split(',').map(s => s.trim()).filter(Boolean);

function isConfigured() {
  return !!(TELEGRAM_TOKEN && CHAT_IDS.length > 0);
}

/**
 * Telegram API Call
 */
function telegramApi(method, body) {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_TOKEN) return resolve({ ok: false, reason: 'kein Token' });

    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ ok: false, body }); }
      });
    });

    req.on('error', (err) => {
      console.error('[telegram]', err.message);
      resolve({ ok: false, error: err.message });
    });
    req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.write(data);
    req.end();
  });
}

/**
 * Nachricht an alle Chat-IDs senden
 */
async function sendToAll(text, reply_markup) {
  const results = [];
  for (const chatId of CHAT_IDS) {
    const body = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true };
    if (reply_markup) body.reply_markup = reply_markup;
    results.push(await telegramApi('sendMessage', body));
  }
  return results;
}

/**
 * Einzelne Nachricht senden (für Antworten auf Button-Klicks)
 */
async function sendMessage(chatId, text) {
  return telegramApi('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

/**
 * Nachricht bearbeiten (nach Button-Klick)
 */
async function editMessage(chatId, messageId, text) {
  return telegramApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  });
}

/**
 * Callback-Query beantworten (entfernt Ladekreis vom Button)
 */
async function answerCallback(callbackQueryId, text) {
  return telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });
}

/**
 * Neue Reservierung – mit Bestätigen/Ablehnen Buttons
 */
async function notifyReservation({ id, guest_name, guest_phone, guest_email, date, time, party_size, message }) {
  if (!isConfigured()) return;

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const d = new Date(date);
  const dayName = dayNames[d.getDay()];
  const dateStr = `${dayName}, ${d.toLocaleDateString('de-DE')}`;

  let text = `🍽 <b>Neue Reservierung!</b>\n\n`;
  text += `👤 ${guest_name}\n`;
  text += `📅 ${dateStr} um ${time} Uhr\n`;
  text += `👥 ${party_size} Person${party_size > 1 ? 'en' : ''}\n`;
  if (guest_phone) text += `📞 ${guest_phone}\n`;
  if (guest_email) text += `✉️ ${guest_email}\n`;
  if (message) text += `\n💬 <i>${message}</i>\n`;
  text += `\n⏳ Status: <b>Offen</b>`;

  const reply_markup = {
    inline_keyboard: [[
      { text: '✅ Bestätigen', callback_data: `res_confirm_${id}` },
      { text: '❌ Ablehnen', callback_data: `res_decline_${id}` },
    ]],
  };

  return sendToAll(text, reply_markup);
}

/**
 * Neue Bestellung
 */
async function notifyOrder({ guest_name, guest_phone, pickup_time, total, items }) {
  if (!isConfigured()) return;

  let text = `🛒 <b>Neue Bestellung!</b>\n\n`;
  text += `👤 ${guest_name}\n`;
  if (guest_phone) text += `📞 ${guest_phone}\n`;
  if (pickup_time) text += `🕐 Abholung: ${pickup_time}\n`;
  text += `💰 ${total?.toFixed(2).replace('.', ',')} €\n`;
  if (items && items.length > 0) {
    text += `\n📋 Bestellung:\n`;
    items.forEach(i => { text += `  • ${i.quantity}x ${i.name}\n`; });
  }

  return sendToAll(text);
}

/**
 * Webhook registrieren (einmalig aufrufen)
 */
async function setWebhook(url) {
  return telegramApi('setWebhook', { url, allowed_updates: ['callback_query'] });
}

/**
 * Callback-Query verarbeiten (von Webhook aufgerufen)
 */
async function handleCallback(callbackQuery, db) {
  const { id: queryId, data, from, message } = callbackQuery;

  // Format: res_confirm_123 oder res_decline_123
  const match = data.match(/^res_(confirm|decline)_(\d+)$/);
  if (!match) {
    await answerCallback(queryId, 'Unbekannte Aktion');
    return;
  }

  const [, action, resId] = match;
  const newStatus = action === 'confirm' ? 'confirmed' : 'declined';
  const statusText = action === 'confirm' ? '✅ Bestätigt' : '❌ Abgelehnt';
  const byName = from.first_name || 'Unbekannt';

  try {
    // Reservierung in DB aktualisieren
    const res = db.prepare('SELECT * FROM reservations WHERE id = ?').get(resId);
    if (!res) {
      await answerCallback(queryId, 'Reservierung nicht gefunden');
      return;
    }

    if (res.status !== 'pending') {
      await answerCallback(queryId, `Bereits ${res.status === 'confirmed' ? 'bestätigt' : 'bearbeitet'}`);
      // Nachricht trotzdem aktualisieren
      const updatedText = message.text.replace(/⏳ Status: .*/, `${statusText} von ${byName}`);
      await editMessage(message.chat.id, message.message_id, updatedText);
      return;
    }

    db.prepare('UPDATE reservations SET status = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, resId);

    // Button-Nachricht aktualisieren (Buttons entfernen, Status zeigen)
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const d = new Date(res.date);
    const dateStr = `${dayNames[d.getDay()]}, ${d.toLocaleDateString('de-DE')}`;

    let updatedText = `🍽 <b>Reservierung ${statusText}</b>\n\n`;
    updatedText += `👤 ${res.guest_name}\n`;
    updatedText += `📅 ${dateStr} um ${res.time} Uhr\n`;
    updatedText += `👥 ${res.party_size} Person${res.party_size > 1 ? 'en' : ''}\n`;
    if (res.guest_phone) updatedText += `📞 ${res.guest_phone}\n`;
    updatedText += `\n${statusText} von ${byName}`;

    await editMessage(message.chat.id, message.message_id, updatedText);
    await answerCallback(queryId, `${action === 'confirm' ? 'Bestätigt' : 'Abgelehnt'}!`);

    console.log(`[telegram] Reservierung #${resId} ${newStatus} von ${byName}`);
  } catch (err) {
    console.error('[telegram] Callback-Fehler:', err.message);
    await answerCallback(queryId, 'Fehler: ' + err.message);
  }
}

module.exports = {
  sendToAll, sendMessage, editMessage, answerCallback,
  notifyReservation, notifyOrder,
  setWebhook, handleCallback,
  isConfigured,
};
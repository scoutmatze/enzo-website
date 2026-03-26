/**
 * Da Enzo – Telegram Benachrichtigungen
 * 
 * .env Variablen:
 *   TELEGRAM_BOT_TOKEN=7123456789:AAH...
 *   TELEGRAM_CHAT_ID=982345678
 */

const https = require('https');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function isConfigured() {
  return !!(TELEGRAM_TOKEN && TELEGRAM_CHAT_ID);
}

/**
 * Sendet eine Nachricht über den Telegram Bot
 */
function sendMessage(text) {
  return new Promise((resolve, reject) => {
    if (!isConfigured()) {
      return resolve({ ok: false, reason: 'Telegram nicht konfiguriert' });
    }

    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
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
      console.error('[telegram] Fehler:', err.message);
      resolve({ ok: false, error: err.message });
    });

    req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.write(data);
    req.end();
  });
}

/**
 * Benachrichtigung bei neuer Reservierung
 */
async function notifyReservation({ guest_name, guest_phone, guest_email, date, time, party_size, message }) {
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
  text += `\n⏳ Status: <b>Offen</b> – bitte bestätigen`;

  return sendMessage(text);
}

/**
 * Benachrichtigung bei neuer Bestellung
 */
async function notifyOrder({ guest_name, guest_phone, pickup_time, total, items }) {
  let text = `🛒 <b>Neue Bestellung!</b>\n\n`;
  text += `👤 ${guest_name}\n`;
  if (guest_phone) text += `📞 ${guest_phone}\n`;
  if (pickup_time) text += `🕐 Abholung: ${pickup_time}\n`;
  text += `💰 ${total?.toFixed(2).replace('.', ',')} €\n`;
  if (items && items.length > 0) {
    text += `\n📋 Bestellung:\n`;
    items.forEach(i => { text += `  • ${i.quantity}x ${i.name}\n`; });
  }

  return sendMessage(text);
}

module.exports = { sendMessage, notifyReservation, notifyOrder, isConfigured };

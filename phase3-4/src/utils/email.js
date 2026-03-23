const nodemailer = require('nodemailer');

let transporter = null;

function initMail() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('  ℹ️  SMTP nicht konfiguriert – E-Mails werden übersprungen');
    return;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: { user, pass },
  });

  transporter.verify().then(() => {
    console.log('  ✅ SMTP verbunden: ' + host);
  }).catch(err => {
    console.error('  ❌ SMTP Fehler:', err.message);
    transporter = null;
  });
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter) return { sent: false, reason: 'SMTP nicht konfiguriert' };

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({ from, to, subject, text, html });
    return { sent: true };
  } catch (err) {
    console.error('[MAIL ERROR]', err.message);
    return { sent: false, reason: err.message };
  }
}

// Vorgefertigte E-Mail-Templates

async function sendReservationNotification(reservation) {
  const notifyEmail = process.env.NOTIFY_EMAIL || process.env.SMTP_USER;
  if (!notifyEmail) return;

  const d = new Date(reservation.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return sendMail({
    to: notifyEmail,
    subject: `🍽️ Neue Reservierung: ${reservation.guest_name} (${reservation.party_size} Pers.)`,
    text: `Neue Reservierung eingegangen!\n\nName: ${reservation.guest_name}\nDatum: ${d}\nUhrzeit: ${reservation.time}\nPersonen: ${reservation.party_size}\nTelefon: ${reservation.guest_phone || '–'}\nE-Mail: ${reservation.guest_email || '–'}\nWünsche: ${reservation.message || '–'}\n\nBitte im Backend bestätigen oder ablehnen.`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#B85A3A;margin-bottom:4px">🍽️ Neue Reservierung</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold;width:120px">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${reservation.guest_name}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">Datum</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${d}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">Uhrzeit</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${reservation.time} Uhr</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">Personen</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${reservation.party_size}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">Telefon</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${reservation.guest_phone || '–'}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">E-Mail</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${reservation.guest_email || '–'}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:bold">Wünsche</td><td style="padding:8px 12px;border-bottom:1px solid #eee">${reservation.message || '–'}</td></tr>
        </table>
        <p style="margin-top:16px;color:#635850;font-size:13px">Bitte im <a href="${process.env.ADMIN_URL || ''}/admin.html" style="color:#B85A3A">Backend</a> bestätigen oder ablehnen.</p>
      </div>
    `,
  });
}

async function sendInvoiceEmail({ to, invoiceNumber, customerName, total, pdfBuffer }) {
  if (!transporter) return { sent: false, reason: 'SMTP nicht konfiguriert' };

  return sendMail({
    to,
    subject: `Rechnung ${invoiceNumber} – Da Enzo`,
    text: `Sehr geehrte/r ${customerName},\n\nanbei erhalten Sie Ihre Rechnung ${invoiceNumber} über ${total}.\n\nVielen Dank für Ihr Vertrauen!\n\nMit freundlichen Grüßen\nDa Enzo – Caffé & Ristorante`,
    html: `
      <div style="font-family:sans-serif;max-width:500px">
        <h2 style="color:#B85A3A">Rechnung ${invoiceNumber}</h2>
        <p>Sehr geehrte/r ${customerName},</p>
        <p>anbei erhalten Sie Ihre Rechnung über <strong>${total}</strong>.</p>
        <p>Vielen Dank für Ihr Vertrauen!</p>
        <p style="color:#635850;margin-top:24px;font-size:13px">Da Enzo – Caffé & Ristorante<br>Zschokkestraße 34, 80686 München</p>
      </div>
    `,
  });
}

module.exports = { initMail, sendMail, sendReservationNotification, sendInvoiceEmail };

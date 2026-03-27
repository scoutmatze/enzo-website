const express = require('express');
const { getDb } = require('../db/init');
const { handleCallback, setWebhook, isConfigured } = require('../utils/telegram');

const router = express.Router();

// POST /api/telegram/webhook – Telegram Callback-Handler
router.post('/webhook', async (req, res) => {
  try {
    if (req.body.callback_query) {
      const db = getDb();
      await handleCallback(req.body.callback_query, db);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[telegram webhook]', err.message);
    res.json({ ok: true }); // Telegram erwartet immer 200
  }
});

// POST /api/telegram/setup – Webhook bei Telegram registrieren (einmalig)
router.post('/setup', async (req, res) => {
  try {
    const baseUrl = req.body.url || `https://da-enzo-muenchen.de`;
    const webhookUrl = `${baseUrl}/api/telegram/webhook`;
    const result = await setWebhook(webhookUrl);
    res.json({ message: 'Webhook registriert', url: webhookUrl, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
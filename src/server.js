require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const ZALO_ACCESS_TOKEN = process.env.ZALO_ACCESS_TOKEN;
const RECIPIENT_USER_ID = process.env.RECIPIENT_USER_ID;

const LUNCH_MESSAGE =
  process.env.LUNCH_MESSAGE ||
  'Em ơi, nhớ ăn cơm trưa và uống nước nha! 🍱💧 Anh nhắc em đó~ 💕';
const DINNER_MESSAGE =
  process.env.DINNER_MESSAGE ||
  'Em ơi, nhớ ăn tối và uống nước nha! 🍜💧 Anh thương em~ 💕';

const hasCredentials =
  ZALO_ACCESS_TOKEN &&
  ZALO_ACCESS_TOKEN !== 'your_access_token_here' &&
  RECIPIENT_USER_ID &&
  RECIPIENT_USER_ID !== 'her_zalo_user_id_here';

if (!hasCredentials) {
  console.warn('WARNING: Zalo credentials not configured. Reminders will not send.');
  console.warn('Copy .env.example to .env and fill in your credentials.');
}

let remindersEnabled = true;
const logs = [];
let lastManualSend = 0;

function now() {
  return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function hanoiDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
}

function nextOccurrence(hour, minute) {
  const hanoi = hanoiDate();
  const target = new Date(hanoi);
  target.setHours(hour, minute, 0, 0);
  if (hanoi >= target) target.setDate(target.getDate() + 1);
  const diffMs = target - hanoi;
  return { isoHanoi: target.toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }), diffMs };
}

async function sendZaloMessage(message, type) {
  if (!hasCredentials) {
    const entry = { time: now(), type, message, success: false, error: 'No credentials' };
    logs.unshift(entry);
    if (logs.length > 50) logs.splice(50);
    return { ok: false, error: 'No credentials configured' };
  }

  try {
    const response = await fetch('https://openapi.zalo.me/v2.0/oa/message/cs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: ZALO_ACCESS_TOKEN },
      body: JSON.stringify({
        recipient: { user_id: RECIPIENT_USER_ID },
        message: { text: message },
      }),
    });
    const data = await response.json();
    const success = data.error === 0;
    const entry = { time: now(), type, message, success, error: success ? null : data.message };
    logs.unshift(entry);
    if (logs.length > 50) logs.splice(50);
    console.log(`[${now()}] ${success ? 'Sent' : 'Failed'} ${type} reminder`);
    return { ok: success, error: success ? null : data.message };
  } catch (err) {
    const entry = { time: now(), type, message, success: false, error: err.message };
    logs.unshift(entry);
    if (logs.length > 50) logs.splice(50);
    return { ok: false, error: err.message };
  }
}

// Cron jobs — Hanoi timezone
const cronOpts = { timezone: 'Asia/Ho_Chi_Minh' };

cron.schedule('30 12 * * *', () => {
  if (remindersEnabled) sendZaloMessage(LUNCH_MESSAGE, 'lunch');
}, cronOpts);

cron.schedule('30 18 * * *', () => {
  if (remindersEnabled) sendZaloMessage(DINNER_MESSAGE, 'dinner');
}, cronOpts);

// API routes
app.get('/api/status', (req, res) => {
  const hanoi = hanoiDate();
  const lunch = nextOccurrence(12, 30);
  const dinner = nextOccurrence(18, 30);
  res.json({
    enabled: remindersEnabled,
    hasCredentials,
    currentHanoiTime: hanoi.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    nextLunch: lunch,
    nextDinner: dinner,
    lastSent: logs[0] || null,
  });
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: logs.slice(0, 20) });
});

app.post('/api/toggle', (req, res) => {
  remindersEnabled = !remindersEnabled;
  console.log(`[${now()}] Reminders ${remindersEnabled ? 'enabled' : 'disabled'}`);
  res.json({ enabled: remindersEnabled });
});

app.post('/api/send', async (req, res) => {
  const { type } = req.body;
  if (!['lunch', 'dinner'].includes(type)) {
    return res.status(400).json({ ok: false, error: 'type must be lunch or dinner' });
  }

  const now_ms = Date.now();
  if (now_ms - lastManualSend < 30000) {
    return res.status(429).json({ ok: false, error: 'Please wait 30 seconds between sends' });
  }
  lastManualSend = now_ms;

  const message = type === 'lunch' ? LUNCH_MESSAGE : DINNER_MESSAGE;
  const result = await sendZaloMessage(message, type);
  res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌸 Zalo Reminder Widget running at http://localhost:${PORT}`);
  console.log(`   Reminders scheduled at 12:30 PM and 6:30 PM Hanoi time`);
  console.log(`   Current Hanoi time: ${now()}\n`);
});

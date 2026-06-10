require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const NTFY_TOPIC = process.env.NTFY_TOPIC;

const LUNCH_MESSAGE =
  process.env.LUNCH_MESSAGE ||
  'Em ơi, nhớ ăn cơm trưa và uống nước nha! 🍱💧';
const DINNER_MESSAGE =
  process.env.DINNER_MESSAGE ||
  'Em ơi, nhớ ăn tối và uống nước nha! 🍜💧';

const hasCredentials = NTFY_TOPIC && NTFY_TOPIC !== 'your-secret-topic-here';

if (!hasCredentials) {
  console.warn('WARNING: NTFY_TOPIC not set. Copy .env.example to .env and set it.');
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
  return { diffMs: target - hanoi };
}

async function sendNotification(message, type) {
  const title = type === 'lunch' ? 'An trua nha em!' : 'An toi nha em!';

  if (!hasCredentials) {
    logs.unshift({ time: now(), type, message, success: false, error: 'No topic set' });
    if (logs.length > 50) logs.splice(50);
    return { ok: false, error: 'NTFY_TOPIC not configured' };
  }

  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': 'default',
        'Tags': type === 'lunch' ? 'bento' : 'ramen',
      },
      body: message,
    });

    const success = res.ok;
    logs.unshift({ time: now(), type, message, success, error: success ? null : `HTTP ${res.status}` });
    if (logs.length > 50) logs.splice(50);
    console.log(`[${now()}] ${success ? 'Sent' : 'Failed'} ${type} reminder`);
    return { ok: success, error: success ? null : `HTTP ${res.status}` };
  } catch (err) {
    logs.unshift({ time: now(), type, message, success: false, error: err.message });
    if (logs.length > 50) logs.splice(50);
    return { ok: false, error: err.message };
  }
}

// Cron jobs — Hanoi timezone
const cronOpts = { timezone: 'Asia/Ho_Chi_Minh' };

cron.schedule('30 12 * * *', () => {
  if (remindersEnabled) sendNotification(LUNCH_MESSAGE, 'lunch');
}, cronOpts);

cron.schedule('30 18 * * *', () => {
  if (remindersEnabled) sendNotification(DINNER_MESSAGE, 'dinner');
}, cronOpts);

// API
app.get('/api/status', (req, res) => {
  res.json({
    enabled: remindersEnabled,
    hasCredentials,
    ntfyTopic: hasCredentials ? NTFY_TOPIC : null,
    currentHanoiTime: hanoiDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    nextLunch: nextOccurrence(12, 30),
    nextDinner: nextOccurrence(18, 30),
    lastSent: logs[0] || null,
  });
});

app.get('/api/logs', (req, res) => {
  res.json({ logs: logs.slice(0, 20) });
});

app.post('/api/toggle', (req, res) => {
  remindersEnabled = !remindersEnabled;
  res.json({ enabled: remindersEnabled });
});

app.post('/api/send', async (req, res) => {
  const { type } = req.body;
  if (!['lunch', 'dinner'].includes(type)) {
    return res.status(400).json({ ok: false, error: 'type must be lunch or dinner' });
  }
  if (Date.now() - lastManualSend < 30000) {
    return res.status(429).json({ ok: false, error: 'Wait 30 seconds between sends' });
  }
  lastManualSend = Date.now();
  const message = type === 'lunch' ? LUNCH_MESSAGE : DINNER_MESSAGE;
  res.json(await sendNotification(message, type));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌸 Reminder Widget → http://localhost:${PORT}`);
  console.log(`   12:30 PM & 6:30 PM Hanoi time`);
  console.log(`   Current Hanoi time: ${now()}\n`);
});

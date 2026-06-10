require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const NTFY_TOPIC = process.env.NTFY_TOPIC;
const LUNCH_MESSAGE = process.env.LUNCH_MESSAGE || 'Cục cưng ơiiii, nhớ ăn trưa và uống nước đầy đủ đấy nhé <3';
const DINNER_MESSAGE = process.env.DINNER_MESSAGE || 'Cục cưng ơiiii, nhớ ăn tối và uống nước đầy đủ đấy nhé <3';

const hasCredentials = NTFY_TOPIC && NTFY_TOPIC !== 'your-secret-topic-here';
if (!hasCredentials) console.warn('WARNING: NTFY_TOPIC not set. Copy .env.example to .env and set it.');

// ── Persistence ──
const DATA_FILE = path.join(__dirname, '../data/scheduled.json');
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function loadScheduled() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; }
}
function saveScheduled(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

let scheduled = loadScheduled();
let remindersEnabled = true;
const logs = [];
let lastManualSend = 0;

// ── Helpers ──
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
function addLog(type, message, success, error = null) {
  logs.unshift({ time: now(), type, message, success, error });
  if (logs.length > 50) logs.splice(50);
}

// ── Send text ──
async function sendNotification(message, type, title = null) {
  const titles = { lunch: 'An trua nha em!', dinner: 'An toi nha em!', custom: 'Tu anh!', scheduled: 'Tu anh!' };
  if (!hasCredentials) { addLog(type, message, false, 'No topic set'); return { ok: false, error: 'NTFY_TOPIC not configured' }; }
  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': title || titles[type] || 'Tu anh!' },
      body: message,
    });
    const success = res.ok;
    addLog(type, message, success, success ? null : `HTTP ${res.status}`);
    console.log(`[${now()}] ${success ? 'Sent' : 'Failed'} ${type}`);
    return { ok: success };
  } catch (err) {
    addLog(type, message, false, err.message);
    return { ok: false, error: err.message };
  }
}

// ── Send image buffer ──
async function sendImage(buffer, mimetype, filename, caption) {
  if (!hasCredentials) return { ok: false, error: 'NTFY_TOPIC not configured' };
  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Title': caption || 'Tu anh!',
        'Filename': filename || 'image.jpg',
        'Content-Type': mimetype || 'image/jpeg',
      },
      body: buffer,
    });
    const success = res.ok;
    addLog('image', caption || filename || 'image', success, success ? null : `HTTP ${res.status}`);
    return { ok: success };
  } catch (err) {
    addLog('image', filename || 'image', false, err.message);
    return { ok: false, error: err.message };
  }
}

// ── Cron: scheduled reminders ──
const cronOpts = { timezone: 'Asia/Ho_Chi_Minh' };
cron.schedule('30 12 * * *', () => { if (remindersEnabled) sendNotification(LUNCH_MESSAGE, 'lunch'); }, cronOpts);
cron.schedule('30 18 * * *', () => { if (remindersEnabled) sendNotification(DINNER_MESSAGE, 'dinner'); }, cronOpts);

// ── Cron: check scheduled messages every minute ──
cron.schedule('* * * * *', () => {
  const hanoiNow = hanoiDate();
  const nowMin = new Date(hanoiNow);
  nowMin.setSeconds(0, 0);

  scheduled = loadScheduled();
  let changed = false;

  for (const item of scheduled) {
    if (item.sent) continue;
    const itemTime = new Date(item.sendAt);
    // fire if within the current minute
    if (Math.abs(itemTime - nowMin) < 60000) {
      sendNotification(item.message, 'scheduled');
      item.sent = true;
      changed = true;
      console.log(`[${now()}] Fired scheduled message: ${item.message}`);
    }
  }

  // prune sent items older than 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const before = scheduled.length;
  scheduled = scheduled.filter(s => !s.sent || new Date(s.sendAt) > cutoff);
  if (changed || scheduled.length !== before) saveScheduled(scheduled);
}, { timezone: 'Asia/Ho_Chi_Minh' });

// ── API ──
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

app.get('/api/logs', (req, res) => res.json({ logs: logs.slice(0, 20) }));

app.post('/api/toggle', (req, res) => {
  remindersEnabled = !remindersEnabled;
  res.json({ enabled: remindersEnabled });
});

app.post('/api/send', async (req, res) => {
  const { type } = req.body;
  if (!['lunch', 'dinner'].includes(type)) return res.status(400).json({ ok: false, error: 'Invalid type' });
  if (Date.now() - lastManualSend < 30000) return res.status(429).json({ ok: false, error: 'Wait 30 seconds' });
  lastManualSend = Date.now();
  const message = type === 'lunch' ? LUNCH_MESSAGE : DINNER_MESSAGE;
  res.json(await sendNotification(message, type));
});

app.post('/api/message', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ ok: false, error: 'Empty message' });
  if (!hasCredentials) return res.status(503).json({ ok: false, error: 'NTFY_TOPIC not configured' });
  res.json(await sendNotification(message.trim(), 'custom'));
});

// ── Scheduled messages ──
app.get('/api/scheduled', (req, res) => {
  res.json({ scheduled: scheduled.filter(s => !s.sent).sort((a, b) => new Date(a.sendAt) - new Date(b.sendAt)) });
});

app.post('/api/scheduled', (req, res) => {
  const { message, sendAt } = req.body;
  if (!message?.trim()) return res.status(400).json({ ok: false, error: 'Empty message' });
  if (!sendAt) return res.status(400).json({ ok: false, error: 'Missing sendAt' });

  const item = { id: Date.now().toString(), message: message.trim(), sendAt, sent: false, createdAt: now() };
  scheduled.push(item);
  saveScheduled(scheduled);
  res.json({ ok: true, item });
});

app.delete('/api/scheduled/:id', (req, res) => {
  scheduled = scheduled.filter(s => s.id !== req.params.id);
  saveScheduled(scheduled);
  res.json({ ok: true });
});

// ── Photo upload ──
app.post('/api/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file' });
  const caption = req.body.caption || 'Tu anh!';
  res.json(await sendImage(req.file.buffer, req.file.mimetype, req.file.originalname, caption));
});

// ── Drawing (receives PNG blob) ──
app.post('/api/drawing', express.raw({ type: 'image/png', limit: '5mb' }), async (req, res) => {
  if (!req.body?.length) return res.status(400).json({ ok: false, error: 'No drawing data' });
  res.json(await sendImage(req.body, 'image/png', 'drawing.png', 'Ve cho em ne!'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌸 Reminder Widget → http://localhost:${PORT}`);
  console.log(`   12:30 PM & 6:30 PM Hanoi time | Current: ${now()}\n`);

  // Self-ping every 14 minutes to prevent Railway free tier from sleeping
  const APP_URL = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : null;

  if (APP_URL) {
    setInterval(() => {
      fetch(`${APP_URL}/api/status`)
        .then(() => console.log(`[${now()}] Keepalive ping OK`))
        .catch(err => console.warn(`[${now()}] Keepalive failed: ${err.message}`));
    }, 14 * 60 * 1000);
    console.log(`   Keepalive enabled → ${APP_URL}`);
  }
});

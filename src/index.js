// Headless version (no web UI). Use `npm start` for the widget instead.
require('dotenv').config();
const cron = require('node-cron');
const fetch = require('node-fetch');

const NTFY_TOPIC = process.env.NTFY_TOPIC;
const LUNCH_MESSAGE = process.env.LUNCH_MESSAGE || 'Cục cưng ơiiii, nhớ ăn trưa và uống nước đầy đủ đấy nhé <3';
const DINNER_MESSAGE = process.env.DINNER_MESSAGE || 'Cục cưng ơiiii, nhớ ăn tối và uống nước đầy đủ đấy nhé <3';

if (!NTFY_TOPIC || NTFY_TOPIC === 'your-secret-topic-here') {
  console.error('ERROR: Set NTFY_TOPIC in your .env file.');
  process.exit(1);
}

function now() {
  return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });
}

async function send(message, title) {
  const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: title },
    body: message,
  });
  console.log(`[${now()}] ${res.ok ? 'Sent' : 'Failed'}: ${title}`);
}

const opts = { timezone: 'Asia/Ho_Chi_Minh' };
cron.schedule('30 12 * * *', () => send(LUNCH_MESSAGE, 'An trua nha em!'), opts);
cron.schedule('30 18 * * *', () => send(DINNER_MESSAGE, 'An toi nha em!'), opts);

console.log(`Bot started. Current Hanoi time: ${now()}`);

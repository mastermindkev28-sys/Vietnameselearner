require('dotenv').config();
const cron = require('node-cron');
const fetch = require('node-fetch');

const ZALO_ACCESS_TOKEN = process.env.ZALO_ACCESS_TOKEN;
const RECIPIENT_USER_ID = process.env.RECIPIENT_USER_ID;

const LUNCH_MESSAGE =
  process.env.LUNCH_MESSAGE ||
  'Em ơi, nhớ ăn cơm trưa và uống nước nha! 🍱💧 Anh nhắc em đó~ 💕';
const DINNER_MESSAGE =
  process.env.DINNER_MESSAGE ||
  'Em ơi, nhớ ăn tối và uống nước nha! 🍜💧 Anh thương em~ 💕';

if (!ZALO_ACCESS_TOKEN || ZALO_ACCESS_TOKEN === 'your_access_token_here') {
  console.error('ERROR: ZALO_ACCESS_TOKEN is not set in your .env file.');
  console.error('See README.md for setup instructions.');
  process.exit(1);
}

if (!RECIPIENT_USER_ID || RECIPIENT_USER_ID === 'her_zalo_user_id_here') {
  console.error('ERROR: RECIPIENT_USER_ID is not set in your .env file.');
  console.error('Run: node src/setup.js  to find the user ID.');
  process.exit(1);
}

async function sendZaloMessage(message) {
  const url = 'https://openapi.zalo.me/v2.0/oa/message/cs';

  const body = {
    recipient: { user_id: RECIPIENT_USER_ID },
    message: { text: message },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: ZALO_ACCESS_TOKEN,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error !== 0) {
      console.error(`[${now()}] Failed to send message:`, data);
    } else {
      console.log(`[${now()}] Message sent successfully: "${message}"`);
    }
  } catch (err) {
    console.error(`[${now()}] Network error:`, err.message);
  }
}

function now() {
  return new Date().toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// 12:30 PM Hanoi time (UTC+7) = cron schedule in server's local time
// We schedule using Hanoi timezone via TZ offset awareness
// node-cron supports timezone option directly
const options = { timezone: 'Asia/Ho_Chi_Minh' };

// 12:30 PM every day
cron.schedule('30 12 * * *', () => {
  console.log(`[${now()}] Sending lunch reminder...`);
  sendZaloMessage(LUNCH_MESSAGE);
}, options);

// 6:30 PM every day
cron.schedule('30 18 * * *', () => {
  console.log(`[${now()}] Sending dinner reminder...`);
  sendZaloMessage(DINNER_MESSAGE);
}, options);

console.log('Zalo reminder bot started!');
console.log('Scheduled reminders (Hanoi time):');
console.log('  - 12:30 PM: Lunch & water reminder');
console.log('  - 6:30 PM:  Dinner & water reminder');
console.log(`Current Hanoi time: ${now()}`);

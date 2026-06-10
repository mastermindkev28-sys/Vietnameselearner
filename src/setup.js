/**
 * Test your ntfy setup by sending a test notification right now.
 * Usage: node src/setup.js
 */
require('dotenv').config();
const fetch = require('node-fetch');

const NTFY_TOPIC = process.env.NTFY_TOPIC;

if (!NTFY_TOPIC || NTFY_TOPIC === 'your-secret-topic-here') {
  console.log('=== SETUP ===\n');
  console.log('1. Pick a secret topic name, e.g.: bao-nho-an-com-abc123');
  console.log('2. Copy .env.example → .env and set NTFY_TOPIC=your-topic');
  console.log('3. She installs the ntfy app (iOS/Android)');
  console.log('4. She subscribes to your topic in the app');
  console.log('5. Run this script to send a test notification\n');
  process.exit(0);
}

async function test() {
  console.log(`Sending test notification to topic: ${NTFY_TOPIC} ...`);
  const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Test tu anh!' },
    body: 'Nếu em thấy tin này là ổn rồi nha! 🌸',
  });
  if (res.ok) {
    console.log('✅ Sent! Check her phone.');
  } else {
    console.error('❌ Failed:', res.status, await res.text());
  }
}

test();

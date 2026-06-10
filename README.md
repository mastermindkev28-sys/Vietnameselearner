# Zalo Daily Reminder Bot

Sends your girlfriend two daily reminders via Zalo to drink water and eat her meals.

- **12:30 PM** Hanoi time — lunch + water reminder
- **6:30 PM** Hanoi time — dinner + water reminder

---

## Setup (15 minutes)

### Step 1: Create a Zalo Official Account (OA)

You need a Zalo OA to send messages programmatically.

1. Go to [https://oa.zalo.me/](https://oa.zalo.me/) and create a free OA
2. Choose **Personal** type — no business verification needed for personal use

### Step 2: Get your Access Token

1. Go to [https://developers.zalo.me/tools/explorer](https://developers.zalo.me/tools/explorer)
2. Log in with your Zalo account
3. Select your OA
4. Click **"Get Access Token"** and copy the token

> Note: Free OA tokens expire every 90 days. You'll need to refresh them periodically.

### Step 3: Get your girlfriend's User ID

1. Ask her to **search for and follow** your OA on Zalo
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Paste your access token into `.env`
4. Run the setup script:
   ```bash
   npm install
   node src/setup.js
   ```
5. Copy her User ID from the output into `.env`

### Step 4: Run the bot

```bash
npm start
```

Keep it running (e.g., on your computer, a Raspberry Pi, or a free cloud server).

---

## Running 24/7 (Recommended)

### Option A: Free cloud server (Railway / Render)

1. Push this repo to GitHub
2. Deploy to [Railway](https://railway.app/) or [Render](https://render.com/) for free
3. Set environment variables in the platform dashboard

### Option B: Your own computer

Use `pm2` to keep it running:

```bash
npm install -g pm2
pm2 start src/index.js --name zalo-reminder
pm2 save
pm2 startup
```

---

## Customize Messages

Edit these in your `.env` file:

```env
LUNCH_MESSAGE=Em ơi, nhớ ăn cơm trưa và uống nước nha! 🍱💧 Anh nhắc em đó~ 💕
DINNER_MESSAGE=Em ơi, nhớ ăn tối và uống nước nha! 🍜💧 Anh thương em~ 💕
```

---

## Files

```
├── src/
│   ├── index.js    # Main bot — runs the cron schedule
│   └── setup.js    # Helper to find girlfriend's User ID
├── .env.example    # Template for your credentials
├── .env            # Your actual credentials (never commit this!)
└── package.json
```

# Daily Reminder Bot 💕

Sends your girlfriend two phone notifications per day to eat and drink water.

- **12:30 PM** Hanoi time — lunch reminder
- **6:30 PM** Hanoi time — dinner reminder

Uses [ntfy.sh](https://ntfy.sh) — free, no account needed.

---

## Setup (5 minutes)

### Step 1: Pick a secret topic name

Think of any random string, e.g. `bao-nho-an-com-abc123`.  
Keep it hard to guess — anyone who knows it can send to it.

### Step 2: Configure

```bash
cp .env.example .env
# Edit .env and set: NTFY_TOPIC=bao-nho-an-com-abc123
```

### Step 3: She installs ntfy

- **Android**: [Play Store — ntfy](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
- **iOS**: [App Store — ntfy](https://apps.apple.com/app/ntfy/id1625396347)

She opens the app → **+** → enter your topic name → Subscribe.

### Step 4: Test it

```bash
npm install
node src/setup.js
```

She should get a test notification instantly. ✅

### Step 5: Run the widget

```bash
npm start
# Open http://localhost:3000
```

---

## Running 24/7

### Railway (free)

1. Push to GitHub
2. Deploy on [railway.app](https://railway.app)
3. Add `NTFY_TOPIC` as an environment variable

### Your own machine with pm2

```bash
npm install -g pm2
pm2 start src/server.js --name reminder
pm2 save && pm2 startup
```

---

## Customize messages

In `.env`:
```env
LUNCH_MESSAGE=Em ơi, nhớ ăn cơm trưa và uống nước nha! 🍱💧
DINNER_MESSAGE=Em ơi, nhớ ăn tối và uống nước nha! 🍜💧
```

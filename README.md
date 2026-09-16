# Family Stock Checker

A simple Progressive Web App for a small family (3 members) to track food inventory and expiry dates. Take a photo of a product label — the app reads the product name and expiry date automatically.

**No servers to pay for, no logins, no tokens on your phone.** The app is hosted on GitHub Pages; data lives in `data/inventory.json` in this repo; saving goes through a tiny free Google Apps Script so everyone in the family can save; and the script emails everyone **N days before items expire**.

## Features

- 📷 One-photo scanning: product name + expiry date via OCR (Tesseract.js, runs in browser)
- 🔴🟡🟢 Expiry status colors + in-app alerts + browser notifications
- 👨‍👩‍👧 Shared by 3 family members — each picks their name, no passwords, no tokens
- ☁️ Data stored in `data/inventory.json` in this repo (every change is a git commit — full history for free)
- 📧 Daily email digest of items expiring within N days (Google Apps Script)
- 📱 Installable as a PWA (Add to Home Screen)
- 🔔 Reminder via native calendar (Google Calendar / iOS .ics)

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Tesseract.js (client-side OCR)
- GitHub Pages (hosting) + GitHub Contents API (storage, via Apps Script proxy)
- Google Apps Script (free save-server + daily email reminders)

## Setup

### 1. Deploy the app (owner, one-time)

- Push this repo to GitHub
- Repo **Settings → Pages → Source: GitHub Actions** — the included workflow deploys on every push to `main`
- App URL: `https://mzf3334-dev.github.io/familystocker/`

### 2. Create ONE GitHub token (owner, one-time)

- Go to https://github.com/settings/personal-access-tokens/new
- Repository access: **Only select repositories** → `familystocker`
- Permissions: **Contents → Read and write**
- Copy the token — it goes *inside the script* (step 3), never on any phone

### 3. Create the save-server + reminders (owner, one-time)

- Open https://script.google.com → **New project**
- Paste the code from **`google-apps-script/Code.gs`** (in this repo)
- In the CONFIG section at the top: fill in **MEMBERS** (names + emails) and set **REMINDER_DAYS** (e.g. `3` = email 3 days before expiry)
- Project Settings (⚙️) → **Script Properties** → add `GITHUB_TOKEN` = the token from step 2
- **Deploy → New deployment → Web app** → Execute as: **Me**, Access: **Anyone** → copy the URL (ends in `/exec`)
- Paste that URL into `src/config.ts` (`APPS_SCRIPT_URL`) and push — or each member can paste it in the app's Settings instead
- In the editor, run **`setupDailyTrigger`** once to enable the daily 8:00 reminder emails

### 4. Family members (per phone, ~30 seconds)

- Open the app URL, tap your name
- If the owner didn't bake the server URL into `src/config.ts`: go to **Settings → Family Server**, paste the URL, tap **Test** then **Save**
- (iOS Safari: Share → Add to Home Screen to install)

That's it — saving and reminders just work for everyone.

## Development

```bash
npm install
npm run dev
```

## Data format

`data/inventory.json`:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Oat Milk",
      "chineseName": "燕麦奶",
      "expiryDate": "2026-12-31",
      "addedBy": "Tony",
      "createdAt": "2026-09-16T10:00:00Z"
    }
  ]
}
```

## License

MIT License

## Author

Tony Mo - https://github.com/tonymo2024

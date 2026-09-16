# Family Stock Checker

A simple Progressive Web App for a small family (3 members) to track food inventory and expiry dates. Take a photo of a product label — the app reads the product name and expiry date automatically.

**No backend. No database. No server costs.** Data lives in a JSON file inside this GitHub repo, and the app is hosted on GitHub Pages for free.

## Features

- 📷 One-photo scanning: product name + expiry date via OCR (Tesseract.js, runs in browser)
- 🔴🟡🟢 Expiry status colors + in-app alerts + browser notifications
- 👨‍👩‍👧 Shared by 3 family members — each picks their name, no passwords
- ☁️ Data stored in `data/inventory.json` in this repo (every change is a git commit — full history for free)
- 📱 Installable as a PWA (Add to Home Screen)
- 🔔 Reminder via native calendar (Google Calendar / iOS .ics)

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- Tesseract.js (client-side OCR)
- GitHub Pages (hosting) + GitHub Contents API (storage)

## Setup (one-time)

1. **Create a fine-grained Personal Access Token:**
   - Go to https://github.com/settings/personal-access-tokens/new
   - Repository access: **Only select repositories** → `FamilyStockChecker`
   - Permissions: **Contents → Read and write**
   - Copy the token (starts with `github_pat_`)

2. **Deploy the app:**
   - Push this repo to GitHub
   - GitHub Actions automatically builds and deploys to Pages on every push to `main`
   - In repo Settings → Pages, set Source to **GitHub Actions**

3. **Each family member (one-time on their phone):**
   - Open the app URL: `https://mzf3334-dev.github.io/familystocker/`
   - Tap their name
   - Go to Settings → paste their GitHub token → Save
   - (iOS Safari: Share → Add to Home Screen to install)

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

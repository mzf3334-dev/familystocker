# Family Stock Checker

A Progressive Web Application (PWA) to help families track food inventory and expiry dates in real-time.

## Features

- Mobile-First Design
- OCR Scanner for product recognition
- Family Sharing capabilities
- Real-time cloud sync with Firebase
- Multi-language support (English, Traditional/Simplified Chinese)

## Tech Stack

- Frontend: React 19 + TypeScript
- Build Tool: Vite
- Styling: Tailwind CSS
- OCR Engine: Tesseract.js
- Backend: Firebase (Firestore, Auth, Hosting)
- Icons: Lucide React
- Date management: date-fns

## Getting Started

### Installation

```bash
git clone https://github.com/tonymo2024/FamilyStockChecker.git
cd FamilyStockChecker
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:5173

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/     # React components
├── context/        # Auth context
├── pages/          # Page components
├── services/       # Firebase and OCR services
├── types/          # TypeScript definitions
└── utils/          # Utility functions
```

## Firebase Setup

1. Create a Firebase project
2. Enable Firestore and Google Auth
3. Create .env with your Firebase configuration

## Deployment

```bash
npm run build
firebase deploy
```

## License

MIT License

## Author

Tony Mo - https://github.com/tonymo2024

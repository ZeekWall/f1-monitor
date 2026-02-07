# When is the race?

Compact web app that shows the next Formula 1 race weekend sessions in the user's local timezone.

## Features
- Finds the next upcoming race weekend from the current season.
- Shows all available sessions (practice, sprint-related sessions, qualifying, race).
- Supports `12h` / `24h` time display toggle (saved in browser).
- Uses color-coded session types with status badges (`completed`, `upcoming`, `next`).

## Requirements
- Node.js 20+

## Run locally
```bash
cd /home/zwall/apps/f1-monitor
npm test
npm start
```

Open `http://localhost:3000`.

## API
- `GET /api/next-race`
- Optional cache refresh: `GET /api/next-race?refresh=1`

## Deploy to Vercel
This repo includes `vercel.json` with explicit routing for static assets and serverless API functions.

1. Import the repo in Vercel.
2. No build command is required.
3. Deploy.

After deploy, verify:
- `/` renders the UI.
- `/api/next-race` returns JSON.

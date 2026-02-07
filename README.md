# F1 Monitor

Simple web app that shows the next Formula 1 race weekend sessions in the user's local timezone.

## Features
- Finds the next upcoming race weekend from the current season.
- Shows all available sessions (practice, sprint-related sessions, qualifying, race).
- Converts all UTC session times to browser local timezone.
- Shows session status: `completed`, `upcoming`, `next`.

## Requirements
- Node.js 20+

## Run Locally
```bash
cd /home/zwall/apps/f1-monitor
npm test
npm start
```

Then open:
- `http://localhost:3000`

## API
`GET /api/next-race`

Optional cache-busting refresh:
`GET /api/next-race?refresh=1`

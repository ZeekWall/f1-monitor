# F1 Monitor Plan

## Goal
Build a simple web app that shows the next Formula 1 race weekend sessions (practice, sprint, qualifying, race) in the user’s local timezone.

## Scope
- Show only the **next upcoming race weekend**.
- Include all available sessions for that weekend:
  - Practice 1, Practice 2, Practice 3
  - Sprint Shootout / Sprint Qualifying (if present)
  - Sprint (if present)
  - Qualifying
  - Race
- Automatically display times in the viewer’s local timezone.

## Technical Approach
1. **Frontend stack**
- Use a lightweight Next.js app (App Router) for simple deployment and server/client boundaries.

2. **Data source**
- Use a public F1 schedule API with UTC timestamps (example: Ergast-compatible sources or another stable endpoint).
- Add a server-side fetch wrapper so the browser never depends directly on third-party API quirks.

3. **Upcoming race selection**
- Fetch current season schedule.
- Determine the next race by comparing `race date/time` with current UTC time.
- Return full weekend session data for that race.

4. **Timezone conversion**
- Keep canonical times in UTC.
- Convert on client using `Intl.DateTimeFormat` with the browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- Display timezone abbreviation and offset in UI.

5. **UI**
- Header: app name + detected timezone.
- Event card: Grand Prix name, circuit, country.
- Session list: each session name + local date/time.
- Status badge per session (`completed`, `upcoming`, `next`).

6. **Error/empty states**
- API unavailable: show clear retry message.
- Off-season/no event found: show fallback message.
- Missing session fields: hide unavailable sessions gracefully.

7. **Caching and refresh**
- Server route cache for a short TTL (e.g., 10–30 minutes).
- Client refresh button to re-fetch manually.

## Implementation Steps
1. Scaffold app in `f1-monitor/`.
2. Add typed schedule model and API adapter.
3. Implement next-race selector and session normalizer.
4. Build API route `/api/next-race`.
5. Build UI page consuming that route.
6. Add local timezone formatting utilities.
7. Add loading, error, and off-season states.
8. Add basic tests for:
- next-race selection logic
- session sorting
- timezone formatting utility behavior
9. Add README with setup/run/deploy instructions.

## Acceptance Criteria
- App always shows the **next race weekend** (not past events).
- All available sessions for that weekend are listed.
- Every displayed session time is in the user’s local timezone.
- App handles missing/failed data with clear UI messaging.
- Core date-selection logic is covered by tests.

## Nice-to-Have (After MVP)
- Countdown timer to next session.
- 12h/24h user toggle.
- "Add to calendar" links per session.
- PWA support for quick mobile access.

function getLocalTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const CLOCK_STORAGE_KEY = 'when-is-race-24h';
let use24HourClock = false;
let lastRaceData = null;

function loadClockPreference() {
  try {
    return localStorage.getItem(CLOCK_STORAGE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function saveClockPreference() {
  try {
    localStorage.setItem(CLOCK_STORAGE_KEY, use24HourClock ? '1' : '0');
  } catch (error) {
    // Ignore storage errors and keep in-memory preference.
  }
}

function updateClockToggleLabel() {
  const button = document.getElementById('clockToggle');
  if (!button) {
    return;
  }
  button.textContent = use24HourClock ? '24h On' : '24h Off';
  button.setAttribute('aria-pressed', String(use24HourClock));
}

function formatLocalTime(isoUtc, timeZone) {
  const date = new Date(isoUtc);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour12: !use24HourClock,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

function getLocalDayKey(isoUtc, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(isoUtc));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatLocalDayLabel(isoUtc, timeZone) {
  const date = new Date(isoUtc);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function classifySessions(sessions) {
  const now = Date.now();
  let nextAssigned = false;

  return sessions.map((session) => {
    const timeMs = new Date(session.utcTime).getTime();
    let status = 'upcoming';

    if (timeMs < now) {
      status = 'completed';
    } else if (!nextAssigned) {
      status = 'next';
      nextAssigned = true;
    }

    return {
      ...session,
      status
    };
  });
}

function getSessionTypeClass(session) {
  if (session.key === 'Race') {
    return 'session-type-race';
  }
  if (session.key === 'Qualifying') {
    return 'session-type-qualifying';
  }
  if (session.key.startsWith('Sprint')) {
    return 'session-type-sprint';
  }
  if (session.key.includes('Practice')) {
    return 'session-type-practice';
  }
  return 'session-type-other';
}

function render(nextRace) {
  lastRaceData = nextRace;
  const timezoneEl = document.getElementById('timezone');
  const statusEl = document.getElementById('status');
  const eventEl = document.getElementById('event');
  const raceNameEl = document.getElementById('raceName');
  const locationEl = document.getElementById('location');
  const sessionsEl = document.getElementById('sessions');

  updateClockToggleLabel();
  const timezone = getLocalTimezone();
  timezoneEl.textContent = `Local timezone: ${timezone}`;

  if (!nextRace) {
    statusEl.textContent = 'No upcoming race weekend found.';
    eventEl.classList.add('hidden');
    return;
  }

  statusEl.textContent = '';
  eventEl.classList.remove('hidden');

  raceNameEl.textContent = nextRace.raceName;
  locationEl.textContent = [nextRace.circuitName, nextRace.locality, nextRace.country]
    .filter(Boolean)
    .join(' • ');

  sessionsEl.innerHTML = '';
  const grouped = new Map();
  for (const session of classifySessions(nextRace.sessions)) {
    const dayKey = getLocalDayKey(session.utcTime, timezone);
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, {
        label: formatLocalDayLabel(session.utcTime, timezone),
        sessions: []
      });
    }
    grouped.get(dayKey).sessions.push(session);
  }

  for (const group of grouped.values()) {
    const dayGroup = document.createElement('li');
    dayGroup.className = 'day-group';
    if (group.sessions.length === 1 && group.sessions[0].key === 'Race') {
      dayGroup.classList.add('race-only-day');
    }

    const heading = document.createElement('h3');
    heading.className = 'day-heading';
    heading.textContent = group.label;

    const daySessions = document.createElement('div');
    daySessions.className = 'day-sessions';

    for (const session of group.sessions) {
      const row = document.createElement('div');
      row.className = `session-row ${getSessionTypeClass(session)}`;

      const meta = document.createElement('div');
      meta.className = 'session-meta';

      const name = document.createElement('div');
      name.className = 'session-name';
      name.textContent = session.name;

      const time = document.createElement('div');
      time.className = 'session-time';
      time.textContent = formatLocalTime(session.utcTime, timezone);

      const badge = document.createElement('span');
      badge.className = `badge ${session.status}`;
      badge.textContent = session.status;

      meta.append(name, time);
      row.append(meta, badge);
      daySessions.append(row);
    }

    dayGroup.append(heading, daySessions);
    sessionsEl.append(dayGroup);
  }
}

async function loadData(forceRefresh = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = 'Loading race weekend...';

  try {
    const suffix = forceRefresh ? '?refresh=1' : '';
    const response = await fetch(`/api/next-race${suffix}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('API returned non-JSON response. Check that /api/next-race is deployed.');
    }
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Unknown API error');
    }

    render(payload.data);
  } catch (error) {
    statusEl.textContent = `Could not load schedule: ${error.message}`;
    document.getElementById('event').classList.add('hidden');
  }
}

document.getElementById('refreshButton').addEventListener('click', () => {
  loadData(true);
});

document.getElementById('clockToggle').addEventListener('click', () => {
  use24HourClock = !use24HourClock;
  saveClockPreference();
  updateClockToggleLabel();
  if (lastRaceData) {
    render(lastRaceData);
  }
});

use24HourClock = loadClockPreference();
updateClockToggleLabel();
loadData();

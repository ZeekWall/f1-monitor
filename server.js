const http = require('http');
const fs = require('fs');
const path = require('path');
const { pickNextRaceWeekend } = require('./lib/race-utils');

const PORT = Number(process.env.PORT || 3000);
const API_URL = 'https://api.jolpi.ca/ergast/f1/current.json';
const CACHE_TTL_MS = 15 * 60 * 1000;

const cache = {
  value: null,
  expiresAt: 0
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filepath, contentType) {
  try {
    const content = fs.readFileSync(filepath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    sendJson(res, 404, { error: 'Not found' });
  }
}

function normalizeResponse(selection) {
  if (!selection) {
    return null;
  }

  const { race, sessions } = selection;

  return {
    season: race.season,
    round: race.round,
    raceName: race.raceName,
    circuitName: race.Circuit?.circuitName || null,
    locality: race.Circuit?.Location?.locality || null,
    country: race.Circuit?.Location?.country || null,
    sessions
  };
}

async function fetchNextRaceData(forceRefresh = false) {
  const nowMs = Date.now();
  if (!forceRefresh && cache.value && nowMs < cache.expiresAt) {
    return cache.value;
  }

  const response = await fetch(API_URL, {
    headers: {
      'User-Agent': 'f1-monitor/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Schedule request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const races = payload?.MRData?.RaceTable?.Races;

  if (!Array.isArray(races)) {
    throw new Error('Unexpected schedule response shape');
  }

  const next = normalizeResponse(pickNextRaceWeekend(races));

  cache.value = next;
  cache.expiresAt = nowMs + CACHE_TTL_MS;

  return next;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === '/api/next-race') {
    try {
      const forceRefresh = requestUrl.searchParams.get('refresh') === '1';
      const nextRace = await fetchNextRaceData(forceRefresh);

      if (!nextRace) {
        sendJson(res, 404, { error: 'No upcoming race weekend found for current season.' });
        return;
      }

      sendJson(res, 200, {
        fetchedAtUtc: new Date().toISOString(),
        data: nextRace
      });
      return;
    } catch (error) {
      sendJson(res, 502, {
        error: 'Failed to fetch F1 schedule data.',
        details: error.message
      });
      return;
    }
  }

  if (requestUrl.pathname === '/app.js') {
    sendFile(res, path.join(__dirname, 'public', 'app.js'), 'text/javascript; charset=utf-8');
    return;
  }

  if (requestUrl.pathname === '/styles.css') {
    sendFile(res, path.join(__dirname, 'public', 'styles.css'), 'text/css; charset=utf-8');
    return;
  }

  if (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html') {
    sendFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html; charset=utf-8');
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`F1 Monitor running at http://127.0.0.1:${PORT}`);
});

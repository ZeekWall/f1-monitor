const { pickNextRaceWeekend } = require('./race-utils');

const API_URL = 'https://api.jolpi.ca/ergast/f1/current.json';
const CACHE_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;

const cache = {
  hasValue: false,
  value: null,
  expiresAt: 0
};

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

async function fetchNextRaceData(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  const fetchImpl = options.fetchImpl || fetch;

  const nowMs = Date.now();
  if (!forceRefresh && cache.hasValue && nowMs < cache.expiresAt) {
    return cache.value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetchImpl(API_URL, {
      headers: {
        'User-Agent': 'f1-monitor/1.0'
      },
      signal: controller.signal
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Schedule request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Schedule request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const races = payload?.MRData?.RaceTable?.Races;

  if (!Array.isArray(races)) {
    throw new Error('Unexpected schedule response shape');
  }

  const next = normalizeResponse(pickNextRaceWeekend(races));

  cache.hasValue = true;
  cache.value = next;
  cache.expiresAt = nowMs + CACHE_TTL_MS;

  return next;
}

module.exports = {
  fetchNextRaceData
};

const test = require('node:test');
const assert = require('node:assert/strict');

function loadService() {
  const servicePath = require.resolve('../lib/schedule-service');
  delete require.cache[servicePath];
  return require('../lib/schedule-service');
}

function makeScheduleResponse(races) {
  return {
    ok: true,
    json: async () => ({
      MRData: {
        RaceTable: {
          Races: races
        }
      }
    })
  };
}

test('fetchNextRaceData normalizes selected race response', async () => {
  const { fetchNextRaceData } = loadService();

  const races = [
    {
      season: '2026',
      round: '4',
      raceName: 'Future GP',
      date: '2099-04-20',
      time: '12:00:00Z',
      FirstPractice: { date: '2099-04-18', time: '10:00:00Z' },
      Circuit: {
        circuitName: 'Future Circuit',
        Location: { locality: 'Future City', country: 'Futureland' }
      }
    }
  ];

  const data = await fetchNextRaceData({
    fetchImpl: async () => makeScheduleResponse(races)
  });

  assert.equal(data.raceName, 'Future GP');
  assert.equal(data.circuitName, 'Future Circuit');
  assert.equal(data.locality, 'Future City');
  assert.equal(data.country, 'Futureland');
  assert.deepEqual(data.sessions.map((s) => s.name), ['Practice 1', 'Race']);
});

test('fetchNextRaceData caches null offseason responses', async () => {
  const { fetchNextRaceData } = loadService();
  let calls = 0;

  const pastOnly = [
    {
      season: '2001',
      round: '1',
      raceName: 'Past GP',
      date: '2001-03-10',
      time: '12:00:00Z',
      FirstPractice: { date: '2001-03-08', time: '10:00:00Z' }
    }
  ];

  const fetchImpl = async () => {
    calls += 1;
    return makeScheduleResponse(pastOnly);
  };

  const first = await fetchNextRaceData({ fetchImpl });
  const second = await fetchNextRaceData({ fetchImpl });

  assert.equal(first, null);
  assert.equal(second, null);
  assert.equal(calls, 1);
});

test('fetchNextRaceData forceRefresh bypasses cache', async () => {
  const { fetchNextRaceData } = loadService();
  let calls = 0;

  const races = [
    {
      season: '2026',
      round: '4',
      raceName: 'Future GP',
      date: '2099-04-20',
      time: '12:00:00Z',
      FirstPractice: { date: '2099-04-18', time: '10:00:00Z' }
    }
  ];

  const fetchImpl = async () => {
    calls += 1;
    return makeScheduleResponse(races);
  };

  await fetchNextRaceData({ fetchImpl });
  await fetchNextRaceData({ forceRefresh: true, fetchImpl });

  assert.equal(calls, 2);
});

test('fetchNextRaceData throws for non-OK response', async () => {
  const { fetchNextRaceData } = loadService();

  await assert.rejects(
    () =>
      fetchNextRaceData({
        fetchImpl: async () => ({ ok: false, status: 503 })
      }),
    /status 503/
  );
});

test('fetchNextRaceData throws for invalid payload shape', async () => {
  const { fetchNextRaceData } = loadService();

  await assert.rejects(
    () =>
      fetchNextRaceData({
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ MRData: { RaceTable: {} } })
        })
      }),
    /Unexpected schedule response shape/
  );
});

test('fetchNextRaceData maps AbortError to timeout message', async () => {
  const { fetchNextRaceData } = loadService();

  await assert.rejects(
    () =>
      fetchNextRaceData({
        fetchImpl: async () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          throw error;
        }
      }),
    /timed out/
  );
});

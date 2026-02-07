const test = require('node:test');
const assert = require('node:assert/strict');
const { extractSessions, pickNextRaceWeekend, toIsoUtc } = require('../lib/race-utils');

test('toIsoUtc returns ISO timestamp in UTC', () => {
  const actual = toIsoUtc('2026-03-15', '14:00:00Z');
  assert.equal(actual, '2026-03-15T14:00:00.000Z');
});

test('toIsoUtc throws on invalid date values', () => {
  assert.throws(() => toIsoUtc('not-a-date', '14:00:00Z'), /Invalid time value/);
});

test('extractSessions includes known sessions sorted by time and race', () => {
  const race = {
    date: '2026-05-10',
    time: '13:00:00Z',
    FirstPractice: { date: '2026-05-08', time: '11:30:00Z' },
    Qualifying: { date: '2026-05-09', time: '14:00:00Z' },
    Sprint: { date: '2026-05-09', time: '10:00:00Z' }
  };

  const sessions = extractSessions(race);

  assert.deepEqual(
    sessions.map((s) => s.name),
    ['Practice 1', 'Sprint', 'Qualifying', 'Race']
  );
});

test('extractSessions defaults missing time fields to midnight UTC', () => {
  const race = {
    date: '2026-05-10',
    FirstPractice: { date: '2026-05-08' }
  };

  const sessions = extractSessions(race);
  assert.equal(sessions[0].utcTime, '2026-05-08T00:00:00.000Z');
  assert.equal(sessions[1].utcTime, '2026-05-10T00:00:00.000Z');
});

test('extractSessions includes sprint variants and preserves chronological order', () => {
  const race = {
    date: '2026-10-11',
    time: '13:00:00Z',
    SprintShootout: { date: '2026-10-10', time: '09:00:00Z' },
    SprintQualifying: { date: '2026-10-10', time: '09:30:00Z' },
    Sprint: { date: '2026-10-10', time: '13:00:00Z' },
    Qualifying: { date: '2026-10-09', time: '15:00:00Z' }
  };

  const sessions = extractSessions(race);

  assert.deepEqual(
    sessions.map((s) => s.name),
    ['Qualifying', 'Sprint Shootout', 'Sprint Qualifying', 'Sprint', 'Race']
  );
});

test('pickNextRaceWeekend returns first race whose weekend has not fully ended', () => {
  const races = [
    {
      raceName: 'Past GP',
      date: '2026-04-01',
      time: '12:00:00Z',
      FirstPractice: { date: '2026-03-30', time: '10:00:00Z' }
    },
    {
      raceName: 'Upcoming GP',
      date: '2026-04-20',
      time: '12:00:00Z',
      FirstPractice: { date: '2026-04-18', time: '10:00:00Z' }
    }
  ];

  const selected = pickNextRaceWeekend(races, new Date('2026-04-05T00:00:00Z'));

  assert.equal(selected.race.raceName, 'Upcoming GP');
  assert.equal(selected.sessions[selected.sessions.length - 1].name, 'Race');
});

test('pickNextRaceWeekend includes race when now equals final session time', () => {
  const races = [
    {
      raceName: 'Boundary GP',
      date: '2026-06-01',
      time: '12:00:00Z',
      FirstPractice: { date: '2026-05-30', time: '10:00:00Z' }
    }
  ];

  const selected = pickNextRaceWeekend(races, new Date('2026-06-01T12:00:00Z'));
  assert.equal(selected.race.raceName, 'Boundary GP');
});

test('pickNextRaceWeekend skips races with no valid sessions', () => {
  const races = [
    {
      raceName: 'Broken GP'
    },
    {
      raceName: 'Valid GP',
      date: '2026-08-12',
      time: '12:00:00Z',
      FirstPractice: { date: '2026-08-10', time: '10:00:00Z' }
    }
  ];

  const selected = pickNextRaceWeekend(races, new Date('2026-08-01T00:00:00Z'));
  assert.equal(selected.race.raceName, 'Valid GP');
});

test('pickNextRaceWeekend returns null when all races are complete', () => {
  const races = [
    {
      raceName: 'Past GP',
      date: '2026-04-01',
      time: '12:00:00Z',
      FirstPractice: { date: '2026-03-30', time: '10:00:00Z' }
    }
  ];

  const selected = pickNextRaceWeekend(races, new Date('2026-04-05T00:00:00Z'));
  assert.equal(selected, null);
});

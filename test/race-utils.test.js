const test = require('node:test');
const assert = require('node:assert/strict');
const { extractSessions, pickNextRaceWeekend, toIsoUtc } = require('../lib/race-utils');

test('toIsoUtc returns ISO timestamp in UTC', () => {
  const actual = toIsoUtc('2026-03-15', '14:00:00Z');
  assert.equal(actual, '2026-03-15T14:00:00.000Z');
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

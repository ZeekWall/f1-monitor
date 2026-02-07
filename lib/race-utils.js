const SESSION_FIELD_MAP = [
  { field: 'FirstPractice', label: 'Practice 1' },
  { field: 'SecondPractice', label: 'Practice 2' },
  { field: 'ThirdPractice', label: 'Practice 3' },
  { field: 'SprintShootout', label: 'Sprint Shootout' },
  { field: 'SprintQualifying', label: 'Sprint Qualifying' },
  { field: 'Sprint', label: 'Sprint' },
  { field: 'Qualifying', label: 'Qualifying' }
];

function toIsoUtc(date, time) {
  if (!date) {
    return null;
  }

  const normalizedTime = time || '00:00:00Z';
  return new Date(`${date}T${normalizedTime}`).toISOString();
}

function extractSessions(race) {
  const sessions = [];

  for (const definition of SESSION_FIELD_MAP) {
    const raw = race[definition.field];
    if (!raw || !raw.date) {
      continue;
    }

    sessions.push({
      key: definition.field,
      name: definition.label,
      utcTime: toIsoUtc(raw.date, raw.time)
    });
  }

  if (race.date) {
    sessions.push({
      key: 'Race',
      name: 'Race',
      utcTime: toIsoUtc(race.date, race.time)
    });
  }

  sessions.sort((a, b) => new Date(a.utcTime).getTime() - new Date(b.utcTime).getTime());
  return sessions;
}

function pickNextRaceWeekend(races, now = new Date()) {
  if (!Array.isArray(races) || races.length === 0) {
    return null;
  }

  const nowMs = now.getTime();

  for (const race of races) {
    const sessions = extractSessions(race);
    if (sessions.length === 0) {
      continue;
    }

    const raceEndMs = new Date(sessions[sessions.length - 1].utcTime).getTime();
    if (raceEndMs >= nowMs) {
      return {
        race,
        sessions
      };
    }
  }

  return null;
}

module.exports = {
  extractSessions,
  pickNextRaceWeekend,
  toIsoUtc
};

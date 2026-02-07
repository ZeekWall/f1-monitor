const { fetchNextRaceData } = require('../lib/schedule-service');

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  try {
    const forceRefresh = req.query?.refresh === '1';
    const nextRace = await fetchNextRaceData({ forceRefresh });

    if (!nextRace) {
      sendJson(res, 404, { error: 'No upcoming race weekend found for current season.' });
      return;
    }

    sendJson(res, 200, {
      fetchedAtUtc: new Date().toISOString(),
      data: nextRace
    });
  } catch (error) {
    sendJson(res, 502, {
      error: 'Failed to fetch F1 schedule data.',
      details: error.message
    });
  }
};

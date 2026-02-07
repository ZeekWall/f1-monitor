const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchNextRaceData } = require('./lib/schedule-service');

const PORT = Number(process.env.PORT || 3000);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

function sendFile(res, filepath, contentType) {
  try {
    const content = fs.readFileSync(filepath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(content);
  } catch (error) {
    sendJson(res, 404, { error: 'Not found' });
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, 'http://localhost');

  if (requestUrl.pathname === '/api/next-race') {
    try {
      const forceRefresh = requestUrl.searchParams.get('refresh') === '1';
      const nextRace = await fetchNextRaceData({ forceRefresh });

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
      const payload = { error: 'Failed to fetch F1 schedule data.' };
      if (process.env.NODE_ENV !== 'production') {
        payload.details = error.message;
      }
      sendJson(res, 502, payload);
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
  console.log(`When is the race? running at http://127.0.0.1:${PORT}`);
});

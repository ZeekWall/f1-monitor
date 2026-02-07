const test = require('node:test');
const assert = require('node:assert/strict');

function loadApiHandler(fetchNextRaceData) {
  const servicePath = require.resolve('../lib/schedule-service');
  const handlerPath = require.resolve('../api/next-race');

  delete require.cache[servicePath];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: { fetchNextRaceData }
  };

  delete require.cache[handlerPath];
  return require('../api/next-race');
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(payload) {
      this.body = payload;
    }
  };
}

test('api handler returns 200 with race payload', async () => {
  const expected = { raceName: 'Test GP', sessions: [] };
  const handler = loadApiHandler(async () => expected);
  const req = { query: {} };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  const payload = JSON.parse(res.body);
  assert.deepEqual(payload.data, expected);
  assert.equal(typeof payload.fetchedAtUtc, 'string');
});

test('api handler returns 404 when no upcoming race exists', async () => {
  const handler = loadApiHandler(async () => null);
  const req = { query: {} };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  const payload = JSON.parse(res.body);
  assert.match(payload.error, /No upcoming race weekend/);
});

test('api handler returns 502 when schedule service throws', async () => {
  const handler = loadApiHandler(async () => {
    throw new Error('boom');
  });
  const req = { query: {} };
  const res = createMockRes();

  await handler(req, res);

  assert.equal(res.statusCode, 502);
  const payload = JSON.parse(res.body);
  assert.equal(payload.error, 'Failed to fetch F1 schedule data.');
  assert.equal(payload.details, 'boom');
});

test('api handler hides internal error details in production', async () => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const handler = loadApiHandler(async () => {
    throw new Error('boom');
  });
  const req = { query: {} };
  const res = createMockRes();

  try {
    await handler(req, res);
  } finally {
    process.env.NODE_ENV = previousEnv;
  }

  assert.equal(res.statusCode, 502);
  const payload = JSON.parse(res.body);
  assert.equal(payload.error, 'Failed to fetch F1 schedule data.');
  assert.equal(payload.details, undefined);
});

test('api handler forwards refresh=1 as forceRefresh=true', async () => {
  let observedOptions = null;
  const handler = loadApiHandler(async (options) => {
    observedOptions = options;
    return { raceName: 'Test GP', sessions: [] };
  });

  const req = { query: { refresh: '1' } };
  const res = createMockRes();
  await handler(req, res);

  assert.equal(observedOptions.forceRefresh, true);
});

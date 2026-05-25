'use strict';

const assert = require('assert');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { createServer } = require('../server');
const { UrlStore } = require('../lib/url-store');
const { DAY_IN_MS, getNextUtcMidnightDelay } = require('../lib/url-cleanup');

function request(port, options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        method: options.method,
        path: options.path,
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function startTestServer(dataFilePath) {
  const server = await createServer({ dataFilePath });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    port: address.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

test('accepts valid URLs and rejects malformed input', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'url-shortener-'));
  const dataFilePath = path.join(tempDir, 'urls.json');
  const server = await startTestServer(dataFilePath);

  try {
    const valid = await request(
      server.port,
      {
        method: 'POST',
        path: '/shorten',
        headers: {
          'content-type': 'application/json',
        },
      },
      JSON.stringify({
        longUrl: 'https://example.com/articles/1',
        alias: 'custom-code-attempt',
      }),
    );

    assert.equal(valid.statusCode, 201);

    const payload = JSON.parse(valid.body);
    assert.equal(payload.longUrl, 'https://example.com/articles/1');
    assert.match(payload.shortUrl, /^http:\/\/127\.0\.0\.1:\d+\/[0-9A-Za-z]{7}$/);
    assert.equal(payload.code.length, 7);

    const invalid = await request(
      server.port,
      {
        method: 'POST',
        path: '/shorten',
        headers: {
          'content-type': 'application/json',
        },
      },
      JSON.stringify({
        longUrl: 'not-a-url',
      }),
    );

    assert.equal(invalid.statusCode, 400);
  } finally {
    await server.close();
  }
});

test('redirects known codes and returns not found for missing codes', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'url-shortener-'));
  const dataFilePath = path.join(tempDir, 'urls.json');
  const server = await startTestServer(dataFilePath);

  try {
    const createResponse = await request(
      server.port,
      {
        method: 'POST',
        path: '/shorten',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
      },
      'longUrl=https%3A%2F%2Fexample.com%2Fdestination',
    );

    assert.equal(createResponse.statusCode, 201);
    const { code, shortUrl } = JSON.parse(createResponse.body);

    const redirect = await request(server.port, {
      method: 'GET',
      path: `/${code}`,
    });

    assert.equal(redirect.statusCode, 302);
    assert.equal(redirect.headers.location, 'https://example.com/destination');

    const missing = await request(server.port, {
      method: 'GET',
      path: '/missing-code',
    });

    assert.equal(missing.statusCode, 404);
    assert.ok(shortUrl.includes(code));
  } finally {
    await server.close();
  }
});

test('persists mappings across a restart with creation timestamps', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'url-shortener-'));
  const dataFilePath = path.join(tempDir, 'urls.json');

  const firstServer = await startTestServer(dataFilePath);

  let code;
  try {
    const response = await request(
      firstServer.port,
      {
        method: 'POST',
        path: '/shorten',
        headers: {
          'content-type': 'application/json',
        },
      },
      JSON.stringify({
        longUrl: 'https://example.com/persisted',
      }),
    );

    assert.equal(response.statusCode, 201);
    code = JSON.parse(response.body).code;
  } finally {
    await firstServer.close();
  }

  const secondServer = await startTestServer(dataFilePath);
  try {
    const redirect = await request(secondServer.port, {
      method: 'GET',
      path: `/${code}`,
    });

    assert.equal(redirect.statusCode, 302);
    assert.equal(redirect.headers.location, 'https://example.com/persisted');

    const saved = JSON.parse(await fs.readFile(dataFilePath, 'utf8'));
    assert.equal(saved[code].longUrl, 'https://example.com/persisted');
    assert.match(saved[code].createdAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await secondServer.close();
  }
});

test('expires mappings after 90 days during startup cleanup', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'url-shortener-'));
  const dataFilePath = path.join(tempDir, 'urls.json');
  const expiredAt = new Date(Date.now() - 91 * DAY_IN_MS).toISOString();

  await fs.writeFile(
    dataFilePath,
    JSON.stringify(
      {
        expiredcode: {
          longUrl: 'https://example.com/expired',
          createdAt: expiredAt,
        },
      },
      null,
      2,
    ),
  );

  const server = await startTestServer(dataFilePath);

  try {
    const redirect = await request(server.port, {
      method: 'GET',
      path: '/expiredcode',
    });

    assert.equal(redirect.statusCode, 404);

    const saved = JSON.parse(await fs.readFile(dataFilePath, 'utf8'));
    assert.equal(Object.keys(saved).length, 0);
  } finally {
    await server.close();
  }
});

test('cleanup removes expired and legacy mappings while keeping fresh ones', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'url-shortener-'));
  const dataFilePath = path.join(tempDir, 'urls.json');
  const store = new UrlStore(dataFilePath);
  const now = Date.UTC(2026, 4, 25, 12, 0, 0, 0);
  const freshCreatedAt = new Date(now - 7 * DAY_IN_MS).toISOString();
  const expiredCreatedAt = new Date(now - 91 * DAY_IN_MS).toISOString();

  await fs.writeFile(
    dataFilePath,
    JSON.stringify(
      {
        freshcode: {
          longUrl: 'https://example.com/fresh',
          createdAt: freshCreatedAt,
        },
        stalelegacy: 'https://example.com/legacy',
        expiredcode: {
          longUrl: 'https://example.com/expired',
          createdAt: expiredCreatedAt,
        },
      },
      null,
      2,
    ),
  );

  await store.load();
  const deleted = await store.deleteExpiredRecords(now);

  assert.equal(deleted, 2);
  assert.equal(store.get('freshcode'), 'https://example.com/fresh');
  assert.equal(store.get('stalelegacy'), null);
  assert.equal(store.get('expiredcode'), null);

  const saved = JSON.parse(await fs.readFile(dataFilePath, 'utf8'));
  assert.deepEqual(Object.keys(saved), ['freshcode']);
  assert.equal(saved.freshcode.longUrl, 'https://example.com/fresh');
  assert.equal(saved.freshcode.createdAt, freshCreatedAt);
});

test('schedules cleanup at the next UTC midnight', () => {
  const delay = getNextUtcMidnightDelay(new Date(Date.UTC(2026, 4, 25, 23, 15, 0, 0)));
  assert.equal(delay, 45 * 60 * 1000);
});

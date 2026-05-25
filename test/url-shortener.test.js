'use strict';

const assert = require('assert');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { createServer } = require('../server');

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

test('persists mappings across a restart', async () => {
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
    assert.equal(saved[code], 'https://example.com/persisted');
  } finally {
    await secondServer.close();
  }
});

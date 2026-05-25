'use strict';

const http = require('http');
const path = require('path');

const { reserveUniqueShortCode } = require('./lib/code-generator');
const { UrlStore } = require('./lib/url-store');
const { scheduleDailyUtcCleanup } = require('./lib/url-cleanup');
const { isValidHttpUrl } = require('./lib/url-validation');

function defaultDataFilePath() {
  return path.join(__dirname, 'data', 'urls.json');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  });
  res.end(`${JSON.stringify(payload)}\n`);
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    'content-type': 'text/plain; charset=utf-8',
  });
  res.end(`${body}\n`);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', reject);
  });
}

function extractLongUrl(rawBody, contentType) {
  const body = rawBody.trim();

  if (!body) {
    return null;
  }

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(body);
      return parsed.longUrl || parsed.url || parsed.long_url || null;
    } catch {
      return null;
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(body);
    return params.get('longUrl') || params.get('url') || params.get('long_url');
  }

  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === 'object') {
      return parsed.longUrl || parsed.url || parsed.long_url || null;
    }
  } catch {
    // Fall through to treat the body as a raw URL.
  }

  if (body.includes('=')) {
    const params = new URLSearchParams(body);
    const candidate = params.get('longUrl') || params.get('url') || params.get('long_url');
    if (candidate) {
      return candidate;
    }
  }

  return body;
}

function buildShortUrl(req, code) {
  const host = req.headers.host || 'localhost:3000';
  return `http://${host}/${code}`;
}

function createRequestHandler(store) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'POST' && url.pathname === '/shorten') {
        const contentType = String(req.headers['content-type'] || '').toLowerCase();
        const rawBody = await readRequestBody(req);
        const longUrl = extractLongUrl(rawBody, contentType);

        if (!isValidHttpUrl(longUrl)) {
          sendJson(res, 400, { error: 'A valid http or https URL is required.' });
          return;
        }

        const code = await reserveUniqueShortCode(store, longUrl);
        sendJson(res, 201, {
          code,
          longUrl,
          shortUrl: buildShortUrl(req, code),
        });
        return;
      }

      if (req.method === 'GET' && url.pathname.length > 1) {
        const code = decodeURIComponent(url.pathname.slice(1));
        const longUrl = store.get(code);

        if (!longUrl) {
          sendText(res, 404, 'Not found');
          return;
        }

        res.writeHead(302, {
          location: longUrl,
        });
        res.end();
        return;
      }

      sendText(res, 404, 'Not found');
    } catch (error) {
      sendJson(res, 500, {
        error: 'Internal server error',
      });
    }
  };
}

async function createServer(options = {}) {
  const app = await createApplication(options);
  return app.server;
}

async function createApplication(options = {}) {
  const store = new UrlStore(options.dataFilePath || defaultDataFilePath());
  await store.load();
  await store.deleteExpiredRecords();

  return {
    store,
    server: http.createServer(createRequestHandler(store)),
  };
}

async function start() {
  const port = Number(process.env.PORT || '3000');
  const app = await createApplication();
  const cleanupJob = scheduleDailyUtcCleanup(app.store, {
    onError(error) {
      process.stderr.write(
        `${error.stack || error.message || 'Expiration cleanup failed'}\n`,
      );
    },
  });
  const server = app.server;

  server.on('close', () => {
    cleanupJob.cancel();
  });

  server.listen(port, () => {
    process.stdout.write(`Listening on port ${port}\n`);
  });

  return server;
}

if (require.main === module) {
  start().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  createApplication,
  createServer,
  createRequestHandler,
  start,
};

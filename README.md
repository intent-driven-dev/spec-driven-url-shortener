# Spec-Driven URL Shortener

Minimal dependency-free Node.js URL shortener.

## Requirements

- Node.js 18 or newer

## Install

No packages are required. The project uses only built-in Node.js APIs.

## Run

```bash
npm start
```

By default the server listens on `PORT=3000` and stores URL mappings in `data/urls.json`.
Each mapping is persisted with a creation timestamp and expires 90 days after it is created.
The server runs an asynchronous cleanup job once per day on the UTC schedule and performs an initial cleanup during startup.

## Test

```bash
npm test
```

## API

### `POST /shorten`

Accepts a long URL in JSON, form-encoded, or plain-text request bodies.

Example:

```bash
curl -X POST http://localhost:3000/shorten \
  -H 'content-type: application/json' \
  -d '{"longUrl":"https://example.com"}'
```

### `GET /:code`

Redirects with `302 Found` to the original long URL.

Expired mappings are removed from storage and return `404 Not found`.

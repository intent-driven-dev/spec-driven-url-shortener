## Why

We need a minimal end-to-end URL shortener slice that proves the core product loop: a user submits a valid long URL, receives a short URL on our domain, and can visit that short URL to be redirected to the original destination.

This first slice intentionally excludes accounts, custom aliases, expiration, abuse controls, and link management so we can validate the core redirect behavior with the smallest possible surface area.

## What Changes

- Add an anonymous shortening flow that accepts a syntactically valid long URL and returns a generated short URL.
- Add redirect handling for short URLs so visiting `/<code>` sends the browser to the original long URL.
- Use automatically generated short codes only.
- Keep links permanent for now.
- Accept valid URL syntax without checking reachability.
- Use flexible redirects for the first slice rather than hard permanent-redirect semantics.
- Expose only the two core code endpoints:
  - `POST /shorten`
  - `GET /:code`
- Exclude user accounts, custom aliases, expiration, rate limiting, duplicate suppression, and listing/status pages from this change.

## Capabilities

### New Capabilities
- `url-shortening`: anonymous URL submission, short-code generation, and redirect resolution for the first slice.

### Modified Capabilities
- 

## Impact

This will affect the HTTP server routing, URL validation logic, code generation/storage for short links, redirect responses, and the test suite. The implementation should stay dependency-free and use built-in Node.js APIs only.

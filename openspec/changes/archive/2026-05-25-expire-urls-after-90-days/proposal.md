## Why

The current URL shortener preserves mappings indefinitely, which conflicts with the new retention rule. We need a bounded lifecycle so every URL is removed after 90 days and stale mappings do not remain in storage.

## What Changes

- **BREAKING**: Existing short URLs will expire and be deleted from storage after 90 days from their creation time.
- Add an asynchronous cleanup process that runs daily in UTC and removes expired mappings.
- Persist creation timestamps for new URL mappings so expiration is deterministic.
- Migrate legacy mappings without creation timestamps so they are removed by cleanup instead of becoming permanent exceptions.
- Keep the public shortening and redirect endpoints unchanged.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `url-shortening`: change the link lifecycle from permanent retention to 90-day expiration with daily UTC cleanup.

## Impact

HTTP server startup and background scheduling, file-backed URL storage format, redirect lookup behavior after cleanup, migration handling for existing data, and the test suite.

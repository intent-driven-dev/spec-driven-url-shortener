## 1. Storage and Expiration Data

- [x] 1.1 Extend URL records to persist creation timestamps alongside long URLs, while keeping legacy records loadable.
- [x] 1.2 Add store helpers to identify and delete records that are 90 days old or older using UTC timestamps.
- [x] 1.3 Make the store save the post-cleanup state atomically after expired records are removed.

## 2. Cleanup Scheduling

- [x] 2.1 Add an asynchronous expiration cleanup job that runs on a daily UTC schedule.
- [x] 2.2 Run an initial cleanup pass on startup so already-expired legacy mappings are removed before the server serves traffic.
- [x] 2.3 Keep the cleanup logic isolated from request handling so redirects and shorten requests stay simple.

## 3. API Behavior and Migration

- [x] 3.1 Update `POST /shorten` to store the creation timestamp for each new URL mapping.
- [x] 3.2 Ensure `GET /:code` returns not found once an expired mapping has been deleted.
- [x] 3.3 Purge legacy mappings without creation metadata during the first cleanup run after deployment.

## 4. Tests and Documentation

- [x] 4.1 Add tests for expiring a mapping after 90 days and verifying the redirect no longer works.
- [x] 4.2 Add tests for daily cleanup behavior and legacy record migration.
- [x] 4.3 Update the README to describe the 90-day expiration policy and UTC cleanup behavior.
- [x] 4.4 Run the full test suite and confirm the change passes.

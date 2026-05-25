## 1. Storage and Expiration Data

- [ ] 1.1 Extend URL records to persist creation timestamps alongside long URLs, while keeping legacy records loadable.
- [ ] 1.2 Add store helpers to identify and delete records that are 90 days old or older using UTC timestamps.
- [ ] 1.3 Make the store save the post-cleanup state atomically after expired records are removed.

## 2. Cleanup Scheduling

- [ ] 2.1 Add an asynchronous expiration cleanup job that runs on a daily UTC schedule.
- [ ] 2.2 Run an initial cleanup pass on startup so already-expired legacy mappings are removed before the server serves traffic.
- [ ] 2.3 Keep the cleanup logic isolated from request handling so redirects and shorten requests stay simple.

## 3. API Behavior and Migration

- [ ] 3.1 Update `POST /shorten` to store the creation timestamp for each new URL mapping.
- [ ] 3.2 Ensure `GET /:code` returns not found once an expired mapping has been deleted.
- [ ] 3.3 Purge legacy mappings without creation metadata during the first cleanup run after deployment.

## 4. Tests and Documentation

- [ ] 4.1 Add tests for expiring a mapping after 90 days and verifying the redirect no longer works.
- [ ] 4.2 Add tests for daily cleanup behavior and legacy record migration.
- [ ] 4.3 Update the README to describe the 90-day expiration policy and UTC cleanup behavior.
- [ ] 4.4 Run the full test suite and confirm the change passes.

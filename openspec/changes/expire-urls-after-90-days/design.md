## Context

The project is a dependency-free Node.js URL shortener that currently stores code-to-URL mappings in a local JSON file. The server handles `POST /shorten` for creation and `GET /:code` for redirects. Today, mappings are preserved indefinitely.

The requested change introduces a fixed retention window: every mapping must expire 90 days after creation, and cleanup must run asynchronously on a daily UTC schedule.

## Goals / Non-Goals

**Goals:**
- Delete URL mappings 90 days after their creation time.
- Run expiration cleanup asynchronously once per day using UTC as the reference timezone.
- Keep the service dependency-free and small.
- Preserve the existing public API shape for shortening and redirecting URLs.
- Remove legacy mappings without creation metadata during cleanup so old URLs do not remain permanent.

**Non-Goals:**
- Custom per-link expiration windows.
- Manual delete or restore endpoints.
- User accounts, ownership, or link management UI.
- External databases, queues, or third-party scheduling libraries.

## Decisions

- Store structured URL records with creation timestamps instead of bare `code -> longUrl` strings.
  - Rationale: expiration requires deterministic age tracking per mapping, and a structured record keeps the data model explicit.
  - Alternatives considered: infer age from file timestamps or keep a sidecar metadata file. Rejected because they are brittle and do not provide per-record precision.

- Treat legacy records without creation timestamps as expired during cleanup.
  - Rationale: the requirement says all URLs must expire, including ones already in the system. Since old records do not contain creation metadata, the safest compatible behavior is to purge them rather than guess their age.
  - Alternatives considered: backfill timestamps from the file mtime or leave legacy records untouched. Rejected because neither guarantees that existing URLs actually expire.

- Run cleanup as a background job aligned to UTC, with an initial catch-up pass on startup.
  - Rationale: the user requested asynchronous daily cleanup in UTC. A startup pass ensures the service does not serve overdue mappings after downtime, and the daily schedule keeps steady retention behavior.
  - Alternatives considered: cleanup only on request, or a simple 24-hour interval from process start. Rejected because they either couple deletion to traffic or drift away from UTC-based daily timing.

- Keep expiration logic in the store layer and scheduling logic in the server layer.
  - Rationale: the store should own data mutation and persistence, while the server owns process lifecycle and timers.
  - Alternatives considered: place scheduling inside the store class. Rejected because it couples persistence with process management and makes testing harder.

- Persist deletions atomically after each cleanup pass.
  - Rationale: expiration is a destructive operation, so the store should never be left half-written if the process stops mid-save.
  - Alternatives considered: direct overwrite. Rejected because it is fragile under interruption.

## Risks / Trade-offs

- [Legacy mappings may disappear immediately after rollout] -> This is intentional to satisfy the "all URLs" requirement; communicate the change clearly in release notes.
- [Daily cleanup means a link can remain available until the next scheduled run after it crosses 90 days] -> Align the scheduler to UTC and run a startup catch-up pass to reduce the window.
- [Adding timestamps changes the on-disk file format] -> Keep the loader backward compatible so old files can still be read and migrated.
- [Time-based tests can be flaky if they depend on the real clock] -> Use injected or fixed timestamps in tests.

## Migration Plan

1. Deploy a version that can read both legacy string records and new structured records.
2. Run a startup cleanup pass to purge legacy records without creation metadata.
3. Start the daily UTC cleanup job after the server is listening.
4. Verify that new mappings are persisted with creation timestamps and that expired mappings are removed atomically.

Rollback strategy:
1. Revert to the previous server version if needed.
2. Keep the migrated data file intact unless a manual restore is required.

## Open Questions

None.

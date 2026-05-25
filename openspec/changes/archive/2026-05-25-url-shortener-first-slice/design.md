## Context

The project is a dependency-free Node.js URL shortener using CommonJS modules and built-in APIs only. The repository is currently at the proposal stage for this change, and the first slice must prove the core loop: submit a long URL, receive a short URL on our domain, and redirect back to the original URL when the short code is visited.

The requested scope is intentionally small: anonymous use only, automatically generated codes only, permanent links, syntactically valid URL input only, no abuse protections, no listing UI, and only the two code endpoints.

## Goals / Non-Goals

**Goals:**
- Accept a syntactically valid URL via `POST /shorten`.
- Generate a short code automatically and return a short URL on the service domain.
- Resolve `GET /:code` to the original URL.
- Preserve mappings permanently for the first slice.
- Keep the implementation small, explicit, and dependency-free.

**Non-Goals:**
- User accounts, ownership, or authentication.
- Custom aliases or branded codes.
- Link expiration, deletion, or editing.
- Rate limiting, duplicate suppression, or abuse detection.
- Listing pages, dashboards, analytics, or admin features.
- External databases, queues, or third-party packages.

## Decisions

- Use Node's built-in `http` module for the server.
  - Rationale: the project explicitly prefers simple HTTP/server logic over frameworks and prohibits third-party dependencies.
  - Alternatives considered: Express or another framework. Rejected because they add unnecessary surface area for the first slice.

- Persist URL mappings to a local JSON file with an in-memory cache.
  - Rationale: "Permanent links only" requires durability beyond process lifetime, so a purely in-memory store is not sufficient.
  - Alternatives considered: in-memory storage only, SQLite, or a remote database. Rejected because in-memory storage loses data on restart and databases are unnecessary for the initial slice.

- Write the JSON store atomically.
  - Rationale: the store is file-backed, so writes should not leave the data file partially written if the process crashes mid-update.
  - Alternatives considered: direct overwrite. Rejected because it is fragile under interruption.

- Generate codes using cryptographically strong random bytes and a compact base62 alphabet.
  - Rationale: codes should be hard to guess and the implementation should stay simple.
  - Alternatives considered: sequential IDs. Rejected because they are predictable and leak scale.

- Validate submitted URLs with the built-in `URL` parser and accept only `http:` and `https:` schemes.
  - Rationale: the first slice only needs syntactic validation; reachability checks would add latency and failure modes unrelated to the core behavior.
  - Alternatives considered: performing an HTTP reachability probe. Rejected because it creates network dependency and does not improve the redirect flow itself.

- Return `302 Found` for redirects.
  - Rationale: the user chose flexibility, so the service should avoid permanent redirect semantics in the first slice.
  - Alternatives considered: `301 Moved Permanently` or `308 Permanent Redirect`. Rejected because they are more cache-committing than the requested flexible behavior.

## Risks / Trade-offs

- [File-backed storage is simple but not horizontally scalable] -> Acceptable for the first slice; revisit if traffic or availability requirements grow.
- [Atomic writes add a small amount of implementation complexity] -> Use a small, well-contained storage module and keep the write path explicit.
- [Random code collisions are possible, though unlikely] -> Detect collisions and retry code generation before failing the request.
- [URL parsing behavior can be opinionated for edge cases] -> Keep validation narrow: accept only syntactically valid `http` and `https` URLs.

## Migration Plan

No migration is required because this is a new feature slice.

Deployment plan:
1. Add the server, storage module, and tests.
2. Start the service with a fresh or existing local data file.
3. Verify that a newly created short URL resolves after a restart.

Rollback plan:
1. Remove the new route handling and storage writes if needed.
2. Leave the persisted file in place unless explicitly cleaned up, since rollback should not destroy user-created mappings by default.

## Open Questions

None.

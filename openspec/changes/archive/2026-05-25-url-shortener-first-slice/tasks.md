## 1. Storage Foundation

- [x] 1.1 Create a file-backed URL store that loads mappings on startup and saves them atomically to a local JSON file
- [x] 1.2 Add collision-safe helpers for generating and reserving unique short codes
- [x] 1.3 Add URL validation helpers that accept only syntactically valid `http` and `https` URLs

## 2. HTTP Endpoints

- [x] 2.1 Implement `POST /shorten` to accept a valid long URL, create a generated code, and return the service-domain short URL
- [x] 2.2 Implement `GET /:code` to look up known codes and respond with a `302 Found` redirect
- [x] 2.3 Return appropriate client errors for invalid URLs and not found for unknown codes

## 3. Project Files

- [x] 3.1 Add a `.gitignore` file that excludes generated runtime data and common local/editor artifacts
- [x] 3.2 Add a `README.md` with setup instructions and how to start the service locally

## 4. Tests

- [x] 4.1 Add tests for accepting valid URLs and rejecting malformed input
- [x] 4.2 Add tests for redirecting known codes and returning not found for missing codes
- [x] 4.3 Add a persistence test that verifies a created mapping survives a server restart when the data file remains in place

## 5. Verification

- [x] 5.1 Run the full test suite and confirm the new slice passes without third-party dependencies

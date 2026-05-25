## Purpose

Provide the core dependency-free URL shortening capability: accept valid long URLs, generate short codes, and redirect short URLs back to the original destination.

## Requirements

### Requirement: Submit a valid long URL
The system SHALL accept a syntactically valid `http` or `https` URL submitted through `POST /shorten`.

#### Scenario: Accept a valid URL
- **WHEN** a client submits a syntactically valid `http` or `https` URL
- **THEN** the system SHALL create a short URL for that long URL
- **AND** the system SHALL return the short URL on the service domain

### Requirement: Reject invalid URL syntax
The system SHALL reject URL submissions that are not syntactically valid `http` or `https` URLs.

#### Scenario: Reject malformed input
- **WHEN** a client submits a value that is not a syntactically valid URL
- **THEN** the system SHALL respond with a client error
- **AND** the system SHALL not create a short code

### Requirement: Generate short codes automatically
The system SHALL generate short codes automatically and SHALL NOT accept custom aliases.

#### Scenario: Ignore custom alias attempts
- **WHEN** a client attempts to specify a custom alias while creating a short URL
- **THEN** the system SHALL not use the provided alias
- **AND** the system SHALL generate its own short code

### Requirement: Resolve known short codes
The system SHALL redirect `GET /:code` requests for known codes to the original long URL.

#### Scenario: Redirect to original URL
- **WHEN** a client requests a short code that exists
- **THEN** the system SHALL respond with a `302 Found` redirect
- **AND** the redirect target SHALL be the original long URL

### Requirement: Handle unknown short codes
The system SHALL respond with not found when a requested short code does not exist.

#### Scenario: Missing code returns not found
- **WHEN** a client requests a short code that has not been created
- **THEN** the system SHALL respond with not found

### Requirement: Expire mappings after 90 days
The system SHALL delete each URL mapping 90 days after the mapping's creation time.

#### Scenario: Expired mapping is removed during cleanup
- **WHEN** the daily UTC cleanup job runs after a mapping reaches 90 days of age
- **THEN** the system SHALL delete the mapping from storage
- **AND** the mapping SHALL no longer resolve to the original long URL

### Requirement: Run expiration cleanup daily in UTC
The system SHALL run an asynchronous expiration cleanup job once per day using UTC as the scheduling reference.

#### Scenario: Daily cleanup removes eligible mappings
- **WHEN** the scheduled UTC cleanup job runs
- **THEN** the system SHALL delete every mapping whose creation time is at least 90 days in the past
- **AND** the system SHALL persist the updated store after deletions

### Requirement: Remove legacy mappings without creation metadata
The system SHALL treat legacy mappings that do not have creation metadata as expired and delete them during the first cleanup run after deployment.

#### Scenario: Legacy mapping is purged
- **WHEN** the cleanup job encounters a mapping that does not contain creation metadata
- **THEN** the system SHALL delete the mapping from storage
- **AND** the mapping SHALL no longer resolve to the original long URL

## ADDED Requirements

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

### Requirement: Preserve mappings permanently
The system SHALL preserve each generated short-code mapping without expiration.

#### Scenario: Mapping remains available after restart
- **WHEN** the service restarts after a short URL has been created
- **THEN** the short code SHALL still resolve to the original long URL
- **AND** the mapping SHALL remain available until the underlying data store is removed

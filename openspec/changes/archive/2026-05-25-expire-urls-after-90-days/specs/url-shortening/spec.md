## REMOVED Requirements

### Requirement: Preserve mappings permanently
**Reason**: Replaced by 90-day expiration and daily cleanup.
**Migration**: Legacy mappings without creation metadata should be treated as expired and removed during the first cleanup run after deployment.

## ADDED Requirements

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

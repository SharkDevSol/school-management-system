# Requirements Document

## Introduction

This feature enhances the communication system to filter contacts based on class teaching assignments. Teachers should only see guardians of students in classes they teach, and guardians should only see teachers who teach their wards plus administrators. This ensures relevant communication channels and reduces clutter from unrelated contacts.

## Glossary

- **Teacher**: A staff member who teaches one or more classes
- **Class Teacher**: A teacher assigned as the primary teacher for a specific class
- **Guardian**: A parent or guardian of one or more students (wards)
- **Ward**: A student under a guardian's care
- **Administrator/Director**: A staff member with administrative privileges who can communicate with all guardians
- **Communication System**: The messaging feature that allows teachers and guardians to exchange messages

## Requirements

### Requirement 1

**User Story:** As a teacher, I want to see only guardians of students in my assigned classes, so that I can communicate with relevant parents without being overwhelmed by unrelated contacts.

#### Acceptance Criteria

1. WHEN a teacher opens the communications page THEN the system SHALL display only guardians whose wards are in classes taught by that teacher
2. WHEN a teacher is assigned as class teacher for a class THEN the system SHALL include all guardians of students in that class in the teacher's contact list
3. WHEN a teacher teaches multiple classes THEN the system SHALL aggregate guardians from all taught classes without duplicates
4. WHEN a guardian has multiple wards in different classes taught by the same teacher THEN the system SHALL display that guardian only once in the contact list

### Requirement 2

**User Story:** As a guardian, I want to see only teachers who teach my wards plus administrators, so that I can easily find and contact the right staff members.

#### Acceptance Criteria

1. WHEN a guardian opens the communications page THEN the system SHALL display only teachers who teach at least one of the guardian's wards
2. WHEN a guardian opens the communications page THEN the system SHALL always include administrators (directors) in the contact list
3. WHEN a guardian has multiple wards in different classes THEN the system SHALL aggregate teachers from all wards' classes without duplicates
4. WHEN a teacher teaches multiple subjects to the same ward THEN the system SHALL display that teacher only once in the contact list

### Requirement 3

**User Story:** As an administrator, I want to maintain full access to all guardians, so that I can communicate with any parent when needed.

#### Acceptance Criteria

1. WHEN an administrator opens the communications page THEN the system SHALL display all guardians in the system
2. WHEN a new guardian is added to the system THEN the system SHALL make that guardian available to administrators immediately

### Requirement 4

**User Story:** As a system user, I want the filtered contact list to load efficiently, so that I can start communicating without delays.

#### Acceptance Criteria

1. WHEN the communications page loads THEN the system SHALL retrieve filtered contacts within 2 seconds
2. WHEN filtering contacts THEN the system SHALL use database-level filtering to minimize data transfer

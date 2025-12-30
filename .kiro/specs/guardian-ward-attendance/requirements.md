# Requirements Document

## Introduction

This feature enables guardians to view the attendance records of their wards (students they are responsible for) through the Guardian Profile page. Guardians can select a ward, view available attendance periods, and see detailed attendance reports showing daily attendance status for each week.

## Glossary

- **Guardian**: A parent or legal guardian responsible for one or more students
- **Ward**: A student under the care of a guardian
- **Attendance Record**: A weekly record of a student's daily attendance status (Present/Absent/Late)
- **Attendance Period**: A named attendance tracking period (e.g., "Week_1", "Term_1_Week_3")
- **Attendance Schema**: Database schema storing attendance data in format `class_{className}_attendance`

## Requirements

### Requirement 1

**User Story:** As a guardian, I want to view my ward's attendance records, so that I can monitor their school attendance.

#### Acceptance Criteria

1. WHEN a guardian navigates to the Attendance tab THEN the Guardian_Profile SHALL display a ward selector if multiple wards exist
2. WHEN a guardian selects a ward THEN the Guardian_Profile SHALL fetch and display available attendance periods for that ward's class
3. WHEN attendance periods are loaded THEN the Guardian_Profile SHALL display them in a selectable list format
4. WHEN a guardian selects an attendance period THEN the Guardian_Profile SHALL display the ward's attendance data for that period

### Requirement 2

**User Story:** As a guardian, I want to see detailed attendance information for each day, so that I can understand my ward's attendance patterns.

#### Acceptance Criteria

1. WHEN attendance data is displayed THEN the Guardian_Profile SHALL show attendance status for each day of the week (Monday through Sunday)
2. WHEN displaying attendance status THEN the Guardian_Profile SHALL use visual indicators (P for Present, A for Absent, L for Late, - for no data)
3. WHEN attendance data is displayed THEN the Guardian_Profile SHALL show the week start date for context
4. WHEN displaying attendance THEN the Guardian_Profile SHALL calculate and display attendance summary statistics (total present, absent, late)

### Requirement 3

**User Story:** As a guardian, I want the attendance view to handle edge cases gracefully, so that I have a clear understanding even when data is unavailable.

#### Acceptance Criteria

1. WHEN no attendance records exist for a ward THEN the Guardian_Profile SHALL display an appropriate empty state message
2. WHEN attendance data is loading THEN the Guardian_Profile SHALL display a loading indicator
3. IF an error occurs while fetching attendance THEN the Guardian_Profile SHALL display an error message and allow retry
4. WHEN a ward has no class assigned THEN the Guardian_Profile SHALL display a message indicating attendance is unavailable

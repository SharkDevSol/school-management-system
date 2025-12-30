# Requirements Document

## Introduction

This feature enhances the AttendanceView page to display calculated attendance marks/scores for students based on their attendance records. The system will calculate attendance percentages and scores per student, showing their overall attendance performance. Additionally, the separate StudentAttendance page will be removed, consolidating attendance viewing into a single, comprehensive view.

## Glossary

- **AttendanceView**: The page component that displays attendance records and statistics for viewing purposes
- **StudentAttendance**: The existing page for creating and marking attendance (to be removed)
- **Attendance Mark**: A calculated score/percentage representing a student's attendance performance
- **Present (P)**: Student attended the class
- **Absent (A)**: Student did not attend the class
- **Late (L)**: Student arrived late to class
- **Permission (E)**: Student had excused absence with permission

## Requirements

### Requirement 1

**User Story:** As a teacher, I want to see calculated attendance marks for each student, so that I can quickly assess their attendance performance.

#### Acceptance Criteria

1. WHEN viewing attendance details for a class THEN the AttendanceView SHALL display an attendance percentage for each student
2. WHEN calculating attendance marks THEN the AttendanceView SHALL count Present (P) as 100%, Late (L) as 50%, Permission (E) as 75%, and Absent (A) as 0%
3. WHEN displaying student attendance THEN the AttendanceView SHALL show a visual indicator (color-coded) based on attendance percentage thresholds
4. WHEN attendance percentage is 90% or above THEN the AttendanceView SHALL display a green indicator
5. WHEN attendance percentage is between 75% and 89% THEN the AttendanceView SHALL display a yellow indicator
6. WHEN attendance percentage is below 75% THEN the AttendanceView SHALL display a red indicator

### Requirement 2

**User Story:** As an administrator, I want the attendance viewing consolidated into one page, so that navigation is simplified.

#### Acceptance Criteria

1. WHEN the StudentAttendance route is accessed THEN the system SHALL redirect to AttendanceView or show a 404
2. WHEN the navigation menu is rendered THEN the system SHALL not display the StudentAttendance link
3. WHEN the App routes are configured THEN the system SHALL not include the StudentAttendance route

### Requirement 3

**User Story:** As a teacher, I want to see a summary of attendance marks for all students in a class, so that I can identify students with poor attendance.

#### Acceptance Criteria

1. WHEN viewing class attendance overview THEN the AttendanceView SHALL display a sortable list of students with their attendance marks
2. WHEN sorting by attendance mark THEN the AttendanceView SHALL order students from lowest to highest or highest to lowest
3. WHEN a student has no attendance records THEN the AttendanceView SHALL display "N/A" for their attendance mark

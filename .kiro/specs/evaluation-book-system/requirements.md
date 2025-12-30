# Requirements Document

## Introduction

The School Evaluation Book System is a secure, multi-role web application that manages the daily student evaluation process. It facilitates structured communication and reporting between Administrators, Teachers, and Guardians through a daily evaluation workflow. Administrators create master evaluation form templates and assign teachers to classes. Teachers fill out daily evaluation forms and send them to guardians. Guardians receive forms, add their feedback, and return them to teachers. All parties have role-appropriate access to evaluation reports and history.

## Glossary

- **Evaluation Book**: The complete system for managing daily student evaluations and feedback between school staff and guardians
- **Master Evaluation Form**: A customizable template created by administrators that defines the structure and fields for daily evaluations
- **Daily Evaluation**: An instance of the master form filled out by a teacher for students in their assigned class on a specific date
- **Guardian Feedback**: The response section of an evaluation form where guardians provide their input about their ward's progress
- **Ward**: A student under the care of a guardian
- **Class Assignment**: The administrative mapping of a teacher to one or more classes for evaluation purposes
- **Evaluation Report**: A historical view of evaluation data filtered by role-appropriate access permissions

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to create and manage master evaluation form templates, so that the entire school uses consistent evaluation criteria.

#### Acceptance Criteria

1. WHEN an administrator accesses the form creation interface THEN the Evaluation Book System SHALL display a form builder with customizable field options
2. WHEN an administrator adds a field to the form template THEN the Evaluation Book System SHALL support text input, rating scale, and text area field types
3. WHEN an administrator saves a form template THEN the Evaluation Book System SHALL persist the template with all configured fields and validation rules
4. WHEN an administrator edits an existing template THEN the Evaluation Book System SHALL load the current configuration and allow modifications
5. WHEN an administrator includes a guardian feedback field THEN the Evaluation Book System SHALL create a designated text area labeled for guardian response input

### Requirement 2

**User Story:** As an administrator, I want to assign teachers to specific classes, so that each class has a designated evaluator responsible for daily assessments.

#### Acceptance Criteria

1. WHEN an administrator accesses the teacher assignment interface THEN the Evaluation Book System SHALL display a list of all teachers and all classes
2. WHEN an administrator assigns a teacher to a class THEN the Evaluation Book System SHALL create a mapping between the teacher and the class
3. WHEN an administrator removes a teacher assignment THEN the Evaluation Book System SHALL delete the mapping and revoke the teacher's access to that class
4. WHEN displaying assignments THEN the Evaluation Book System SHALL show the current teacher-class mappings with teacher name and class name

### Requirement 3

**User Story:** As an administrator, I want to view comprehensive evaluation reports across all classes, so that I can monitor school-wide evaluation activity and compliance.

#### Acceptance Criteria

1. WHEN an administrator accesses the reporting dashboard THEN the Evaluation Book System SHALL display evaluation data for all classes and students
2. WHEN an administrator filters reports THEN the Evaluation Book System SHALL support filtering by date range, class, teacher, and student
3. WHEN displaying reports THEN the Evaluation Book System SHALL show evaluation submission status, guardian response status, and completion rates
4. WHEN an administrator exports report data THEN the Evaluation Book System SHALL generate a downloadable report in a standard format

### Requirement 4

**User Story:** As a teacher, I want to access only the classes assigned to me, so that I can focus on my responsibilities without seeing unrelated data.

#### Acceptance Criteria

1. WHEN a teacher logs into the Evaluation Book System THEN the system SHALL display only the classes assigned to that teacher
2. WHEN a teacher attempts to access a class not assigned to them THEN the Evaluation Book System SHALL deny access and display an authorization error
3. WHEN displaying the teacher's class list THEN the Evaluation Book System SHALL show class name and student count for each assigned class

### Requirement 5

**User Story:** As a teacher, I want to fill out and send daily evaluation forms to guardians, so that parents stay informed about their child's daily progress.

#### Acceptance Criteria

1. WHEN a teacher selects a class for daily evaluation THEN the Evaluation Book System SHALL display the master evaluation form with all students in that class
2. WHEN a teacher fills out evaluation fields for a student THEN the Evaluation Book System SHALL validate input against field constraints
3. WHEN a teacher submits the daily evaluation THEN the Evaluation Book System SHALL send the evaluation to the guardians of all evaluated students
4. WHEN an evaluation is sent THEN the Evaluation Book System SHALL record the submission timestamp and mark the evaluation as pending guardian response

### Requirement 6

**User Story:** As a teacher, I want to receive and review guardian feedback on evaluations, so that I can understand parent perspectives and concerns.

#### Acceptance Criteria

1. WHEN a guardian submits feedback THEN the Evaluation Book System SHALL notify the assigned teacher of the response
2. WHEN a teacher views an evaluation with guardian feedback THEN the Evaluation Book System SHALL display the guardian's response in the designated feedback section
3. WHEN displaying evaluations THEN the Evaluation Book System SHALL indicate which evaluations have received guardian responses

### Requirement 7

**User Story:** As a teacher, I want to view evaluation reports for my assigned classes only, so that I can track student progress over time.

#### Acceptance Criteria

1. WHEN a teacher accesses the reporting interface THEN the Evaluation Book System SHALL display reports only for classes assigned to that teacher
2. WHEN a teacher filters reports THEN the Evaluation Book System SHALL support filtering by date range and student within their assigned classes
3. WHEN displaying class reports THEN the Evaluation Book System SHALL show evaluation history, guardian response rates, and trend data

### Requirement 8

**User Story:** As a guardian, I want to receive daily evaluation forms for my ward, so that I stay informed about my child's school performance.

#### Acceptance Criteria

1. WHEN a teacher sends a daily evaluation THEN the Evaluation Book System SHALL deliver the form to the guardian's profile
2. WHEN a guardian views their profile THEN the Evaluation Book System SHALL display pending evaluations requiring their response
3. WHEN displaying an evaluation THEN the Evaluation Book System SHALL show all teacher-entered data and the designated guardian feedback area

### Requirement 9

**User Story:** As a guardian, I want to add my feedback to the evaluation form and submit it back to the teacher, so that I can communicate my observations about my child's progress.

#### Acceptance Criteria

1. WHEN a guardian opens a pending evaluation THEN the Evaluation Book System SHALL display an editable text area for guardian feedback
2. WHEN a guardian enters feedback THEN the Evaluation Book System SHALL accept text input in the designated response field
3. WHEN a guardian submits the completed form THEN the Evaluation Book System SHALL send the response to the assigned teacher
4. WHEN a guardian submits feedback THEN the Evaluation Book System SHALL record the submission timestamp and mark the evaluation as completed

### Requirement 10

**User Story:** As a guardian, I want to view evaluation history for my ward only, so that I can track my child's progress over time.

#### Acceptance Criteria

1. WHEN a guardian accesses the evaluation history THEN the Evaluation Book System SHALL display only evaluations for their registered ward(s)
2. WHEN a guardian has multiple wards THEN the Evaluation Book System SHALL allow filtering by individual ward
3. WHEN displaying evaluation history THEN the Evaluation Book System SHALL show evaluation date, teacher comments, and guardian responses
4. WHEN a guardian attempts to view another student's data THEN the Evaluation Book System SHALL deny access and display an authorization error

### Requirement 11

**User Story:** As a system user, I want evaluation data to be serialized and stored persistently, so that evaluation records are preserved and retrievable.

#### Acceptance Criteria

1. WHEN the system stores evaluation data THEN the Evaluation Book System SHALL encode evaluation records using JSON format
2. WHEN the system retrieves evaluation data THEN the Evaluation Book System SHALL decode stored records and reconstruct evaluation objects
3. WHEN storing evaluation submissions THEN the Evaluation Book System SHALL preserve all field values, timestamps, and user associations


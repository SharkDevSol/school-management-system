# Design Document: Evaluation Book System

## Overview

The Evaluation Book System extends the existing school management application to support a daily evaluation workflow between teachers and guardians. The system enables administrators to create customizable evaluation form templates, assign teachers to classes, and view school-wide reports. Teachers fill out daily evaluations for their assigned classes and send them to guardians. Guardians receive evaluations, add their feedback, and return them to teachers. All roles have appropriate access controls and reporting capabilities.

This design builds upon the existing evaluation infrastructure (evaluation_areas, evaluations, evaluation_forms, evaluation_responses tables) while adding new models for the daily evaluation book workflow, guardian feedback, and role-based access control.

## Architecture

The system follows the existing application architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  Admin Views    │   Teacher Views    │    Guardian Views         │
│  - Form Builder │   - Class List     │    - Evaluation Inbox     │
│  - Assignments  │   - Daily Form     │    - Feedback Form        │
│  - Reports      │   - Feedback View  │    - Ward History         │
│                 │   - Class Reports  │                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────▼────────────────────────────────────┐
│                    Backend (Express.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  /api/evaluation-book/*                                          │
│  - templates (CRUD for form templates)                           │
│  - assignments (teacher-class mappings)                          │
│  - daily-evaluations (daily form submissions)                    │
│  - guardian-feedback (guardian responses)                        │
│  - reports (role-filtered reporting)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    PostgreSQL Database                           │
├─────────────────────────────────────────────────────────────────┤
│  evaluation_book_templates                                       │
│  evaluation_book_template_fields                                 │
│  evaluation_book_teacher_assignments                             │
│  evaluation_book_daily_entries                                   │
│  evaluation_book_guardian_feedback                               │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend Components

#### 1. EvaluationBookTemplateService
Manages master evaluation form templates.

```javascript
// Interface
interface TemplateField {
  id?: number;
  field_name: string;
  field_type: 'text' | 'rating' | 'textarea';
  field_order: number;
  is_guardian_field: boolean;
  max_rating?: number;
  required: boolean;
}

interface EvaluationBookTemplate {
  id?: number;
  template_name: string;
  description?: string;
  fields: TemplateField[];
  is_active: boolean;
  created_by: number;
  created_at?: Date;
  updated_at?: Date;
}

// Methods
createTemplate(template: EvaluationBookTemplate): Promise<EvaluationBookTemplate>
updateTemplate(id: number, template: EvaluationBookTemplate): Promise<EvaluationBookTemplate>
getTemplate(id: number): Promise<EvaluationBookTemplate>
listTemplates(): Promise<EvaluationBookTemplate[]>
deleteTemplate(id: number): Promise<void>
```

#### 2. TeacherAssignmentService
Manages teacher-to-class assignments for evaluation purposes.

```javascript
// Interface
interface TeacherAssignment {
  id?: number;
  teacher_global_id: number;
  teacher_name: string;
  class_name: string;
  assigned_by: number;
  assigned_at?: Date;
}

// Methods
assignTeacher(assignment: TeacherAssignment): Promise<TeacherAssignment>
removeAssignment(id: number): Promise<void>
getAssignmentsForTeacher(teacherGlobalId: number): Promise<TeacherAssignment[]>
getAllAssignments(): Promise<TeacherAssignment[]>
getTeacherForClass(className: string): Promise<TeacherAssignment | null>
```

#### 3. DailyEvaluationService
Handles daily evaluation form submissions from teachers.

```javascript
// Interface
interface DailyEvaluationEntry {
  id?: number;
  template_id: number;
  teacher_global_id: number;
  class_name: string;
  student_name: string;
  evaluation_date: Date;
  field_values: Record<string, any>; // JSON: { field_id: value }
  status: 'pending' | 'sent' | 'responded' | 'completed';
  sent_at?: Date;
  created_at?: Date;
}

// Methods
createDailyEvaluation(entry: DailyEvaluationEntry): Promise<DailyEvaluationEntry>
sendToGuardians(evaluationIds: number[]): Promise<void>
getEvaluationsForClass(className: string, date: Date): Promise<DailyEvaluationEntry[]>
getEvaluationsForGuardian(guardianId: string): Promise<DailyEvaluationEntry[]>
getEvaluationById(id: number): Promise<DailyEvaluationEntry>
```

#### 4. GuardianFeedbackService
Manages guardian responses to daily evaluations.

```javascript
// Interface
interface GuardianFeedback {
  id?: number;
  daily_evaluation_id: number;
  guardian_id: string;
  feedback_text: string;
  submitted_at?: Date;
}

// Methods
submitFeedback(feedback: GuardianFeedback): Promise<GuardianFeedback>
getFeedbackForEvaluation(evaluationId: number): Promise<GuardianFeedback | null>
getFeedbackByGuardian(guardianId: string): Promise<GuardianFeedback[]>
```

#### 5. EvaluationBookReportService
Generates role-filtered reports.

```javascript
// Interface
interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  className?: string;
  teacherGlobalId?: number;
  studentName?: string;
  guardianId?: string;
}

interface ReportSummary {
  totalEvaluations: number;
  pendingResponses: number;
  completedResponses: number;
  responseRate: number;
  entries: DailyEvaluationEntry[];
}

// Methods
getAdminReport(filter: ReportFilter): Promise<ReportSummary>
getTeacherReport(teacherGlobalId: number, filter: ReportFilter): Promise<ReportSummary>
getGuardianReport(guardianId: string, filter: ReportFilter): Promise<ReportSummary>
exportReport(filter: ReportFilter, format: 'csv' | 'pdf'): Promise<Buffer>
```

### Frontend Components

#### Admin Components
- `EvaluationBookFormBuilder.jsx` - Drag-and-drop form template builder
- `TeacherAssignmentManager.jsx` - Interface for assigning teachers to classes
- `AdminEvaluationDashboard.jsx` - School-wide reporting dashboard

#### Teacher Components
- `TeacherClassList.jsx` - List of assigned classes
- `DailyEvaluationForm.jsx` - Form for entering daily evaluations
- `GuardianFeedbackView.jsx` - View guardian responses
- `TeacherReportView.jsx` - Class-specific reports

#### Guardian Components
- `GuardianEvaluationInbox.jsx` - List of pending evaluations
- `GuardianFeedbackForm.jsx` - Form for adding feedback
- `WardEvaluationHistory.jsx` - Historical view of ward's evaluations

### API Routes

```
POST   /api/evaluation-book/templates              - Create template (Admin)
GET    /api/evaluation-book/templates              - List templates (Admin)
GET    /api/evaluation-book/templates/:id          - Get template (Admin)
PUT    /api/evaluation-book/templates/:id          - Update template (Admin)
DELETE /api/evaluation-book/templates/:id          - Delete template (Admin)

POST   /api/evaluation-book/assignments            - Assign teacher (Admin)
GET    /api/evaluation-book/assignments            - List all assignments (Admin)
GET    /api/evaluation-book/assignments/teacher/:id - Get teacher's assignments
DELETE /api/evaluation-book/assignments/:id        - Remove assignment (Admin)

POST   /api/evaluation-book/daily                  - Create daily evaluation (Teacher)
GET    /api/evaluation-book/daily/class/:className - Get class evaluations (Teacher)
POST   /api/evaluation-book/daily/send             - Send to guardians (Teacher)
GET    /api/evaluation-book/daily/guardian/:id     - Get guardian's evaluations
GET    /api/evaluation-book/daily/:id              - Get single evaluation

POST   /api/evaluation-book/feedback               - Submit feedback (Guardian)
GET    /api/evaluation-book/feedback/:evaluationId - Get feedback for evaluation

GET    /api/evaluation-book/reports/admin          - Admin reports
GET    /api/evaluation-book/reports/teacher/:id    - Teacher reports
GET    /api/evaluation-book/reports/guardian/:id   - Guardian reports
GET    /api/evaluation-book/reports/export         - Export report
```

## Data Models

### Database Schema

```sql
-- Master evaluation form templates
CREATE TABLE evaluation_book_templates (
  id SERIAL PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template fields (customizable form structure)
CREATE TABLE evaluation_book_template_fields (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES evaluation_book_templates(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'rating', 'textarea')),
  field_order INTEGER NOT NULL,
  is_guardian_field BOOLEAN DEFAULT false,
  max_rating INTEGER,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teacher-to-class assignments for evaluation book
CREATE TABLE evaluation_book_teacher_assignments (
  id SERIAL PRIMARY KEY,
  teacher_global_id INTEGER NOT NULL,
  teacher_name VARCHAR(100) NOT NULL,
  class_name VARCHAR(100) NOT NULL,
  assigned_by INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_global_id, class_name)
);

-- Daily evaluation entries
CREATE TABLE evaluation_book_daily_entries (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES evaluation_book_templates(id) ON DELETE SET NULL,
  teacher_global_id INTEGER NOT NULL,
  class_name VARCHAR(100) NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  guardian_id VARCHAR(100),
  evaluation_date DATE NOT NULL,
  field_values JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'responded', 'completed')),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, class_name, student_name, evaluation_date)
);

-- Guardian feedback responses
CREATE TABLE evaluation_book_guardian_feedback (
  id SERIAL PRIMARY KEY,
  daily_evaluation_id INTEGER REFERENCES evaluation_book_daily_entries(id) ON DELETE CASCADE,
  guardian_id VARCHAR(100) NOT NULL,
  feedback_text TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(daily_evaluation_id)
);

-- Indexes for performance
CREATE INDEX idx_daily_entries_teacher ON evaluation_book_daily_entries(teacher_global_id);
CREATE INDEX idx_daily_entries_class ON evaluation_book_daily_entries(class_name);
CREATE INDEX idx_daily_entries_guardian ON evaluation_book_daily_entries(guardian_id);
CREATE INDEX idx_daily_entries_date ON evaluation_book_daily_entries(evaluation_date);
CREATE INDEX idx_daily_entries_status ON evaluation_book_daily_entries(status);
CREATE INDEX idx_feedback_guardian ON evaluation_book_guardian_feedback(guardian_id);
```

### JSON Field Values Structure

The `field_values` JSONB column stores evaluation data:

```json
{
  "1": "Good progress in reading",
  "2": 4,
  "3": "Needs improvement in math",
  "4": 5
}
```

Where keys are field IDs and values are the entered data (text or rating number).



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the acceptance criteria analysis, the following correctness properties must be validated through property-based testing:

### Property 1: Template Round-Trip Consistency
*For any* valid evaluation book template with any combination of fields, saving the template and then retrieving it SHALL produce an equivalent template object with all fields, field types, and configuration preserved.
**Validates: Requirements 1.3, 1.4**

### Property 2: Field Type Support
*For any* field configuration with field_type in ['text', 'rating', 'textarea'], the system SHALL accept and store the field with its type correctly preserved.
**Validates: Requirements 1.2**

### Property 3: Teacher Assignment Creation and Display
*For any* valid teacher-class assignment, creating the assignment SHALL result in the assignment appearing in the assignments list with correct teacher_name and class_name.
**Validates: Requirements 2.2, 2.4**

### Property 4: Assignment Removal Revokes Access
*For any* existing teacher-class assignment, removing the assignment SHALL result in the teacher no longer having access to that class's evaluations.
**Validates: Requirements 2.3**

### Property 5: Admin Unrestricted Report Access
*For any* set of evaluations across multiple classes and teachers, an administrator's report query SHALL return all evaluations with submission status, guardian response status, and completion rates.
**Validates: Requirements 3.1, 3.3**

### Property 6: Report Filtering Accuracy
*For any* report filter criteria (date range, class, teacher, student), the filtered results SHALL contain only evaluations matching all specified criteria.
**Validates: Requirements 3.2**

### Property 7: Teacher Class Access Control
*For any* teacher with assigned classes, querying their class list or reports SHALL return only data for classes explicitly assigned to that teacher.
**Validates: Requirements 4.1, 7.1**

### Property 8: Teacher Unauthorized Access Denied
*For any* teacher and any class not assigned to them, attempting to access that class's evaluations SHALL result in an authorization error.
**Validates: Requirements 4.2**

### Property 9: Evaluation Form Student Completeness
*For any* class selected for daily evaluation, the evaluation form SHALL include all students registered in that class.
**Validates: Requirements 5.1**

### Property 10: Input Validation Against Constraints
*For any* evaluation field with constraints (e.g., rating with max_rating), input values exceeding constraints SHALL be rejected, and valid values SHALL be accepted.
**Validates: Requirements 5.2**

### Property 11: Evaluation Send Workflow
*For any* submitted daily evaluation, sending it SHALL result in the evaluation being marked with status 'sent', a recorded sent_at timestamp, and association with the correct guardian(s).
**Validates: Requirements 5.3, 5.4**

### Property 12: Feedback Display with Status
*For any* evaluation with guardian feedback, viewing the evaluation SHALL display the feedback text and indicate the evaluation has received a response.
**Validates: Requirements 6.2, 6.3**

### Property 13: Guardian Inbox Completeness
*For any* guardian with pending evaluations, their inbox SHALL display all sent evaluations for their ward(s) with complete teacher-entered data.
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 14: Guardian Feedback Submission
*For any* guardian feedback submission, the feedback SHALL be recorded with correct evaluation association, guardian_id, submission timestamp, and the evaluation status SHALL change to 'responded' or 'completed'.
**Validates: Requirements 9.2, 9.3, 9.4**

### Property 15: Guardian Ward-Only Access
*For any* guardian, querying evaluation history SHALL return only evaluations for students registered as their ward(s).
**Validates: Requirements 10.1**

### Property 16: Guardian Multi-Ward Filtering
*For any* guardian with multiple wards, filtering by a specific ward SHALL return only evaluations for that ward.
**Validates: Requirements 10.2**

### Property 17: Guardian Unauthorized Access Denied
*For any* guardian and any student not registered as their ward, attempting to access that student's evaluations SHALL result in an authorization error.
**Validates: Requirements 10.4**

### Property 18: Evaluation Data Serialization Round-Trip
*For any* evaluation entry with field_values, serializing to JSON and deserializing SHALL produce an equivalent object with all field values, timestamps, and user associations preserved.
**Validates: Requirements 11.1, 11.2, 11.3**

## Error Handling

### API Error Responses

All API endpoints return consistent error responses:

```javascript
// Error response format
{
  error: string,        // Error type/code
  message: string,      // Human-readable message
  details?: any         // Optional additional details
}

// HTTP Status Codes
400 - Bad Request (validation errors, missing fields)
401 - Unauthorized (not logged in)
403 - Forbidden (insufficient permissions)
404 - Not Found (resource doesn't exist)
500 - Internal Server Error (unexpected errors)
```

### Validation Errors

- Template fields must have valid field_type
- Rating fields must have max_rating > 0
- Assignments must reference existing teachers and classes
- Daily evaluations must reference active templates
- Guardian feedback must reference existing evaluations

### Access Control Errors

- Teachers accessing unassigned classes receive 403
- Guardians accessing non-ward students receive 403
- All role-specific endpoints verify user role

## Testing Strategy

### Property-Based Testing

The system uses **fast-check** as the property-based testing library for JavaScript/TypeScript.

Each correctness property is implemented as a property-based test with:
- Minimum 100 iterations per property
- Custom generators for domain objects (templates, assignments, evaluations)
- Shrinking support for minimal failing examples

Property tests are tagged with format: `**Feature: evaluation-book-system, Property {number}: {property_text}**`

### Unit Testing

Unit tests cover:
- Individual service method behavior
- Input validation logic
- Error handling paths
- Edge cases (empty lists, null values, boundary conditions)

### Test Data Generators

```javascript
// Template generator
const templateArb = fc.record({
  template_name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 500 })),
  is_active: fc.boolean(),
  fields: fc.array(fieldArb, { minLength: 1, maxLength: 20 })
});

// Field generator
const fieldArb = fc.record({
  field_name: fc.string({ minLength: 1, maxLength: 100 }),
  field_type: fc.constantFrom('text', 'rating', 'textarea'),
  field_order: fc.integer({ min: 1, max: 100 }),
  is_guardian_field: fc.boolean(),
  max_rating: fc.option(fc.integer({ min: 1, max: 10 })),
  required: fc.boolean()
});

// Assignment generator
const assignmentArb = fc.record({
  teacher_global_id: fc.integer({ min: 1 }),
  teacher_name: fc.string({ minLength: 1, maxLength: 100 }),
  class_name: fc.string({ minLength: 1, maxLength: 100 })
});

// Daily evaluation generator
const dailyEvaluationArb = fc.record({
  template_id: fc.integer({ min: 1 }),
  teacher_global_id: fc.integer({ min: 1 }),
  class_name: fc.string({ minLength: 1, maxLength: 100 }),
  student_name: fc.string({ minLength: 1, maxLength: 100 }),
  evaluation_date: fc.date(),
  field_values: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer())),
  status: fc.constantFrom('pending', 'sent', 'responded', 'completed')
});
```

### Integration Testing

Integration tests verify:
- Complete workflows (create template → assign teacher → submit evaluation → guardian feedback)
- Database transactions and rollbacks
- API authentication and authorization
- Cross-service interactions

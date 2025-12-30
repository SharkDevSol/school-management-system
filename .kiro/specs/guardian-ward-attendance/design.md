# Design Document: Guardian Ward Attendance

## Overview

This feature adds an Attendance tab to the Guardian Profile page, allowing guardians to view their wards' attendance records. The system fetches attendance data from class-specific attendance schemas and displays it in a user-friendly format with daily status indicators and summary statistics.

## Architecture

The feature follows the existing Guardian Profile architecture pattern:
- Frontend: React component integrated into GuardianProfile.jsx
- Backend: New API endpoint in a dedicated route file
- Database: Queries existing attendance schemas (`class_{className}_attendance`)

```
┌─────────────────────────────────────────────────────────────┐
│                    Guardian Profile                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Bottom Navigation                       │    │
│  │  [Profile] [Posts] [Marks] [Attendance] [Messages]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Attendance Tab Content                    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │         Ward Selector (if multiple)          │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │         Period Selector Dropdown             │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │         Attendance Cards Display             │    │    │
│  │  │  - Week Start Date                           │    │    │
│  │  │  - Daily Status Grid (Mon-Sun)               │    │    │
│  │  │  - Summary Statistics                        │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Backend API

**New Route File:** `backend/routes/guardianAttendanceRoutes.js`

```javascript
// GET /api/guardian-attendance/tables/:className
// Returns list of attendance table names for a class
Response: string[] // e.g., ["Week_1", "Week_2", "Term_1"]

// GET /api/guardian-attendance/student/:className/:tableName/:schoolId
// Returns attendance records for a specific student
Response: {
  attendance_name: string,
  week_start: string,
  monday: string | null,
  tuesday: string | null,
  wednesday: string | null,
  thursday: string | null,
  friday: string | null,
  saturday: string | null,
  sunday: string | null
}[]
```

### Frontend Components

**Modified:** `GuardianProfile.jsx`
- Add 'attendance' to navItems
- Add state for attendance data, selected period, loading
- Add `renderAttendanceTab()` function
- Add `fetchAttendanceTables()` and `fetchWardAttendance()` functions

**Helper Functions:**
```javascript
// Map attendance value to display indicator
getAttendanceIndicator(value: string | null): string
// Returns: 'P', 'A', 'L', or '-'

// Calculate attendance summary
calculateAttendanceSummary(record: AttendanceRecord): {
  present: number,
  absent: number,
  late: number,
  total: number
}
```

## Data Models

### AttendanceRecord
```typescript
interface AttendanceRecord {
  id: number;
  attendance_name: string;
  week_start: string;
  school_id: string;
  class_id: string;
  student_name: string;
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
  saturday: string | null;
  sunday: string | null;
}
```

### AttendanceSummary
```typescript
interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Ward selector conditional rendering
*For any* guardian with wards array, the ward selector component SHALL be rendered if and only if wards.length > 1
**Validates: Requirements 1.1**

### Property 2: Attendance indicator mapping
*For any* attendance value input, the getAttendanceIndicator function SHALL return exactly one of: 'P' for 'P', 'A' for 'A', 'L' for 'L', or '-' for null/undefined/empty
**Validates: Requirements 2.2**

### Property 3: Attendance summary calculation correctness
*For any* attendance record with daily values, calculateAttendanceSummary SHALL return counts where present + absent + late + unmarked equals 7 (total days)
**Validates: Requirements 2.4**

### Property 4: All days displayed
*For any* attendance record, the display SHALL include all seven days (Monday through Sunday) regardless of their values
**Validates: Requirements 2.1**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No attendance schema exists | Display "No attendance records available" |
| API request fails | Show error message with retry button |
| Ward has no class | Display "Attendance unavailable - no class assigned" |
| Empty attendance tables | Display "No attendance periods found" |
| Loading state | Show skeleton loader |

## Testing Strategy

### Unit Tests
- Test `getAttendanceIndicator()` function with all possible inputs
- Test `calculateAttendanceSummary()` with various attendance records
- Test conditional rendering of ward selector

### Property-Based Tests
Using a property-based testing library (e.g., fast-check for JavaScript):

1. **Property 2 Test:** Generate random attendance values and verify indicator mapping is deterministic and correct
2. **Property 3 Test:** Generate random attendance records and verify summary counts always sum to 7
3. **Property 4 Test:** Generate random attendance records and verify all 7 days are present in output

### Integration Tests
- Test API endpoint returns correct data structure
- Test full flow from ward selection to attendance display

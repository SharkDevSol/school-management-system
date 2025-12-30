# Design Document: Attendance Marks View

## Overview

This feature enhances the existing AttendanceView component to calculate and display attendance marks (percentage scores) for each student. The system will use a weighted calculation formula where different attendance statuses contribute different percentages to the final score. Additionally, the separate StudentAttendance page will be removed to consolidate attendance functionality.

## Architecture

The enhancement follows the existing React component architecture:

```
AttendanceView (Enhanced)
├── Attendance Mark Calculator (utility function)
├── Color Indicator Logic (utility function)
├── Sortable Student List (UI enhancement)
└── Individual Student Marks Display
```

### Changes Required:
1. **AttendanceView.jsx** - Add mark calculation and display
2. **AttendanceView.module.css** - Add styles for marks and color indicators
3. **App.jsx** - Remove StudentAttendance route
4. **Home.jsx** - Remove StudentAttendance navigation link
5. **Delete** StudentAttendance folder

## Components and Interfaces

### Attendance Mark Calculator

```javascript
/**
 * Calculate attendance mark for a student
 * @param {Object} student - Student attendance record with day values
 * @returns {number|null} - Percentage (0-100) or null if no records
 */
function calculateAttendanceMark(student) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weights = { 'P': 100, 'L': 50, 'E': 75, 'A': 0 };
  
  let totalWeight = 0;
  let recordCount = 0;
  
  days.forEach(day => {
    if (student[day] && weights.hasOwnProperty(student[day])) {
      totalWeight += weights[student[day]];
      recordCount++;
    }
  });
  
  return recordCount > 0 ? Math.round(totalWeight / recordCount) : null;
}
```

### Color Indicator Function

```javascript
/**
 * Get color class based on attendance percentage
 * @param {number|null} percentage - Attendance percentage
 * @returns {string} - CSS class name
 */
function getMarkColorClass(percentage) {
  if (percentage === null) return 'markNA';
  if (percentage >= 90) return 'markGreen';
  if (percentage >= 75) return 'markYellow';
  return 'markRed';
}
```

### Sorting Function

```javascript
/**
 * Sort students by attendance mark
 * @param {Array} students - Array of student objects with marks
 * @param {string} order - 'asc' or 'desc'
 * @returns {Array} - Sorted array
 */
function sortByMark(students, order = 'desc') {
  return [...students].sort((a, b) => {
    const markA = a.mark ?? -1;
    const markB = b.mark ?? -1;
    return order === 'asc' ? markA - markB : markB - markA;
  });
}
```

## Data Models

### Enhanced Student Attendance Record

```typescript
interface StudentAttendanceWithMark {
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
  mark: number | null;  // Calculated attendance percentage
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Attendance Mark Calculation Accuracy

*For any* student attendance record with at least one recorded day, the calculated mark SHALL equal the average of weighted values where P=100, L=50, E=75, A=0.

**Validates: Requirements 1.2**

### Property 2: Color Indicator Threshold Correctness

*For any* attendance percentage value, the color indicator function SHALL return:
- 'markGreen' for values >= 90
- 'markYellow' for values >= 75 and < 90
- 'markRed' for values < 75
- 'markNA' for null values

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

### Property 3: Sorting Preserves All Students

*For any* list of students with attendance marks, sorting by mark SHALL produce a list containing all original students in the correct order (ascending or descending by mark value).

**Validates: Requirements 3.1, 3.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No attendance records for student | Display "N/A" and use neutral color |
| Invalid attendance status value | Skip in calculation |
| Empty class | Display empty state message |
| API error | Show error message with retry option |

## Testing Strategy

### Unit Tests
- Test `calculateAttendanceMark` with various attendance combinations
- Test `getMarkColorClass` at boundary values (74, 75, 89, 90)
- Test `sortByMark` with mixed marks including null values

### Property-Based Tests
Using fast-check library for JavaScript:

1. **Mark Calculation Property Test**: Generate random attendance records and verify calculation matches expected formula
2. **Color Indicator Property Test**: Generate random percentages and verify correct color class
3. **Sorting Property Test**: Generate random student lists and verify sort order correctness

### Integration Tests
- Verify AttendanceView renders marks correctly
- Verify StudentAttendance route is removed
- Verify navigation doesn't include StudentAttendance link

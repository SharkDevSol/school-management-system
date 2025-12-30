# Design Document: Task Pages Full Screen Layout

## Overview

This design addresses the layout constraints in the task pages where content is centered with max-width limitations. The solution involves modifying CSS modules for TaskPage, TaskDetail, and Task7 components to remove width constraints and enable full-screen layouts while maintaining responsive behavior.

## Architecture

The task pages follow a component-based architecture with CSS modules for styling:

```
APP/src/PAGE/
├── TaskPage.jsx          # Main task list component
├── TaskPage.module.css   # Styles for task list
├── TaskDetail.jsx        # Task detail pages (1-6)
├── TaskDetail.module.css # Styles for task details
├── Task7.jsx             # Schedule configuration
└── Task7.module.css      # Styles for Task 7
```

The changes are purely CSS-based and do not require modifications to the React component logic.

## Components and Interfaces

### TaskPage.module.css Changes

Current constraints to remove:
- `.container` has no explicit max-width but may inherit constraints

Changes needed:
- Ensure `.container` uses `width: 100%` without max-width
- Update `.taskGrid` to use full available width
- Ensure `.progressSection` spans full width

### TaskDetail.module.css Changes

Current constraints to remove:
- `.container` has `max-width: 800px`
- `.form` has `max-width: 400px`

Changes needed:
- Remove `max-width: 800px` from `.container`
- Remove or increase `max-width` on `.form`
- Ensure `.contentArea` uses full width
- Update table containers for full width

### Task7.module.css Changes

Current constraints to remove:
- `.task7Container` has `max-width: 1200px`

Changes needed:
- Remove `max-width: 1200px` from `.task7Container`
- Ensure `.stepCard` uses full available width
- Update `.comprehensiveGrid` for full width utilization

## Data Models

No data model changes required. This is a CSS-only modification.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, all acceptance criteria are testable as specific examples rather than universal properties. The criteria involve verifying specific CSS property values on rendered components, which are best validated through visual inspection and example-based testing rather than property-based testing.

Since all criteria are example-based (testing specific CSS values at specific breakpoints), no universal correctness properties are applicable for this feature. The testing strategy will focus on visual verification and example-based tests.

## Error Handling

No error handling changes required. CSS modifications do not introduce runtime errors.

Potential issues to consider:
- Content overflow on very small screens: Handled by responsive breakpoints
- Table overflow: Handled by `overflow-x: auto` on table containers

## Testing Strategy

### Visual Testing

Since this is a CSS-only change, the primary testing approach is visual verification:

1. **Desktop Testing (>768px)**
   - Verify TaskPage container spans full width
   - Verify TaskDetail container spans full width
   - Verify Task7 container spans full width
   - Verify grids utilize available horizontal space

2. **Mobile Testing (<768px)**
   - Verify single-column layouts apply correctly
   - Verify appropriate padding is maintained
   - Verify horizontal scrolling works for tables

### Manual Test Cases

| Test Case | Component | Expected Behavior |
|-----------|-----------|-------------------|
| TC1 | TaskPage | Container has no max-width constraint |
| TC2 | TaskPage | Task grid cards fill available width |
| TC3 | TaskDetail | Container has no max-width constraint |
| TC4 | TaskDetail | Forms expand appropriately |
| TC5 | TaskDetail | Tables use full available width |
| TC6 | Task7 | Container has no max-width constraint |
| TC7 | Task7 | Configuration grid fills available width |
| TC8 | All | Responsive layout at 768px breakpoint |

### CSS Property Verification

The following CSS properties should be verified after changes:

```css
/* TaskPage.module.css */
.container {
  width: 100%;
  /* No max-width */
}

/* TaskDetail.module.css */
.container {
  width: 100%;
  /* No max-width: 800px */
}

/* Task7.module.css */
.task7Container {
  width: 100%;
  /* No max-width: 1200px */
}
```

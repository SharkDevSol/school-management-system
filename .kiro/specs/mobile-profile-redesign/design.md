# Design Document: Mobile Profile Redesign

## Overview

This design document outlines the architecture and implementation approach for redesigning the Student, Guardian, and Staff profile pages with a mobile-first app experience. The redesign transforms the current simulated mobile container (375px max-width) into a true responsive mobile app interface with modern UX patterns including bottom navigation, collapsible sections, pull-to-refresh, and smooth animations.

The implementation will use React with CSS Modules, maintaining consistency with the existing codebase while introducing reusable mobile UI components.

## Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MobileProfileLayout                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    AppHeader                         │   │
│  │  [Back] [Title] [Action]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ProfileHeader                       │   │
│  │  [Avatar] [Name] [Subtitle]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ContentArea                         │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │           CollapsibleCard                    │    │   │
│  │  │  [Header] [Expandable Content]              │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │           PostCard                           │    │   │
│  │  │  [Title] [Body] [Media] [Actions]           │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 BottomNavigation                     │   │
│  │  [Profile] [Posts] [Attendance] [Grades]            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### State Management

Each profile component will manage:
- `activeTab`: Current bottom navigation selection
- `expandedSections`: Set of expanded collapsible card IDs
- `isRefreshing`: Pull-to-refresh state
- `isLoading`: Initial data loading state

## Components and Interfaces

### Shared Mobile Components

#### MobileProfileLayout
```typescript
interface MobileProfileLayoutProps {
  children: React.ReactNode;
  title: string;
  onLogout: () => void;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}
```

#### BottomNavigation
```typescript
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavigationProps {
  items: NavItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
}
```

#### CollapsibleCard
```typescript
interface CollapsibleCardProps {
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}
```

#### ProfileHeader
```typescript
interface ProfileHeaderProps {
  imageUrl?: string;
  name: string;
  subtitle?: string;
  fallbackInitial: string;
}
```

#### SkeletonLoader
```typescript
interface SkeletonLoaderProps {
  type: 'avatar' | 'text' | 'card' | 'list';
  count?: number;
}
```

#### Toast
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}
```

#### PostCard
```typescript
interface PostCardProps {
  post: {
    id: number;
    title: string;
    body: string;
    link?: string;
    media?: Array<{ filename: string; mimetype: string; originalname: string }>;
    likes: number;
    created_at: string;
    audiences?: string[];
  };
  onLike: (postId: number) => void;
}
```

### Profile-Specific Components

#### StudentProfile
- Uses MobileProfileLayout with student-specific tabs
- Tabs: Profile, Posts, Attendance, Grades
- Displays: Core Info, Guardian Info, Additional Info in collapsible cards

#### GuardianProfile  
- Uses MobileProfileLayout with guardian-specific tabs
- Tabs: Profile, Wards, Posts, Communications
- Features horizontal swipeable WardCarousel component
- Each ward card expands to show detailed information

#### StaffProfile
- Uses MobileProfileLayout with staff-specific tabs
- Tabs: Profile, Evaluations, Posts, Communications
- Displays evaluation cards with status badges and action buttons

## Data Models

### Student Profile Data
```typescript
interface StudentData {
  id: number;
  student_name: string;
  class: string;
  class_id: string;
  age: number;
  gender: string;
  school_id: string;
  username: string;
  image_student?: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  [key: string]: any; // Additional dynamic fields
}
```

### Guardian Profile Data
```typescript
interface GuardianData {
  guardian_name: string;
  guardian_phone: string;
  guardian_username: string;
}

interface WardData extends StudentData {
  // Inherits all student fields
}
```

### Staff Profile Data
```typescript
interface StaffData {
  id: number;
  global_staff_id: string;
  name: string;
  image_staff?: string;
  [key: string]: any; // Dynamic profile fields
}

interface StaffUser {
  username: string;
  staffType: string;
  className: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Full-screen mobile layout
*For any* viewport width less than 768px, the profile container element SHALL have no max-width constraint and SHALL occupy 100% of the viewport width.
**Validates: Requirements 1.1, 6.1**

### Property 2: Loading state displays skeleton
*For any* profile page in loading state (isLoading=true), the rendered output SHALL contain skeleton loader elements and SHALL NOT contain actual profile data.
**Validates: Requirements 1.2**

### Property 3: Header displays user identity
*For any* user type (student, guardian, staff) with valid profile data, the profile header SHALL render the user's name and image (or fallback initial) in the header section.
**Validates: Requirements 1.3, 3.1, 4.1**

### Property 4: Navigation state consistency
*For any* bottom navigation interaction, clicking a navigation item SHALL update the activeTab state to match the clicked item's ID, AND the clicked item SHALL receive the active visual indicator class.
**Validates: Requirements 2.2, 2.3**

### Property 5: Ward carousel renders all wards
*For any* guardian with N wards (where N > 0), the ward carousel SHALL render exactly N ward cards, each containing the ward's name and class information.
**Validates: Requirements 3.2**

### Property 6: Evaluation cards display required elements
*For any* staff evaluation, the evaluation card SHALL display the evaluation name, status indicator, and at least one action button.
**Validates: Requirements 4.2**

### Property 7: Toast notification on action result
*For any* action that succeeds or fails (like post, refresh), a toast notification SHALL be displayed with a message string and appropriate type (success/error).
**Validates: Requirements 5.5**

### Property 8: Responsive layout adaptation
*For any* viewport width transition across the 768px breakpoint, the layout SHALL change between mobile and desktop modes, AND all profile data SHALL remain visible (no content loss).
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 9: Post media rendering
*For any* post with media attachments, the post card SHALL render a media element (image/video/download link) for each attachment. *For any* post with a link, the post card SHALL render a tappable link element.
**Validates: Requirements 7.2, 7.4**

### Property 10: Like count updates on interaction
*For any* like button click on a post, the displayed like count SHALL increment by 1 from its previous value.
**Validates: Requirements 7.3**

## Error Handling

### Network Errors
- Display toast notification with error message
- Show retry button in content area
- Maintain last known data if available

### Authentication Errors
- Redirect to appropriate login page
- Clear local storage credentials
- Display informative message

### Data Validation
- Handle missing optional fields gracefully
- Display placeholder for missing images
- Format dates consistently across locales

## Testing Strategy

### Dual Testing Approach

This implementation will use both unit tests and property-based tests:

#### Unit Tests (Vitest + React Testing Library)
- Test individual component rendering
- Test user interactions (clicks, taps)
- Test edge cases (empty data, missing fields)
- Test error states

#### Property-Based Tests (fast-check)
- Test layout properties across viewport sizes
- Test data rendering for generated profile data
- Test navigation state consistency
- Test like count invariants

### Testing Framework Configuration
- Framework: Vitest with React Testing Library
- Property-based testing: fast-check library
- Minimum iterations for property tests: 100
- Test file location: Co-located with components using `.test.jsx` suffix

### Test Annotations
Each property-based test MUST include a comment in this format:
```javascript
// **Feature: mobile-profile-redesign, Property {number}: {property_text}**
```

### Key Test Scenarios

1. **Layout Tests**
   - Verify no max-width on mobile viewport
   - Verify responsive breakpoint behavior
   - Verify bottom navigation fixed positioning

2. **Data Rendering Tests**
   - Verify header renders user identity for all user types
   - Verify all wards render in guardian carousel
   - Verify evaluation cards have required elements

3. **Interaction Tests**
   - Verify navigation state updates on click
   - Verify like count increments
   - Verify collapsible sections toggle

4. **Loading State Tests**
   - Verify skeleton renders during loading
   - Verify skeleton replaced by data after load

# Design Document: App-Wide Translation System

## Overview

This design implements comprehensive app-wide language translation support for the school management application. The system leverages the existing AppContext translation mechanism to ensure all UI text updates when users change their language preference. Additionally, it addresses profile page design issues to ensure consistent styling and proper dark mode support.

## Architecture

The translation system follows a centralized architecture using React Context:

```
┌─────────────────────────────────────────────────────────────┐
│                        AppProvider                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  translations: { en: {...}, am: {...}, om: {...} }  │   │
│  │  language: 'en' | 'am' | 'om' | 'so' | 'ar' | 'fr'  │   │
│  │  t(key): string                                      │   │
│  │  updateLanguage(lang): void                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Components Using t()                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Home    │  │ Profile  │  │  Lists   │  │ Settings │   │
│  │  Page    │  │  Pages   │  │  Pages   │  │   Page   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. AppContext (Existing - Enhanced)

The existing AppContext provides the translation infrastructure:

```javascript
// Translation function interface
t(key: string): string
// Returns translated string for current language
// Falls back to English, then to key itself

// Language update function
updateLanguage(lang: string): void
// Updates language state and persists to localStorage
```

### 2. Translation Keys Structure

New translation keys to be added for profile pages:

```javascript
{
  // Profile Tab Labels
  profile: 'Profile',
  posts: 'Posts',
  evaluations: 'Evaluations',
  communications: 'Messages',
  settings: 'Settings',
  attendance: 'Attendance',
  schedule: 'Schedule',
  marklist: 'Mark List',
  class: 'Class',
  
  // Profile Sections
  profileInformation: 'Profile Information',
  accountInformation: 'Account Information',
  
  // Actions
  refresh: 'Refresh',
  save: 'Save',
  logout: 'Logout',
  viewDetails: 'View Details',
  fillForm: 'Fill Form',
  viewReport: 'View Report',
  
  // Status Labels
  completed: 'Completed',
  pending: 'Pending',
  inProgress: 'In Progress',
  
  // Empty States
  noEvaluations: 'No evaluations assigned',
  noPosts: 'No posts yet',
  noMessages: 'No messages',
  
  // Attendance
  markAttendance: 'Mark Attendance',
  viewAttendance: 'View Attendance',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  permission: 'Permission',
  saveAttendance: 'Save Attendance',
  
  // Ward/Guardian specific
  wards: 'Wards',
  selectWard: 'Select Ward',
  wardAttendance: 'Ward Attendance'
}
```

### 3. Profile Components to Update

Components requiring translation integration:

1. **StaffProfile.jsx** - Add useApp() hook and t() function calls
2. **StudentProfile.jsx** - Add useApp() hook and t() function calls  
3. **GuardianProfile.jsx** - Add useApp() hook and t() function calls
4. **SettingsTab.jsx** - Already uses translations, verify completeness
5. **MobileProfileLayout.jsx** - Add translations for common elements

## Data Models

### Translation Object Structure

```javascript
const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    // ... existing keys
    
    // NEW: Profile-specific keys
    profile: 'Profile',
    posts: 'Posts',
    evaluations: 'Evaluations',
    communications: 'Messages',
    // ... more keys
  },
  am: {
    // Amharic translations
    profile: 'መገለጫ',
    posts: 'ልጥፎች',
    evaluations: 'ግምገማዎች',
    communications: 'መልዕክቶች',
    // ...
  },
  om: {
    // Oromo translations
    profile: 'Piroofaayilii',
    posts: 'Maxxansaalee',
    evaluations: 'Madaalliiwwan',
    communications: 'Ergaalee',
    // ...
  },
  // ... other languages
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Translation Function Returns Valid String
*For any* valid translation key and any supported language, the t() function should return a non-empty string (either the translation, English fallback, or the key itself).
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 4.2**

### Property 2: Language Persistence Round Trip
*For any* language code that is set via updateLanguage(), reading from localStorage should return the same language code.
**Validates: Requirements 1.5**

### Property 3: Translation Consistency Across Languages
*For any* translation key that exists in English, the t() function should return a value (not undefined) for all supported languages.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

## Error Handling

1. **Missing Translation Key**: Falls back to English translation, then to the key itself
2. **Invalid Language Code**: Defaults to English ('en')
3. **Context Not Available**: Components should handle undefined context gracefully

## Testing Strategy

### Unit Tests
- Test t() function returns correct translations for each language
- Test updateLanguage() persists to localStorage
- Test fallback behavior for missing keys

### Property-Based Tests
Using a property-based testing library (e.g., fast-check):

1. **Property 1 Test**: Generate random valid translation keys and languages, verify t() returns non-empty string
2. **Property 2 Test**: Generate random language codes, verify localStorage round-trip
3. **Property 3 Test**: For all keys in English translations, verify all languages return a value

### Integration Tests
- Test language change updates all visible text in profile pages
- Test dark mode styling applies correctly with translations
- Test RTL layout for Arabic language

## Implementation Notes

### CSS Design Fixes for Profile Pages

1. **Spacing**: Ensure consistent padding (16px mobile, 20px desktop)
2. **Typography**: Use proper font weights (600 for labels, 500 for values)
3. **Dark Mode**: Use CSS variables for colors that adapt to theme
4. **Tab Navigation**: Consistent height and active state styling

### Dark Mode CSS Pattern

```css
/* Light mode default */
.fieldLabel {
  color: #6b7280;
}

.fieldValue {
  color: #1f2937;
}

/* Dark mode override */
:global(.darkMode) .fieldLabel,
:global(body.dark-mode) .fieldLabel {
  color: #9ca3af;
}

:global(.darkMode) .fieldValue,
:global(body.dark-mode) .fieldValue {
  color: #e5e7eb;
}
```

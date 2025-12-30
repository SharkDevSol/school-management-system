# Design Document: User Profile Settings

## Overview

This feature adds a Settings tab to all user profile pages (StudentProfile, StaffProfile, GuardianProfile) enabling users to personalize their app experience. Users can change the app language and toggle dark mode, with preferences persisted in localStorage using user-specific keys.

## Architecture

The feature leverages the existing AppContext for theme and language management, adding a reusable SettingsTab component that can be integrated into all profile pages.

```
┌─────────────────────────────────────────────────────────────┐
│                    Profile Pages                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Bottom Navigation                       │    │
│  │  [Profile] [Posts] [...] [Settings]                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Settings Tab Content                      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │         Language Selection                   │    │    │
│  │  │  [EN] [AM] [OM] [SO] [AR] [FR]              │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │         Dark Mode Toggle                     │    │    │
│  │  │  [Light ○────● Dark]                        │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    AppContext                                │
│  - theme: { mode: 'light' | 'dark', ... }                   │
│  - language: 'en' | 'am' | 'om' | 'so' | 'ar' | 'fr'       │
│  - setTheme(), setLanguage()                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    localStorage                              │
│  - userSettings_{userId}: { language, darkMode }            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### New Component: SettingsTab

**File:** `APP/src/COMPONENTS/mobile/SettingsTab.jsx`

```javascript
interface SettingsTabProps {
  userId: string;  // Unique identifier for user-specific storage
  userType: 'student' | 'staff' | 'guardian';
}

// Available languages
const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'om', name: 'Afaan Oromoo', flag: '🇪🇹' },
  { code: 'so', name: 'Soomaali', flag: '🇸🇴' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
];
```

### Modified Components

**StudentProfile.jsx, StaffProfile.jsx, GuardianProfile.jsx:**
- Add Settings tab to navItems
- Add renderSettingsTab() function
- Import and use SettingsTab component

### Helper Functions

```javascript
// Get user-specific localStorage key
const getUserSettingsKey = (userId: string, userType: string): string => {
  return `userSettings_${userType}_${userId}`;
};

// Save user settings to localStorage
const saveUserSettings = (userId: string, userType: string, settings: UserSettings): void;

// Load user settings from localStorage
const loadUserSettings = (userId: string, userType: string): UserSettings | null;
```

## Data Models

### UserSettings
```typescript
interface UserSettings {
  language: 'en' | 'am' | 'om' | 'so' | 'ar' | 'fr';
  darkMode: boolean;
}
```

### Language Option
```typescript
interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Language options completeness
*For any* settings tab render, the language selector SHALL display exactly 6 language options (en, am, om, so, ar, fr)
**Validates: Requirements 2.1**

### Property 2: Language change persistence
*For any* language selection, after calling saveUserSettings, localStorage SHALL contain the selected language value at the user-specific key
**Validates: Requirements 2.3**

### Property 3: Theme toggle persistence
*For any* dark mode toggle, after calling saveUserSettings, localStorage SHALL contain the correct darkMode boolean value
**Validates: Requirements 3.3**

### Property 4: User-specific key format
*For any* userId and userType combination, getUserSettingsKey SHALL return a string in format `userSettings_{userType}_{userId}`
**Validates: Requirements 4.1**

## Error Handling

| Scenario | Handling |
|----------|----------|
| localStorage unavailable | Fall back to in-memory state, show warning |
| Invalid saved settings | Reset to defaults (en, light mode) |
| Missing userId | Use 'anonymous' as fallback identifier |

## Testing Strategy

### Unit Tests
- Test getUserSettingsKey returns correct format
- Test saveUserSettings writes to localStorage
- Test loadUserSettings reads from localStorage
- Test default values when no saved settings exist

### Property-Based Tests
Using fast-check for JavaScript:

1. **Property 2 Test:** Generate random language codes and verify persistence
2. **Property 3 Test:** Generate random boolean values and verify theme persistence
3. **Property 4 Test:** Generate random userId/userType combinations and verify key format

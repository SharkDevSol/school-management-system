# Design Document: Global Theme and Language Propagation

## Overview

This feature ensures consistent application of theme colors and language settings across all pages in the School Management System. The existing `AppContext` provides theme and language state management, but many pages either don't consume this context or use hardcoded values. This design extends the existing infrastructure to ensure all pages properly consume and apply theme/language settings.

## Architecture

The solution leverages React's Context API pattern already established in the application:

```
┌─────────────────────────────────────────────────────────────┐
│                      AppProvider                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Theme     │  │  Language   │  │   CSS Variables     │  │
│  │   State     │  │   State     │  │   (document root)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    useApp() Hook                             │
│  Returns: { theme, t, language, updateTheme, ... }          │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │  Post   │        │Schedule │        │  Other  │
   │  Page   │        │Dashboard│        │  Pages  │
   └─────────┘        └─────────┘        └─────────┘
```

## Components and Interfaces

### Existing Components (to be enhanced)

#### AppContext (`APP/src/context/AppContext.jsx`)
- Already provides `theme`, `language`, `t()`, `updateTheme()`, `updateLanguage()`
- Already applies CSS variables via `applyTheme()`
- No changes needed to core context

#### Pages Requiring Updates

1. **Post.jsx** - Currently imports `useApp` but only uses `t()`. Needs theme color application.
2. **ScheduleDashboard.jsx** - Currently imports `useApp` but only uses `t()`. Needs theme color application.
3. **Communication.jsx** - Currently imports `useApp` but doesn't use it fully. Needs theme and translation.
4. **ReportCard.jsx** - Does not import `useApp`. Needs full integration.
5. **CreateRegisterStudent.jsx** - Does not import `useApp`. Needs full integration.
6. **CreateRegisterStaff.jsx** - Does not import `useApp`. Needs full integration.
7. **MarkListView.jsx** - Needs verification and potential updates.

### Interface: useApp Hook

```typescript
interface Theme {
  primaryColor: string;    // Hex color e.g., '#667eea'
  secondaryColor: string;  // Hex color e.g., '#764ba2'
  mode: 'light' | 'dark';
}

interface AppContextValue {
  theme: Theme;
  updateTheme: (theme: Theme) => void;
  language: string;  // Language code e.g., 'en', 'om', 'am'
  updateLanguage: (lang: string) => void;
  t: (key: string) => string;  // Translation function
  translations: Record<string, Record<string, string>>;
}
```

## Data Models

### Theme State
```javascript
{
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  mode: 'light'
}
```

### CSS Variables (applied to document root)
```css
--primary-color: #667eea;
--secondary-color: #764ba2;
--primary-light: rgba(102, 126, 234, 0.1);
--primary-lighter: rgba(102, 126, 234, 0.05);
--primary-shadow: rgba(102, 126, 234, 0.3);
--primary-shadow-lg: rgba(102, 126, 234, 0.35);
```

### Translation Keys Structure
Each page will use translation keys from the existing `translations` object in AppContext. New keys will be added as needed for pages that don't have translations yet.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme Color Propagation
*For any* valid theme color configuration and any page component that uses the `useApp` hook, the component should receive the current theme values from context and apply them to styled elements.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Translation Completeness
*For any* supported language code and any translation key used in the application, the `t()` function should return a non-empty string (either the translated value or the English fallback).
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: Context Reactivity
*For any* update to theme or language state via `updateTheme()` or `updateLanguage()`, all components subscribed to the context should receive the updated values and re-render accordingly.
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Settings Persistence Round-Trip
*For any* theme or language setting saved to localStorage, loading the application should restore the exact same setting values.
**Validates: Requirements 4.1, 4.2**

### Property 5: Dark Mode Toggle Consistency
*For any* mode value ('light' or 'dark'), the document body should have the 'dark-mode' class if and only if the mode is 'dark'.
**Validates: Requirements 5.1, 5.2**

## Error Handling

1. **Missing Translation Keys**: The `t()` function already falls back to English if a key is missing in the selected language, then to the key itself if not found in English.

2. **Invalid Theme Colors**: The `applyTheme()` function should validate hex color format before applying. Invalid colors should be ignored and defaults retained.

3. **Context Not Available**: Components using `useApp()` outside of `AppProvider` will throw an error (existing behavior). All pages are wrapped in AppProvider at the app root.

4. **localStorage Unavailable**: If localStorage is not available (e.g., private browsing), settings should still work in-memory but won't persist.

5. **Database API Failure**: If branding API fails, the application falls back to localStorage values, then to defaults.

## Testing Strategy

### Unit Tests
- Test that each page component correctly imports and uses the `useApp` hook
- Test that translation keys exist for all supported languages
- Test that CSS variables are correctly applied when theme changes

### Property-Based Tests
The following property-based tests will be implemented using a JavaScript PBT library (fast-check):

1. **Theme Propagation Property Test**: Generate random valid hex colors, update theme, verify CSS variables match
2. **Translation Completeness Property Test**: For all language codes and all translation keys, verify t() returns non-empty strings
3. **Persistence Round-Trip Property Test**: Generate random theme/language values, save to localStorage, reload, verify values match
4. **Dark Mode Toggle Property Test**: For both mode values, verify body class state matches expected

Each property-based test will:
- Run a minimum of 100 iterations
- Be tagged with the corresponding correctness property reference
- Use the format: `**Feature: global-theme-language, Property {number}: {property_text}**`

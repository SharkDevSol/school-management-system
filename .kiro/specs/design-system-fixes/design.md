# Design Document: Design System Fixes

## Overview

This design addresses four critical issues in the School Management System's design system:
1. Registration page buttons not properly styled
2. Theme color changes not propagating to all pages
3. Language switching not affecting all components
4. Incomplete dark mode support

The solution involves refactoring CSS modules to use CSS variables consistently, ensuring all components consume the AppContext for theme and language, and creating a unified approach to dark mode styling.

## Architecture

### Current State Issues

The current implementation has these problems:
- CSS modules use hardcoded color values (e.g., `#667eea`, `#764ba2`) instead of CSS variables
- Some components don't consume the AppContext for translations
- Dark mode CSS variables exist but aren't used consistently in component styles
- Gradients are hardcoded instead of using CSS variable interpolation

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AppContext                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Theme     │  │  Language   │  │    Dark Mode            │  │
│  │ - primary   │  │ - current   │  │ - mode: light/dark      │  │
│  │ - secondary │  │ - t()       │  │ - applyTheme()          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CSS Variables (index.css)                     │
│  :root {                                                         │
│    --primary-color: #667eea;                                     │
│    --secondary-color: #764ba2;                                   │
│    --bg-color, --text-color, --card-bg, etc.                    │
│  }                                                               │
│  body.dark-mode { /* dark overrides */ }                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Component CSS Modules                         │
│  - Use var(--primary-color) instead of #667eea                  │
│  - Use var(--bg-color) for backgrounds                          │
│  - Use var(--text-color) for text                               │
│  - Use var(--card-bg) for card backgrounds                      │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced CSS Variable System (index.css)

Add additional CSS variables for comprehensive theming:

```css
:root {
  /* Theme Colors - Updated dynamically by AppContext */
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --primary-gradient: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  --primary-light: rgba(102, 126, 234, 0.1);
  --primary-shadow: rgba(102, 126, 234, 0.3);
  
  /* Light Mode Colors */
  --bg-color: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  --text-color: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --card-bg: #ffffff;
  --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  --input-bg: #ffffff;
  --hover-bg: #f1f5f9;
}

body.dark-mode {
  --bg-color: #0f172a;
  --bg-secondary: #1e293b;
  --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  --text-color: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
  --card-bg: #1e293b;
  --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  --input-bg: #1e293b;
  --hover-bg: #334155;
}
```

### 2. AppContext Enhancement

Update the `applyTheme` function to also update gradient-related CSS variables:

```javascript
const applyTheme = (themeData) => {
  document.documentElement.style.setProperty('--primary-color', themeData.primaryColor);
  document.documentElement.style.setProperty('--secondary-color', themeData.secondaryColor);
  
  // Update computed variables for gradients and shadows
  const primaryRgb = hexToRgb(themeData.primaryColor);
  if (primaryRgb) {
    document.documentElement.style.setProperty('--primary-light', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`);
    document.documentElement.style.setProperty('--primary-shadow', `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`);
  }
  
  // Apply dark mode class
  if (themeData.mode === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
};
```

### 3. CSS Module Refactoring Pattern

All CSS modules should follow this pattern:

**Before (hardcoded):**
```css
.button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}
.container {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #1e293b;
}
```

**After (CSS variables):**
```css
.button {
  background: var(--primary-gradient);
  box-shadow: 0 8px 24px var(--primary-shadow);
}
.container {
  background: var(--bg-gradient);
  color: var(--text-color);
}
```

## Data Models

No new data models required. The existing theme state structure is sufficient:

```typescript
interface ThemeState {
  primaryColor: string;    // Hex color e.g., "#667eea"
  secondaryColor: string;  // Hex color e.g., "#764ba2"
  mode: 'light' | 'dark';
}

interface AppContextValue {
  theme: ThemeState;
  updateTheme: (theme: ThemeState) => void;
  language: string;
  updateLanguage: (lang: string) => void;
  t: (key: string) => string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme Color Propagation
*For any* valid hex color set as primary or secondary color, the CSS variable on the document root SHALL equal that color value immediately after the theme update.
**Validates: Requirements 2.1, 1.4**

### Property 2: CSS Variable Usage in Styles
*For any* CSS module file in the application, all instances of the hardcoded theme colors (#667eea, #764ba2) SHALL be replaced with CSS variable references (var(--primary-color), var(--secondary-color)).
**Validates: Requirements 2.3, 2.4**

### Property 3: Translation Function Consistency
*For any* translation key that exists in the English translations, calling t(key) SHALL return the corresponding translation for the current language, or the English fallback if the key is missing in the current language.
**Validates: Requirements 3.2, 3.5**

### Property 4: Dark Mode Class Application
*For any* theme state where mode equals 'dark', the document body SHALL have the 'dark-mode' class applied, and for mode equals 'light', the class SHALL be removed.
**Validates: Requirements 4.1**

### Property 5: Dark Mode CSS Variable Values
*For any* CSS variable defined in the dark mode ruleset, when dark mode is active, the computed style SHALL use the dark mode value instead of the light mode value.
**Validates: Requirements 4.2, 4.3, 4.4**

### Property 6: Language Persistence
*For any* language selection, after page reload, the language state SHALL equal the previously selected language.
**Validates: Requirements 3.4**

## Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Invalid hex color provided | Validate hex format, fallback to default color |
| Missing translation key | Return English translation or key itself |
| Database branding load fails | Use localStorage fallback, then defaults |
| CSS variable not supported | Graceful degradation with fallback colors |

## Testing Strategy

### Unit Tests
- Test `hexToRgb` utility function with valid and invalid inputs
- Test `applyTheme` function updates CSS variables correctly
- Test `t()` translation function returns correct values
- Test language direction changes for RTL languages

### Property-Based Tests
Using a property-based testing library (e.g., fast-check for JavaScript):

1. **Theme Color Propagation Test**: Generate random valid hex colors, apply theme, verify CSS variables match
2. **Translation Fallback Test**: Generate random keys, verify fallback behavior
3. **Dark Mode Toggle Test**: Toggle mode multiple times, verify class state consistency

### Integration Tests
- Verify theme changes persist across page navigation
- Verify language changes affect all rendered components
- Verify dark mode styling applies to all page elements


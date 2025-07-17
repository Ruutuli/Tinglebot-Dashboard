# CSS Duplicate Style Checker

A Node.js tool that analyzes CSS files to find duplicate styles, redundant rules, and opportunities for consolidation.

## Features

- **Duplicate Selectors**: Finds CSS selectors that are defined multiple times
- **Duplicate Properties**: Identifies repeated property-value pairs across different rules
- **Similar Rules**: Groups rules with identical properties for potential consolidation
- **Comprehensive Reporting**: Generates detailed console output and JSON reports
- **Recursive Scanning**: Automatically finds all CSS files in subdirectories

## Installation

1. Install the required dependency:
```bash
npm install css
```

Or if you want to use the separate package.json:
```bash
cp css-checker-package.json package.json
npm install
```

## Usage

### Basic Usage
```bash
# Analyze current directory
node css-duplicate-checker.js

# Analyze specific directory
node css-duplicate-checker.js public/css

# Analyze multiple directories
node css-duplicate-checker.js .
```

### Using npm scripts (if using the separate package.json)
```bash
# Check current directory
npm run check

# Check CSS directory specifically
npm run check:css
```

## Output

The script provides:

1. **Console Report**: Detailed analysis printed to console
2. **JSON Report**: Exported to `css-duplicates-report.json`

### Console Output Example
```
================================================================================
CSS DUPLICATE STYLES REPORT
================================================================================

Analyzed 15 CSS files:
  - public/css/styles.css
  - public/css/dashboard.css
  - public/css/buttons.css
  ...

----------------------------------------
DUPLICATE SELECTORS
----------------------------------------

Selector: .calendar-stat-item
Found 2 times:
  - public/css/calender.css:25
  - public/css/dashboard.css:45

----------------------------------------
DUPLICATE PROPERTY-VALUE PAIRS
----------------------------------------

Property: background = var(--card-background)
Found 3 times:
  - public/css/calender.css:15 (.calendar-overview)
  - public/css/dashboard.css:23 (.card-container)
  - public/css/buttons.css:12 (.btn-primary)

----------------------------------------
SIMILAR RULES (Potential Consolidation)
----------------------------------------

Group 1:
Properties: background:var(--card-background);border:1px solid var(--border-color);border-radius:var(--card-radius)
Found 2 similar rules:
  - public/css/calender.css:15 (.calendar-overview)
  - public/css/dashboard.css:23 (.card-container)

================================================================================
SUMMARY
================================================================================
Total CSS files analyzed: 15
Total CSS rules found: 1,247
Duplicate selectors: 5
Duplicate properties: 23
Similar rule groups: 8

⚠️  Found potential issues. Consider consolidating duplicate styles.
```

## What It Finds

### 1. Duplicate Selectors
CSS rules with the same selector defined multiple times:
```css
/* Found in multiple files */
.calendar-stat-item {
    background: var(--bg-secondary);
    padding: 1.5rem;
}
```

### 2. Duplicate Properties
Same property-value pairs used across different selectors:
```css
/* These could be consolidated into a utility class */
.card { background: var(--card-background); }
.sidebar { background: var(--card-background); }
.header { background: var(--card-background); }
```

### 3. Similar Rules
Rules with identical properties that could be combined:
```css
/* These have identical properties */
.calendar-overview {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: var(--card-radius);
    padding: 2rem;
}

.dashboard-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: var(--card-radius);
    padding: 2rem;
}
```

## Recommendations

Based on the analysis, consider:

1. **Create Utility Classes**: For commonly repeated properties
2. **Consolidate Similar Rules**: Combine rules with identical properties
3. **Remove Duplicate Selectors**: Keep only one definition per selector
4. **Use CSS Custom Properties**: For consistent values across rules

## Example Refactoring

### Before (with duplicates)
```css
.calendar-overview {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: var(--card-radius);
    padding: 2rem;
}

.dashboard-card {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: var(--card-radius);
    padding: 2rem;
}
```

### After (consolidated)
```css
.card-base {
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: var(--card-radius);
    padding: 2rem;
}

.calendar-overview {
    /* Inherit from .card-base */
}

.dashboard-card {
    /* Inherit from .card-base */
}
```

## JSON Report Structure

The exported JSON file contains:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "filesAnalyzed": ["public/css/styles.css", ...],
  "totalRules": 1247,
  "duplicates": {
    "selectors": {
      ".calendar-stat-item": [
        {"file": "public/css/calender.css", "line": 25},
        {"file": "public/css/dashboard.css", "line": 45}
      ]
    },
    "properties": {
      "background:var(--card-background)": [
        {"file": "public/css/calender.css", "line": 15, "selector": ".calendar-overview"}
      ]
    },
    "similarRules": [
      {
        "properties": "background:var(--card-background);border:1px solid var(--border-color)",
        "rules": [...]
      }
    ]
  }
}
```

## Requirements

- Node.js >= 12.0.0
- npm or yarn

## License

MIT 
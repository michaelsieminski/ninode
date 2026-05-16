# OpenTUI Documentation
Please always refer to the [OpenTUI](https://github.com/sst/opentui/blob/main/packages/core/docs/development.md) and [OpenTUI React](https://github.com/sst/opentui/tree/main/packages/react) Documentations for detailed information on using the TUI framework effectively.

## Developmemnt Guidelines
- Never run the dev server as it probably is already running in another terminal

## Code Style & Guidelines
- **Stack:** Bun + React 19 + @opentui/react (TUI).
- **Components:** Use functional components with hooks.
- **TUI Elements:** Use `<box>`, `<text>`, `<ascii-font>` from `@opentui/react`.
  - Layout: Use Flexbox props on `<box>` (e.g., `flexGrow`, `alignItems`).
- **TypeScript:** Strict mode enabled. Use `import type` for type-only imports.
- **Formatting:** 2 spaces indentation, double quotes, semicolons required.
- **Naming:** PascalCase for components, camelCase for variables/functions.
- **Async:** Top-level await is allowed in entry files.
- **Imports:** Group external imports first, then internal.

## Styling Guidelines

### Color Philosophy
- **Subtle & Pleasant:** Use low-contrast colors that are easy on the eyes
- **No Borders:** Use dark gray backgrounds instead of borders for cleaner look
- **No Emojis:** Maintain professional appearance without emoji characters
- **Consistent Spacing:** Use consistent gaps and margins throughout interface
- **Visual Hierarchy:** Use text attributes (bold, dim) and grayscale variations rather than bright colors

### Background Colors

**Dark Backgrounds (Base Layers):**
- `#0A0A0A` - Darkest background for aggregate/summary sections (Dashboard stats)
- `#0C0C0C` - Very dark background for default/non-selected items (ServerList default)
- `#0E0E0E` - Standard dark background for containers and unselected states (Sidebar, cards)
- `#111111` - Slightly lighter dark for non-selected items (Sidebar items)
- `#171717` - Lighter dark gray for selected/active states (ServerMetricsCard, Sidebar selected)

**Error Backgrounds:**
- `#260101` - Very dark red background for error message boxes

**Usage Rules:**
- Use darker backgrounds (`#0A0A0A`, `#0C0C0C`) for base layers
- Use `#0E0E0E` as the default container background
- Use `#171717` to highlight selected/active items
- Always pair error backgrounds with appropriate error text colors

### Brand / Primary Color

- `#9FBAFF` - Soft blue, ninode's brand primary. Used as the accent that signals
  interactive or branded content across the app.

**Where to use it:**
- Selected/active navigation items (sidebar entry, selected server card title)
- Focused action buttons (`[Save]`, `[Cancel]`, `[Connect]`, etc.)
- Keyboard shortcut keys in hint bars (`^B`, `ENTER`, `a`, `d`, ...)
- Focused input labels (the `Label:` part, not the value)
- Page titles (`Dashboard`, server name in detail view, `Add Server`)
- Sidebar selection indicator (`▎` bar)

**Where NOT to use it:**
- Long-form body text or data values — keep those grayscale for readability
- Status indicators — those keep their semantic colors (green/amber/red)
- Anything inside backgrounds that would clash (avoid on `#260101` error bg)

### Foreground Colors

**Grayscale Hierarchy (Primary to Subtle):**
- `#FFFFFF` - White, reserved for high-contrast values where the brand color would
  reduce legibility (e.g. focused input text). Prefer `#9FBAFF` for active state.
- `#8B8B8B` - Medium gray for normal text, data values, secondary information
- `#6B6B6B` - Darker gray for tertiary text, detailed metrics
- `#5C5C5C` - Even darker gray for labels, section headers, loading states
- `#3D3D3D` - Very dark gray for extremely dim text, hints
- `#343434` - Nearly invisible gray for idle indicators

**Usage Rules:**
- Use `#9FBAFF` (brand) for active/selected states and primary headings; reserve
  `#FFFFFF` only for value text where contrast matters more than brand presence
- Use `#8B8B8B` for regular content and data display
- Use `#5C5C5C` - `#6B6B6B` range for labels and secondary info
- Use `#3D3D3D` - `#343434` for very subtle hints or inactive states

### Status & Semantic Colors

**Success States:**
- `#66AA66` - Soft green for success indicators, low usage (<70%) in progress bars
- Use for: Connected states, successful operations, healthy metrics

**Warning States:**
- `#CCAA66` - Soft amber for warning indicators, medium-high usage (70-89%) in progress bars
- Use for: Moderate resource usage, attention needed but not critical

**Error States:**
- `#CC6666` - Soft red for error indicators, high usage (90%+) in progress bars
- `#8B5050` - Medium red text for error messages
- `#6B3030` - Dark red text for error labels or subtle error states
- Use for: Connection failures, critical resource usage, operation failures

**Real-time Indicators:**
- `#66AA66` - Success/active refresh indicator
- `#CC6666` - Error refresh indicator
- `#343434` - Idle refresh indicator

**Usage Rules:**
- Always use soft, muted versions of status colors (never pure red/green/yellow)
- Pair status colors with dark backgrounds when possible
- For errors, use dark red background (`#260101`) with red text (`#940808` or `#8B5050`)
- Never use bright or saturated status colors

### Text Attributes

**Numeric Attributes (Terminal Colors):**
- `0` - Normal/default text style
- `1` - Bold text for emphasis, selected items, headings
- `2` - Dim/green tint (terminal color 2) for secondary info, timestamps, metadata
- `4` - Red (terminal color 4) for error status labels
- `8` - Yellow (terminal color 8) for warning/connecting status labels

**Usage Rules:**
- Use `attributes={1}` (bold) for selected items and headings
- Use `attributes={2}` (dim) for metadata, counts, timestamps
- Use numeric color attributes (2, 4, 8) only for status labels in specific contexts
- Prefer explicit `fg` colors over numeric attributes for most text styling

### Component-Specific Patterns

**Selection/Focus States:**
- Background: `#171717` (or `#0E0E0E` for less emphasis)
- Text: `#9FBAFF` (brand) with `attributes={1}` (bold)
- Indicator: Add `"▎ "` (brand-colored bar) or `"> "` prefix

**Navigation/Sidebar:**
- Selected: background `#171717`, text `#9FBAFF` bold, leading `▎` accent in `#9FBAFF`
- Unselected: background `#111111`, text `#5C5C5C`
- Container: background `#0E0E0E`

**Cards/Panels:**
- Selected: background `#171717`, title `#9FBAFF` bold, leading `▎ ` accent
- Unselected: background `#0E0E0E`, title `#8B8B8B` normal
- Labels: `#5C5C5C`
- Values: `#8B8B8B` or `#6B6B6B`

**Buttons/Actions:**
- Focused: text `#9FBAFF` (brand)
- Unfocused: text `#8B8B8B`
- Use bracket notation: `[Connect]`, `[Disconnect]`

**Keyboard Hints:**
- Key: `#9FBAFF` (brand)
- Label: `#6B6B6B`

**Progress Bars:**
- Low usage (0-69%): `#66AA66` (green)
- Medium usage (70-89%): `#CCAA66` (amber)
- High usage (90-100%): `#CC6666` (red)
- Bar symbols: `=` for filled, `-` for empty

**Error Messages:**
- Container: background `#260101`, padding `{1}`
- Text: `#940808` or `#8B5050`
- Format: "Error: {message}"

**Empty States:**
- Container: background `#0E0E0E`, padding `{2}`
- Text: `#5C5C5C`
- Secondary text: `#3D3D3D` with `attributes={2}`

### Best Practices

1. **Consistency:** Always use exact hex codes from this guide
2. **Contrast:** Ensure sufficient contrast between text and background
3. **Hierarchy:** Use grayscale variations to establish visual hierarchy
4. **Status:** Use semantic colors sparingly and consistently
5. **Accessibility:** Avoid relying solely on color to convey information
6. **Layering:** Use darker backgrounds for lower layers, lighter for higher layers
7. **Selection:** Always make selected states obvious with background and text color changes
8. **Errors:** Always use dark backgrounds with colored text, never bright backgrounds
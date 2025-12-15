# Task: Setup Project Structure and Core Layout

**Priority:** High  
**Estimated Time:** 1-2 hours  
**Dependencies:** None

## Description
Create the basic project structure and implement the core layout components that will serve as the foundation for the ninode application.

## Requirements Addressed
- REQ-7.2: Responsive layout for different terminal sizes
- REQ-7.3: Color-coded status indicators
- Foundation for all UI components

## Implementation Details

### 1. Create Component Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── StatusBar.tsx
│   └── common/
│       ├── Button.tsx
│       └── Loading.tsx
├── types/
│   └── index.ts
└── hooks/
    └── index.ts
```

### 2. Core Layout Components
- **AppLayout**: Main application layout with sidebar and content area
- **Sidebar**: Navigation menu for different sections (Dashboard, Servers, Processes, Logs)
- **StatusBar**: Bottom status bar showing connection status and help info

### 3. Basic Types
```typescript
// types/index.ts
export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
}

export type NavigationSection = 'dashboard' | 'servers' | 'processes' | 'logs';
```

### 4. Basic Styling
- Use consistent color scheme for status indicators
- Implement responsive flexbox layout
- Add loading states and basic animations

## Acceptance Criteria
1. Project structure created as specified
2. AppLayout renders with sidebar and content area
3. Sidebar shows navigation sections
4. StatusBar displays basic connection status
5. Layout adapts to different terminal sizes
6. Navigation between sections works (basic routing)

## Next Steps
This task provides the foundation for all subsequent UI components and features.

# Task: Basic Dashboard with System Metrics

**Priority:** High  
**Estimated Time:** 2-3 hours  
**Dependencies:** 002-ssh-connections.md

## Description
Create the main dashboard that displays real-time system metrics (CPU, memory, disk) for connected servers.

## Requirements Addressed
- REQ-2.1: Display real-time CPU usage
- REQ-2.2: Show memory utilization
- REQ-2.3: Monitor disk usage and available space
- REQ-6.1: Dashboard updates every 2-5 seconds

## Implementation Details

### 1. Data Collection Services
```
src/services/data/
├── MetricsCollector.ts
├── SystemInfo.ts
└── parsers/
    ├── CPUParser.ts
    ├── MemoryParser.ts
    └── DiskParser.ts
```

### 2. Metrics Collection
```typescript
// services/data/MetricsCollector.ts
export class MetricsCollector {
  async collectCPUMetrics(connectionId: string): Promise<CPUMetrics>;
  async collectMemoryMetrics(connectionId: string): Promise<MemoryMetrics>;
  async collectDiskMetrics(connectionId: string): Promise<DiskMetrics>;
  startPeriodicCollection(connectionId: string, interval: number): void;
}

// Types for metrics
export interface CPUMetrics {
  usage: number;
  loadAverage: [number, number, number];
  cores: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  swapTotal: number;
  swapUsed: number;
}

export interface DiskMetrics {
  filesystem: string;
  total: number;
  used: number;
  free: number;
  usagePercent: number;
  mountpoint: string;
}
```

### 3. Dashboard Components
```
src/components/dashboard/
├── Dashboard.tsx
├── MetricsGrid.tsx
├── CPUMonitor.tsx
├── MemoryMonitor.tsx
└── DiskMonitor.tsx
```

### 4. Command Execution
- CPU: `top -bn1 | grep "Cpu(s)"` and `uptime`
- Memory: `free -m`
- Disk: `df -h`

### 5. Real-time Updates
- Use React hooks with intervals for periodic updates
- Implement caching to prevent excessive SSH calls
- Handle connection failures gracefully

### 6. Visual Design
- Color-coded usage indicators (green/yellow/red)
- Progress bars for visual representation
- Compact layout suitable for terminal display
- Server selection dropdown or tabs

## Technical Notes
- Parse command output reliably across different Linux distributions
- Implement error handling for failed commands
- Use debouncing to prevent excessive re-renders
- Cache metrics with short TTL (2-5 seconds)

## Acceptance Criteria
1. Dashboard displays CPU, memory, and disk metrics
2. Metrics update every 2-5 seconds automatically
3. Can switch between different connected servers
4. Visual indicators show usage levels with appropriate colors
5. Handles connection failures gracefully (shows last known data)
6. Layout is responsive to terminal size changes

## Dependencies
- SSH connection management
- Command parsing utilities
- React state management for real-time updates

## Next Steps
This provides the core monitoring functionality that users will see most often.
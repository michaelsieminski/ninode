# Task: Log Viewer and Monitoring

**Priority:** Medium  
**Estimated Time:** 2-3 hours  
**Dependencies:** 004-process-management.md

## Description
Implement a log viewer that allows users to monitor system and application logs in real-time across connected servers.

## Requirements Addressed
- REQ-4.1: View system logs (syslog, auth.log, etc.)
- REQ-4.2: Monitor application logs in real-time
- REQ-4.3: Filter logs by severity level
- REQ-4.4: Search logs by keyword or pattern

## Implementation Details

### 1. Log Reading Service
```
src/services/data/
├── LogReader.ts
└── parsers/
    └── LogParser.ts
```

### 2. Log Data Management
```typescript
// services/data/LogReader.ts
export class LogReader {
  async getLogFiles(connectionId: string): Promise<LogFile[]>;
  async readLog(connectionId: string, filePath: string, lines?: number): Promise<LogEntry[]>;
  async tailLog(connectionId: string, filePath: string): Promise<ReadableStream<LogEntry>>;
  async searchLog(connectionId: string, filePath: string, pattern: string): Promise<LogEntry[]>;
}

export interface LogFile {
  path: string;
  name: string;
  size: number;
  modified: Date;
  type: 'system' | 'application' | 'access';
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  source?: string;
  rawLine: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
```

### 3. Log UI Components
```
src/components/logs/
├── LogViewer.tsx
├── LogEntry.tsx
├── LogFilter.tsx
├── LogSearch.tsx
└── LogFileSelector.tsx
```

### 4. Log Sources
- **System Logs**: `/var/log/syslog`, `/var/log/auth.log`, `/var/log/kern.log`
- **Application Logs**: Common locations like `/var/log/nginx/`, `/var/log/apache2/`
- **Custom Logs**: User-specified log file paths

### 5. Features
- **File Selection**: Dropdown to choose log files
- **Real-time Tailing**: Follow log files with `tail -f`
- **Level Filtering**: Filter by log severity with color coding
- **Search**: Search log entries by keyword or regex pattern
- **Auto-scroll**: Follow new entries or manual scroll control
- **Timestamp Formatting**: Human-readable timestamp display

### 6. Performance Considerations
- Stream logs rather than loading entire files
- Implement buffer management for real-time updates
- Use virtual scrolling for large log lists
- Limit history to prevent memory issues

## Technical Notes
- Use `tail -f` for real-time log monitoring
- Parse syslog format and common application log formats
- Implement proper stream cleanup when switching files
- Handle log rotation and file availability

## Acceptance Criteria
1. Can select from available log files on server
2. Real-time log streaming works with auto-scroll
3. Can filter logs by severity level (info, warn, error)
4. Search functionality finds matching log entries
5. Color coding for different log levels
6. Handles large log files without performance issues
7. Can stop/start real-time monitoring

## Dependencies
- SSH connection management
- Stream handling for real-time data
- Virtual scrolling component

## Next Steps
This provides essential troubleshooting and monitoring capabilities for system administrators.
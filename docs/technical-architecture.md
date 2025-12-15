# Ninode - Technical Architecture Document

## Technology Stack

### Core Technologies
- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **UI Framework**: React 19 with @opentui/react (Terminal UI)
- **Language**: TypeScript (strict mode)
- **Package Manager**: Bun
- **SSH Client**: Node.js SSH2 library or equivalent

### Development Tools
- **Build Tool**: Bun built-in bundler
- **Linting**: ESLint with TypeScript rules
- **Testing**: Bun test framework
- **Hot Reload**: Bun --watch mode

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Ninode Application                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   UI Layer  │  │ State Mgmt  │  │   Service Layer     │   │
│  │             │  │             │  │                     │   │
│  │ • Dashboard │  │ • React     │  │ • SSH Manager       │   │
│  │ • Navigation│  │   Context   │  │ • Data Collector    │   │
│  │ • Forms     │  │ • Custom    │  │ • Alert Engine      │   │
│  │ • Modals    │  │   Hooks     │  │ • Config Manager    │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Local     │  │   SSH       │  │   Remote Servers    │   │
│  │   Storage   │  │   Clients   │  │                     │   │
│  │             │  │             │  │ • System Metrics    │   │
│  │ • Config    │  │ • Connections│  │ • Process Lists     │   │
│  │ • Cache     │  │ • Commands  │  │ • Log Files         │   │
│  │ • History   │  │ • Streams   │  │ • System Info       │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### UI Components Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── StatusBar.tsx
│   ├── dashboard/
│   │   ├── Dashboard.tsx
│   │   ├── MetricsGrid.tsx
│   │   ├── CPUMonitor.tsx
│   │   ├── MemoryMonitor.tsx
│   │   └── DiskMonitor.tsx
│   ├── servers/
│   │   ├── ServerList.tsx
│   │   ├── ServerCard.tsx
│   │   └── AddServerModal.tsx
│   ├── processes/
│   │   ├── ProcessList.tsx
│   │   ├── ProcessRow.tsx
│   │   └── ProcessActions.tsx
│   ├── logs/
│   │   ├── LogViewer.tsx
│   │   ├── LogFilter.tsx
│   │   └── LogEntry.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Loading.tsx
```

### Service Layer Structure
```
src/
├── services/
│   ├── ssh/
│   │   ├── SSHManager.ts
│   │   ├── SSHConnection.ts
│   │   └── CommandExecutor.ts
│   ├── data/
│   │   ├── MetricsCollector.ts
│   │   ├── ProcessMonitor.ts
│   │   ├── LogReader.ts
│   │   └── SystemInfo.ts
│   ├── storage/
│   │   ├── ConfigManager.ts
│   │   ├── CacheManager.ts
│   │   └── HistoryManager.ts
│   └── alerts/
│       ├── AlertEngine.ts
│       ├── ThresholdManager.ts
│       └── NotificationManager.ts
```

## Data Flow Architecture

### State Management Strategy
- **Global State**: React Context for application-wide state
- **Server State**: Custom hooks for server-specific data
- **UI State**: Local component state for UI interactions
- **Cache State**: In-memory caching with TTL for metrics

### Data Flow Patterns
```
1. Metrics Collection Flow:
   SSH Command → Parser → Cache → React State → UI Update

2. User Interaction Flow:
   UI Event → Action Handler → Service Call → State Update → UI Re-render

3. Alert Processing Flow:
   Metrics Check → Threshold Compare → Alert Trigger → UI Notification
```

## SSH Integration Architecture

### Connection Management
```typescript
interface SSHConnection {
  id: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  status: 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
}

class SSHManager {
  private connections: Map<string, SSHConnection>;
  
  async connect(config: ServerConfig): Promise<SSHConnection>;
  async executeCommand(connectionId: string, command: string): Promise<CommandResult>;
  async streamCommand(connectionId: string, command: string): Promise<ReadableStream>;
  async disconnect(connectionId: string): Promise<void>;
}
```

### Command Execution Strategy
- **System Commands**: Use standard Linux commands (`top`, `free`, `df`, etc.)
- **Parsing**: Custom parsers for command output
- **Error Handling**: Timeout and retry mechanisms
- **Security**: Command validation and sanitization

## Performance Optimization

### Caching Strategy
- **Metrics Cache**: 5-second TTL for dashboard data
- **Process Cache**: 10-second TTL for process lists
- **Log Cache**: Streaming with buffer management
- **Config Cache**: Persistent with change detection

### Memory Management
- **Connection Pooling**: Reuse SSH connections
- **Data Cleanup**: Automatic cleanup of old data
- **Stream Management**: Proper stream disposal
- **Component Unmounting**: Cleanup intervals and subscriptions

### Rendering Optimization
- **Virtual Scrolling**: For large lists (processes, logs)
- **Debounced Updates**: Prevent excessive re-renders
- **Memoization**: Cache expensive computations
- **Lazy Loading**: Load components on demand

## Security Architecture

### Credential Management
```typescript
interface CredentialStore {
  store(serverId: string, credentials: SecureCredentials): Promise<void>;
  retrieve(serverId: string): Promise<SecureCredentials>;
  delete(serverId: string): Promise<void>;
}

class SecureCredentialStore implements CredentialStore {
  // Use system keychain or encrypted local storage
  // Never store passwords in plain text
}
```

### Security Measures
- **Input Validation**: Sanitize all user inputs
- **Command Whitelisting**: Only allow predefined commands
- **Connection Limits**: Prevent resource exhaustion
- **Audit Logging**: Track all system interactions

## Error Handling & Resilience

### Error Categories
1. **Connection Errors**: Network failures, authentication issues
2. **Command Errors**: Invalid commands, permission denied
3. **Parse Errors**: Unexpected command output
4. **UI Errors**: Component failures, rendering issues

### Recovery Strategies
- **Automatic Reconnection**: Exponential backoff with max retries
- **Graceful Degradation**: Show cached data when unavailable
- **User Notifications**: Clear error messages and actions
- **Fallback Mechanisms**: Alternative data sources

## Testing Strategy

### Unit Testing
- **Service Layer**: Mock SSH connections, test data parsing
- **Components**: Test rendering and user interactions
- **Utilities**: Test helper functions and validators
- **Hooks**: Test custom React hooks

### Integration Testing
- **SSH Integration**: Test with real SSH servers (Docker containers)
- **End-to-End**: Test complete user workflows
- **Performance**: Test with multiple concurrent connections

### Test Tools
- **Framework**: Bun test
- **Mocking**: Built-in mocking capabilities
- **SSH Testing**: Docker containers with SSH servers
- **UI Testing**: Component testing utilities

## Deployment & Distribution

### Build Process
```typescript
// bun.build.config.ts
export default {
  entrypoints: ["src/index.tsx"],
  target: "bun",
  minify: true,
  external: ["@opentui/core", "@opentui/react"],
  outdir: "dist"
};
```

### Distribution Strategy
- **Single Binary**: Bundle application with Bun
- **Package Managers**: NPM, Homebrew, AUR
- **Installation Scripts**: Automated setup and configuration
- **Updates**: Self-updating mechanism

## Monitoring & Observability

### Application Metrics
- **Performance**: Memory usage, CPU consumption
- **Errors**: Error rates, types, and frequencies
- **Usage**: Feature usage, session duration
- **Connections**: Success rates, latency

### Logging Strategy
- **Structured Logging**: JSON format for easy parsing
- **Log Levels**: Debug, Info, Warn, Error
- **Log Rotation**: Prevent disk space issues
- **Privacy**: No sensitive data in logs

## Future Architecture Considerations

### Scalability
- **Plugin System**: Allow custom metric collectors
- **API Integration**: Support for monitoring APIs
- **Database Storage**: Persistent historical data
- **Multi-User**: Shared configurations and dashboards

### Extensibility
- **Custom Commands**: User-defined monitoring commands
- **Themes**: Customizable terminal themes
- **Integrations**: Third-party service integrations
- **Automation**: Scriptable actions and workflows

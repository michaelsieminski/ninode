# Task: SSH Connection Management

**Priority:** High  
**Estimated Time:** 2-3 hours  
**Dependencies:** 001-project-structure.md

## Description
Implement the core SSH connection management system that allows ninode to connect to remote Linux servers and execute commands.

## Requirements Addressed
- REQ-1.1: Support SSH-based connections to remote Linux servers
- REQ-1.2: Store and manage multiple server configurations
- REQ-1.3: Test connectivity before adding servers
- REQ-1.4: Support key-based and password authentication
- REQ-8.1: Secure credential storage

## Implementation Details

### 1. SSH Service Layer
```
src/services/ssh/
├── SSHManager.ts
├── SSHConnection.ts
└── CommandExecutor.ts
```

### 2. Core Classes
```typescript
// services/ssh/SSHManager.ts
export class SSHManager {
  private connections: Map<string, SSHConnection>;
  
  async connect(config: ServerConfig): Promise<SSHConnection>;
  async disconnect(connectionId: string): Promise<void>;
  async testConnection(config: ServerConfig): Promise<boolean>;
  getConnectionStatus(connectionId: string): ConnectionStatus;
}

// services/ssh/SSHConnection.ts
export class SSHConnection {
  async executeCommand(command: string): Promise<CommandResult>;
  async streamCommand(command: string): Promise<ReadableStream>;
  isConnected(): boolean;
}
```

### 3. Server Configuration
```typescript
export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key';
  password?: string; // Encrypted
  keyPath?: string;
}
```

### 4. Secure Storage
- Implement encrypted local storage for credentials
- Use system keychain when available
- Never store passwords in plain text

### 5. Connection UI Components
- Server list component
- Add server modal with form validation
- Connection status indicators
- Test connection functionality

## Technical Notes
- Use SSH2 library or similar for SSH connections
- Implement connection pooling for efficiency
- Add proper error handling and timeout management
- Support both password and key-based authentication

## Acceptance Criteria
1. Can add/remove server configurations
2. Successfully connects to test SSH servers
3. Supports both password and key authentication
4. Credentials are stored securely
5. Connection status is displayed in real-time
6. Can test connectivity before saving server config

## Dependencies
- SSH library (ssh2 or similar)
- Encryption library for credential storage
- Form validation components

## Next Steps
This enables all server monitoring features by providing the communication layer.

# Task: Configuration Management and Persistence

**Priority:** Medium  
**Estimated Time:** 1-2 hours  
**Dependencies:** 002-ssh-connections.md

## Description
Implement configuration management and data persistence for server settings, user preferences, and application state.

## Requirements Addressed
- REQ-1.2: Store and manage multiple server configurations
- REQ-8.1: Secure credential storage
- Foundation for all persistent features

## Implementation Details

### 1. Storage Services
```
src/services/storage/
├── ConfigManager.ts
├── CacheManager.ts
└── HistoryManager.ts
```

### 2. Configuration Management
```typescript
// services/storage/ConfigManager.ts
export class ConfigManager {
  async saveServerConfig(config: ServerConfig): Promise<void>;
  async getServerConfigs(): Promise<ServerConfig[]>;
  async deleteServerConfig(id: string): Promise<void>;
  async saveUserPreferences(prefs: UserPreferences): Promise<void>;
  async getUserPreferences(): Promise<UserPreferences>;
}

export interface UserPreferences {
  refreshInterval: number;
  theme: 'default' | 'dark' | 'light';
  defaultServer?: string;
  autoConnect: boolean;
  showHiddenFiles: boolean;
}
```

### 3. Secure Credential Storage
```typescript
// services/storage/SecureStorage.ts
export class SecureStorage {
  async storeCredentials(serverId: string, credentials: SecureCredentials): Promise<void>;
  async retrieveCredentials(serverId: string): Promise<SecureCredentials>;
  async deleteCredentials(serverId: string): Promise<void>;
}

export interface SecureCredentials {
  username: string;
  authMethod: 'password' | 'key';
  encryptedData: string; // Encrypted password or key path
}
```

### 4. Cache Management
```typescript
// services/storage/CacheManager.ts
export class CacheManager {
  async set(key: string, data: any, ttl?: number): Promise<void>;
  async get<T>(key: string): Promise<T | null>;
  async delete(key: string): Promise<void>;
  async clear(): Promise<void>;
}
```

### 5. Storage Strategy
- **Configuration**: JSON files in user config directory
- **Credentials**: Encrypted storage using system keychain
- **Cache**: In-memory with optional file persistence
- **History**: Rotating log files for command history

### 6. Configuration Locations
- **Linux/macOS**: `~/.config/ninode/`
- **Windows**: `%APPDATA%/ninode/`
- **Portable**: Local directory for portable installations

### 7. Features
- **Import/Export**: Configuration backup and restore
- **Migration**: Handle configuration format changes
- **Validation**: Ensure configuration integrity
- **Encryption**: AES-256 for sensitive data

## Technical Notes
- Use Node.js `fs` module for file operations
- Implement proper error handling for file I/O
- Add configuration validation and schema checking
- Use atomic writes to prevent corruption

## Acceptance Criteria
1. Server configurations persist between application runs
2. Credentials are stored securely and encrypted
3. User preferences are saved and restored
4. Can import/export configuration files
5. Handles configuration file corruption gracefully
6. Works across different operating systems

## Dependencies
- File system access
- Encryption library
- Configuration validation

## Next Steps
This enables all features that require persistent data storage.

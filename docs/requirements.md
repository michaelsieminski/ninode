# Ninode - Requirements Document

## Project Overview
Ninode is a terminal-based application built with React 19 and @opentui/react for monitoring Linux-based remote servers. The application provides real-time system monitoring capabilities through a text-based user interface.

## Core Requirements

### Functional Requirements

#### 1. Server Connection Management
- **REQ-1.1**: Support SSH-based connections to remote Linux servers
- **REQ-1.2**: Store and manage multiple server configurations (host, port, credentials)
- **REQ-1.3**: Test connectivity before adding servers to monitoring list
- **REQ-1.4**: Support key-based and password authentication

#### 2. System Monitoring Dashboard
- **REQ-2.1**: Display real-time CPU usage (percentage, load averages)
- **REQ-2.2**: Show memory utilization (RAM, swap usage)
- **REQ-2.3**: Monitor disk usage and available space
- **REQ-2.4**: Display network interface statistics
- **REQ-2.5**: Show system uptime and process count

#### 3. Process Management
- **REQ-3.1**: List running processes with resource consumption
- **REQ-3.2**: Sort processes by CPU, memory, or name
- **REQ-3.3**: Kill processes remotely (with confirmation)
- **REQ-3.4**: Search/filter processes by name

#### 4. Log Monitoring
- **REQ-4.1**: View system logs (syslog, auth.log, etc.)
- **REQ-4.2**: Monitor application logs in real-time
- **REQ-4.3**: Filter logs by severity level
- **REQ-4.4**: Search logs by keyword or pattern

#### 5. Alert System
- **REQ-5.1**: Configure threshold-based alerts (CPU > 80%, memory > 90%, etc.)
- **REQ-5.2**: Visual indicators for alert conditions
- **REQ-5.3**: Alert history and acknowledgment

### Non-Functional Requirements

#### 6. Performance
- **REQ-6.1**: Dashboard updates every 2-5 seconds
- **REQ-6.2**: Connection establishment within 10 seconds
- **REQ-6.3**: Support monitoring up to 10 servers simultaneously

#### 7. Usability
- **REQ-7.1**: Intuitive keyboard navigation
- **REQ-7.2**: Responsive layout for different terminal sizes
- **REQ-7.3**: Color-coded status indicators
- **REQ-7.4**: Help system with keyboard shortcuts

#### 8. Security
- **REQ-8.1**: Secure credential storage (encrypted local storage)
- **REQ-8.2**: No password logging or exposure
- **REQ-8.3**: Support for SSH key authentication
- **REQ-8.4**: Connection timeout and retry mechanisms

#### 9. Reliability
- **REQ-9.1**: Graceful handling of connection failures
- **REQ-9.2**: Automatic reconnection with exponential backoff
- **REQ-9.3**: Data validation and error handling
- **REQ-9.4**: Minimal memory footprint

## User Stories

### As a system administrator, I want to:
- Monitor multiple servers from a single terminal interface
- Quickly identify performance issues through visual indicators
- Manage processes without SSHing into individual servers
- View logs in real-time across multiple systems

### As a DevOps engineer, I want to:
- Set up custom alerts for resource thresholds
- Track system performance trends over time
- Easily switch between different server environments
- Have a lightweight monitoring solution that doesn't require web servers

## Technical Constraints

- Must run entirely in terminal (no GUI components)
- Built with React 19 and @opentui/react
- Uses Bun as runtime and package manager
- TypeScript strict mode enabled
- Cross-platform compatibility (Linux, macOS, Windows with WSL)

## Success Criteria

1. Successfully monitor at least 5 servers simultaneously
2. Dashboard refresh rate under 5 seconds
3. Memory usage under 100MB for the application
4. Zero configuration required for basic SSH connections
5. Intuitive navigation learnable within 10 minutes

## Future Enhancements (Out of Scope for MVP)

- Historical data visualization
- Custom dashboards
- Plugin system for additional metrics
- Team collaboration features
- Mobile terminal support

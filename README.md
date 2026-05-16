# Ninode

> A powerful terminal-based server monitoring application built with React 19 and OpenTUI

Ninode is a modern, lightweight terminal user interface (TUI) for monitoring and managing Linux-based remote servers via SSH. Monitor multiple servers simultaneously, track system metrics in real-time, manage processes, view logs, and set up custom alerts—all from a single, beautiful terminal interface.

## Installation

### Homebrew (macOS / Linux)

```bash
brew tap michaelsieminski/tap
brew install ninode
```

### Quick install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/michaelsieminski/ninode/main/install.sh | sh
```

### Commands

```
ninode                Launch the TUI
ninode daemon start   Start the background metrics daemon
ninode daemon stop    Stop it
ninode daemon status  Show status
ninode daemon logs    Tail the daemon log
ninode --version
ninode --help
```

The TUI auto-starts the daemon on launch if it's not already running.

### Where data is stored

Ninode keeps its SQLite database, daemon PID, and logs out of the install location:

- macOS: `~/Library/Application Support/ninode/`
- Linux: `$XDG_DATA_HOME/ninode/` (defaults to `~/.local/share/ninode/`)
- Override with `NINODE_DATA_DIR=/path/to/dir`

Passwords are stored in the OS keychain (Keychain on macOS, libsecret on Linux).

### Build from source

```bash
git clone https://github.com/michaelsieminski/ninode.git
cd ninode
bun install
bun run build         # produces dist/ninode for your platform
# or for development:
bun dev
```

## Features

### Server Management
- **Multi-Server Monitoring**: Connect to and monitor multiple servers simultaneously
- **SSH Authentication**: Support for both password and SSH key-based authentication
- **Secure Credential Storage**: Passwords stored securely in system keychain using `@napi-rs/keyring`
- **Connection Management**: Automatic reconnection with exponential backoff
- **Quick Setup**: Zero configuration required for basic SSH connections

### Real-Time System Monitoring
- **CPU Metrics**: Track CPU usage, load averages, and core-level statistics
- **Memory Usage**: Monitor RAM and swap utilization with visual indicators
- **Disk Space**: View disk usage and available space across all partitions
- **Network Statistics**: Track network interface statistics and throughput
- **System Information**: Display uptime, process count, and system details

### Process Management
- **Live Process List**: View running processes with resource consumption
- **Sorting & Filtering**: Sort by CPU, memory, or name; filter by keyword
- **Remote Control**: Kill processes remotely with confirmation dialogs
- **Real-Time Updates**: Process list refreshes automatically

### Log Monitoring
- **System Logs**: Access syslog, auth.log, and other system logs
- **Real-Time Streaming**: Monitor application logs as they update
- **Filtering**: Filter logs by severity level or search by keyword
- **Pattern Matching**: Search logs using regular expressions

### Alert System
- **Threshold Alerts**: Configure custom alerts for CPU, memory, disk usage
- **Visual Indicators**: Color-coded status indicators for quick identification
- **Alert History**: Track and acknowledge alert notifications
- **Customizable Rules**: Set up your own alert thresholds

## Roadmap

### Current (MVP)
- ✅ Multi-server SSH connections
- ✅ Real-time system metrics (CPU, memory, disk)
- ✅ Secure credential storage
- ✅ Basic UI navigation

### In Progress
- 🚧 Process management
- 🚧 Log monitoring
- 🚧 Alert system

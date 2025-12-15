// types/index.ts
export interface Server {
	id: string;
	name: string;
	host: string;
	port: number;
	username: string;
	status: "connected" | "disconnected" | "error";
}

export interface ServerConfig {
	id: string;
	name: string;
	host: string;
	port: number;
	username: string;
	authMethod: "password" | "key";
	password?: string; // Encrypted
	keyPath?: string;
}

export type ConnectionStatus =
	| "connected"
	| "connecting"
	| "disconnected"
	| "error";

export interface CommandResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export type NavigationSection = "dashboard" | "servers" | "processes" | "logs";

// Metrics Types
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

export interface NetworkMetrics {
	interface: string;
	rxBytes: number; // Total bytes received (cumulative)
	txBytes: number; // Total bytes transmitted (cumulative)
	rxRate: number; // Current receive rate in bytes/sec
	txRate: number; // Current transmit rate in bytes/sec
}

export interface ServerMetrics {
	serverId: string;
	serverName: string;
	cpu: CPUMetrics | null;
	memory: MemoryMetrics | null;
	disks: DiskMetrics[];
	network: NetworkMetrics | null;
	lastUpdated: number;
	error?: string;
}

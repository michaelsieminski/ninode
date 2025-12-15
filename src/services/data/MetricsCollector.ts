import type { SSHConnection } from "../ssh/SSHConnection";
import type {
	CPUMetrics,
	MemoryMetrics,
	DiskMetrics,
	NetworkMetrics,
	ServerMetrics,
} from "../../types";
import { CPUParser } from "./parsers/CPUParser";
import { MemoryParser } from "./parsers/MemoryParser";
import { DiskParser } from "./parsers/DiskParser";
import { NetworkParser } from "./parsers/NetworkParser";

interface MetricsCache {
	metrics: ServerMetrics;
	timestamp: number;
}

export class MetricsCollector {
	private cpuParser = new CPUParser();
	private memoryParser = new MemoryParser();
	private diskParser = new DiskParser();
	private networkParser = new NetworkParser();
	private cache = new Map<string, MetricsCache>();
	private cacheTTL = 3000; // 3 seconds cache

	/**
	 * Collect all metrics for a server
	 */
	async collectAllMetrics(
		serverId: string,
		serverName: string,
		connection: SSHConnection,
	): Promise<ServerMetrics> {
		// Check cache first
		const cached = this.cache.get(serverId);
		if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
			return cached.metrics;
		}

		try {
			// Collect all metrics in parallel
			const [cpu, memory, disks, network] = await Promise.all([
				this.collectCPUMetrics(connection),
				this.collectMemoryMetrics(connection),
				this.collectDiskMetrics(connection),
				this.collectNetworkMetrics(serverId, connection),
			]);

			const metrics: ServerMetrics = {
				serverId,
				serverName,
				cpu,
				memory,
				disks,
				network,
				lastUpdated: Date.now(),
			};

			// Update cache
			this.cache.set(serverId, { metrics, timestamp: Date.now() });

			return metrics;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Return cached data with error if available
			if (cached) {
				return {
					...cached.metrics,
					error: errorMessage,
				};
			}

			return {
				serverId,
				serverName,
				cpu: null,
				memory: null,
				disks: [],
				network: null,
				lastUpdated: Date.now(),
				error: errorMessage,
			};
		}
	}

	/**
	 * Collect CPU metrics from the server
	 */
	async collectCPUMetrics(connection: SSHConnection): Promise<CPUMetrics> {
		// Use multiple commands for reliability
		const [topResult, uptimeResult, nprocResult] = await Promise.all([
			connection.executeCommand("top -bn1 | head -5"),
			connection.executeCommand("uptime"),
			connection.executeCommand("nproc"),
		]);

		const metrics = this.cpuParser.parseCPUUsage(
			topResult.stdout,
			uptimeResult.stdout,
		);

		// Override cores if nproc succeeded
		if (nprocResult.exitCode === 0) {
			metrics.cores = this.cpuParser.parseCoresFromNproc(nprocResult.stdout);
		}

		return metrics;
	}

	/**
	 * Collect memory metrics from the server
	 */
	async collectMemoryMetrics(
		connection: SSHConnection,
	): Promise<MemoryMetrics> {
		const result = await connection.executeCommand("free -m");
		return this.memoryParser.parseMemoryUsage(result.stdout);
	}

	/**
	 * Collect disk metrics from the server
	 */
	async collectDiskMetrics(connection: SSHConnection): Promise<DiskMetrics[]> {
		const result = await connection.executeCommand("df -h");
		return this.diskParser.parseDiskUsage(result.stdout);
	}

	/**
	 * Collect network metrics from the server
	 */
	async collectNetworkMetrics(
		serverId: string,
		connection: SSHConnection,
	): Promise<NetworkMetrics | null> {
		const result = await connection.executeCommand("cat /proc/net/dev");

		// Get previous metrics from cache for rate calculation
		const cached = this.cache.get(serverId);
		const previousNetwork = cached?.metrics.network;
		const timeDelta = cached
			? (Date.now() - cached.timestamp) / 1000
			: undefined;

		return this.networkParser.parseNetworkUsage(
			result.stdout,
			previousNetwork,
			timeDelta,
		);
	}

	/**
	 * Clear the cache for a specific server or all servers
	 */
	clearCache(serverId?: string): void {
		if (serverId) {
			this.cache.delete(serverId);
		} else {
			this.cache.clear();
		}
	}

	/**
	 * Get the memory parser for formatting
	 */
	getMemoryParser(): MemoryParser {
		return this.memoryParser;
	}

	/**
	 * Get the disk parser for formatting
	 */
	getDiskParser(): DiskParser {
		return this.diskParser;
	}

	/**
	 * Get the network parser for formatting
	 */
	getNetworkParser(): NetworkParser {
		return this.networkParser;
	}
}

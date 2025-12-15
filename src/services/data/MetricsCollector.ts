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
	previousCpuStats?: {
		user: number;
		nice: number;
		system: number;
		idle: number;
		total: number;
	};
}

/**
 * Section markers for the combined metrics command output
 */
const SECTION_MARKERS = {
	CPU_STAT: "===CPU_STAT===",
	LOADAVG: "===LOADAVG===",
	NPROC: "===NPROC===",
	MEMINFO: "===MEMINFO===",
	DISKSTATS: "===DISKSTATS===",
	NETDEV: "===NETDEV===",
} as const;

export class MetricsCollector {
	private cpuParser = new CPUParser();
	private memoryParser = new MemoryParser();
	private diskParser = new DiskParser();
	private networkParser = new NetworkParser();
	private cache = new Map<string, MetricsCache>();
	private cacheTTL = 3000; // 3 seconds cache

	private buildCombinedCommand(): string {
		return [
			`echo "${SECTION_MARKERS.CPU_STAT}"`,
			"cat /proc/stat | head -1", // Only first line (aggregate CPU)
			`echo "${SECTION_MARKERS.LOADAVG}"`,
			"cat /proc/loadavg",
			`echo "${SECTION_MARKERS.NPROC}"`,
			"nproc",
			`echo "${SECTION_MARKERS.MEMINFO}"`,
			"cat /proc/meminfo",
			`echo "${SECTION_MARKERS.DISKSTATS}"`,
			"df -h",
			`echo "${SECTION_MARKERS.NETDEV}"`,
			"cat /proc/net/dev",
		].join(" && ");
	}

	/**
	 * Parse the combined command output into sections
	 */
	private parseSections(output: string): Map<string, string> {
		const sections = new Map<string, string>();
		const markers = Object.values(SECTION_MARKERS);

		let currentSection = "";
		let currentContent: string[] = [];

		for (const line of output.split("\n")) {
			if (markers.includes(line.trim() as (typeof markers)[number])) {
				// Save previous section
				if (currentSection) {
					sections.set(currentSection, currentContent.join("\n"));
				}
				currentSection = line.trim();
				currentContent = [];
			} else {
				currentContent.push(line);
			}
		}

		// Save last section
		if (currentSection) {
			sections.set(currentSection, currentContent.join("\n"));
		}

		return sections;
	}

	/**
	 * Collect all metrics for a server using a single optimized command
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
			// Execute single combined command
			const result = await connection.executeCommand(
				this.buildCombinedCommand(),
			);
			const sections = this.parseSections(result.stdout);

			// Parse all metrics from the combined output
			const cpu = this.parseCPUFromSections(serverId, sections);
			const memory = this.parseMemoryFromSections(sections);
			const disks = this.parseDisksFromSections(sections);
			const network = this.parseNetworkFromSections(serverId, sections);

			const metrics: ServerMetrics = {
				serverId,
				serverName,
				cpu,
				memory,
				disks,
				network,
				lastUpdated: Date.now(),
			};

			// Update cache with CPU stats for delta calculation
			const cpuStatSection = sections.get(SECTION_MARKERS.CPU_STAT) || "";
			const cpuStats = this.cpuParser.parseProcStat(cpuStatSection);

			this.cache.set(serverId, {
				metrics,
				timestamp: Date.now(),
				previousCpuStats: cpuStats,
			});

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
	 * Parse CPU metrics from combined output sections
	 */
	private parseCPUFromSections(
		serverId: string,
		sections: Map<string, string>,
	): CPUMetrics {
		const cpuStatOutput = sections.get(SECTION_MARKERS.CPU_STAT) || "";
		const loadavgOutput = sections.get(SECTION_MARKERS.LOADAVG) || "";
		const nprocOutput = sections.get(SECTION_MARKERS.NPROC) || "";

		// Get previous CPU stats for delta calculation
		const cached = this.cache.get(serverId);
		const previousCpuStats = cached?.previousCpuStats;
		const timeDelta = cached
			? (Date.now() - cached.timestamp) / 1000
			: undefined;

		return this.cpuParser.parseCPUMetrics(
			cpuStatOutput,
			loadavgOutput,
			nprocOutput,
			previousCpuStats,
			timeDelta,
		);
	}

	/**
	 * Parse memory metrics from combined output sections
	 */
	private parseMemoryFromSections(
		sections: Map<string, string>,
	): MemoryMetrics {
		const meminfoOutput = sections.get(SECTION_MARKERS.MEMINFO) || "";
		return this.memoryParser.parseProcMeminfo(meminfoOutput);
	}

	/**
	 * Parse disk metrics from combined output sections
	 */
	private parseDisksFromSections(sections: Map<string, string>): DiskMetrics[] {
		const dfOutput = sections.get(SECTION_MARKERS.DISKSTATS) || "";
		return this.diskParser.parseDiskUsage(dfOutput);
	}

	/**
	 * Parse network metrics from combined output sections
	 */
	private parseNetworkFromSections(
		serverId: string,
		sections: Map<string, string>,
	): NetworkMetrics | null {
		const netdevOutput = sections.get(SECTION_MARKERS.NETDEV) || "";

		// Get previous metrics from cache for rate calculation
		const cached = this.cache.get(serverId);
		const previousNetwork = cached?.metrics.network;
		const timeDelta = cached
			? (Date.now() - cached.timestamp) / 1000
			: undefined;

		return this.networkParser.parseNetworkUsage(
			netdevOutput,
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

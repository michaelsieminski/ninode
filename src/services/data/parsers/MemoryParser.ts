import type { MemoryMetrics } from "../../../types";

export class MemoryParser {
	/**
	 * Parse memory metrics from /proc/meminfo output
	 *
	 * Format:
	 * MemTotal:       16384000 kB
	 * MemFree:         2048000 kB
	 * MemAvailable:   10240000 kB
	 * Buffers:          512000 kB
	 * Cached:          4096000 kB
	 * SwapTotal:       8192000 kB
	 * SwapFree:        8000000 kB
	 * ...
	 */
	parseProcMeminfo(meminfoOutput: string): MemoryMetrics {
		const metrics: MemoryMetrics = {
			total: 0,
			used: 0,
			free: 0,
			swapTotal: 0,
			swapUsed: 0,
		};

		const values: Record<string, number> = {};

		for (const line of meminfoOutput.split("\n")) {
			const match = line.match(/^(\w+):\s+(\d+)\s*kB?/);
			if (match && match[1] && match[2]) {
				// Convert from kB to MB
				values[match[1]] = Math.round(parseInt(match[2], 10) / 1024);
			}
		}

		// Calculate memory values
		metrics.total = values["MemTotal"] || 0;
		metrics.free = values["MemFree"] || 0;

		// Used memory calculation (same as `free` command)
		// Used = Total - Free - Buffers - Cached - SReclaimable
		const buffers = values["Buffers"] || 0;
		const cached = values["Cached"] || 0;
		const sReclaimable = values["SReclaimable"] || 0;

		metrics.used =
			metrics.total - metrics.free - buffers - cached - sReclaimable;
		metrics.used = Math.max(0, metrics.used); // Ensure non-negative

		// Swap values
		metrics.swapTotal = values["SwapTotal"] || 0;
		const swapFree = values["SwapFree"] || 0;
		metrics.swapUsed = metrics.swapTotal - swapFree;

		return metrics;
	}

	/**
	 * Parse memory metrics from `free -m` output (legacy method)
	 *
	 * Format:
	 *               total        used        free      shared  buff/cache   available
	 * Mem:          15884        5432        2156         456        8295       10007
	 * Swap:          8191         123        8068
	 */
	parseMemoryUsage(freeOutput: string): MemoryMetrics {
		const lines = freeOutput.split("\n");
		const memMetrics: MemoryMetrics = {
			total: 0,
			used: 0,
			free: 0,
			swapTotal: 0,
			swapUsed: 0,
		};

		for (const line of lines) {
			const trimmed = line.trim();

			// Parse Mem line
			if (trimmed.startsWith("Mem:")) {
				const parts = trimmed.split(/\s+/);
				if (parts.length >= 4) {
					memMetrics.total = parseInt(parts[1] || "0", 10) || 0;
					memMetrics.used = parseInt(parts[2] || "0", 10) || 0;
					memMetrics.free = parseInt(parts[3] || "0", 10) || 0;
				}
			}

			// Parse Swap line
			if (trimmed.startsWith("Swap:")) {
				const parts = trimmed.split(/\s+/);
				if (parts.length >= 3) {
					memMetrics.swapTotal = parseInt(parts[1] || "0", 10) || 0;
					memMetrics.swapUsed = parseInt(parts[2] || "0", 10) || 0;
				}
			}
		}

		return memMetrics;
	}

	/**
	 * Format bytes to human-readable string
	 */
	formatBytes(mb: number): string {
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(1)} GB`;
		}
		return `${mb} MB`;
	}

	/**
	 * Calculate usage percentage
	 */
	calculateUsagePercent(used: number, total: number): number {
		if (total === 0) return 0;
		return Math.round((used / total) * 100 * 10) / 10;
	}
}

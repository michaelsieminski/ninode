import type { MemoryMetrics } from "../../../types";

export class MemoryParser {
	/**
	 * Parse memory metrics from `free -m` output
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

import type { CPUMetrics } from "../../../types";

export interface CPUStats {
	user: number;
	nice: number;
	system: number;
	idle: number;
	total: number;
}

export class CPUParser {
	/**
	 * Parse CPU metrics from /proc/stat, /proc/loadavg, and nproc output
	 *
	 * @param procStatOutput - Output from `cat /proc/stat | head -1`
	 * @param loadavgOutput - Output from `cat /proc/loadavg`
	 * @param nprocOutput - Output from `nproc`
	 * @param previousStats - Previous CPU stats for delta calculation
	 * @param timeDelta - Time elapsed since previous reading (seconds)
	 */
	parseCPUMetrics(
		procStatOutput: string,
		loadavgOutput: string,
		nprocOutput: string,
		previousStats?: CPUStats,
		timeDelta?: number,
	): CPUMetrics {
		const currentStats = this.parseProcStat(procStatOutput);
		const usage = this.calculateUsage(currentStats, previousStats);
		const loadAverage = this.parseLoadAverage(loadavgOutput);
		const cores = this.parseCoresFromNproc(nprocOutput);

		return {
			usage,
			loadAverage,
			cores,
		};
	}

	/**
	 * Parse /proc/stat output to extract CPU jiffies
	 *
	 * Format: cpu  user nice system idle iowait irq softirq steal guest guest_nice
	 * Example: cpu  12345 678 9012 345678 901 0 234 0 0 0
	 */
	parseProcStat(output: string): CPUStats {
		const lines = output.split("\n");

		for (const line of lines) {
			const trimmed = line.trim();
			// Match aggregate CPU line (not individual cores like cpu0, cpu1)
			if (trimmed.startsWith("cpu ") || trimmed === "cpu") {
				const parts = trimmed.split(/\s+/);

				if (parts.length >= 5) {
					const user = parseInt(parts[1] || "0", 10) || 0;
					const nice = parseInt(parts[2] || "0", 10) || 0;
					const system = parseInt(parts[3] || "0", 10) || 0;
					const idle = parseInt(parts[4] || "0", 10) || 0;
					const iowait = parseInt(parts[5] || "0", 10) || 0;
					const irq = parseInt(parts[6] || "0", 10) || 0;
					const softirq = parseInt(parts[7] || "0", 10) || 0;
					const steal = parseInt(parts[8] || "0", 10) || 0;

					// Total includes all CPU time
					const total =
						user + nice + system + idle + iowait + irq + softirq + steal;

					return { user, nice, system, idle, total };
				}
			}
		}

		return { user: 0, nice: 0, system: 0, idle: 0, total: 0 };
	}

	/**
	 * Calculate CPU usage percentage from delta between two readings
	 *
	 * This gives accurate "instant" CPU usage rather than average since boot.
	 * Formula: ((work_delta) / (total_delta)) * 100
	 * Where work = user + nice + system (excludes iowait, idle)
	 */
	private calculateUsage(current: CPUStats, previous?: CPUStats): number {
		if (!previous || previous.total === 0) {
			// First reading - calculate usage since boot (less accurate but still valid)
			if (current.total === 0) return 0;
			const work = current.user + current.nice + current.system;
			return Math.round((work / current.total) * 100 * 10) / 10;
		}

		const totalDelta = current.total - previous.total;
		if (totalDelta <= 0) return 0;

		const workDelta =
			current.user -
			previous.user +
			(current.nice - previous.nice) +
			(current.system - previous.system);

		const usage = (workDelta / totalDelta) * 100;
		return Math.round(Math.max(0, Math.min(100, usage)) * 10) / 10;
	}

	/**
	 * Parse load average from /proc/loadavg
	 *
	 * Format: 0.00 0.01 0.05 1/234 5678
	 * Fields: 1min 5min 15min running/total last_pid
	 */
	private parseLoadAverage(output: string): [number, number, number] {
		const trimmed = output.trim();
		const parts = trimmed.split(/\s+/);

		if (parts.length >= 3) {
			return [
				parseFloat(parts[0] || "0") || 0,
				parseFloat(parts[1] || "0") || 0,
				parseFloat(parts[2] || "0") || 0,
			];
		}

		return [0, 0, 0];
	}

	/**
	 * Parse cores from nproc command output
	 */
	parseCoresFromNproc(output: string): number {
		const cores = parseInt(output.trim(), 10);
		return isNaN(cores) ? 1 : cores;
	}

	// Legacy methods for backward compatibility (if needed)

	/**
	 * @deprecated Use parseCPUMetrics instead
	 * Parse CPU metrics from various Linux commands
	 * Uses multiple fallback strategies for cross-distribution compatibility
	 */
	parseCPUUsage(topOutput: string, uptimeOutput: string): CPUMetrics {
		const usage = this.parseUsageFromTop(topOutput);
		const loadAverage = this.parseLoadAverageFromUptime(uptimeOutput);
		const cores = this.parseCores(topOutput);

		return {
			usage,
			loadAverage,
			cores,
		};
	}

	/**
	 * @deprecated Use parseProcStat instead
	 * Parse CPU usage from `top -bn1` output
	 */
	private parseUsageFromTop(output: string): number {
		const lines = output.split("\n");

		for (const line of lines) {
			if (line.includes("Cpu(s)") || line.includes("%Cpu")) {
				const userMatch = line.match(/(\d+\.?\d*)\s*(?:%?\s*)?us/);
				const sysMatch = line.match(/(\d+\.?\d*)\s*(?:%?\s*)?sy/);
				const niceMatch = line.match(/(\d+\.?\d*)\s*(?:%?\s*)?ni/);

				if (userMatch?.[1] && sysMatch?.[1]) {
					const user = parseFloat(userMatch[1]);
					const sys = parseFloat(sysMatch[1]);
					const nice = niceMatch?.[1] ? parseFloat(niceMatch[1]) : 0;

					return Math.round((user + sys + nice) * 10) / 10;
				}
			}
		}

		return 0;
	}

	/**
	 * @deprecated Use parseLoadAverage instead
	 * Parse load average from `uptime` output
	 */
	private parseLoadAverageFromUptime(output: string): [number, number, number] {
		const match = output.match(
			/load average[s]?:\s*(\d+\.?\d*),?\s*(\d+\.?\d*),?\s*(\d+\.?\d*)/i,
		);

		if (match && match[1] && match[2] && match[3]) {
			return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
		}

		return [0, 0, 0];
	}

	/**
	 * @deprecated
	 * Parse number of CPU cores from top output
	 */
	private parseCores(output: string): number {
		const cpuLineMatches = output.match(/%?Cpu\d+/g);
		if (cpuLineMatches && cpuLineMatches.length > 0) {
			return cpuLineMatches.length;
		}
		return 1;
	}
}

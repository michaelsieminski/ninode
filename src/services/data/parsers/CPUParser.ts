import type { CPUMetrics } from "../../../types";

export class CPUParser {
	/**
	 * Parse CPU metrics from various Linux commands
	 * Uses multiple fallback strategies for cross-distribution compatibility
	 */
	parseCPUUsage(topOutput: string, uptimeOutput: string): CPUMetrics {
		const usage = this.parseUsageFromTop(topOutput);
		const loadAverage = this.parseLoadAverage(uptimeOutput);
		const cores = this.parseCores(topOutput);

		return {
			usage,
			loadAverage,
			cores,
		};
	}

	/**
	 * Parse CPU usage from `top -bn1` output
	 * Calculates actual CPU work: user + system + nice
	 * Excludes iowait, steal, and other overhead (better for VPS comparison)
	 * Handles both "%Cpu(s)" and "Cpu(s):" formats
	 */
	private parseUsageFromTop(output: string): number {
		// Try to match different top output formats
		// Format 1: %Cpu(s):  1.2 us,  0.3 sy,  0.0 ni, 98.5 id, ...
		// Format 2: Cpu(s):  1.2%us,  0.3%sy,  0.0%ni, 98.5%id, ...
		const lines = output.split("\n");

		for (const line of lines) {
			if (line.includes("Cpu(s)") || line.includes("%Cpu")) {
				// Extract user, system, and nice percentages
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
	 * Parse load average from `uptime` output
	 * Format: "load average: 0.00, 0.01, 0.05"
	 */
	private parseLoadAverage(output: string): [number, number, number] {
		const match = output.match(
			/load average[s]?:\s*(\d+\.?\d*),?\s*(\d+\.?\d*),?\s*(\d+\.?\d*)/i,
		);

		if (match && match[1] && match[2] && match[3]) {
			return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
		}

		return [0, 0, 0];
	}

	/**
	 * Parse number of CPU cores from top output or /proc/cpuinfo
	 */
	private parseCores(output: string): number {
		// Try to find core count from top output header
		// Format: "Tasks: 123 total, ..." or "%Cpu0, %Cpu1, ..."
		const cpuLineMatches = output.match(/%?Cpu\d+/g);
		if (cpuLineMatches && cpuLineMatches.length > 0) {
			return cpuLineMatches.length;
		}

		// Default to 1 if we can't determine
		return 1;
	}

	/**
	 * Parse cores from nproc command output
	 */
	parseCoresFromNproc(output: string): number {
		const cores = parseInt(output.trim(), 10);
		return isNaN(cores) ? 1 : cores;
	}
}

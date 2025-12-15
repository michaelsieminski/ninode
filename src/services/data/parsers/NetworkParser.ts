import type { NetworkMetrics } from "../../../types";

export class NetworkParser {
	/**
	 * Parse network metrics from `/proc/net/dev` output
	 * Format:
	 * Inter-|   Receive                                                |  Transmit
	 *  face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
	 *     lo:   12345      123    0    0    0     0          0         0    12345      123    0    0    0     0       0          0
	 *   eth0: 9876543    87654    0    0    0     0          0         0  5432109    54321    0    0    0     0       0          0
	 *
	 * @param procNetDevOutput - Raw output from `cat /proc/net/dev`
	 * @param previousMetrics - Previous network metrics for rate calculation (optional)
	 * @param timeDelta - Time elapsed since previous metrics in seconds (optional)
	 */
	parseNetworkUsage(
		procNetDevOutput: string,
		previousMetrics?: NetworkMetrics | null,
		timeDelta?: number,
	): NetworkMetrics | null {
		const lines = procNetDevOutput.split("\n");

		// Skip header lines (first 2 lines)
		const dataLines = lines.slice(2);

		// Find the first non-loopback interface
		for (const line of dataLines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			// Parse interface line: "eth0: 123456 ..."
			const parts = trimmed.split(/\s+/);
			if (parts.length < 10) continue;

			const interfaceName = parts[0]?.replace(":", "") || "";

			// Skip loopback interface
			if (interfaceName === "lo") continue;

			// Extract bytes received (column 1) and transmitted (column 9)
			const rxBytes = parseInt(parts[1] || "0", 10) || 0;
			const txBytes = parseInt(parts[9] || "0", 10) || 0;

			// Calculate rates if we have previous metrics
			let rxRate = 0;
			let txRate = 0;

			if (previousMetrics && timeDelta && timeDelta > 0) {
				// Calculate rate in bytes/sec
				const rxDelta = rxBytes - previousMetrics.rxBytes;
				const txDelta = txBytes - previousMetrics.txBytes;

				rxRate = Math.max(0, rxDelta / timeDelta);
				txRate = Math.max(0, txDelta / timeDelta);
			}

			return {
				interface: interfaceName,
				rxBytes,
				txBytes,
				rxRate,
				txRate,
			};
		}

		// No valid interface found
		return null;
	}

	/**
	 * Format bytes to human-readable rate (e.g., "1.5 MB/s", "256 KB/s")
	 */
	formatRate(bytesPerSec: number): string {
		if (bytesPerSec >= 1024 * 1024) {
			return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
		}
		if (bytesPerSec >= 1024) {
			return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
		}
		return `${bytesPerSec.toFixed(0)} B/s`;
	}

	/**
	 * Format total bytes to human-readable size (e.g., "1.5 GB", "256 MB")
	 */
	formatBytes(bytes: number): string {
		if (bytes >= 1024 * 1024 * 1024) {
			return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
		}
		if (bytes >= 1024 * 1024) {
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		}
		if (bytes >= 1024) {
			return `${(bytes / 1024).toFixed(1)} KB`;
		}
		return `${bytes} B`;
	}
}

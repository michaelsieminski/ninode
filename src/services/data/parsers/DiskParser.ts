import type { DiskMetrics } from "../../../types";

export class DiskParser {
	/**
	 * Parse disk metrics from `df -h` output
	 * Format:
	 * Filesystem      Size  Used Avail Use% Mounted on
	 * /dev/sda1        50G   25G   25G  50% /
	 * /dev/sdb1       100G   75G   25G  75% /data
	 */
	parseDiskUsage(dfOutput: string): DiskMetrics[] {
		const lines = dfOutput.split("\n");
		const disks: DiskMetrics[] = [];

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i];
			if (!line) continue;
			const trimmed = line.trim();
			if (!trimmed) continue;

			const parts = trimmed.split(/\s+/);
			if (parts.length >= 6) {
				const filesystem = parts[0];

				// Skip virtual filesystems
				if (!filesystem || this.shouldSkipFilesystem(filesystem)) {
					continue;
				}

				const disk: DiskMetrics = {
					filesystem,
					total: this.parseSize(parts[1] || "0"),
					used: this.parseSize(parts[2] || "0"),
					free: this.parseSize(parts[3] || "0"),
					usagePercent: parseInt((parts[4] || "0").replace("%", ""), 10) || 0,
					mountpoint: parts[5] || "/",
				};

				disks.push(disk);
			}
		}

		return disks;
	}

	/**
	 * Parse human-readable size to MB
	 * Handles formats like "50G", "100M", "1T"
	 */
	private parseSize(sizeStr: string): number {
		const match = sizeStr.match(/^([\d.]+)([KMGT]?)/i);
		if (!match || !match[1]) return 0;

		const value = parseFloat(match[1]);
		const unit = (match[2] || "").toUpperCase();

		switch (unit) {
			case "K":
				return value / 1024;
			case "M":
				return value;
			case "G":
				return value * 1024;
			case "T":
				return value * 1024 * 1024;
			default:
				return value / (1024 * 1024); // Assume bytes
		}
	}

	/**
	 * Check if filesystem should be skipped (virtual/temp filesystems)
	 */
	private shouldSkipFilesystem(filesystem: string): boolean {
		const skipPrefixes = [
			"tmpfs",
			"devtmpfs",
			"udev",
			"overlay",
			"none",
			"cgroup",
			"run",
			"shm",
		];

		return skipPrefixes.some(
			(prefix) =>
				filesystem.startsWith(prefix) || filesystem.includes("docker"),
		);
	}

	/**
	 * Format size in MB to human-readable string
	 */
	formatSize(mb: number): string {
		if (mb >= 1024 * 1024) {
			return `${(mb / (1024 * 1024)).toFixed(1)}T`;
		}
		if (mb >= 1024) {
			return `${(mb / 1024).toFixed(1)}G`;
		}
		if (mb >= 1) {
			return `${mb.toFixed(0)}M`;
		}
		return `${(mb * 1024).toFixed(0)}K`;
	}
}

import React from "react";
import type { ServerMetrics, ConnectionStatus } from "../../types";
import ProgressBar from "./ProgressBar";
import { MemoryParser } from "../../services/data/parsers/MemoryParser";
import { DiskParser } from "../../services/data/parsers/DiskParser";
import { NetworkParser } from "../../services/data/parsers/NetworkParser";

interface ServerMetricsCardProps {
	metrics: ServerMetrics;
	isSelected: boolean;
	refreshState: "success" | "error" | "idle";
	connectionStatus: ConnectionStatus;
	isDeleting?: boolean;
	metricsPerRow?: number;
	contentWidth?: number;
}

const memoryParser = new MemoryParser();
const diskParser = new DiskParser();
const networkParser = new NetworkParser();

const getStatusColor = (status: ConnectionStatus) => {
	switch (status) {
		case "connected":
			return "#66AA66";
		case "connecting":
			return "#CCAA66";
		case "error":
		case "disconnected":
			return "#CC6666";
	}
};

const getStatusLabel = (status: ConnectionStatus) => {
	switch (status) {
		case "connected":
			return "CONNECTED";
		case "connecting":
			return "CONNECTING";
		case "error":
			return "ERROR";
		case "disconnected":
			return "DISCONNECTED";
	}
};

export default function ServerMetricsCard({
	metrics,
	isSelected,
	refreshState,
	connectionStatus,
	isDeleting = false,
	metricsPerRow = 4,
	contentWidth = 120,
}: ServerMetricsCardProps) {
	const memoryUsagePercent = metrics.memory
		? memoryParser.calculateUsagePercent(
				metrics.memory.used,
				metrics.memory.total,
			)
		: 0;

	// Get the primary disk (root mount or first disk)
	const primaryDisk =
		metrics.disks.find((d) => d.mountpoint === "/") || metrics.disks[0];

	// Calculate network activity level
	const getNetworkActivity = () => {
		if (!metrics.network)
			return { level: "idle", label: "IDLE", color: "#3D3D3D", bars: 0 };

		const totalRate = metrics.network.rxRate + metrics.network.txRate;
		const kbps = totalRate / 1024;
		const mbps = totalRate / (1024 * 1024);

		if (mbps > 10) {
			return { level: "high", label: "HIGH", color: "#66AA66", bars: 4 };
		}
		if (mbps > 1) {
			return { level: "medium", label: "MED", color: "#CCAA66", bars: 3 };
		}
		if (kbps > 100) {
			return { level: "low", label: "LOW", color: "#8B8B8B", bars: 2 };
		}
		return { level: "idle", label: "IDLE", color: "#3D3D3D", bars: 0 };
	};

	const networkActivity = getNetworkActivity();

	// Calculate responsive column width based on content width and metrics per row
	const isCompact = metricsPerRow <= 2;
	const columnWidth = Math.max(
		20,
		Math.floor((contentWidth - 4) / metricsPerRow) - 2,
	);
	const progressBarWidth = Math.min(16, Math.max(8, columnWidth - 12));

	// Render a single metric section
	const renderMetricSection = (
		label: string,
		subLabel: string,
		progressPercent: number | null,
		detail: string,
		isNetwork: boolean = false,
	) => (
		<box flexDirection="column" width={columnWidth}>
			<box flexDirection="row" alignItems="center" gap={1}>
				<text fg="#5C5C5C">{label}</text>
				{!isCompact && (
					<text fg="#5C5C5C" attributes={2}>
						{subLabel}
					</text>
				)}
			</box>
			{isNetwork ? (
				<box flexDirection="row" alignItems="center" gap={1}>
					<text fg={networkActivity.color}>
						{`[${Array.from({ length: 4 }, (_, i) => (i < networkActivity.bars ? "▮" : "▯")).join("")}]`}
					</text>
					{!isCompact && (
						<text fg={networkActivity.color} attributes={2}>
							{networkActivity.label}
						</text>
					)}
				</box>
			) : (
				<ProgressBar percent={progressPercent || 0} width={progressBarWidth} />
			)}
			{!isCompact && (
				<box flexDirection="row" gap={1} marginTop={0}>
					<text fg="#6B6B6B">{detail}</text>
				</box>
			)}
		</box>
	);

	// Build metric sections array
	const metricSections = [
		renderMetricSection(
			"CPU",
			`${metrics.cpu?.cores || "-"} cores`,
			metrics.cpu?.usage || 0,
			`Load: ${metrics.cpu?.loadAverage.map((l) => l.toFixed(2)).join(", ") || "-"}`,
		),
		renderMetricSection(
			"Mem",
			metrics.memory ? memoryParser.formatBytes(metrics.memory.total) : "-",
			memoryUsagePercent,
			metrics.memory
				? `${memoryParser.formatBytes(metrics.memory.used)} / ${memoryParser.formatBytes(metrics.memory.total)}`
				: "-",
		),
		renderMetricSection(
			"Disk",
			primaryDisk ? diskParser.formatSize(primaryDisk.total) : "-",
			primaryDisk?.usagePercent || 0,
			primaryDisk
				? `${diskParser.formatSize(primaryDisk.used)} / ${diskParser.formatSize(primaryDisk.total)}`
				: "-",
		),
		renderMetricSection(
			"Net",
			metrics.network?.interface || "-",
			null,
			metrics.network
				? `↓${networkParser.formatRate(metrics.network.rxRate)} ↑${networkParser.formatRate(metrics.network.txRate)}`
				: "-",
			true,
		),
	];

	// Split metrics into rows based on metricsPerRow
	const rows: React.ReactNode[][] = [];
	for (let i = 0; i < metricSections.length; i += metricsPerRow) {
		rows.push(metricSections.slice(i, i + metricsPerRow));
	}

	return (
		<box
			flexDirection="column"
			padding={1}
			backgroundColor={isSelected ? "#171717" : "#0E0E0E"}
		>
			{/* Server header */}
			<box flexDirection="row" justifyContent="space-between" marginBottom={1}>
				<box flexDirection="row" gap={1} alignItems="center">
					<text
						attributes={isSelected ? 1 : 0}
						fg={isSelected ? "#FFFFFF" : "#8B8B8B"}
					>
						{`${isSelected ? "> " : "  "}${metrics.serverName}`}
					</text>
					<text
						fg={
							refreshState === "success"
								? "#66AA66"
								: refreshState === "error"
									? "#CC6666"
									: "#343434"
						}
					>
						●
					</text>
					<text fg={getStatusColor(connectionStatus)} attributes={2}>
						{getStatusLabel(connectionStatus)}
					</text>
				</box>
				{isDeleting ? (
					<text fg="#CC6666">Delete? [y]es [n]o</text>
				) : (
					<text fg="#3D3D3D" attributes={2}>
						{new Date(metrics.lastUpdated).toLocaleTimeString()}
					</text>
				)}
			</box>

			{/* Metrics rows */}
			{metrics.error ? (
				<box paddingLeft={2}>
					<text fg="#8B5050">{metrics.error}</text>
				</box>
			) : (
				<box flexDirection="column" paddingLeft={2} gap={1}>
					{rows.map((row, rowIndex) => (
						<box key={rowIndex} flexDirection="row" gap={2}>
							{row}
						</box>
					))}
				</box>
			)}
		</box>
	);
}

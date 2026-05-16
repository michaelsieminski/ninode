import { useState, useEffect, useRef, useMemo } from "react";
import { useKeyboard } from "@opentui/react";
import type { ServerMetrics, ConnectionStatus } from "../../types";
import type { SSHManager } from "../../services/ssh/SSHManager";
import {
	DatabaseService,
	type MetricsDataPoint,
} from "../../services/storage/DatabaseService";
import { MetricsCollector } from "../../services/data/MetricsCollector";
import { useResponsive } from "../../hooks/useResponsive";
import BrailleGraph from "../graphs/BrailleGraph";
import TimeRangeSelector, {
	type TimeRange,
	TIME_RANGES,
} from "./TimeRangeSelector";
import KeyboardHints from "../common/KeyboardHints";

// Type guard for time range config
function getTimeRangeConfigSafe(range: TimeRange): {
	key: TimeRange;
	label: string;
	ms: number;
	aggregation: "raw" | "1min" | "5min" | "15min";
} {
	const config = TIME_RANGES.find((r) => r.key === range);
	if (!config) {
		return TIME_RANGES[0]!;
	}
	return config;
}

interface ServerDetailViewProps {
	serverId: string;
	serverName: string;
	sshManager: SSHManager;
	onBack: () => void;
}

const metricsCollector = new MetricsCollector();

export default function ServerDetailView({
	serverId,
	serverName,
	sshManager,
	onBack,
}: ServerDetailViewProps) {
	const { breakpoints, contentWidth } = useResponsive();
	const [timeRange, setTimeRange] = useState<TimeRange>("5min");
	const [historicalData, setHistoricalData] = useState<MetricsDataPoint[]>([]);
	const [currentMetrics, setCurrentMetrics] = useState<ServerMetrics | null>(
		null,
	);
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>("disconnected");
	const [refreshState, setRefreshState] = useState<
		"success" | "error" | "idle"
	>("idle");
	const mountedRef = useRef(true);
	const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Calculate graph width based on content width
	const graphWidth = useMemo(() => {
		const baseWidth = contentWidth - 4; // Account for padding
		return Math.max(20, Math.min(baseWidth, 80));
	}, [contentWidth]);

	// Load historical data when time range changes
	useEffect(() => {
		loadHistoricalData();
	}, [serverId, timeRange]);

	// Real-time metrics collection
	useEffect(() => {
		mountedRef.current = true;

		const collectMetrics = async () => {
			const connection = sshManager.getConnection(serverId);
			setConnectionStatus(sshManager.getConnectionStatus(serverId));

			if (!connection || !connection.isConnected()) {
				setCurrentMetrics({
					serverId,
					serverName,
					cpu: null,
					memory: null,
					disks: [],
					network: null,
					lastUpdated: Date.now(),
					error: "Not connected",
				});
				setRefreshState("error");
				return;
			}

			try {
				const metrics = await metricsCollector.collectAllMetrics(
					serverId,
					serverName,
					connection,
				);

				if (mountedRef.current) {
					setCurrentMetrics(metrics);
					setRefreshState("success");

					// Save to database
					DatabaseService.saveMetrics(metrics);

					// Reset refresh indicator
					if (refreshTimeoutRef.current) {
						clearTimeout(refreshTimeoutRef.current);
					}
					refreshTimeoutRef.current = setTimeout(() => {
						if (mountedRef.current) {
							setRefreshState("idle");
						}
					}, 200);
				}
			} catch (error) {
				if (mountedRef.current) {
					setCurrentMetrics({
						serverId,
						serverName,
						cpu: null,
						memory: null,
						disks: [],
						network: null,
						lastUpdated: Date.now(),
						error: error instanceof Error ? error.message : "Unknown error",
					});
					setRefreshState("error");
				}
			}
		};

		collectMetrics();
		const interval = setInterval(collectMetrics, 1000);

		return () => {
			mountedRef.current = false;
			clearInterval(interval);
			if (refreshTimeoutRef.current) {
				clearTimeout(refreshTimeoutRef.current);
			}
		};
	}, [serverId, serverName, sshManager]);

	const loadHistoricalData = () => {
		const config = getTimeRangeConfigSafe(timeRange);
		const endTime = Date.now();
		const startTime = endTime - config.ms;

		const data = DatabaseService.getMetricsRange(
			serverId,
			startTime,
			endTime,
			config.aggregation,
		);

		setHistoricalData(data);
	};

	// Keyboard handling
	useKeyboard((key) => {
		if (key.name === "escape" || key.name === "backspace") {
			onBack();
		} else if (key.name === "left" || key.name === "h") {
			const currentIdx = TIME_RANGES.findIndex((r) => r.key === timeRange);
			if (currentIdx > 0) {
				const prevRange = TIME_RANGES[currentIdx - 1];
				if (prevRange) {
					setTimeRange(prevRange.key);
				}
			}
		} else if (key.name === "right" || key.name === "l") {
			const currentIdx = TIME_RANGES.findIndex((r) => r.key === timeRange);
			if (currentIdx < TIME_RANGES.length - 1) {
				const nextRange = TIME_RANGES[currentIdx + 1];
				if (nextRange) {
					setTimeRange(nextRange.key);
				}
			}
		}
	});

	// Map data to time buckets so gaps show as empty space
	const mapDataToTimeBuckets = useMemo(() => {
		const config = getTimeRangeConfigSafe(timeRange);
		const now = Date.now();
		const startTime = now - config.ms;

		// Number of buckets matches graph width for accurate positioning
		const bucketCount = graphWidth - 6; // Account for Y-axis width
		const bucketSize = config.ms / bucketCount;

		return (
			extractor: (d: MetricsDataPoint) => number | null,
		): (number | null)[] => {
			const buckets: (number | null)[] = Array(bucketCount).fill(null);
			const bucketCounts: number[] = Array(bucketCount).fill(0);

			for (const d of historicalData) {
				const bucketIndex = Math.floor((d.timestamp - startTime) / bucketSize);
				if (bucketIndex >= 0 && bucketIndex < bucketCount) {
					const value = extractor(d);
					if (value !== null) {
						const currentBucket = buckets[bucketIndex];
						const currentCount = bucketCounts[bucketIndex] ?? 0;
						if (currentBucket === null || currentBucket === undefined) {
							buckets[bucketIndex] = value;
							bucketCounts[bucketIndex] = 1;
						} else {
							// Average multiple values in same bucket
							buckets[bucketIndex] =
								(currentBucket * currentCount + value) / (currentCount + 1);
							bucketCounts[bucketIndex] = currentCount + 1;
						}
					}
				}
			}

			return buckets;
		};
	}, [historicalData, timeRange, graphWidth]);

	// Extract time-series data for graphs with proper time positioning
	const cpuData = useMemo(
		() => mapDataToTimeBuckets((d) => d.cpuUsage),
		[mapDataToTimeBuckets],
	);

	const memoryData = useMemo(
		() =>
			mapDataToTimeBuckets((d) => {
				if (d.memoryTotal && d.memoryUsed) {
					return (d.memoryUsed / d.memoryTotal) * 100;
				}
				return null;
			}),
		[mapDataToTimeBuckets],
	);

	const networkRxData = useMemo(
		() => mapDataToTimeBuckets((d) => d.networkRxRate),
		[mapDataToTimeBuckets],
	);

	const networkTxData = useMemo(
		() => mapDataToTimeBuckets((d) => d.networkTxRate),
		[mapDataToTimeBuckets],
	);

	// Check if we have any actual data
	const hasData = historicalData.length > 0;

	// Generate X-axis time labels based on time range (always show even without data)
	const xAxisLabels = useMemo(() => {
		const config = getTimeRangeConfigSafe(timeRange);
		const now = Date.now();
		const startTime = now - config.ms;

		// Number of labels to show (adjust based on range)
		let labelCount: number;
		let formatFn: (ts: number) => string;

		switch (timeRange) {
			case "5min":
				labelCount = 3;
				formatFn = (ts) => {
					const d = new Date(ts);
					return `${d.getMinutes()}:${d.getSeconds().toString().padStart(2, "0")}`;
				};
				break;
			case "30min":
				labelCount = 4;
				formatFn = (ts) => {
					const d = new Date(ts);
					return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
				};
				break;
			case "1hr":
				labelCount = 4;
				formatFn = (ts) => {
					const d = new Date(ts);
					return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
				};
				break;
			case "6hr":
				labelCount = 4;
				formatFn = (ts) => {
					const d = new Date(ts);
					return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
				};
				break;
			case "24hr":
				labelCount = 5;
				formatFn = (ts) => {
					const d = new Date(ts);
					return `${d.getHours()}:00`;
				};
				break;
			default:
				labelCount = 3;
				formatFn = (ts) => new Date(ts).toLocaleTimeString();
		}

		const labels: string[] = [];
		for (let i = 0; i < labelCount; i++) {
			const ts = startTime + (config.ms * i) / (labelCount - 1);
			labels.push(formatFn(ts));
		}

		return labels;
	}, [historicalData.length, timeRange]);

	// Format helpers
	const formatBytes = (bytes: number): string => {
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
	};

	const formatRate = (bytesPerSec: number): string => {
		return `${formatBytes(bytesPerSec)}/s`;
	};

	const formatTime = (timestamp: number): string => {
		return new Date(timestamp).toLocaleTimeString();
	};

	// Get status color
	const getStatusColor = (): string => {
		switch (connectionStatus) {
			case "connected":
				return "#66AA66";
			case "connecting":
				return "#CCAA66";
			case "error":
				return "#CC6666";
			default:
				return "#5C5C5C";
		}
	};

	const getRefreshIndicatorColor = (): string => {
		switch (refreshState) {
			case "success":
				return "#66AA66";
			case "error":
				return "#CC6666";
			default:
				return "#343434";
		}
	};

	const cpu = currentMetrics?.cpu;
	const memory = currentMetrics?.memory;
	const network = currentMetrics?.network;
	const primaryDisk = currentMetrics?.disks?.[0];

	return (
		<box flexDirection="column">
			{/* Header */}
			<box
				flexDirection="row"
				justifyContent="space-between"
				alignItems="center"
			>
				<text attributes={1} fg="#9FBAFF">
					{serverName}
				</text>
				<box flexDirection="row" gap={2}>
					<text fg={getRefreshIndicatorColor()}>
						{refreshState === "idle" ? " " : "\u25CF"}
					</text>
					<text fg={getStatusColor()} attributes={1}>
						{connectionStatus.toUpperCase()}
					</text>
					{currentMetrics && (
						<text fg="#8B8B8B">{formatTime(currentMetrics.lastUpdated)}</text>
					)}
				</box>
			</box>

			{/* Error message */}
			{currentMetrics?.error && (
				<box marginTop={1} padding={1} backgroundColor="#260101">
					<text fg="#8B5050">Error: {currentMetrics.error}</text>
				</box>
			)}

			{/* Time range selector */}
			<box marginTop={1}>
				<TimeRangeSelector
					selectedRange={timeRange}
					onRangeChange={setTimeRange}
				/>
			</box>

			{/* CPU Section */}
			<box flexDirection="column" marginTop={2}>
				<box
					flexDirection="row"
					justifyContent="space-between"
					alignItems="center"
				>
					<text fg="#8B8B8B" attributes={1}>
						CPU Usage
					</text>
					{cpu && (
						<text fg="#6B6B6B">
							{cpu.usage.toFixed(1)}% | Load: {cpu.loadAverage[0].toFixed(2)},{" "}
							{cpu.loadAverage[1].toFixed(2)}, {cpu.loadAverage[2].toFixed(2)} |{" "}
							{cpu.cores} cores
						</text>
					)}
				</box>
				<box marginTop={1}>
					{hasData ? (
						<BrailleGraph
							data={cpuData}
							width={graphWidth}
							height={breakpoints.isNarrow ? 4 : 6}
							minValue={0}
							maxValue={100}
							color="#66AA66"
							showYAxis
							showXAxis
							xAxisLabels={xAxisLabels}
						/>
					) : (
						<text fg="#3D3D3D">No historical data available</text>
					)}
				</box>
			</box>

			{/* Memory Section */}
			<box flexDirection="column" marginTop={2}>
				<box
					flexDirection="row"
					justifyContent="space-between"
					alignItems="center"
				>
					<text fg="#8B8B8B" attributes={1}>
						Memory Usage
					</text>
					{memory && (
						<text fg="#6B6B6B">
							{((memory.used / memory.total) * 100).toFixed(1)}% |{" "}
							{formatBytes(memory.used * 1024 * 1024)} /{" "}
							{formatBytes(memory.total * 1024 * 1024)} | Swap:{" "}
							{formatBytes(memory.swapUsed * 1024 * 1024)} /{" "}
							{formatBytes(memory.swapTotal * 1024 * 1024)}
						</text>
					)}
				</box>
				<box marginTop={1}>
					{hasData ? (
						<BrailleGraph
							data={memoryData}
							width={graphWidth}
							height={breakpoints.isNarrow ? 4 : 6}
							minValue={0}
							maxValue={100}
							color="#CCAA66"
							showYAxis
							showXAxis
							xAxisLabels={xAxisLabels}
						/>
					) : (
						<text fg="#3D3D3D">No historical data available</text>
					)}
				</box>
			</box>

			{/* Network Section */}
			<box flexDirection="column" marginTop={2}>
				<box
					flexDirection="row"
					justifyContent="space-between"
					alignItems="center"
				>
					<text fg="#8B8B8B" attributes={1}>
						Network Traffic
					</text>
					{network && (
						<text fg="#6B6B6B">
							{network.interface} | ↓ {formatRate(network.rxRate)} | ↑{" "}
							{formatRate(network.txRate)}
						</text>
					)}
				</box>
				<box marginTop={1} flexDirection="column" gap={1}>
					<box flexDirection="row" gap={1} alignItems="flex-end">
						<text fg="#66AA66">↓</text>
						{hasData ? (
							<BrailleGraph
								data={networkRxData}
								width={Math.floor(graphWidth / 2) - 4}
								height={breakpoints.isNarrow ? 2 : 3}
								color="#66AA66"
							/>
						) : (
							<text fg="#3D3D3D">No data</text>
						)}
						<text fg="#CC6666">↑</text>
						{hasData ? (
							<BrailleGraph
								data={networkTxData}
								width={Math.floor(graphWidth / 2) - 4}
								height={breakpoints.isNarrow ? 2 : 3}
								color="#CC6666"
							/>
						) : (
							<text fg="#3D3D3D">No data</text>
						)}
					</box>
				</box>
			</box>

			{/* Disk Section */}
			{primaryDisk && (
				<box flexDirection="column" marginTop={2}>
					<box
						flexDirection="row"
						justifyContent="space-between"
						alignItems="center"
					>
						<text fg="#8B8B8B" attributes={1}>
							Disk Usage
						</text>
						<text fg="#6B6B6B">
							{primaryDisk.usagePercent.toFixed(1)}% |{" "}
							{formatBytes(primaryDisk.used * 1024 * 1024)} /{" "}
							{formatBytes(primaryDisk.total * 1024 * 1024)} |{" "}
							{primaryDisk.mountpoint}
						</text>
					</box>
					<box marginTop={1}>
						<text
							fg={
								primaryDisk.usagePercent >= 90
									? "#CC6666"
									: primaryDisk.usagePercent >= 70
										? "#CCAA66"
										: "#66AA66"
							}
						>
							{"█".repeat(
								Math.round((primaryDisk.usagePercent / 100) * graphWidth),
							)}
							<span fg="#3D3D3D">
								{"░".repeat(
									Math.max(
										0,
										graphWidth -
											Math.round((primaryDisk.usagePercent / 100) * graphWidth),
									),
								)}
							</span>
						</text>
					</box>
				</box>
			)}

			{/* Keyboard hints */}
			<box marginTop={2}>
				<KeyboardHints
					hints={[
						{ key: "ESC", label: "back" },
						{ key: "←/→", label: "time range" },
					]}
				/>
			</box>
		</box>
	);
}

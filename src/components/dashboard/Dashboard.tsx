import { useState, useEffect, useRef } from "react";
import { useKeyboard } from "@opentui/react";
import type { ServerConfig, ServerMetrics } from "../../types";
import type { SSHManager } from "../../services/ssh/SSHManager";
import { DatabaseService } from "../../services/storage/DatabaseService";
import { MetricsCollector } from "../../services/data/MetricsCollector";
import { useResponsive } from "../../hooks/useResponsive";
import ServerMetricsCard from "./ServerMetricsCard";
import AddServerForm from "../servers/AddServerForm";
import KeyboardHints from "../common/KeyboardHints";

interface DashboardProps {
	sshManager: SSHManager;
	onFormModeChange?: (isInForm: boolean) => void;
	onServerSelect?: (serverId: string, serverName: string) => void;
}

const metricsCollector = new MetricsCollector();

export default function Dashboard({
	sshManager,
	onFormModeChange,
	onServerSelect,
}: DashboardProps) {
	const { breakpoints, metricsPerRow, contentWidth } = useResponsive();
	const [servers, setServers] = useState<ServerConfig[]>([]);
	const [metricsMap, setMetricsMap] = useState<Map<string, ServerMetrics>>(
		new Map(),
	);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshStates, setRefreshStates] = useState<
		Map<string, "success" | "error" | "idle">
	>(new Map());
	const [showAddModal, setShowAddModal] = useState(false);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const mountedRef = useRef(true);
	const isCollectingRef = useRef(false);
	const refreshTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
	const updateTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

	// Load servers on mount
	useEffect(() => {
		mountedRef.current = true;
		loadServers();
		return () => {
			mountedRef.current = false;
			refreshTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
			refreshTimeoutsRef.current.clear();
			updateTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
			updateTimeoutsRef.current.clear();
		};
	}, []);

	// Auto-connect and collect metrics
	useEffect(() => {
		if (servers.length === 0) {
			setIsLoading(false);
			return;
		}

		const connectAndCollect = async () => {
			for (const server of servers) {
				if (!mountedRef.current) return;

				// Connect if needed
				if (sshManager.getConnectionStatus(server.id) === "disconnected") {
					try {
						await sshManager.connect(server);
					} catch (error) {
						if (!mountedRef.current) return;
						updateServerMetrics(server.id, {
							serverId: server.id,
							serverName: server.name,
							cpu: null,
							memory: null,
							disks: [],
							network: null,
							lastUpdated: Date.now(),
							error:
								error instanceof Error ? error.message : "Connection failed",
						});
						continue;
					}
				}

				// Collect metrics
				if (!mountedRef.current) return;
				await collectMetricsForServer(server);
			}

			if (mountedRef.current) {
				setIsLoading(false);
			}
		};

		connectAndCollect();
	}, [servers, sshManager]);

	// Periodic refresh
	useEffect(() => {
		if (servers.length === 0) return;

		const interval = setInterval(async () => {
			if (!mountedRef.current || isCollectingRef.current) return;

			isCollectingRef.current = true;
			await Promise.all(
				servers.map((server) => collectMetricsForServer(server)),
			);
			isCollectingRef.current = false;
		}, 1000);

		return () => clearInterval(interval);
	}, [servers, sshManager]);

	const loadServers = async () => {
		const configs = await DatabaseService.getAllServers();
		if (mountedRef.current) {
			setServers(configs);
		}
	};

	const updateServerMetrics = (
		serverId: string,
		metrics: ServerMetrics,
		isError: boolean = false,
	) => {
		if (!mountedRef.current) return;

		// Save metrics to database (only if not an error)
		if (!isError && !metrics.error) {
			DatabaseService.saveMetrics(metrics);
		}

		// Use setTimeout to batch updates and prevent yoga-layout conflicts
		const updateTimeout = setTimeout(() => {
			updateTimeoutsRef.current.delete(updateTimeout);
			if (!mountedRef.current) return;

			setMetricsMap((prev) => {
				const newMap = new Map(prev);
				newMap.set(serverId, metrics);
				return newMap;
			});

			// Trigger per-server refresh indicator
			const state: "success" | "error" = isError ? "error" : "success";
			setRefreshStates((prev) => {
				const newMap = new Map(prev);
				newMap.set(serverId, state);
				return newMap;
			});

			// Clear existing timeout for this server
			const existingTimeout = refreshTimeoutsRef.current.get(serverId);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
			}

			// Reset to idle after 200ms
			const idleTimeout = setTimeout(() => {
				refreshTimeoutsRef.current.delete(serverId);
				if (mountedRef.current) {
					setRefreshStates((prev) => {
						const newMap = new Map(prev);
						newMap.set(serverId, "idle");
						return newMap;
					});
				}
			}, 200);

			refreshTimeoutsRef.current.set(serverId, idleTimeout);
		});

		updateTimeoutsRef.current.add(updateTimeout);
	};

	const collectMetricsForServer = async (server: ServerConfig) => {
		const connection = sshManager.getConnection(server.id);

		if (!connection || !connection.isConnected()) {
			updateServerMetrics(
				server.id,
				{
					serverId: server.id,
					serverName: server.name,
					cpu: null,
					memory: null,
					disks: [],
					network: null,
					lastUpdated: Date.now(),
					error: "Not connected",
				},
				true,
			);
			return;
		}

		try {
			const metrics = await metricsCollector.collectAllMetrics(
				server.id,
				server.name,
				connection,
			);
			updateServerMetrics(server.id, metrics, false);
		} catch (error) {
			updateServerMetrics(
				server.id,
				{
					serverId: server.id,
					serverName: server.name,
					cpu: null,
					memory: null,
					disks: [],
					network: null,
					lastUpdated: Date.now(),
					error: error instanceof Error ? error.message : "Unknown error",
				},
				true,
			);
		}
	};

	// Open/close modal handlers
	const openAddModal = () => {
		setShowAddModal(true);
		onFormModeChange?.(true);
	};

	const closeAddModal = () => {
		setShowAddModal(false);
		onFormModeChange?.(false);
	};

	// Add server handler — only persist if the SSH connection actually works
	const handleAddServer = async (
		config: ServerConfig,
	): Promise<{ success: true } | { success: false; error: string }> => {
		try {
			await sshManager.connect(config);
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Connection failed",
			};
		}

		await DatabaseService.saveServer(config);
		await loadServers();
		closeAddModal();
		return { success: true };
	};

	// Delete server handler
	const handleDeleteServer = async (serverId: string) => {
		// Disconnect first
		sshManager.disconnect(serverId);
		// Remove from storage
		await DatabaseService.deleteServer(serverId);
		// Remove from metrics map
		setMetricsMap((prev) => {
			const newMap = new Map(prev);
			newMap.delete(serverId);
			return newMap;
		});
		// Reload servers
		await loadServers();
		// Reset delete confirmation
		setDeleteConfirmId(null);
		// Adjust selected index if needed
		setSelectedIndex((prev) => Math.max(0, Math.min(prev, servers.length - 2)));
	};

	// Keyboard navigation
	useKeyboard((key) => {
		// Don't handle keys when modal is open
		if (showAddModal) return;

		if (key.name === "up") {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
			setDeleteConfirmId(null);
		} else if (key.name === "down") {
			setSelectedIndex((prev) => Math.min(servers.length - 1, prev + 1));
			setDeleteConfirmId(null);
		} else if (key.name === "return") {
			// Handle delete confirmation first
			if (deleteConfirmId) {
				handleDeleteServer(deleteConfirmId);
			} else if (servers[selectedIndex] && onServerSelect) {
				// Navigate to server detail
				onServerSelect(servers[selectedIndex].id, servers[selectedIndex].name);
			}
		} else if (key.name === "a") {
			openAddModal();
		} else if (key.name === "d" || key.name === "backspace") {
			if (servers.length > 0 && servers[selectedIndex]) {
				setDeleteConfirmId(servers[selectedIndex].id);
			}
		} else if (deleteConfirmId) {
			if (key.name === "y") {
				handleDeleteServer(deleteConfirmId);
			} else if (key.name === "n" || key.name === "escape") {
				setDeleteConfirmId(null);
			}
		}
	});

	// Calculate aggregate stats
	const connectedServers = servers.filter(
		(s) => sshManager.getConnectionStatus(s.id) === "connected",
	);
	const totalCores = Array.from(metricsMap.values()).reduce(
		(sum, m) => sum + (m.cpu?.cores || 0),
		0,
	);
	const avgCpuUsage =
		Array.from(metricsMap.values())
			.filter((m) => m.cpu)
			.reduce((sum, m) => sum + (m.cpu?.usage || 0), 0) /
			Math.max(1, connectedServers.length) || 0;
	const avgMemoryUsage =
		Array.from(metricsMap.values())
			.filter((m) => m.memory)
			.reduce((sum, m) => {
				if (!m.memory) return sum;
				return sum + (m.memory.used / m.memory.total) * 100;
			}, 0) / Math.max(1, connectedServers.length) || 0;

	// Show add server form (replaces content)
	if (showAddModal) {
		return (
			<box flexDirection="column">
				<AddServerForm onSave={handleAddServer} onCancel={closeAddModal} />
			</box>
		);
	}

	if (isLoading && servers.length === 0) {
		return (
			<box flexDirection="column">
				<text attributes={1}>Dashboard</text>
				<box marginTop={2}>
					<text fg="#5C5C5C">Loading servers...</text>
				</box>
			</box>
		);
	}

	if (servers.length === 0) {
		return (
			<box flexDirection="column">
				<text attributes={1}>Dashboard</text>
				<box marginTop={2} padding={2} backgroundColor="#0E0E0E">
					<text fg="#5C5C5C">No servers configured</text>
				</box>
				<box marginTop={1}>
					<KeyboardHints hints={[{ key: "a", label: "add server" }]} />
				</box>
			</box>
		);
	}

	return (
		<box flexDirection="column">
			<box
				flexDirection="row"
				justifyContent="space-between"
				alignItems="center"
			>
				<text attributes={1}>
					{breakpoints.isNarrow ? "Dash" : "Dashboard"}
				</text>
				<text fg="#3D3D3D" attributes={2}>
					{`${connectedServers.length}/${servers.length} connected`}
				</text>
			</box>

			<box
				flexDirection={breakpoints.isNarrow ? "column" : "row"}
				marginTop={1}
				gap={breakpoints.isNarrow ? 0 : 4}
				padding={1}
				backgroundColor="#0A0A0A"
				flexWrap="wrap"
			>
				<box flexDirection="row" gap={1}>
					<text fg="#5C5C5C">Servers:</text>
					<text fg="#8B8B8B">{servers.length}</text>
				</box>
				<box flexDirection="row" gap={1}>
					<text fg="#5C5C5C">
						{breakpoints.isNarrow ? "Cores:" : "Total Cores:"}
					</text>
					<text fg="#8B8B8B">{totalCores}</text>
				</box>
				<box flexDirection="row" gap={1}>
					<text fg="#5C5C5C">{breakpoints.isNarrow ? "CPU:" : "Avg CPU:"}</text>
					<text fg="#8B8B8B">{avgCpuUsage.toFixed(1)}%</text>
				</box>
				<box flexDirection="row" gap={1}>
					<text fg="#5C5C5C">
						{breakpoints.isNarrow ? "Mem:" : "Avg Memory:"}
					</text>
					<text fg="#8B8B8B">{avgMemoryUsage.toFixed(1)}%</text>
				</box>
			</box>

			<box flexDirection="column" marginTop={1} gap={1}>
				{servers.map((server, index) => {
					const metrics = metricsMap.get(server.id) || {
						serverId: server.id,
						serverName: server.name,
						cpu: null,
						memory: null,
						disks: [],
						network: null,
						lastUpdated: Date.now(),
					};

					return (
						<ServerMetricsCard
							key={server.id}
							metrics={metrics}
							isSelected={index === selectedIndex}
							refreshState={refreshStates.get(server.id) || "idle"}
							connectionStatus={sshManager.getConnectionStatus(server.id)}
							isDeleting={deleteConfirmId === server.id}
							metricsPerRow={metricsPerRow}
							contentWidth={contentWidth}
						/>
					);
				})}
			</box>

			{/* Keyboard hints */}
			<box marginTop={2}>
				<KeyboardHints
					hints={[
						{
							key: "ENTER",
							label: breakpoints.isNarrow ? "open" : "open details",
						},
						{ key: "a", label: breakpoints.isNarrow ? "add" : "add server" },
						{ key: "d", label: "delete" },
					]}
				/>
			</box>
		</box>
	);
}

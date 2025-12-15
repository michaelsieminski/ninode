import { useState, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import type { ServerConfig, ConnectionStatus } from "../../types";
import type { SSHManager } from "../../services/ssh/SSHManager";

interface ServerListProps {
	servers: ServerConfig[];
	sshManager: SSHManager;
	onDelete?: (serverId: string) => void;
	onRequestAdd?: () => void;
}

export default function ServerList({
	servers,
	sshManager,
	onDelete,
	onRequestAdd,
}: ServerListProps) {
	const [serverStatuses, setServerStatuses] = useState<
		Map<string, ConnectionStatus>
	>(new Map());
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const [errors, setErrors] = useState<Map<string, string>>(new Map());
	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

	useEffect(() => {
		const updateStatuses = () => {
			const statuses = new Map<string, ConnectionStatus>();
			servers.forEach((server) => {
				statuses.set(server.id, sshManager.getConnectionStatus(server.id));
			});
			setServerStatuses(statuses);
		};

		updateStatuses();
		const interval = setInterval(updateStatuses, 1000);
		return () => clearInterval(interval);
	}, [servers, sshManager]);

	const getStatusAttributes = (status: ConnectionStatus) => {
		switch (status) {
			case "connected":
				return 2; // Green
			case "connecting":
				return 8; // Yellow
			case "error":
				return 4; // Red
			default:
				return 0; // Normal
		}
	};

	useKeyboard((key) => {
		// Handle delete confirmation dialog
		if (deleteConfirm !== null) {
			if (key.name === "y" || key.name === "return") {
				if (onDelete) {
					sshManager.disconnect(deleteConfirm);
					onDelete(deleteConfirm);
				}
				setDeleteConfirm(null);
			} else if (key.name === "n" || key.name === "escape") {
				setDeleteConfirm(null);
			}
			return;
		}

		// Add server shortcut
		if (key.name === "a" && onRequestAdd) {
			onRequestAdd();
			return;
		}

		// Delete server shortcut
		if (
			(key.name === "d" || key.name === "backspace") &&
			servers[selectedIndex]
		) {
			setDeleteConfirm(servers[selectedIndex].id);
			return;
		}

		if (key.name === "up") {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
		} else if (key.name === "down") {
			setSelectedIndex((prev) => Math.min(servers.length - 1, prev + 1));
		}
	});

	if (servers.length === 0) {
		return (
			<box flexDirection="column" padding={2} backgroundColor="#0E0E0E">
				<text fg="#5C5C5C">No servers configured</text>
				<text fg="#3D3D3D" attributes={2}>
					Press [a] to add a server
				</text>
			</box>
		);
	}

	return (
		<box flexDirection="column" padding={0} marginTop={1} gap={1}>
			{servers.map((server, index) => {
				const status = serverStatuses.get(server.id) || "disconnected";
				const isSelected = index === selectedIndex;

				return (
					<box
						key={server.id}
						flexDirection="column"
						padding={2}
						backgroundColor={isSelected ? "#171717" : "#0E0E0E"}
					>
						<box
							flexDirection="row"
							justifyContent="space-between"
							alignItems="center"
						>
							<box flexDirection="column" gap={0}>
								<text
									fg={isSelected ? "#FFFFFF" : "#8B8B8B"}
									attributes={isSelected ? 1 : 0}
								>
									{server.name}
								</text>
								<text fg="#6B6B6B">
									{server.username}@{server.host}:{server.port}
								</text>
							</box>
							<box flexDirection="column" alignItems="flex-end" gap={0}>
								<text attributes={getStatusAttributes(status)}>
									{status.toUpperCase()}
								</text>
								<text fg="#5C5C5C">{server.authMethod}</text>
							</box>
						</box>

						{isSelected && deleteConfirm === server.id && (
							<box
								flexDirection="row"
								justifyContent="flex-end"
								gap={1}
								marginTop={1}
							>
								<text fg="#CC6666">Delete this server? </text>
								<text fg="#FFFFFF" attributes={1}>
									[y]
								</text>
								<text fg="#8B8B8B">es</text>
								<text fg="#FFFFFF" attributes={1}>
									{" "}
									[n]
								</text>
								<text fg="#8B8B8B">o</text>
							</box>
						)}

						{isSelected && deleteConfirm !== server.id && (
							<box flexDirection="row" justifyContent="flex-end" marginTop={1}>
								<text fg="#5C5C5C">[d] delete</text>
							</box>
						)}

						{errors.get(server.id) && (
							<box marginTop={1} padding={1} backgroundColor="#260101">
								<text fg="#940808">Error: {errors.get(server.id)}</text>
							</box>
						)}
					</box>
				);
			})}
		</box>
	);
}

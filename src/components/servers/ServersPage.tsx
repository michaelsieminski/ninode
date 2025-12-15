import { useState, useEffect } from "react";
import type { ServerConfig } from "../../types";
import type { SSHManager } from "../../services/ssh/SSHManager";
import ServerList from "./ServerList";
import AddServerForm from "./AddServerForm";
import { SecureStorage } from "../../services/ssh/SecureStorage";

interface ServersPageProps {
	sshManager: SSHManager;
	onFormModeChange?: (isFormMode: boolean) => void;
}

const secureStorage = new SecureStorage();

type ViewMode = "list" | "add";

export default function ServersPage({
	sshManager,
	onFormModeChange,
}: ServersPageProps) {
	const [servers, setServers] = useState<ServerConfig[]>([]);
	const [viewMode, setViewMode] = useState<ViewMode>("list");

	useEffect(() => {
		loadServers();
	}, []);

	useEffect(() => {
		servers.forEach(async (server) => {
			if (sshManager.getConnectionStatus(server.id) === "disconnected") {
				try {
					await sshManager.connect(server);
				} catch (error) {
					console.error("Failed to connect to", server.name, error);
				}
			}
		});
	}, [servers, sshManager]);

	const loadServers = async () => {
		const configs = await secureStorage.getAllServerConfigs();
		if (configs.length === 0 && process.env.TEST_HOST) {
			// Add a test server for demonstration from env
			const testConfig = {
				id: "test",
				name: process.env.TEST_NAME || "Test Server",
				host: process.env.TEST_HOST,
				port: parseInt(process.env.TEST_PORT || "22"),
				username: process.env.TEST_USERNAME || "user",
				authMethod: "password" as const,
				password: process.env.TEST_PASSWORD, // From env
			};
			await secureStorage.saveServerConfig(testConfig);
			configs.push(testConfig);
		}
		setServers(configs);
	};

	const handleAddServer = async (config: ServerConfig) => {
		await secureStorage.saveServerConfig(config);
		setServers((prev) => [...prev, config]);
		setViewMode("list");
		onFormModeChange?.(false);
	};

	const handleDeleteServer = async (serverId: string) => {
		await secureStorage.deleteServerConfig(serverId);
		setServers((prev) => prev.filter((s) => s.id !== serverId));
	};

	const handleShowAddForm = () => {
		setViewMode("add");
		onFormModeChange?.(true);
	};

	const handleCancelForm = () => {
		setViewMode("list");
		onFormModeChange?.(false);
	};

	if (viewMode === "add") {
		return (
			<box flexDirection="column">
				<AddServerForm onSave={handleAddServer} onCancel={handleCancelForm} />
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
				<text attributes={1}>Servers</text>
				<box flexDirection="row" gap={2}>
					<text fg="#6B6B6B">[a] add</text>
					<text attributes={2}>
						{servers.length} {servers.length === 1 ? "server" : "servers"}
					</text>
				</box>
			</box>

			<ServerList
				servers={servers}
				sshManager={sshManager}
				onDelete={handleDeleteServer}
				onRequestAdd={handleShowAddForm}
			/>
		</box>
	);
}

import { SSHConnection } from "./SSHConnection";
import type { ServerConfig, ConnectionStatus } from "../../types";

export class SSHManager {
	private connections: Map<string, SSHConnection> = new Map();

	async connect(config: ServerConfig): Promise<SSHConnection> {
		const connection = new SSHConnection();
		await connection.connect(config);
		this.connections.set(config.id, connection);
		return connection;
	}

	async disconnect(connectionId: string): Promise<void> {
		const connection = this.connections.get(connectionId);
		if (connection) {
			connection.disconnect();
			this.connections.delete(connectionId);
		}
	}

	async testConnection(config: ServerConfig): Promise<boolean> {
		const connection = new SSHConnection();
		try {
			await connection.connect(config);
			// Execute a simple test command
			const result = await connection.executeCommand('echo "test"');
			connection.disconnect();
			return result.exitCode === 0;
		} catch (error) {
			return false;
		}
	}

	getConnectionStatus(connectionId: string): ConnectionStatus {
		const connection = this.connections.get(connectionId);
		if (!connection) {
			return "disconnected";
		}
		return connection.isConnected() ? "connected" : "disconnected";
	}

	getConnection(connectionId: string): SSHConnection | undefined {
		return this.connections.get(connectionId);
	}
}

import { createConnection } from "net";
import { SSHConnection } from "./SSHConnection";
import type { ServerConfig, ConnectionStatus } from "../../types";

// Minimum gap between reconnect attempts for a server that's currently down.
// Probing the TCP port is cheap, but doing it on every 1s UI tick is wasteful
// and creates needless connect/close noise on the target.
const RECONNECT_THROTTLE_MS = 5000;
const TCP_PROBE_TIMEOUT_MS = 2000;

export class SSHManager {
	private connections: Map<string, SSHConnection> = new Map();
	private lastReconnectAttempt: Map<string, number> = new Map();
	private inFlightReconnects: Map<string, Promise<SSHConnection | null>> =
		new Map();

	async connect(config: ServerConfig): Promise<SSHConnection> {
		const connection = new SSHConnection();
		await connection.connect(config);
		this.connections.set(config.id, connection);
		this.lastReconnectAttempt.set(config.id, Date.now());
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

	/**
	 * TCP-only probe on the configured SSH port. Resolves true when the port
	 * accepts a connection (proof sshd is listening), false otherwise. ICMP is
	 * intentionally avoided — ping success doesn't imply sshd is up.
	 */
	async probeSshPort(config: ServerConfig): Promise<boolean> {
		return new Promise((resolve) => {
			const socket = createConnection({
				host: config.host,
				port: config.port,
			});

			let settled = false;
			const finish = (ok: boolean) => {
				if (settled) return;
				settled = true;
				socket.destroy();
				resolve(ok);
			};

			socket.setTimeout(TCP_PROBE_TIMEOUT_MS);
			socket.once("connect", () => finish(true));
			socket.once("timeout", () => finish(false));
			socket.once("error", () => finish(false));
		});
	}

	/**
	 * Returns a live connection for the server, attempting reconnect when the
	 * existing one is dead. Throttled per-server so the 1s UI loop doesn't
	 * hammer hosts that are still down. Returns null if the host is unreachable
	 * — callers should treat that as "still disconnected, try again later".
	 */
	async ensureConnected(config: ServerConfig): Promise<SSHConnection | null> {
		const existing = this.connections.get(config.id);
		if (existing && existing.isConnected()) {
			return existing;
		}

		const inFlight = this.inFlightReconnects.get(config.id);
		if (inFlight) {
			return inFlight;
		}

		const lastAttempt = this.lastReconnectAttempt.get(config.id) ?? 0;
		if (Date.now() - lastAttempt < RECONNECT_THROTTLE_MS) {
			return null;
		}

		const attempt = (async (): Promise<SSHConnection | null> => {
			this.lastReconnectAttempt.set(config.id, Date.now());

			// Drop the stale connection object before reconnecting so its state
			// isn't observed by other callers mid-attempt.
			if (existing) {
				existing.disconnect();
				this.connections.delete(config.id);
			}

			const portOpen = await this.probeSshPort(config);
			if (!portOpen) {
				return null;
			}

			try {
				return await this.connect(config);
			} catch {
				return null;
			}
		})();

		this.inFlightReconnects.set(config.id, attempt);
		try {
			return await attempt;
		} finally {
			this.inFlightReconnects.delete(config.id);
		}
	}
}

import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
	unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DatabaseService } from "../storage/DatabaseService";
import { SSHManager } from "../ssh/SSHManager";
import { MetricsCollector } from "../data/MetricsCollector";
import type { ServerConfig } from "../../types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..", "..");

const PID_FILE = join(PROJECT_ROOT, "db", "daemon.pid");
const LOG_FILE = join(PROJECT_ROOT, "db", "daemon.log");
const COLLECTION_INTERVAL_MS = 10000; // 10 seconds

class DaemonServiceClass {
	private sshManager = new SSHManager();
	private metricsCollector = new MetricsCollector();
	private collectionInterval: ReturnType<typeof setInterval> | null = null;
	private isRunning = false;

	private log(message: string): void {
		const timestamp = new Date().toISOString();
		const logMessage = `[${timestamp}] ${message}\n`;
		try {
			const existing = existsSync(LOG_FILE)
				? readFileSync(LOG_FILE, "utf-8")
				: "";
			writeFileSync(LOG_FILE, existing + logMessage);
		} catch {
			// Ignore log errors
		}
	}

	private writePidFile(): void {
		const dir = dirname(PID_FILE);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
		writeFileSync(PID_FILE, process.pid.toString());
	}

	private removePidFile(): void {
		if (existsSync(PID_FILE)) {
			unlinkSync(PID_FILE);
		}
	}

	static getPid(): number | null {
		if (!existsSync(PID_FILE)) {
			return null;
		}
		try {
			const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
			// Check if process is still running
			try {
				process.kill(pid, 0);
				return pid;
			} catch {
				// Process not running, clean up stale PID file
				unlinkSync(PID_FILE);
				return null;
			}
		} catch {
			return null;
		}
	}

	static isRunning(): boolean {
		return DaemonServiceClass.getPid() !== null;
	}

	async start(): Promise<void> {
		if (this.isRunning) {
			this.log("Daemon already running in this process");
			return;
		}

		// Check if another daemon is already running before we start
		if (DaemonServiceClass.isRunning()) {
			this.log(
				`Another daemon already running (PID: ${DaemonServiceClass.getPid()}), exiting`,
			);
			process.exit(0);
		}

		// Write PID file immediately to prevent race conditions
		this.writePidFile();
		this.isRunning = true;

		this.log("Starting ninode daemon...");

		// Initialize database
		await DatabaseService.initialize();
		this.log("Database initialized");

		// Start collection loop
		await this.runCollectionLoop();
		this.collectionInterval = setInterval(
			() => this.runCollectionLoop(),
			COLLECTION_INTERVAL_MS,
		);

		this.log(
			`Daemon started (PID: ${process.pid}), collecting every ${COLLECTION_INTERVAL_MS / 1000}s`,
		);

		// Handle shutdown signals
		process.on("SIGINT", () => this.stop());
		process.on("SIGTERM", () => this.stop());
	}

	private async runCollectionLoop(): Promise<void> {
		try {
			const servers = await DatabaseService.getAllServers();

			if (servers.length === 0) {
				return;
			}

			for (const server of servers) {
				await this.collectServerMetrics(server);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			this.log(`Collection loop error: ${message}`);
		}
	}

	private async collectServerMetrics(server: ServerConfig): Promise<void> {
		try {
			// Get or create connection
			let connection = this.sshManager.getConnection(server.id);

			if (!connection || !connection.isConnected()) {
				try {
					connection = await this.sshManager.connect(server);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					this.log(`Failed to connect to ${server.name}: ${message}`);
					return;
				}
			}

			// Collect metrics
			const metrics = await this.metricsCollector.collectAllMetrics(
				server.id,
				server.name,
				connection,
			);

			// Save to database (only if no error)
			if (!metrics.error) {
				DatabaseService.saveMetrics(metrics);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			this.log(`Failed to collect metrics for ${server.name}: ${message}`);

			// Disconnect on error to force reconnection next time
			await this.sshManager.disconnect(server.id);
		}
	}

	stop(): void {
		this.log("Stopping daemon...");

		if (this.collectionInterval) {
			clearInterval(this.collectionInterval);
			this.collectionInterval = null;
		}

		DatabaseService.close();
		this.removePidFile();
		this.isRunning = false;

		this.log("Daemon stopped");
		process.exit(0);
	}
}

export const DaemonService = new DaemonServiceClass();
export { DaemonServiceClass };

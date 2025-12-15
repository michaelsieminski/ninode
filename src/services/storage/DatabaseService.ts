import { Database } from "bun:sqlite";
import { Entry } from "@napi-rs/keyring";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import type { ServerConfig, ServerMetrics } from "../../types";

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..", "..");

export interface MetricsDataPoint {
	timestamp: number;
	cpuUsage: number | null;
	cpuLoad1: number | null;
	cpuLoad5: number | null;
	cpuLoad15: number | null;
	cpuCores: number | null;
	memoryTotal: number | null;
	memoryUsed: number | null;
	memoryFree: number | null;
	swapTotal: number | null;
	swapUsed: number | null;
	networkInterface: string | null;
	networkRxRate: number | null;
	networkTxRate: number | null;
	disks: Array<{
		filesystem: string;
		total: number;
		used: number;
		free: number;
		usagePercent: number;
		mountpoint: string;
	}>;
}

export type AggregationLevel = "raw" | "1min" | "5min" | "15min";

class DatabaseServiceClass {
	private db: Database | null = null;
	private dbPath: string;
	private dataDir: string;
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.dataDir = join(PROJECT_ROOT, "db");
		this.dbPath = join(this.dataDir, "ninode.db");
	}

	async initialize(): Promise<void> {
		this.ensureDirectory();
		this.db = new Database(this.dbPath);
		this.setupPragmas();
		this.setupSchema();
		await this.migrateFromSecureStorageIfNeeded();
		this.startCleanupJob();
	}

	private ensureDirectory(): void {
		if (!existsSync(this.dataDir)) {
			mkdirSync(this.dataDir, { recursive: true });
		}
	}

	private setupPragmas(): void {
		if (!this.db) return;
		this.db.exec("PRAGMA journal_mode = WAL");
		this.db.exec("PRAGMA synchronous = NORMAL");
		this.db.exec("PRAGMA foreign_keys = ON");
	}

	private setupSchema(): void {
		if (!this.db) return;

		this.db.exec(`
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 22,
        username TEXT NOT NULL,
        auth_method TEXT NOT NULL CHECK (auth_method IN ('password', 'key')),
        key_path TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

		this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        cpu_usage REAL,
        cpu_load_1 REAL,
        cpu_load_5 REAL,
        cpu_load_15 REAL,
        cpu_cores INTEGER,
        memory_total INTEGER,
        memory_used INTEGER,
        memory_free INTEGER,
        swap_total INTEGER,
        swap_used INTEGER,
        network_interface TEXT,
        network_rx_rate REAL,
        network_tx_rate REAL,
        disks_json TEXT,
        FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
      )
    `);

		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metrics_server_time
      ON metrics(server_id, timestamp DESC)
    `);

		this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
      ON metrics(timestamp)
    `);
	}

	private async migrateFromSecureStorageIfNeeded(): Promise<void> {
		if (!this.db) return;

		const configsJsonPath = "configs.json";
		const configsFile = Bun.file(configsJsonPath);

		if (!(await configsFile.exists())) return;

		const serverCount = this.db
			.query<{ count: number }, []>("SELECT COUNT(*) as count FROM servers")
			.get();

		if (serverCount && serverCount.count > 0) return;

		try {
			const configsText = await configsFile.text();
			const configs = JSON.parse(configsText) as Record<
				string,
				Omit<ServerConfig, "password">
			>;

			for (const [id, config] of Object.entries(configs)) {
				const entry = new Entry("ninode", `${id}-password`);
				let password: string | undefined;
				try {
					password = entry.getPassword() || undefined;
				} catch {
					password = undefined;
				}

				await this.saveServer({
					...config,
					id,
					password,
				});
			}

			console.log(`Migrated ${Object.keys(configs).length} servers to SQLite`);
		} catch (error) {
			console.error("Migration from SecureStorage failed:", error);
		}
	}

	// Server management methods
	async saveServer(config: ServerConfig): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		if (config.password) {
			const entry = new Entry("ninode", `${config.id}-password`);
			entry.setPassword(config.password);
		}

		const existingServer = this.db
			.query<{ id: string }, [string]>("SELECT id FROM servers WHERE id = ?")
			.get(config.id);

		if (existingServer) {
			this.db
				.query(
					`
        UPDATE servers SET
          name = ?,
          host = ?,
          port = ?,
          username = ?,
          auth_method = ?,
          key_path = ?,
          updated_at = unixepoch()
        WHERE id = ?
      `,
				)
				.run(
					config.name,
					config.host,
					config.port,
					config.username,
					config.authMethod,
					config.keyPath || null,
					config.id,
				);
		} else {
			this.db
				.query(
					`
        INSERT INTO servers (id, name, host, port, username, auth_method, key_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
				)
				.run(
					config.id,
					config.name,
					config.host,
					config.port,
					config.username,
					config.authMethod,
					config.keyPath || null,
				);
		}
	}

	async getServer(id: string): Promise<ServerConfig | null> {
		if (!this.db) throw new Error("Database not initialized");

		const row = this.db
			.query<
				{
					id: string;
					name: string;
					host: string;
					port: number;
					username: string;
					auth_method: string;
					key_path: string | null;
				},
				[string]
			>("SELECT * FROM servers WHERE id = ?")
			.get(id);

		if (!row) return null;

		let password: string | undefined;
		try {
			const entry = new Entry("ninode", `${id}-password`);
			password = entry.getPassword() || undefined;
		} catch {
			password = undefined;
		}

		return {
			id: row.id,
			name: row.name,
			host: row.host,
			port: row.port,
			username: row.username,
			authMethod: row.auth_method as "password" | "key",
			keyPath: row.key_path || undefined,
			password,
		};
	}

	async getAllServers(): Promise<ServerConfig[]> {
		if (!this.db) throw new Error("Database not initialized");

		const rows = this.db
			.query<
				{
					id: string;
					name: string;
					host: string;
					port: number;
					username: string;
					auth_method: string;
					key_path: string | null;
				},
				[]
			>("SELECT * FROM servers ORDER BY name")
			.all();

		const servers: ServerConfig[] = [];

		for (const row of rows) {
			let password: string | undefined;
			try {
				const entry = new Entry("ninode", `${row.id}-password`);
				password = entry.getPassword() || undefined;
			} catch {
				password = undefined;
			}

			servers.push({
				id: row.id,
				name: row.name,
				host: row.host,
				port: row.port,
				username: row.username,
				authMethod: row.auth_method as "password" | "key",
				keyPath: row.key_path || undefined,
				password,
			});
		}

		return servers;
	}

	async deleteServer(id: string): Promise<void> {
		if (!this.db) throw new Error("Database not initialized");

		this.db.query("DELETE FROM servers WHERE id = ?").run(id);

		try {
			const entry = new Entry("ninode", `${id}-password`);
			entry.deletePassword();
		} catch {
			// Password might not exist
		}
	}

	// Metrics storage methods
	saveMetrics(metrics: ServerMetrics): void {
		if (!this.db) throw new Error("Database not initialized");

		this.db
			.query(
				`
      INSERT INTO metrics (
        server_id, timestamp,
        cpu_usage, cpu_load_1, cpu_load_5, cpu_load_15, cpu_cores,
        memory_total, memory_used, memory_free, swap_total, swap_used,
        network_interface, network_rx_rate, network_tx_rate,
        disks_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
			)
			.run(
				metrics.serverId,
				metrics.lastUpdated,
				metrics.cpu?.usage ?? null,
				metrics.cpu?.loadAverage[0] ?? null,
				metrics.cpu?.loadAverage[1] ?? null,
				metrics.cpu?.loadAverage[2] ?? null,
				metrics.cpu?.cores ?? null,
				metrics.memory?.total ?? null,
				metrics.memory?.used ?? null,
				metrics.memory?.free ?? null,
				metrics.memory?.swapTotal ?? null,
				metrics.memory?.swapUsed ?? null,
				metrics.network?.interface ?? null,
				metrics.network?.rxRate ?? null,
				metrics.network?.txRate ?? null,
				JSON.stringify(metrics.disks),
			);
	}

	getMetricsRange(
		serverId: string,
		startTime: number,
		endTime: number,
		aggregation: AggregationLevel = "raw",
	): MetricsDataPoint[] {
		if (!this.db) throw new Error("Database not initialized");

		if (aggregation === "raw") {
			return this.getRawMetrics(serverId, startTime, endTime);
		}

		return this.getAggregatedMetrics(serverId, startTime, endTime, aggregation);
	}

	private getRawMetrics(
		serverId: string,
		startTime: number,
		endTime: number,
	): MetricsDataPoint[] {
		if (!this.db) return [];

		const rows = this.db
			.query<
				{
					timestamp: number;
					cpu_usage: number | null;
					cpu_load_1: number | null;
					cpu_load_5: number | null;
					cpu_load_15: number | null;
					cpu_cores: number | null;
					memory_total: number | null;
					memory_used: number | null;
					memory_free: number | null;
					swap_total: number | null;
					swap_used: number | null;
					network_interface: string | null;
					network_rx_rate: number | null;
					network_tx_rate: number | null;
					disks_json: string | null;
				},
				[string, number, number]
			>(
				`
      SELECT * FROM metrics
      WHERE server_id = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `,
			)
			.all(serverId, startTime, endTime);

		return rows.map(this.mapRowToDataPoint);
	}

	private getAggregatedMetrics(
		serverId: string,
		startTime: number,
		endTime: number,
		aggregation: AggregationLevel,
	): MetricsDataPoint[] {
		if (!this.db) return [];

		const intervalSeconds =
			aggregation === "1min" ? 60 : aggregation === "5min" ? 300 : 900;

		const rows = this.db
			.query<
				{
					bucket: number;
					cpu_usage: number | null;
					cpu_load_1: number | null;
					cpu_load_5: number | null;
					cpu_load_15: number | null;
					cpu_cores: number | null;
					memory_total: number | null;
					memory_used: number | null;
					memory_free: number | null;
					swap_total: number | null;
					swap_used: number | null;
					network_interface: string | null;
					network_rx_rate: number | null;
					network_tx_rate: number | null;
				},
				[number, number, string, number, number]
			>(
				`
      SELECT
        (timestamp / ? * ?) as bucket,
        AVG(cpu_usage) as cpu_usage,
        AVG(cpu_load_1) as cpu_load_1,
        AVG(cpu_load_5) as cpu_load_5,
        AVG(cpu_load_15) as cpu_load_15,
        MAX(cpu_cores) as cpu_cores,
        MAX(memory_total) as memory_total,
        AVG(memory_used) as memory_used,
        AVG(memory_free) as memory_free,
        MAX(swap_total) as swap_total,
        AVG(swap_used) as swap_used,
        MAX(network_interface) as network_interface,
        AVG(network_rx_rate) as network_rx_rate,
        AVG(network_tx_rate) as network_tx_rate
      FROM metrics
      WHERE server_id = ? AND timestamp >= ? AND timestamp <= ?
      GROUP BY bucket
      ORDER BY bucket ASC
    `,
			)
			.all(intervalSeconds, intervalSeconds, serverId, startTime, endTime);

		return rows.map((row) => ({
			timestamp: row.bucket * 1000,
			cpuUsage: row.cpu_usage,
			cpuLoad1: row.cpu_load_1,
			cpuLoad5: row.cpu_load_5,
			cpuLoad15: row.cpu_load_15,
			cpuCores: row.cpu_cores,
			memoryTotal: row.memory_total,
			memoryUsed: row.memory_used,
			memoryFree: row.memory_free,
			swapTotal: row.swap_total,
			swapUsed: row.swap_used,
			networkInterface: row.network_interface,
			networkRxRate: row.network_rx_rate,
			networkTxRate: row.network_tx_rate,
			disks: [],
		}));
	}

	private mapRowToDataPoint(row: {
		timestamp: number;
		cpu_usage: number | null;
		cpu_load_1: number | null;
		cpu_load_5: number | null;
		cpu_load_15: number | null;
		cpu_cores: number | null;
		memory_total: number | null;
		memory_used: number | null;
		memory_free: number | null;
		swap_total: number | null;
		swap_used: number | null;
		network_interface: string | null;
		network_rx_rate: number | null;
		network_tx_rate: number | null;
		disks_json: string | null;
	}): MetricsDataPoint {
		let disks: MetricsDataPoint["disks"] = [];
		if (row.disks_json) {
			try {
				disks = JSON.parse(row.disks_json);
			} catch {
				disks = [];
			}
		}

		return {
			timestamp: row.timestamp,
			cpuUsage: row.cpu_usage,
			cpuLoad1: row.cpu_load_1,
			cpuLoad5: row.cpu_load_5,
			cpuLoad15: row.cpu_load_15,
			cpuCores: row.cpu_cores,
			memoryTotal: row.memory_total,
			memoryUsed: row.memory_used,
			memoryFree: row.memory_free,
			swapTotal: row.swap_total,
			swapUsed: row.swap_used,
			networkInterface: row.network_interface,
			networkRxRate: row.network_rx_rate,
			networkTxRate: row.network_tx_rate,
			disks,
		};
	}

	cleanupOldMetrics(retentionDays: number = 30): number {
		if (!this.db) return 0;

		const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

		const result = this.db
			.query("DELETE FROM metrics WHERE timestamp < ?")
			.run(cutoffTime);

		return result.changes;
	}

	private startCleanupJob(intervalMs: number = 3600000): void {
		this.cleanupInterval = setInterval(() => {
			const deleted = this.cleanupOldMetrics();
			if (deleted > 0) {
				console.log(`Cleaned up ${deleted} old metrics records`);
			}
		}, intervalMs);
	}

	close(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}
}

export const DatabaseService = new DatabaseServiceClass();

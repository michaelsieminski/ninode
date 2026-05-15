import { Client } from "ssh2";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { ServerConfig, CommandResult } from "../../types";

function resolveKeyPath(path: string): string {
	if (path === "~") return homedir();
	if (path.startsWith("~/")) return join(homedir(), path.slice(2));
	return path;
}

export class SSHConnection {
	private client: Client;
	private connected: boolean = false;

	constructor() {
		this.client = new Client();
	}

	async connect(config: ServerConfig): Promise<void> {
		return new Promise((resolve, reject) => {
			const connectConfig: any = {
				host: config.host,
				port: config.port,
				username: config.username,
			};

			if (config.authMethod === "password" && config.password) {
				connectConfig.password = config.password;
			} else if (config.authMethod === "key" && config.keyPath) {
				connectConfig.privateKey = readFileSync(resolveKeyPath(config.keyPath));
			}

			this.client.on("ready", () => {
				this.connected = true;
				resolve();
			});

			this.client.on("error", (err) => {
				this.connected = false;
				reject(err);
			});

			this.client.connect(connectConfig);
		});
	}

	async executeCommand(command: string): Promise<CommandResult> {
		return new Promise((resolve, reject) => {
			if (!this.connected) {
				reject(new Error("Not connected"));
				return;
			}

			this.client.exec(command, (err, stream) => {
				if (err) {
					reject(err);
					return;
				}

				let stdout = "";
				let stderr = "";

				stream.on("close", (code: number) => {
					resolve({
						stdout,
						stderr,
						exitCode: code || 0,
					});
				});

				stream.on("data", (data: Buffer) => {
					stdout += data.toString();
				});

				stream.stderr.on("data", (data: Buffer) => {
					stderr += data.toString();
				});
			});
		});
	}

	async streamCommand(command: string): Promise<ReadableStream> {
		// TODO: Implement streaming for real-time output
		throw new Error("Not implemented");
	}

	isConnected(): boolean {
		return this.connected;
	}

	disconnect(): void {
		this.client.end();
		this.connected = false;
	}
}

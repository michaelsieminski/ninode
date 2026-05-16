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
				// Fail fast on dead hosts instead of hanging on the TCP SYN.
				readyTimeout: 5000,
				// Detect half-open connections (VM powered off mid-session) within ~20s.
				keepaliveInterval: 10000,
				keepaliveCountMax: 2,
			};

			if (config.authMethod === "password" && config.password) {
				connectConfig.password = config.password;
			} else if (config.authMethod === "key" && config.keyPath) {
				connectConfig.privateKey = readFileSync(resolveKeyPath(config.keyPath));
			}

			let settled = false;
			const settle = (fn: () => void) => {
				if (settled) return;
				settled = true;
				fn();
			};

			this.client.on("ready", () => {
				this.connected = true;
				settle(resolve);
			});

			this.client.on("error", (err) => {
				this.connected = false;
				settle(() => reject(err));
			});

			// Without these, a TCP RST or VM shutdown can leave `connected` true
			// until the next exec fails, masking the real state from the UI.
			this.client.on("close", () => {
				this.connected = false;
			});

			this.client.on("end", () => {
				this.connected = false;
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

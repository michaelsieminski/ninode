import { Entry } from "@napi-rs/keyring";
import type { ServerConfig } from "../../types";

export class SecureStorage {
	private configFile = "configs.json";

	async saveServerConfig(config: ServerConfig): Promise<void> {
		// Load existing configs
		const configs = await this.loadServerConfigs();

		// Store password securely if present
		if (config.password) {
			const entry = new Entry("ninode", `${config.id}-password`);
			entry.setPassword(config.password);
		}

		// Remove password from config before saving
		const configToSave = { ...config };
		delete configToSave.password;

		// Update and save configs
		configs[config.id] = configToSave;
		await Bun.write(this.configFile, JSON.stringify(configs, null, 2));
	}

	async loadServerConfigs(): Promise<
		Record<string, Omit<ServerConfig, "password">>
	> {
		try {
			const file = Bun.file(this.configFile);
			const text = await file.text();
			return JSON.parse(text);
		} catch {
			return {};
		}
	}

	async getServerConfig(id: string): Promise<ServerConfig | null> {
		const configs = await this.loadServerConfigs();
		const config = configs[id];
		if (!config) return null;

		// Retrieve password from secure storage
		const entry = new Entry("ninode", `${id}-password`);
		const password = entry.getPassword();

		return {
			...config,
			password: password || undefined,
		};
	}

	async deleteServerConfig(id: string): Promise<void> {
		const configs = await this.loadServerConfigs();
		delete configs[id];
		await Bun.write(this.configFile, JSON.stringify(configs, null, 2));

		// Remove password from secure storage
		const entry = new Entry("ninode", `${id}-password`);
		entry.deletePassword();
	}

	async getAllServerConfigs(): Promise<ServerConfig[]> {
		const configs = await this.loadServerConfigs();
		const result: ServerConfig[] = [];

		for (const id of Object.keys(configs)) {
			const config = await this.getServerConfig(id);
			if (config) {
				result.push(config);
			}
		}

		return result;
	}
}

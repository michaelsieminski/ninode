import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";

function resolveDataDir(): string {
  if (process.env.NINODE_DATA_DIR) return process.env.NINODE_DATA_DIR;

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "ninode");
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
    return join(appData, "ninode");
  }

  const xdg = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(xdg, "ninode");
}

const DATA_DIR = resolveDataDir();
let ensured = false;

export function getDataDir(): string {
  if (!ensured) {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    ensured = true;
  }
  return DATA_DIR;
}

export function getDataPath(...segments: string[]): string {
  return join(getDataDir(), ...segments);
}

export const PATHS = {
  database: () => getDataPath("ninode.db"),
  daemonPid: () => getDataPath("daemon.pid"),
  daemonLog: () => getDataPath("daemon.log"),
};

import { spawn } from "bun";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { DaemonServiceClass } from "../services/daemon/DaemonService";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..");
const DAEMON_SCRIPT = join(PROJECT_ROOT, "src", "daemon.ts");

function printUsage(): void {
	console.log(`
ninode daemon - Background metrics collection

Usage:
  ninode daemon start   Start the background daemon
  ninode daemon stop    Stop the running daemon
  ninode daemon status  Check if daemon is running
  ninode daemon logs    Show daemon logs
`);
}

async function startDaemon(): Promise<number> {
	if (DaemonServiceClass.isRunning()) {
		const pid = DaemonServiceClass.getPid();
		console.log(`Daemon is already running (PID: ${pid})`);
		return 1;
	}

	console.log("Starting daemon...");

	// Use nohup to truly detach the process from parent
	const proc = spawn({
		cmd: ["nohup", "bun", "run", DAEMON_SCRIPT],
		cwd: PROJECT_ROOT,
		stdout: "ignore",
		stderr: "ignore",
		stdin: "ignore",
	});

	proc.unref();

	// Wait a moment for the process to start
	await new Promise((resolve) => setTimeout(resolve, 500));

	if (DaemonServiceClass.isRunning()) {
		const pid = DaemonServiceClass.getPid();
		console.log(`Daemon started (PID: ${pid})`);
		return 0;
	}

	console.log("Failed to start daemon. Check logs with: ninode daemon logs");
	return 1;
}

function stopDaemon(): number {
	const pid = DaemonServiceClass.getPid();

	if (!pid) {
		console.log("Daemon is not running");
		return 0;
	}

	console.log(`Stopping daemon (PID: ${pid})...`);

	try {
		process.kill(pid, "SIGTERM");
		console.log("Daemon stopped");
		return 0;
	} catch (error) {
		console.log("Failed to stop daemon:", error);
		return 1;
	}
}

function showStatus(): number {
	const pid = DaemonServiceClass.getPid();

	if (pid) {
		console.log(`Daemon is running (PID: ${pid})`);
		return 0;
	}

	console.log("Daemon is not running");
	return 1;
}

async function showLogs(): Promise<number> {
	const logFile = join(PROJECT_ROOT, "db", "daemon.log");
	const file = Bun.file(logFile);

	if (!(await file.exists())) {
		console.log("No logs found");
		return 0;
	}

	const content = await file.text();
	// Show last 50 lines
	const lines = content.trim().split("\n");
	const lastLines = lines.slice(-50);
	console.log(lastLines.join("\n"));
	return 0;
}

export async function handleDaemonCommand(args: string[]): Promise<number> {
	const command = args[0];

	switch (command) {
		case "start":
			return await startDaemon();
		case "stop":
			return stopDaemon();
		case "status":
			return showStatus();
		case "logs":
			return await showLogs();
		default:
			printUsage();
			return command ? 1 : 0;
	}
}

export async function ensureDaemonRunning(): Promise<void> {
	if (DaemonServiceClass.isRunning()) {
		return;
	}

	// Use nohup to truly detach the daemon from parent process
	const proc = spawn({
		cmd: ["nohup", "bun", "run", DAEMON_SCRIPT],
		cwd: PROJECT_ROOT,
		stdout: "ignore",
		stderr: "ignore",
		stdin: "ignore",
	});

	proc.unref();

	// Wait briefly for daemon to start
	await new Promise((resolve) => setTimeout(resolve, 300));
}

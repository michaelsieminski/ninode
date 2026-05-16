import { spawn } from "bun";
import { DaemonServiceClass } from "../services/daemon/DaemonService";
import { PATHS } from "../utils/paths";

function isCompiledBinary(): boolean {
	// In `bun run src/index.tsx`, argv[1] is the script path.
	// In a `bun build --compile` binary, argv[1] is empty/the binary itself.
	const entry = process.argv[1];
	if (!entry) return true;
	return !(
		entry.endsWith(".ts") ||
		entry.endsWith(".tsx") ||
		entry.endsWith(".js")
	);
}

function getSelfSpawnCmd(extraArgs: string[]): string[] {
	if (isCompiledBinary()) {
		return [process.execPath, ...extraArgs];
	}
	// Dev mode: bun + entry script
	return [process.execPath, process.argv[1]!, ...extraArgs];
}

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

	const proc = spawn({
		cmd: ["nohup", ...getSelfSpawnCmd(["daemon", "__run"])],
		stdout: "ignore",
		stderr: "ignore",
		stdin: "ignore",
	});

	proc.unref();

	// Poll for the daemon to write its PID file (cold-starting the binary
	// can take a moment on first launch)
	for (let i = 0; i < 20; i++) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		if (DaemonServiceClass.isRunning()) {
			console.log(`Daemon started (PID: ${DaemonServiceClass.getPid()})`);
			return 0;
		}
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
	const file = Bun.file(PATHS.daemonLog());

	if (!(await file.exists())) {
		console.log("No logs found");
		return 0;
	}

	const content = await file.text();
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

	const proc = spawn({
		cmd: ["nohup", ...getSelfSpawnCmd(["daemon", "__run"])],
		stdout: "ignore",
		stderr: "ignore",
		stdin: "ignore",
	});

	proc.unref();

	for (let i = 0; i < 15; i++) {
		await new Promise((resolve) => setTimeout(resolve, 100));
		if (DaemonServiceClass.isRunning()) return;
	}
}

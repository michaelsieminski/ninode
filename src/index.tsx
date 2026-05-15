import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useState, useRef, useEffect } from "react";
import type { NavigationSection, ViewState } from "./types";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/dashboard/Dashboard";
import ServerDetailView from "./components/detail/ServerDetailView";
import { SSHManager } from "./services/ssh/SSHManager";
import { DatabaseService } from "./services/storage/DatabaseService";
import { DaemonService } from "./services/daemon/DaemonService";
import { handleDaemonCommand, ensureDaemonRunning } from "./cli/daemon";

const VERSION = "0.1.0";

const args = process.argv.slice(2);

if (args[0] === "--version" || args[0] === "-v") {
	console.log(`ninode ${VERSION}`);
	process.exit(0);
}

if (args[0] === "--help" || args[0] === "-h") {
	console.log(`
ninode ${VERSION} - Terminal-based server monitoring

Usage:
  ninode                    Launch the TUI
  ninode daemon start       Start background metrics daemon
  ninode daemon stop        Stop background metrics daemon
  ninode daemon status      Show daemon status
  ninode daemon logs        Tail daemon logs
  ninode --version          Print version
  ninode --help             Show this help
`);
	process.exit(0);
}

if (args[0] === "daemon") {
	const sub = args[1];

	// Internal: re-exec entry point as the daemon process itself
	if (sub === "__run") {
		await DaemonService.start();
		await new Promise(() => {});
	} else {
		const exitCode = await handleDaemonCommand(args.slice(1));
		process.exit(exitCode);
	}
}

// Auto-start daemon if not already running
await ensureDaemonRunning();

function App() {
	const [currentSection, setCurrentSection] =
		useState<NavigationSection>("dashboard");
	const [viewState, setViewState] = useState<ViewState>({ view: "dashboard" });
	const [isInFormMode, setIsInFormMode] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const sshManagerRef = useRef(new SSHManager());
	const sshManager = sshManagerRef.current;

	// Initialize database on mount
	useEffect(() => {
		DatabaseService.initialize().then(() => {
			setIsInitialized(true);
		});

		return () => {
			DatabaseService.close();
		};
	}, []);

	const renderContent = () => {
		if (!isInitialized) {
			return (
				<box alignItems="center" justifyContent="center" flexGrow={1}>
					<text fg="#5C5C5C">Initializing...</text>
				</box>
			);
		}

		switch (viewState.view) {
			case "dashboard":
				return (
					<Dashboard
						sshManager={sshManager}
						onFormModeChange={setIsInFormMode}
						onServerSelect={(serverId, serverName) =>
							setViewState({ view: "serverDetail", serverId, serverName })
						}
					/>
				);
			case "serverDetail":
				return (
					<ServerDetailView
						serverId={viewState.serverId}
						serverName={viewState.serverName}
						sshManager={sshManager}
						onBack={() => setViewState({ view: "dashboard" })}
					/>
				);
			default:
				return (
					<box alignItems="center" justifyContent="center" flexGrow={1}>
						<text>Welcome to Ninode</text>
					</box>
				);
		}
	};

	// Disable keyboard navigation when in detail view or form mode
	const disableKeyboard = isInFormMode || viewState.view === "serverDetail";

	return (
		<AppLayout
			currentSection={currentSection}
			onSectionChange={setCurrentSection}
			sshManager={sshManager}
			disableKeyboardNavigation={disableKeyboard}
		>
			{renderContent()}
		</AppLayout>
	);
}

const renderer = await createCliRenderer({
	useMouse: true,
	enableMouseMovement: true,
});
createRoot(renderer).render(<App />);

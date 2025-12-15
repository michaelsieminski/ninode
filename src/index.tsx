import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useState, useRef, useEffect } from "react";
import type { NavigationSection, ViewState } from "./types";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/dashboard/Dashboard";
import ServerDetailView from "./components/detail/ServerDetailView";
import { SSHManager } from "./services/ssh/SSHManager";
import { DatabaseService } from "./services/storage/DatabaseService";

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

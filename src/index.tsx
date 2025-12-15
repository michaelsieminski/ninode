import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useState, useRef } from "react";
import type { NavigationSection } from "./types";
import AppLayout from "./components/layout/AppLayout";
import ServersPage from "./components/servers/ServersPage";
import Dashboard from "./components/dashboard/Dashboard";
import { SSHManager } from "./services/ssh/SSHManager";

function App() {
	const [currentSection, setCurrentSection] =
		useState<NavigationSection>("dashboard");
	const [isInFormMode, setIsInFormMode] = useState(false);
	const sshManagerRef = useRef(new SSHManager());
	const sshManager = sshManagerRef.current;

	const renderContent = () => {
		switch (currentSection) {
			case "dashboard":
				return <Dashboard sshManager={sshManager} />;
			case "servers":
				return (
					<ServersPage
						sshManager={sshManager}
						onFormModeChange={setIsInFormMode}
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

	return (
		<AppLayout
			currentSection={currentSection}
			onSectionChange={setCurrentSection}
			sshManager={sshManager}
			disableKeyboardNavigation={isInFormMode}
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

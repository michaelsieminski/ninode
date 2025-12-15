import React from "react";
import { useKeyboard } from "@opentui/react";
import type { NavigationSection } from "../../types";
import type { SSHManager } from "../../services/ssh/SSHManager";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
	children: React.ReactNode;
	currentSection: NavigationSection;
	onSectionChange: (section: NavigationSection) => void;
	sshManager?: SSHManager;
	disableKeyboardNavigation?: boolean;
}

export default function AppLayout({
	children,
	currentSection,
	onSectionChange,
	disableKeyboardNavigation = false,
}: AppLayoutProps) {
	useKeyboard((key) => {
		if (disableKeyboardNavigation) return;

		if (key.name === "1") {
			onSectionChange("dashboard");
		} else if (key.name === "2") {
			onSectionChange("processes");
		} else if (key.name === "3") {
			onSectionChange("logs");
		}
	});

	return (
		<box flexDirection="row" height="100%">
			<Sidebar
				currentSection={currentSection}
				onSectionChange={onSectionChange}
			/>
			<box flexGrow={1} paddingLeft={2} paddingRight={2}>
				{children}
			</box>
		</box>
	);
}

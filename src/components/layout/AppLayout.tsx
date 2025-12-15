import React from "react";
import { useKeyboard } from "@opentui/react";
import type { NavigationSection } from "../../types";
import type { SSHManager } from "../../services/ssh/SSHManager";
import { useResponsive } from "../../hooks/useResponsive";
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
	const { breakpoints, sidebarWidth } = useResponsive();

	useKeyboard((key) => {
		if (disableKeyboardNavigation) return;

		if (key.name === "1") {
			onSectionChange("dashboard");
		}
	});

	return (
		<box flexDirection="row" height="100%">
			{!breakpoints.isNarrow && (
				<Sidebar
					currentSection={currentSection}
					onSectionChange={onSectionChange}
					collapsed={false}
					width={sidebarWidth}
				/>
			)}
			<box
				flexGrow={1}
				paddingLeft={breakpoints.isNarrow ? 1 : 2}
				paddingRight={breakpoints.isNarrow ? 1 : 2}
			>
				{children}
			</box>
		</box>
	);
}

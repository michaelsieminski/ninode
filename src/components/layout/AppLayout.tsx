import React, { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { NavigationSection } from "../../types";
import type { SSHManager } from "../../services/ssh/SSHManager";
import { useResponsive } from "../../hooks/useResponsive";
import Sidebar from "./Sidebar";
import KeyboardHints from "../common/KeyboardHints";

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
	const [sidebarHidden, setSidebarHidden] = useState(false);

	useKeyboard((key) => {
		if (key.ctrl && key.name === "b") {
			setSidebarHidden((prev) => !prev);
			return;
		}

		if (disableKeyboardNavigation) return;

		if (key.name === "1") {
			onSectionChange("dashboard");
		}
	});

	const showSidebar = !breakpoints.isNarrow && !sidebarHidden;

	return (
		<box flexDirection="row" height="100%">
			{showSidebar && (
				<Sidebar
					currentSection={currentSection}
					onSectionChange={onSectionChange}
					collapsed={false}
					width={sidebarWidth}
				/>
			)}
			<box
				flexGrow={1}
				flexDirection="column"
				paddingLeft={breakpoints.isNarrow ? 1 : 2}
				paddingRight={breakpoints.isNarrow ? 1 : 2}
			>
				<box flexGrow={1}>{children}</box>
				{!showSidebar && !breakpoints.isNarrow && (
					<box paddingTop={1}>
						<KeyboardHints hints={[{ key: "^b", label: "show sidebar" }]} />
					</box>
				)}
			</box>
		</box>
	);
}

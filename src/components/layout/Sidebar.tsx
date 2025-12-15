import React from "react";
import type { NavigationSection } from "../../types";

interface SidebarProps {
	currentSection: NavigationSection;
	onSectionChange: (section: NavigationSection) => void;
	collapsed?: boolean;
	width?: number;
}

const sections: { key: NavigationSection; label: string; shortcut: string }[] =
	[
		{ key: "dashboard", label: "Dashboard", shortcut: "1" },
		{ key: "processes", label: "Processes", shortcut: "2" },
		{ key: "logs", label: "Logs", shortcut: "3" },
	];

export default function Sidebar({
	currentSection,
	onSectionChange,
	collapsed = false,
	width = 30,
}: SidebarProps) {
	return (
		<box
			width={width}
			flexDirection="column"
			alignItems="center"
			backgroundColor="#0E0E0E"
			padding={1}
		>
			{!collapsed && <ascii-font font="tiny" text="ninode" marginBottom={2} />}
			<box flexDirection="column" width="100%" gap={1}>
				{sections.map((section) => (
					<box
						key={section.key}
						backgroundColor={
							currentSection === section.key ? "#171717" : "#111111"
						}
						padding={collapsed ? 0 : 1}
						onMouseDown={() => onSectionChange(section.key)}
					>
						<text fg={currentSection === section.key ? "#FFFFFF" : "#5C5C5C"}>
							{collapsed
								? `[${section.shortcut}]`
								: `[${section.shortcut}] ${section.label}`}
						</text>
					</box>
				))}
			</box>
		</box>
	);
}

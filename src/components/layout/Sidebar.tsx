import React from "react";
import type { NavigationSection } from "../../types";

interface SidebarProps {
	currentSection: NavigationSection;
	onSectionChange: (section: NavigationSection) => void;
}

const sections: { key: NavigationSection; label: string; shortcut: string }[] =
	[
		{ key: "dashboard", label: "Dashboard", shortcut: "1" },
		{ key: "servers", label: "Servers", shortcut: "2" },
		{ key: "processes", label: "Processes", shortcut: "3" },
		{ key: "logs", label: "Logs", shortcut: "4" },
	];

export default function Sidebar({
	currentSection,
	onSectionChange,
}: SidebarProps) {
	return (
		<box
			width={40}
			flexDirection="column"
			alignItems="center"
			backgroundColor="#0E0E0E"
			padding={1}
		>
			<ascii-font font="tiny" text="ninode" marginBottom={2} />
			<box flexDirection="column" width="100%" gap={1}>
				{sections.map((section) => (
					<box
						key={section.key}
						backgroundColor={
							currentSection === section.key ? "#171717" : "#111111"
						}
						padding={1}
						onMouseDown={() => onSectionChange(section.key)}
					>
						<text fg={currentSection === section.key ? "#FFFFFF" : "#5C5C5C"}>
							[{section.shortcut}] {section.label}
						</text>
					</box>
				))}
			</box>
		</box>
	);
}

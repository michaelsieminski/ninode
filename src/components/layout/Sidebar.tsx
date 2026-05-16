import React from "react";
import type { NavigationSection } from "../../types";
import KeyboardHints from "../common/KeyboardHints";

interface SidebarProps {
	currentSection: NavigationSection;
	onSectionChange: (section: NavigationSection) => void;
	collapsed?: boolean;
	width?: number;
}

const sections: { key: NavigationSection; label: string; shortcut: string }[] =
	[{ key: "dashboard", label: "Dashboard", shortcut: "1" }];

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
			<box flexDirection="column" width="100%" gap={1} flexGrow={1}>
				{sections.map((section) => {
					const isActive = currentSection === section.key;
					return (
						<box
							key={section.key}
							backgroundColor={isActive ? "#171717" : "#111111"}
							padding={collapsed ? 0 : 1}
							flexDirection="row"
							onMouseDown={() => onSectionChange(section.key)}
						>
							<text fg="#9FBAFF">{isActive ? "▎" : " "}</text>
							<text
								fg={isActive ? "#9FBAFF" : "#5C5C5C"}
								attributes={isActive ? 1 : 0}
							>
								{collapsed
									? `[${section.shortcut}]`
									: `[${section.shortcut}] ${section.label}`}
							</text>
						</box>
					);
				})}
			</box>
			{!collapsed && (
				<box
					flexDirection="row"
					width="100%"
					justifyContent="center"
					paddingTop={1}
				>
					<KeyboardHints hints={[{ key: "^b", label: "hide" }]} />
				</box>
			)}
		</box>
	);
}

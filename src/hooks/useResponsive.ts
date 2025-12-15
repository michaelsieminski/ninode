import { useTerminalDimensions } from "@opentui/react";

export interface ResponsiveBreakpoints {
	isNarrow: boolean; // < 80 cols - collapse sidebar
	isMedium: boolean; // 80-120 cols - compact layout
	isWide: boolean; // > 120 cols - full layout
	isShort: boolean; // < 24 rows - compact vertical
}

export interface ResponsiveLayout {
	width: number;
	height: number;
	breakpoints: ResponsiveBreakpoints;
	sidebarWidth: number;
	contentWidth: number;
	metricsPerRow: number;
}

export function useResponsive(): ResponsiveLayout {
	const { width, height } = useTerminalDimensions();

	const breakpoints: ResponsiveBreakpoints = {
		isNarrow: width < 80,
		isMedium: width >= 80 && width < 120,
		isWide: width >= 120,
		isShort: height < 24,
	};

	// Sidebar width: collapsed (0) on narrow, normal (30) otherwise
	const sidebarWidth = breakpoints.isNarrow ? 0 : 30;

	// Content width: full width minus sidebar and padding
	const contentWidth = width - sidebarWidth - 4;

	// Metrics per row based on content width
	// Each metric section needs ~28 chars + gap
	let metricsPerRow = 4;
	if (contentWidth < 60) {
		metricsPerRow = 1;
	} else if (contentWidth < 90) {
		metricsPerRow = 2;
	} else if (contentWidth < 120) {
		metricsPerRow = 3;
	}

	return {
		width,
		height,
		breakpoints,
		sidebarWidth,
		contentWidth,
		metricsPerRow,
	};
}

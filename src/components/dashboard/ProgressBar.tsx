interface ProgressBarProps {
	percent: number;
	width?: number;
	showPercent?: boolean;
}

/**
 * Get text color for the percentage based on usage level
 */
function getTextColor(percent: number): string {
	if (percent >= 90) return "#CC6666"; // Softer red text
	if (percent >= 70) return "#CCAA66"; // Softer amber text
	return "#66AA66"; // Softer green text
}

export default function ProgressBar({
	percent,
	width = 20,
	showPercent = true,
}: ProgressBarProps) {
	const safePercent = Math.min(100, Math.max(0, percent));
	const filledWidth = Math.round((safePercent / 100) * width);
	const emptyWidth = width - filledWidth;

	const filled = "=".repeat(filledWidth);
	const empty = "-".repeat(emptyWidth);
	const textColor = getTextColor(safePercent);
	const percentStr = showPercent
		? ` ${safePercent.toFixed(1).padStart(5)}%`
		: "";

	// Use a single text element to avoid "measure functions cannot have children" error
	const barString = `[${filled}${empty}]${percentStr}`;

	return <text fg={textColor}>{barString}</text>;
}

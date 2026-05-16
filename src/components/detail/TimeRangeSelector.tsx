import React from "react";

export type TimeRange = "5min" | "30min" | "1hr" | "6hr" | "24hr";

interface TimeRangeSelectorProps {
	selectedRange: TimeRange;
	onRangeChange: (range: TimeRange) => void;
	focused?: boolean;
}

export const TIME_RANGES: {
	key: TimeRange;
	label: string;
	ms: number;
	aggregation: "raw" | "1min" | "5min" | "15min";
}[] = [
	{ key: "5min", label: "5m", ms: 5 * 60 * 1000, aggregation: "raw" },
	{ key: "30min", label: "30m", ms: 30 * 60 * 1000, aggregation: "1min" },
	{ key: "1hr", label: "1h", ms: 60 * 60 * 1000, aggregation: "1min" },
	{ key: "6hr", label: "6h", ms: 6 * 60 * 60 * 1000, aggregation: "5min" },
	{ key: "24hr", label: "24h", ms: 24 * 60 * 60 * 1000, aggregation: "15min" },
];

export function getTimeRangeConfig(range: TimeRange) {
	return TIME_RANGES.find((r) => r.key === range) || TIME_RANGES[0];
}

export default function TimeRangeSelector({
	selectedRange,
	onRangeChange,
	focused = true,
}: TimeRangeSelectorProps) {
	return (
		<box flexDirection="row" gap={1}>
			<text fg="#5C5C5C">Time:</text>
			{TIME_RANGES.map((range) => {
				const isSelected = selectedRange === range.key;
				return (
					<box
						key={range.key}
						backgroundColor={isSelected ? "#171717" : "#0E0E0E"}
						paddingLeft={1}
						paddingRight={1}
						onMouseDown={() => onRangeChange(range.key)}
					>
						<text
							fg={isSelected ? "#9FBAFF" : "#5C5C5C"}
							attributes={isSelected && focused ? 1 : 0}
						>
							{range.label}
						</text>
					</box>
				);
			})}
		</box>
	);
}

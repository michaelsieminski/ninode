import React, { useMemo } from "react";

interface BrailleGraphProps {
	data: (number | null)[];
	width: number;
	height?: number;
	minValue?: number;
	maxValue?: number;
	color?: string;
	label?: string;
	showCurrentValue?: boolean;
	unit?: string;
	showYAxis?: boolean;
	showXAxis?: boolean;
	xAxisLabels?: string[];
}

// Block characters for vertical bar graph (8 levels)
const BLOCK_CHARS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function renderBlockGraph(
	data: (number | null)[],
	width: number,
	height: number,
	minValue: number,
	maxValue: number,
): string[] {
	if (data.length === 0) {
		return Array(height).fill(" ".repeat(width));
	}

	// Resample data to fit width, preserving nulls for empty spaces
	const resampledData: (number | null)[] = [];
	const step = data.length / width;

	for (let i = 0; i < width; i++) {
		const startIdx = Math.floor(i * step);
		const endIdx = Math.min(Math.floor((i + 1) * step), data.length);

		if (startIdx === endIdx) {
			resampledData.push(data[startIdx] ?? null);
		} else {
			let sum = 0;
			let count = 0;
			for (let j = startIdx; j < endIdx; j++) {
				const val = data[j];
				if (val !== null && val !== undefined) {
					sum += val;
					count++;
				}
			}
			// Keep null if no valid values in range
			resampledData.push(count > 0 ? sum / count : null);
		}
	}

	// Calculate the range
	const range = maxValue - minValue || 1;
	const totalLevels = height * 8; // 8 levels per character height

	// Build the graph from top to bottom
	const lines: string[] = [];

	for (let row = height - 1; row >= 0; row--) {
		let line = "";
		const rowMin = row * 8;
		const rowMax = (row + 1) * 8;

		for (let col = 0; col < width; col++) {
			const value = resampledData[col];

			// null/undefined values render as empty space
			if (value === null || value === undefined) {
				line += " ";
				continue;
			}

			const normalizedValue = ((value - minValue) / range) * totalLevels;

			if (normalizedValue >= rowMax) {
				// Full block
				line += "█";
			} else if (normalizedValue <= rowMin) {
				// Empty
				line += " ";
			} else {
				// Partial block
				const partialLevel = Math.round(normalizedValue - rowMin);
				line += BLOCK_CHARS[Math.min(partialLevel, 8)] ?? " ";
			}
		}

		lines.push(line);
	}

	return lines;
}

export default function BrailleGraph({
	data,
	width,
	height = 4,
	minValue,
	maxValue,
	color = "#8B8B8B",
	label,
	showCurrentValue = false,
	unit = "",
	showYAxis = false,
	showXAxis = false,
	xAxisLabels = [],
}: BrailleGraphProps) {
	const computedMinValue = minValue ?? 0;
	const validData = data.filter((d): d is number => d !== null);
	const computedMaxValue =
		maxValue ?? (validData.length > 0 ? Math.max(...validData, 1) : 100);

	// Y-axis takes 6 chars (5 for value + 1 space)
	const yAxisWidth = showYAxis ? 6 : 0;
	const graphWidth = Math.max(1, width - yAxisWidth);

	const graphLines = useMemo(
		() =>
			renderBlockGraph(
				data,
				graphWidth,
				height,
				computedMinValue,
				computedMaxValue,
			),
		[data, graphWidth, height, computedMinValue, computedMaxValue],
	);

	// Get the last non-null value for display
	const currentValue =
		validData.length > 0 ? validData[validData.length - 1] : null;

	// Generate Y-axis labels - show values at each row
	const yAxisLabels = useMemo(() => {
		if (!showYAxis) return [];
		const labels: string[] = [];
		const range = computedMaxValue - computedMinValue;

		for (let i = height - 1; i >= 0; i--) {
			// Show label at top, middle, and bottom
			if (i === height - 1) {
				labels.push(formatAxisValue(computedMaxValue));
			} else if (i === Math.floor(height / 2) && height > 2) {
				const midValue = computedMinValue + range / 2;
				labels.push(formatAxisValue(midValue));
			} else if (i === 0) {
				labels.push(formatAxisValue(computedMinValue));
			} else {
				labels.push("");
			}
		}
		return labels;
	}, [showYAxis, height, computedMinValue, computedMaxValue]);

	// Generate X-axis line and labels
	const xAxisLine = useMemo(() => {
		if (!showXAxis) return "";
		return "─".repeat(graphWidth);
	}, [showXAxis, graphWidth]);

	const xAxisLabelLine = useMemo(() => {
		if (!showXAxis || xAxisLabels.length === 0) return "";

		// Distribute labels evenly across the width
		const labelCount = xAxisLabels.length;
		if (labelCount === 0) return "";

		const result: string[] = Array(graphWidth).fill(" ");

		for (let i = 0; i < labelCount; i++) {
			const label = xAxisLabels[i] || "";
			// Position: first label at start, last at end, others evenly distributed
			let pos: number;
			if (labelCount === 1) {
				pos = Math.floor(graphWidth / 2) - Math.floor(label.length / 2);
			} else {
				pos = Math.floor((i / (labelCount - 1)) * (graphWidth - label.length));
			}
			pos = Math.max(0, Math.min(pos, graphWidth - label.length));

			// Write label characters
			for (let j = 0; j < label.length && pos + j < graphWidth; j++) {
				result[pos + j] = label[j] || " ";
			}
		}

		return result.join("");
	}, [showXAxis, xAxisLabels, graphWidth]);

	return (
		<box flexDirection="column">
			{label && (
				<text fg="#5C5C5C">
					{label}
					{showCurrentValue &&
						currentValue !== null &&
						currentValue !== undefined && (
							<span fg="#8B8B8B">
								{" "}
								({currentValue.toFixed(1)}
								{unit})
							</span>
						)}
				</text>
			)}
			{graphLines.map((line, index) => (
				<box key={index} flexDirection="row">
					{showYAxis && (
						<text fg="#3D3D3D">{(yAxisLabels[index] ?? "").padStart(5)} </text>
					)}
					<text fg={color}>{line}</text>
				</box>
			))}
			{showXAxis && (
				<>
					<box flexDirection="row">
						{showYAxis && <text fg="#3D3D3D">{"".padStart(5)} </text>}
						<text fg="#3D3D3D">{xAxisLine}</text>
					</box>
					{xAxisLabelLine && (
						<box flexDirection="row">
							{showYAxis && <text fg="#3D3D3D">{"".padStart(5)} </text>}
							<text fg="#5C5C5C">{xAxisLabelLine}</text>
						</box>
					)}
				</>
			)}
		</box>
	);
}

function formatAxisValue(value: number): string {
	if (value >= 1000000) {
		return `${(value / 1000000).toFixed(0)}M`;
	}
	if (value >= 1000) {
		return `${(value / 1000).toFixed(0)}k`;
	}
	if (value >= 100) {
		return `${value.toFixed(0)}`;
	}
	return `${value.toFixed(0)}`;
}

// Utility function to create a sparkline (single-row graph)
export function renderSparkline(
	data: (number | null)[],
	width: number,
	minValue?: number,
	maxValue?: number,
): string {
	const validData = data.filter((d): d is number => d !== null);
	const lines = renderBlockGraph(
		data,
		width,
		1,
		minValue ?? 0,
		maxValue ?? (validData.length > 0 ? Math.max(...validData, 1) : 100),
	);
	return lines[0] || "";
}

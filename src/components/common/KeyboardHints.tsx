interface KeyboardHint {
	key: string;
	label: string;
}

interface KeyboardHintsProps {
	hints: KeyboardHint[];
}

export default function KeyboardHints({ hints }: KeyboardHintsProps) {
	return (
		<box flexDirection="row" gap={2}>
			{hints.map((hint, index) => (
				<box key={index} flexDirection="row" gap={1}>
					<text fg="#9FBAFF">{hint.key.toLowerCase()}</text>
					<text fg="#6B6B6B">{hint.label.toLowerCase()}</text>
				</box>
			))}
		</box>
	);
}

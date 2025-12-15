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
					<text fg="#FFFFFF">{hint.key}</text>
					<text fg="#6B6B6B">{hint.label}</text>
				</box>
			))}
		</box>
	);
}

import { useKeyboard } from "@opentui/react";

interface SelectOption {
	value: string;
	label: string;
}

interface SelectInputProps {
	label: string;
	options: SelectOption[];
	value: string;
	onChange: (value: string) => void;
	focused?: boolean;
}

export default function SelectInput({
	label,
	options,
	value,
	onChange,
	focused = false,
}: SelectInputProps) {
	useKeyboard((key) => {
		if (!focused) return;

		const currentIndex = options.findIndex((opt) => opt.value === value);

		if (key.name === "left" || key.name === "h") {
			const newIndex = Math.max(0, currentIndex - 1);
			const option = options[newIndex];
			if (option) onChange(option.value);
		} else if (key.name === "right" || key.name === "l") {
			const newIndex = Math.min(options.length - 1, currentIndex + 1);
			const option = options[newIndex];
			if (option) onChange(option.value);
		}
	});

	return (
		<box flexDirection="row" gap={1}>
			<text fg="#5C5C5C" attributes={focused ? 1 : 0}>
				{label}:
			</text>
			<box flexDirection="row" gap={1}>
				{options.map((option) => {
					const isSelected = option.value === value;
					return (
						<text
							key={option.value}
							fg={isSelected ? (focused ? "#FFFFFF" : "#8B8B8B") : "#3D3D3D"}
							attributes={isSelected ? 1 : 0}
						>
							{isSelected ? `[${option.label}]` : option.label}
						</text>
					);
				})}
			</box>
		</box>
	);
}

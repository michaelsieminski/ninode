import { useState, useEffect } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";

interface TextInputProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	focused?: boolean;
	placeholder?: string;
	isPassword?: boolean;
}

export default function TextInput({
	label,
	value,
	onChange,
	focused = false,
	placeholder = "",
	isPassword = false,
}: TextInputProps) {
	const [cursorVisible, setCursorVisible] = useState(true);
	const renderer = useRenderer();

	useEffect(() => {
		if (!focused) return;
		const interval = setInterval(() => {
			setCursorVisible((prev) => !prev);
		}, 500);
		return () => clearInterval(interval);
	}, [focused]);

	useKeyboard((key) => {
		if (!focused) return;

		if (key.name === "backspace") {
			onChange(value.slice(0, -1));
		} else if (key.ctrl && key.name === "u") {
			onChange("");
		} else if (key.name === "tab") {
			return;
		} else if (key.name === "space") {
			onChange(value + " ");
		} else if (
			key.sequence &&
			key.sequence.length === 1 &&
			!key.ctrl &&
			!key.meta
		) {
			onChange(value + key.sequence);
		}
	});

	useEffect(() => {
		if (!focused || !renderer) return;

		const decoder = new TextDecoder();
		const handlePaste = (event: { bytes: Uint8Array }) => {
			const text = decoder.decode(event.bytes).replace(/[\r\n]+/g, "");
			onChange(value + text);
		};

		renderer.keyInput.on("paste", handlePaste);
		return () => {
			renderer.keyInput.off("paste", handlePaste);
		};
	}, [focused, value, onChange, renderer]);

	const displayValue = isPassword ? "*".repeat(value.length) : value;
	const showPlaceholder = value.length === 0 && placeholder && !focused;
	const cursor = focused && cursorVisible ? "_" : "";

	return (
		<box flexDirection="row" gap={1}>
			<text fg="#5C5C5C" attributes={focused ? 1 : 0}>
				{label}:
			</text>
			<text fg={focused ? "#FFFFFF" : "#8B8B8B"}>
				{showPlaceholder ? placeholder : displayValue}
				{cursor}
			</text>
		</box>
	);
}

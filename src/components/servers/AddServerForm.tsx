import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import TextInput from "../common/TextInput";
import SelectInput from "../common/SelectInput";
import type { ServerConfig } from "../../types";

interface AddServerFormProps {
	onSave: (config: ServerConfig) => void;
	onCancel: () => void;
}

type FormField =
	| "name"
	| "host"
	| "port"
	| "username"
	| "authMethod"
	| "password"
	| "keyPath"
	| "actions";

const AUTH_OPTIONS = [
	{ value: "password", label: "Password" },
	{ value: "key", label: "SSH Key" },
];

export default function AddServerForm({
	onSave,
	onCancel,
}: AddServerFormProps) {
	const [name, setName] = useState("");
	const [host, setHost] = useState("");
	const [port, setPort] = useState("22");
	const [username, setUsername] = useState("");
	const [authMethod, setAuthMethod] = useState<"password" | "key">("password");
	const [password, setPassword] = useState("");
	const [keyPath, setKeyPath] = useState("");
	const [focusedField, setFocusedField] = useState<FormField>("name");
	const [focusedAction, setFocusedAction] = useState<"save" | "cancel">("save");
	const [error, setError] = useState("");

	const getFields = (): FormField[] => {
		const baseFields: FormField[] = [
			"name",
			"host",
			"port",
			"username",
			"authMethod",
		];
		if (authMethod === "password") {
			return [...baseFields, "password", "actions"];
		} else {
			return [...baseFields, "keyPath", "actions"];
		}
	};

	const fields = getFields();

	const handleSave = () => {
		if (!name.trim()) {
			setError("Name is required");
			return;
		}
		if (!host.trim()) {
			setError("Host is required");
			return;
		}
		if (!username.trim()) {
			setError("Username is required");
			return;
		}
		if (authMethod === "password" && !password) {
			setError("Password is required");
			return;
		}
		if (authMethod === "key" && !keyPath.trim()) {
			setError("Key path is required");
			return;
		}

		const portNum = parseInt(port, 10);
		if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
			setError("Port must be a valid number (1-65535)");
			return;
		}

		const config: ServerConfig = {
			id: `server-${Date.now()}`,
			name: name.trim(),
			host: host.trim(),
			port: portNum,
			username: username.trim(),
			authMethod,
			...(authMethod === "password"
				? { password }
				: { keyPath: keyPath.trim() }),
		};

		onSave(config);
	};

	useKeyboard((key) => {
		if (key.name === "escape") {
			onCancel();
			return;
		}

		if (key.name === "up" || (key.name === "tab" && key.shift)) {
			const currentIndex = fields.indexOf(focusedField);
			const prevField = fields[currentIndex - 1];
			if (currentIndex > 0 && prevField) {
				setFocusedField(prevField);
				setError("");
			}
		} else if (key.name === "down" || (key.name === "tab" && !key.shift)) {
			const currentIndex = fields.indexOf(focusedField);
			const nextField = fields[currentIndex + 1];
			if (currentIndex < fields.length - 1 && nextField) {
				setFocusedField(nextField);
				setError("");
			}
		} else if (focusedField === "actions") {
			if (key.name === "left") {
				setFocusedAction("save");
			} else if (key.name === "right") {
				setFocusedAction("cancel");
			} else if (key.name === "return") {
				if (focusedAction === "save") {
					handleSave();
				} else {
					onCancel();
				}
			}
		}
	});

	return (
		<box flexDirection="column" padding={1} backgroundColor="#0E0E0E">
			<text attributes={1} fg="#FFFFFF">
				Add Server
			</text>
			<text fg="#5C5C5C" attributes={2}>
				Tab/Shift+Tab or arrows to navigate, type to enter, Ctrl+U to clear, Esc
				to cancel
			</text>

			<box flexDirection="column" gap={1} marginTop={1}>
				<TextInput
					label="Name"
					value={name}
					onChange={setName}
					focused={focusedField === "name"}
					placeholder="My Server"
				/>

				<TextInput
					label="Host"
					value={host}
					onChange={setHost}
					focused={focusedField === "host"}
					placeholder="192.168.1.100"
				/>

				<TextInput
					label="Port"
					value={port}
					onChange={setPort}
					focused={focusedField === "port"}
					placeholder="22"
				/>

				<TextInput
					label="Username"
					value={username}
					onChange={setUsername}
					focused={focusedField === "username"}
					placeholder="root"
				/>

				<SelectInput
					label="Auth"
					options={AUTH_OPTIONS}
					value={authMethod}
					onChange={(v) => setAuthMethod(v as "password" | "key")}
					focused={focusedField === "authMethod"}
				/>

				{authMethod === "password" ? (
					<TextInput
						label="Password"
						value={password}
						onChange={setPassword}
						focused={focusedField === "password"}
						isPassword
					/>
				) : (
					<TextInput
						label="Key Path"
						value={keyPath}
						onChange={setKeyPath}
						focused={focusedField === "keyPath"}
						placeholder="~/.ssh/id_rsa"
					/>
				)}

				<box flexDirection="row" gap={2} marginTop={1}>
					<text
						fg={
							focusedField === "actions" && focusedAction === "save"
								? "#FFFFFF"
								: "#8B8B8B"
						}
						attributes={
							focusedField === "actions" && focusedAction === "save" ? 1 : 0
						}
					>
						[Save]
					</text>
					<text
						fg={
							focusedField === "actions" && focusedAction === "cancel"
								? "#FFFFFF"
								: "#8B8B8B"
						}
						attributes={
							focusedField === "actions" && focusedAction === "cancel" ? 1 : 0
						}
					>
						[Cancel]
					</text>
				</box>

				{error && (
					<box marginTop={1} padding={1} backgroundColor="#260101">
						<text fg="#940808">{error}</text>
					</box>
				)}
			</box>
		</box>
	);
}

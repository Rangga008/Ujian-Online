import { useState, useEffect } from "react";

interface TimePickerInputProps {
	label: string;
	value: string; // ISO datetime string (YYYY-MM-DDTHH:mm)
	onChange: (value: string) => void;
	required?: boolean;
}

export default function TimePickerInput({
	label,
	value,
	onChange,
	required = false,
}: TimePickerInputProps) {
	const [date, setDate] = useState("");
	const [time, setTime] = useState("");
	const [manualTime, setManualTime] = useState(""); // For display in HH.mm format

	// Initialize from value prop
	useEffect(() => {
		if (value) {
			const [datePart, timePart] = value.split("T");
			setDate(datePart || "");
			setTime(timePart || "");
			if (timePart) {
				setManualTime(timePart.replace(":", "."));
			}
		}
	}, [value]);

	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newDate = e.target.value;
		setDate(newDate);
		if (newDate && time) {
			onChange(`${newDate}T${time}`);
		}
	};

	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = e.target.value;
		setTime(newTime);
		setManualTime(newTime.replace(":", "."));
		if (date && newTime) {
			onChange(`${date}T${newTime}`);
		}
	};

	const handleManualTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const input = e.target.value.replace(/[^\d.]/g, ""); // Only allow digits and dot
		setManualTime(input);

		// Convert from format "15.30" to "15:30"
		if (input.length > 0) {
			let timeValue = input;
			// Auto-add dot if user types two digits
			if (input.length === 2 && !input.includes(".")) {
				timeValue = input + ".";
				setManualTime(timeValue);
			}
			// Remove dots and convert to HH:mm format
			const cleaned = input.split(".").join("");
			if (cleaned.length === 1) {
				// Just single digit, wait for more
			} else if (cleaned.length === 2) {
				// Two digits - still waiting
				if (parseInt(cleaned) > 23) {
					// Hour invalid, reset
					setManualTime("");
				}
			} else if (cleaned.length === 3 || cleaned.length === 4) {
				// Full time
				const hour = cleaned.substring(0, 2);
				const minute = cleaned.substring(2, 4);

				const hourNum = parseInt(hour);
				const minNum = parseInt(minute || "0");

				if (hourNum <= 23 && minNum <= 59) {
					const isoTime = `${hour}:${minute.padEnd(2, "0")}`;
					setTime(isoTime);
					if (date) {
						onChange(`${date}T${isoTime}`);
					}
				}
			}
		}
	};

	return (
		<div className="space-y-3">
			<label className="block text-sm font-medium">
				{label} {required && <span className="text-red-500">*</span>}
			</label>

			{/* Date and Time inputs */}
			<div className="flex gap-3">
				{/* Date Input */}
				<div className="flex-1">
					<input
						type="date"
						value={date}
						onChange={handleDateChange}
						className="input w-full text-sm"
						required={required}
					/>
					<p className="text-xs text-gray-500 mt-1">Tanggal</p>
				</div>

				{/* Time Input - Hidden native, shown via manual input */}
				<input
					type="time"
					value={time}
					onChange={handleTimeChange}
					className="hidden"
					required={required}
				/>

				{/* Manual Time Input - Displays in HH.mm format */}
				<div className="w-32">
					<div className="relative">
						<input
							type="text"
							value={manualTime}
							onChange={handleManualTimeChange}
							placeholder="00.00"
							maxLength={5}
							className="input w-full text-sm text-center font-semibold tracking-widest"
							required={required}
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none font-medium">
							24j
						</span>
					</div>
					<p className="text-xs text-gray-500 mt-1">Waktu</p>
				</div>
			</div>

			{/* Preview */}
			{date && time && (
				<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
					<div className="text-gray-700">
						<strong className="text-blue-600">Hasil:</strong>{" "}
						{formatDateTimeIndonesian(date, time)}
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Format date and time to Indonesian format (24-hour)
 * Input: date="2024-01-15", time="14:30"
 * Output: "Senin, 15 Januari 2024 - 14.30"
 */
function formatDateTimeIndonesian(date: string, time: string): string {
	try {
		const dateObj = new Date(`${date}T00:00:00`);
		const dayNames = [
			"Minggu",
			"Senin",
			"Selasa",
			"Rabu",
			"Kamis",
			"Jumat",
			"Sabtu",
		];
		const monthNames = [
			"Januari",
			"Februari",
			"Maret",
			"April",
			"Mei",
			"Juni",
			"Juli",
			"Agustus",
			"September",
			"Oktober",
			"November",
			"Desember",
		];

		const dayName = dayNames[dateObj.getDay()];
		const day = dateObj.getDate();
		const monthName = monthNames[dateObj.getMonth()];
		const year = dateObj.getFullYear();

		// Convert time format from HH:mm to HH.mm
		const timeDisplay = time.replace(":", ".");

		return `${dayName}, ${day} ${monthName} ${year} - ${timeDisplay}`;
	} catch (e) {
		return `${date} ${time.replace(":", ".")}`;
	}
}

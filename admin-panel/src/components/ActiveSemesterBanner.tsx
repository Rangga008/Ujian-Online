import { useEffect, useState } from "react";
import { semestersApi } from "@/lib/semestersApi";

type Variant = "compact" | "default";

export default function ActiveSemesterBanner({
	variant = "default",
}: {
	variant?: Variant;
}) {
	const [active, setActive] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const data = await semestersApi.getActive();
				if (mounted) setActive(data || null);
			} catch {
				if (mounted) setActive(null);
			} finally {
				if (mounted) setLoading(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	if (loading || !active) return null;

	if (variant === "compact") {
		return (
			<div className="flex items-center gap-2 text-xs text-blue-800">
				<span>📅</span>
				<span className="font-medium">Semester Aktif:</span>
				<span className="font-semibold text-blue-900">{active.name}</span>
			</div>
		);
	}

	return (
		<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
			<p className="text-sm font-medium text-blue-800">
				📅 Semester Aktif Saat Ini
			</p>
			<p className="text-lg font-bold text-blue-900 mt-1">{active.name}</p>
			<p className="text-xs text-blue-600 mt-1">
				Siswa dan ujian baru akan otomatis masuk ke semester aktif
			</p>
		</div>
	);
}

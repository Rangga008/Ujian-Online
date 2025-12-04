interface PaginationProps {
	currentPage: number;
	totalPages: number;
	itemsPerPage: number;
	totalItems: number;
	onPageChange: (page: number) => void;
	onItemsPerPageChange: (itemsPerPage: number) => void;
}

export default function Pagination({
	currentPage,
	totalPages,
	itemsPerPage,
	totalItems,
	onPageChange,
	onItemsPerPageChange,
}: PaginationProps) {
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisible = 5;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			if (currentPage <= 3) {
				for (let i = 1; i <= 4; i++) {
					pages.push(i);
				}
				pages.push("...");
				pages.push(totalPages);
			} else if (currentPage >= totalPages - 2) {
				pages.push(1);
				pages.push("...");
				for (let i = totalPages - 3; i <= totalPages; i++) {
					pages.push(i);
				}
			} else {
				pages.push(1);
				pages.push("...");
				for (let i = currentPage - 1; i <= currentPage + 1; i++) {
					pages.push(i);
				}
				pages.push("...");
				pages.push(totalPages);
			}
		}

		return pages;
	};

	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalItems);

	return (
		<div className="flex items-center justify-between px-4 py-3 border-t bg-white">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<label className="text-sm text-gray-700">Tampilkan:</label>
					<select
						value={itemsPerPage}
						onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
						className="input py-1 px-2 text-sm"
					>
						<option value={10}>10</option>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</div>
				<div className="text-sm text-gray-700">
					Menampilkan {startItem} - {endItem} dari {totalItems} data
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
				>
					Previous
				</button>

				{getPageNumbers().map((page, index) =>
					page === "..." ? (
						<span key={`ellipsis-${index}`} className="px-2 text-gray-500">
							...
						</span>
					) : (
						<button
							key={page}
							onClick={() => onPageChange(page as number)}
							className={`px-3 py-1 rounded border text-sm ${
								currentPage === page
									? "bg-blue-600 text-white border-blue-600"
									: "hover:bg-gray-50"
							}`}
						>
							{page}
						</button>
					)
				)}

				<button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="px-3 py-1 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
				>
					Next
				</button>
			</div>
		</div>
	);
}

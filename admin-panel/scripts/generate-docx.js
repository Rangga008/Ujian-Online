const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const {
	Document,
	Packer,
	Paragraph,
	Table,
	TableRow,
	TableCell,
	WidthType,
	ImageRun,
	TextRun,
} = require("docx");

async function fetchImageBuffer(src) {
	try {
		if (!src) return null;
		if (src.startsWith("data:")) {
			const comma = src.indexOf(",");
			const meta = src.substring(5, comma);
			const isBase64 = meta.endsWith(";base64");
			const data = src.substring(comma + 1);
			return Buffer.from(data, isBase64 ? "base64" : "utf8");
		}
		// Use global fetch (Node 18+) when available
		const _fetch = typeof fetch !== "undefined" ? fetch : null;
		if (!_fetch) return null;
		const res = await _fetch(src);
		if (!res.ok) return null;
		const ab = await res.arrayBuffer();
		return Buffer.from(ab);
	} catch (e) {
		console.error("failed fetch image", src, e);
		return null;
	}
}

function cellText(node) {
	return node.textContent ? node.textContent.trim() : "";
}

async function main() {
	try {
		const tplPath = path.join(
			__dirname,
			"..",
			"public",
			"templates",
			"template-import-soal.doc"
		);
		const outPath = path.join(
			__dirname,
			"..",
			"public",
			"templates",
			"template-import-soal.docx"
		);

		if (!fs.existsSync(tplPath)) {
			console.error("Template HTML not found at", tplPath);
			process.exit(1);
		}

		const html = fs.readFileSync(tplPath, "utf8");
		const dom = new JSDOM(html);
		const children = [];

		const tables = Array.from(
			dom.window.document.querySelectorAll("body > table")
		);
		if (!tables.length) {
			console.error("No tables found in template");
			process.exit(1);
		}

		for (const table of tables) {
			const rows = Array.from(table.querySelectorAll("tr"));
			const docRows = [];
			for (const tr of rows) {
				const cells = Array.from(tr.querySelectorAll("td, th"));
				if (cells.length < 2) continue;
				const key = cellText(cells[0]);
				const valueCell = cells[1];

				const valueParagraphs = [];
				const nested = valueCell.querySelector("table");
				if (nested) {
					const optRows = Array.from(nested.querySelectorAll("tr"));
					for (const or of optRows) {
						const txt = (or.textContent || "").trim();
						valueParagraphs.push(new Paragraph(txt));
					}
				} else {
					const img = valueCell.querySelector("img");
					if (img && img.src) {
						const buf = await fetchImageBuffer(img.src);
						if (buf) {
							valueParagraphs.push(
								new Paragraph({
									children: [
										new ImageRun({
											data: buf,
											transformation: { width: 400, height: 250 },
										}),
									],
								})
							);
						}
					}
					const plain = (valueCell.textContent || "").trim();
					if (plain) valueParagraphs.push(new Paragraph(plain));
				}

				const leftCell = new TableCell({
					children: [new Paragraph(key)],
					width: { size: 30, type: WidthType.PERCENTAGE },
				});
				const rightCell = new TableCell({
					children: valueParagraphs.length
						? valueParagraphs
						: [new Paragraph("")],
					width: { size: 70, type: WidthType.PERCENTAGE },
				});
				docRows.push(new TableRow({ children: [leftCell, rightCell] }));
			}

			const tableDoc = new Table({
				rows: docRows,
				width: { size: 100, type: WidthType.PERCENTAGE },
			});
			// Add table and a single blank paragraph to the same section
			children.push(tableDoc);
			children.push(new Paragraph(""));
		}

		const doc = new Document({
			creator: "Ujian Online",
			sections: [{ children }],
		});

		const buffer = await Packer.toBuffer(doc);
		fs.writeFileSync(outPath, buffer);
		console.log("Written", outPath);
	} catch (err) {
		console.error("Failed to generate docx:", err);
		process.exit(1);
	}
}

main();

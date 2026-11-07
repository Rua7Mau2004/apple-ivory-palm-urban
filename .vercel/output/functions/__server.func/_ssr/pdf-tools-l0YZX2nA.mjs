import { i as __toESM } from "../_runtime.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pdf-tools-l0YZX2nA.js
var pdf_worker_min_default = "/assets/pdf.worker.min-CIqJB0yW.mjs";
var thumbs = /* @__PURE__ */ new Map();
var inflightThumbs = /* @__PURE__ */ new Map();
var docs = /* @__PURE__ */ new Map();
var workerReady = false;
var activeRenders = 0;
var renderQueue = [];
function withSlot(work) {
	return new Promise((resolve, reject) => {
		const start = () => {
			activeRenders += 1;
			work().then(resolve, reject).finally(() => {
				activeRenders -= 1;
				renderQueue.shift()?.();
			});
		};
		if (activeRenders < 2) start();
		else renderQueue.push(start);
	});
}
async function loadPdfjs() {
	const lib = await import("../_libs/pdfjs-dist.mjs").then((n) => n.t);
	if (!workerReady) {
		lib.GlobalWorkerOptions.workerSrc = pdf_worker_min_default;
		workerReady = true;
	}
	return lib;
}
async function docFor(fileId, bytes) {
	let pending = docs.get(fileId);
	if (!pending) {
		pending = (async () => {
			return (await loadPdfjs()).getDocument({ data: bytes.slice() }).promise;
		})();
		pending.catch(() => {
			if (docs.get(fileId) === pending) docs.delete(fileId);
		});
		docs.set(fileId, pending);
	}
	return pending;
}
function forgetPdf(fileId) {
	const pending = docs.get(fileId);
	docs.delete(fileId);
	for (const key of thumbs.keys()) if (key.startsWith(`${fileId}:`)) thumbs.delete(key);
	for (const key of inflightThumbs.keys()) if (key.startsWith(`${fileId}:`)) inflightThumbs.delete(key);
	pending?.then((doc) => {
		doc.cleanup();
		doc.loadingTask.destroy();
	}).catch(() => void 0);
}
function renderThumb(fileId, bytes, pageIndex) {
	const key = `${fileId}:${pageIndex}`;
	const cached = thumbs.get(key);
	if (cached) return Promise.resolve(cached);
	const pending = inflightThumbs.get(key);
	if (pending) return pending;
	const job = withSlot(async () => {
		const page = await (await docFor(fileId, bytes)).getPage(pageIndex + 1);
		try {
			const base = page.getViewport({ scale: 1 });
			const viewport = page.getViewport({ scale: 320 / base.width });
			const canvas = document.createElement("canvas");
			canvas.width = Math.ceil(viewport.width);
			canvas.height = Math.ceil(viewport.height);
			await page.render({
				canvas,
				viewport
			}).promise;
			const url = canvas.toDataURL("image/jpeg", .72);
			thumbs.set(key, url);
			return url;
		} finally {
			page.cleanup();
		}
	}).finally(() => {
		inflightThumbs.delete(key);
	});
	inflightThumbs.set(key, job);
	return job;
}
async function readPdfFile(file) {
	const bytes = new Uint8Array(await file.arrayBuffer());
	const task = (await loadPdfjs()).getDocument({ data: bytes.slice() });
	try {
		const doc = await task.promise;
		const pageCount = doc.numPages;
		await doc.cleanup();
		await task.destroy();
		if (pageCount < 1) throw new Error("File PDF không có trang nào.");
		return {
			name: file.name,
			bytes,
			pageCount
		};
	} catch (err) {
		throw toPdfError(err);
	}
}
function parsePageRange(input, pageCount) {
	const parts = input.split(/[,;]+/).map((part) => part.trim()).filter(Boolean);
	if (parts.length === 0) throw new Error("Nhập số trang, ví dụ 1-3, 5.");
	const result = [];
	const seen = /* @__PURE__ */ new Set();
	for (const part of parts) {
		const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);
		const single = /^(\d+)$/.exec(part);
		if (!range && !single) throw new Error(`Không hiểu “${part}”. Dùng dạng 1-3, 5.`);
		const from = Number(range ? range[1] : single?.[1]);
		const to = Number(range ? range[2] : single?.[1]);
		const lo = Math.min(from, to);
		const hi = Math.max(from, to);
		if (lo < 1 || hi > pageCount) throw new Error(`Trang phải từ 1 đến ${pageCount}.`);
		for (let n = lo; n <= hi; n += 1) {
			if (seen.has(n)) continue;
			seen.add(n);
			result.push(n - 1);
		}
	}
	return result;
}
function nextRotation(rotation) {
	return (rotation + 90) % 360;
}
async function loadSource(bytes) {
	const { PDFDocument } = await import("../_libs/pdf-lib.mjs").then((n) => n.t);
	try {
		return await PDFDocument.load(bytes.slice());
	} catch {
		return PDFDocument.load(bytes.slice(), { ignoreEncryption: true });
	}
}
async function composePdf(files, pieces) {
	if (pieces.length === 0) throw new Error("Bản nối chưa có trang nào.");
	const { PDFDocument, degrees } = await import("../_libs/pdf-lib.mjs").then((n) => n.t);
	const out = await PDFDocument.create();
	const loaded = /* @__PURE__ */ new Map();
	for (const piece of pieces) {
		const file = files.find((item) => item.id === piece.fileId);
		if (!file) throw new Error("Một trang không còn file nguồn.");
		let src = loaded.get(file.id);
		if (!src) {
			src = await loadSource(file.bytes);
			loaded.set(file.id, src);
		}
		const [copied] = await out.copyPages(src, [piece.pageIndex]);
		if (!copied) throw new Error("Không cắt được trang đã chọn.");
		const base = copied.getRotation().angle;
		copied.setRotation(degrees((base + piece.rotation) % 360));
		out.addPage(copied);
	}
	out.setTitle("Cắt Nối");
	out.setCreator("Cắt Nối");
	return out.save();
}
async function zipPieces(files, pieces) {
	if (pieces.length === 0) throw new Error("Chưa có trang để tách.");
	const { default: JSZip } = await import("../_libs/jszip+[...].mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
	const zip = new JSZip();
	for (let index = 0; index < pieces.length; index += 1) {
		const piece = pieces[index];
		if (!piece) continue;
		const bytes = await composePdf(files, [{
			...piece,
			rotation: piece.rotation
		}]);
		zip.file(pieceFileName(files, piece, index), bytes);
	}
	return zip.generateAsync({ type: "uint8array" });
}
function downloadBytes(bytes, filename, type) {
	const copy = new Uint8Array(bytes);
	const blob = new Blob([copy], { type });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
async function buildSamples() {
	const contract = await drawSample("HOP DONG", 4, [
		[
			.77,
			.27,
			.18
		],
		[
			.2,
			.34,
			.32
		],
		[
			.45,
			.32,
			.18
		],
		[
			.16,
			.16,
			.15
		]
	]);
	const annex = await drawSample("PHU LUC", 2, [[
		.18,
		.28,
		.45
	], [
		.55,
		.22,
		.24
	]]);
	return [{
		name: "hop-dong-mau.pdf",
		...contract
	}, {
		name: "phu-luc-mau.pdf",
		...annex
	}];
}
async function drawSample(label, count, tones) {
	const { PDFDocument, StandardFonts, rgb } = await import("../_libs/pdf-lib.mjs").then((n) => n.t);
	const doc = await PDFDocument.create();
	const display = await doc.embedFont(StandardFonts.HelveticaBold);
	const body = await doc.embedFont(StandardFonts.Helvetica);
	for (let index = 0; index < count; index += 1) {
		const page = doc.addPage([595.28, 841.89]);
		const { width, height } = page.getSize();
		const tone = tones[index % tones.length] ?? [
			.2,
			.2,
			.2
		];
		page.drawRectangle({
			x: 0,
			y: 0,
			width,
			height,
			color: rgb(.97, .95, .91)
		});
		page.drawRectangle({
			x: 0,
			y: height - 36,
			width,
			height: 36,
			color: rgb(tone[0], tone[1], tone[2])
		});
		page.drawText(String(index + 1).padStart(2, "0"), {
			x: 48,
			y: height / 2 - 36,
			size: 92,
			font: display,
			color: rgb(.11, .1, .09)
		});
		page.drawText(`${label}  /  TRANG ${index + 1}`, {
			x: 48,
			y: 64,
			size: 14,
			font: body,
			color: rgb(.35, .32, .28)
		});
	}
	return {
		bytes: await doc.save(),
		pageCount: doc.getPageCount()
	};
}
function pieceFileName(files, piece, index) {
	const base = (files.find((item) => item.id === piece.fileId)?.name ?? "tai-lieu").replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 48);
	return `${String(index + 1).padStart(2, "0")}-${base}-trang-${piece.pageIndex + 1}.pdf`;
}
function toPdfError(err) {
	if (isPasswordError(err)) return /* @__PURE__ */ new Error("File đang khóa mật khẩu. Hãy mở khóa rồi thử lại.");
	return /* @__PURE__ */ new Error("Không đọc được file PDF này.");
}
function isPasswordError(err) {
	if (!err || typeof err !== "object") return false;
	const name = "name" in err ? String(err.name) : "";
	const message = "message" in err ? String(err.message) : "";
	return name === "PasswordException" || /password/i.test(message);
}
//#endregion
export { buildSamples, composePdf, downloadBytes, forgetPdf, nextRotation, parsePageRange, readPdfFile, renderThumb, zipPieces };

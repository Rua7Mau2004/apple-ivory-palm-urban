import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as RotateCw, c as Download, i as Scissors, l as ChevronUp, o as Plus, r as Trash2, s as Files, t as X, u as ChevronDown } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DIgPrNMF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var primaryBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cut px-4 text-sm font-medium text-oncut transition-colors duration-200 hover:opacity-90 disabled:opacity-40";
var quietBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-sheet px-4 text-sm font-medium text-ink transition-colors duration-200 hover:border-ink disabled:opacity-40";
var textBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-ink transition-colors duration-200 hover:bg-paper disabled:opacity-40";
function PdfDesk() {
	const [files, setFiles] = (0, import_react.useState)([]);
	const [activeId, setActiveId] = (0, import_react.useState)(null);
	const [selected, setSelected] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [pieces, setPieces] = (0, import_react.useState)([]);
	const [range, setRange] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [pane, setPane] = (0, import_react.useState)("source");
	const [dragging, setDragging] = (0, import_react.useState)(false);
	const [dragUid, setDragUid] = (0, import_react.useState)(null);
	const [overUid, setOverUid] = (0, import_react.useState)(null);
	const dragDepth = (0, import_react.useRef)(0);
	const anchor = (0, import_react.useRef)(null);
	const active = files.find((file) => file.id === activeId) ?? null;
	const selectedHere = active ? [...selected].filter((key) => key.startsWith(`${active.id}:`)).length : 0;
	const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0);
	function hasFiles(event) {
		return [...event.dataTransfer.types].includes("Files");
	}
	async function ingest(list) {
		if (busy) return;
		const picked = [...list].filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
		if (picked.length === 0) {
			setError("Chỉ nhận file PDF.");
			return;
		}
		setBusy("Đang đọc PDF…");
		setError(null);
		const { readPdfFile } = await import("./pdf-tools-l0YZX2nA.mjs");
		const loaded = [];
		const problems = [];
		for (const file of picked) try {
			loaded.push({
				id: crypto.randomUUID(),
				...await readPdfFile(file)
			});
		} catch (err) {
			problems.push(`${file.name}: ${messageOf(err)}`);
		}
		if (loaded.length > 0) {
			setFiles((prev) => [...prev, ...loaded]);
			setActiveId(loaded[0]?.id ?? null);
			setPane("source");
			anchor.current = null;
		}
		setError(problems.length > 0 ? problems.join(" ") : null);
		setBusy(null);
	}
	async function loadSample() {
		if (busy) return;
		setBusy("Đang tạo file mẫu…");
		setError(null);
		try {
			const { buildSamples } = await import("./pdf-tools-l0YZX2nA.mjs");
			const withIds = (await buildSamples()).map((sample) => ({
				...sample,
				id: crypto.randomUUID()
			}));
			setFiles((prev) => [...prev, ...withIds]);
			setActiveId(withIds[0]?.id ?? null);
			setPane("source");
		} catch (err) {
			setError(messageOf(err));
		} finally {
			setBusy(null);
		}
	}
	function togglePage(index, shift) {
		if (!active) return;
		setSelected((prev) => {
			const next = new Set(prev);
			if (shift && anchor.current !== null) {
				const from = Math.min(anchor.current, index);
				const to = Math.max(anchor.current, index);
				for (let page = from; page <= to; page += 1) next.add(`${active.id}:${page}`);
			} else {
				const key = `${active.id}:${index}`;
				if (next.has(key)) next.delete(key);
				else next.add(key);
			}
			return next;
		});
		anchor.current = index;
	}
	function selectAll(on) {
		if (!active) return;
		setSelected((prev) => {
			const next = new Set([...prev].filter((key) => !key.startsWith(`${active.id}:`)));
			if (on) for (let index = 0; index < active.pageCount; index += 1) next.add(`${active.id}:${index}`);
			return next;
		});
	}
	function selectParity(odd) {
		if (!active) return;
		setSelected((prev) => {
			const next = new Set([...prev].filter((key) => !key.startsWith(`${active.id}:`)));
			for (let index = 0; index < active.pageCount; index += 1) if ((index + 1) % 2 === 1 === odd) next.add(`${active.id}:${index}`);
			return next;
		});
	}
	async function applyRange(event) {
		event.preventDefault();
		if (!active) return;
		try {
			const { parsePageRange } = await import("./pdf-tools-l0YZX2nA.mjs");
			const indexes = parsePageRange(range, active.pageCount);
			setSelected((prev) => {
				const next = new Set([...prev].filter((key) => !key.startsWith(`${active.id}:`)));
				for (const index of indexes) next.add(`${active.id}:${index}`);
				return next;
			});
			setError(null);
		} catch (err) {
			setError(messageOf(err));
		}
	}
	function pushIndexes(indexes) {
		if (!active || indexes.length === 0) {
			setError("Chưa chọn trang nào.");
			return;
		}
		setError(null);
		setPieces((prev) => [...prev, ...indexes.map((pageIndex) => ({
			uid: crypto.randomUUID(),
			fileId: active.id,
			pageIndex,
			rotation: 0
		}))]);
		setPane("out");
	}
	function removeFile(fileId) {
		import("./pdf-tools-l0YZX2nA.mjs").then(({ forgetPdf }) => forgetPdf(fileId));
		const remaining = files.filter((file) => file.id !== fileId);
		setFiles(remaining);
		setActiveId((current) => current === fileId ? remaining[0]?.id ?? null : current);
		setSelected((prev) => new Set([...prev].filter((key) => !key.startsWith(`${fileId}:`))));
		setPieces((prev) => prev.filter((piece) => piece.fileId !== fileId));
	}
	function movePiece(uid, dir) {
		setPieces((prev) => {
			const from = prev.findIndex((piece) => piece.uid === uid);
			const to = from + dir;
			if (from < 0 || to < 0 || to >= prev.length) return prev;
			const next = [...prev];
			const current = next[from];
			const swap = next[to];
			if (!current || !swap) return prev;
			next[from] = swap;
			next[to] = current;
			return next;
		});
	}
	function dropPiece(targetUid) {
		if (!dragUid || dragUid === targetUid) {
			setDragUid(null);
			setOverUid(null);
			return;
		}
		setPieces((prev) => {
			const next = [...prev];
			const from = next.findIndex((piece) => piece.uid === dragUid);
			const to = next.findIndex((piece) => piece.uid === targetUid);
			if (from < 0 || to < 0) return prev;
			const [item] = next.splice(from, 1);
			if (!item) return prev;
			next.splice(to, 0, item);
			return next;
		});
		setDragUid(null);
		setOverUid(null);
	}
	async function savePdf() {
		if (pieces.length === 0 || busy) return;
		setBusy("Đang nối trang…");
		setError(null);
		try {
			const { composePdf, downloadBytes } = await import("./pdf-tools-l0YZX2nA.mjs");
			downloadBytes(await composePdf(files, pieces), "ban-noi.pdf", "application/pdf");
		} catch (err) {
			setError(messageOf(err));
		} finally {
			setBusy(null);
		}
	}
	async function saveZip(sourcePieces, filename) {
		if (sourcePieces.length === 0 || busy) return;
		setBusy("Đang tách từng trang…");
		setError(null);
		try {
			const { zipPieces, downloadBytes } = await import("./pdf-tools-l0YZX2nA.mjs");
			downloadBytes(await zipPieces(files, sourcePieces), filename, "application/zip");
		} catch (err) {
			setError(messageOf(err));
		} finally {
			setBusy(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-paper text-ink",
		onDragEnter: (event) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current += 1;
			setDragging(true);
		},
		onDragLeave: (event) => {
			if (!hasFiles(event)) return;
			dragDepth.current -= 1;
			if (dragDepth.current <= 0) {
				dragDepth.current = 0;
				setDragging(false);
			}
		},
		onDragOver: (event) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
		},
		onDrop: (event) => {
			if (!hasFiles(event)) return;
			event.preventDefault();
			dragDepth.current = 0;
			setDragging(false);
			ingest(event.dataTransfer.files);
		},
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-widest text-cut uppercase",
						children: "PDF trên máy bạn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "font-display text-4xl leading-none text-ink sm:text-5xl",
						children: ["Cắt Nối", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-3 block h-1 w-12 bg-cut" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-xl text-sm leading-relaxed text-muted",
						children: "Cắt trang ra, sắp xếp lại, rồi nối thành một file. Mọi thao tác chạy trong trình duyệt — PDF không rời máy."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 sm:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FileButton, {
						className: primaryBtn,
						onPick: (list) => void ingest(list),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
							className: "size-4",
							"aria-hidden": true
						}), "Thêm PDF"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: quietBtn,
						onClick: () => void loadSample(),
						disabled: !!busy,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Files, {
							className: "size-4",
							"aria-hidden": true
						}), "Thử file mẫu"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				"aria-live": "polite",
				className: "mx-auto max-w-6xl px-4 sm:px-6",
				children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: busy
				}) : null, error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "alert",
					className: "text-sm text-cut",
					children: error
				}) : null]
			}),
			files.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyDesk, {
				busy: !!busy,
				onPick: (list) => void ingest(list),
				onSample: () => void loadSample()
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-4 pb-10 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2 lg:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: pane === "source" ? primaryBtn : quietBtn,
						onClick: () => setPane("source"),
						children: [
							"Nguồn (",
							totalPages,
							")"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: pane === "out" ? primaryBtn : quietBtn,
						onClick: () => setPane("out"),
						children: [
							"Bản nối (",
							pieces.length,
							")"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-4 lg:flex-row lg:items-start",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						className: clsx("min-w-0 flex-1", pane === "source" ? "block" : "hidden lg:block"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-card border border-line bg-sheet p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-end justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-display text-2xl",
										children: "Nguồn"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm text-muted",
										children: [
											files.length,
											" file · ",
											totalPages,
											" trang · đã chọn ",
											selectedHere
										]
									})] }), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: textBtn,
										onClick: () => removeFile(active.id),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
											className: "size-4",
											"aria-hidden": true
										}), "Gỡ file này"]
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-4 flex gap-2 overflow-x-auto pb-1",
									children: files.map((file) => {
										const on = file.id === activeId;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												setActiveId(file.id);
												anchor.current = null;
											},
											className: clsx("max-w-56 shrink-0 rounded-full border px-3 py-2 text-left text-sm", on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink"),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block truncate",
												children: file.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: on ? "text-paper/70" : "text-muted",
												children: [file.pageCount, " trang"]
											})]
										}, file.id);
									})
								}),
								active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
										onSubmit: (event) => void applyRange(event),
										className: "mt-4 flex flex-col gap-2 sm:flex-row",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "sr-only",
												children: "Dải trang"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: range,
												onChange: (event) => setRange(event.target.value),
												placeholder: "Dải trang: 1-3, 5, 8-10",
												inputMode: "text",
												className: "min-h-11 w-full rounded-full border border-line bg-paper px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "submit",
											className: quietBtn,
											children: "Chọn dải"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 flex flex-wrap gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: textBtn,
												onClick: () => selectAll(true),
												children: "Chọn tất cả"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: textBtn,
												onClick: () => selectAll(false),
												children: "Bỏ chọn"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: textBtn,
												onClick: () => selectParity(true),
												children: "Trang lẻ"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: textBtn,
												onClick: () => selectParity(false),
												children: "Trang chẵn"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-sm text-muted",
										children: "Bấm một trang để chọn. Giữ Shift để chọn cả dải. File gốc không bị sửa."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3",
										children: Array.from({ length: active.pageCount }, (_, index) => {
											const on = selected.has(`${active.id}:${index}`);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												"aria-pressed": on,
												"aria-label": `Trang ${index + 1} của ${active.name}`,
												onClick: (event) => togglePage(index, event.shiftKey),
												className: clsx("flex flex-col gap-2 rounded-card border p-2 text-left", on ? "border-cut bg-paper" : "border-line bg-paper"),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, {
													fileId: active.id,
													bytes: active.bytes,
													pageIndex: index
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "flex items-center justify-between gap-2 text-xs",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-medium",
														children: ["Trang ", index + 1]
													}), on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "rounded-full bg-cut px-2 py-1 text-oncut",
														children: "Đã chọn"
													}) : null]
												})]
											}, `${active.id}:${index}`);
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												className: primaryBtn,
												disabled: selectedHere === 0 || !!busy,
												onClick: () => {
													if (!active) return;
													const indexes = [];
													for (let index = 0; index < active.pageCount; index += 1) if (selected.has(`${active.id}:${index}`)) indexes.push(index);
													pushIndexes(indexes);
												},
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scissors, {
													className: "size-4",
													"aria-hidden": true
												}), "Cắt trang đã chọn"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: quietBtn,
												disabled: !!busy,
												onClick: () => pushIndexes(Array.from({ length: active.pageCount }, (_, index) => index)),
												children: "Nối cả file này"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: quietBtn,
												disabled: !!busy,
												onClick: () => void saveZip(Array.from({ length: active.pageCount }, (_, pageIndex) => ({
													uid: `${active.id}:${pageIndex}`,
													fileId: active.id,
													pageIndex,
													rotation: 0
												})), stem(active.name) + "-tach.zip"),
												children: "Tách mỗi trang một file"
											})
										]
									})
								] }) : null
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
						className: clsx("w-full lg:sticky lg:top-0 lg:max-h-screen lg:w-96 lg:overflow-y-auto", pane === "out" ? "block" : "hidden lg:block"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-card border border-line bg-sheet p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-display text-2xl",
										children: "Bản nối"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: pieces.length === 0 ? "Chưa có trang. Cắt từ nguồn rồi thả vào đây." : `${pieces.length} trang · kéo hoặc dùng mũi tên để đổi chỗ`
									})] }), pieces.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: textBtn,
										onClick: () => setPieces([]),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
											className: "size-4",
											"aria-hidden": true
										}), "Xóa"]
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
									className: "mt-4 flex flex-col gap-2",
									children: pieces.map((piece, index) => {
										const file = files.find((item) => item.id === piece.fileId);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
											draggable: true,
											onDragStart: (event) => {
												event.dataTransfer.effectAllowed = "move";
												event.dataTransfer.setData("text/plain", piece.uid);
												setDragUid(piece.uid);
											},
											onDragOver: (event) => {
												if (hasFiles(event)) return;
												event.preventDefault();
												setOverUid(piece.uid);
											},
											onDrop: (event) => {
												if (hasFiles(event)) return;
												event.preventDefault();
												event.stopPropagation();
												dropPiece(piece.uid);
											},
											className: clsx("rounded-card border bg-paper p-2", overUid === piece.uid ? "border-cut" : "border-line"),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "w-12 shrink-0",
													children: file ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, {
														fileId: file.id,
														bytes: file.bytes,
														pageIndex: piece.pageIndex
													}) : null
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0 flex-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
														className: "text-sm font-medium",
														children: [
															index + 1,
															". Trang ",
															piece.pageIndex + 1
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
														className: "truncate text-xs text-muted",
														children: [file?.name ?? "Đã gỡ", piece.rotation ? ` · xoay ${piece.rotation}°` : ""]
													})]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1 flex justify-between",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
														label: "Đưa lên",
														onClick: () => movePiece(piece.uid, -1),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, {
															className: "size-4",
															"aria-hidden": true
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
														label: "Đưa xuống",
														onClick: () => movePiece(piece.uid, 1),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, {
															className: "size-4",
															"aria-hidden": true
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
														label: "Xoay 90 độ",
														onClick: () => {
															import("./pdf-tools-l0YZX2nA.mjs").then(({ nextRotation }) => {
																setPieces((prev) => prev.map((item) => item.uid === piece.uid ? {
																	...item,
																	rotation: nextRotation(item.rotation)
																} : item));
															});
														},
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCw, {
															className: "size-4",
															"aria-hidden": true
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconButton, {
														label: "Bỏ trang",
														onClick: () => setPieces((prev) => prev.filter((item) => item.uid !== piece.uid)),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
															className: "size-4",
															"aria-hidden": true
														})
													})
												]
											})]
										}, piece.uid);
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 flex flex-col gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: primaryBtn,
										disabled: pieces.length === 0 || !!busy,
										onClick: () => void savePdf(),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {
											className: "size-4",
											"aria-hidden": true
										}), "Tải bản đã nối"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: quietBtn,
										disabled: pieces.length === 0 || !!busy,
										onClick: () => void saveZip(pieces, "ban-noi-tach.zip"),
										children: "Tách bản nối thành từng trang"
									})]
								})
							]
						})
					})]
				})]
			}),
			dragging ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none fixed inset-0 z-40 grid place-items-center bg-ink/50 p-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-card bg-sheet px-6 py-4 font-display text-3xl text-ink",
					children: "Thả PDF vào đây"
				})
			}) : null
		]
	});
}
function EmptyDesk({ busy, onPick, onSample }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "mx-auto max-w-6xl px-4 pt-2 pb-12 sm:px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative rounded-card border border-dashed border-line bg-sheet px-5 py-10 sm:px-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-4 left-4 size-5 border-t-2 border-l-2 border-cut" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-4 right-4 size-5 border-t-2 border-r-2 border-cut" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-4 left-4 size-5 border-b-2 border-l-2 border-cut" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute right-4 bottom-4 size-5 border-r-2 border-b-2 border-cut" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-lg text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-3xl",
							children: "Đặt file PDF lên bàn"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm leading-relaxed text-muted",
							children: "Kéo thả một hoặc nhiều file. Xem từng trang, giữ trang muốn cắt, rồi nối chúng thành file mới để tải về."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FileButton, {
								className: primaryBtn,
								onPick,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, {
									className: "size-4",
									"aria-hidden": true
								}), "Chọn PDF"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: quietBtn,
								onClick: onSample,
								disabled: busy,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Files, {
									className: "size-4",
									"aria-hidden": true
								}), "Thử file mẫu"]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
					className: "mt-10 grid gap-3 sm:grid-cols-3",
					children: [
						[
							"1",
							"Thêm PDF",
							"Một file để cắt, hoặc nhiều file để nối."
						],
						[
							"2",
							"Chọn trang",
							"Bấm, giữ Shift, hoặc gõ dải như 1-3, 5."
						],
						[
							"3",
							"Tải bản nối",
							"Đổi thứ tự, xoay trang, rồi lưu PDF mới."
						]
					].map(([step, title, copy]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "rounded-card border border-line bg-paper p-4 text-left",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-2xl text-cut",
								children: step
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-medium",
								children: title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted",
								children: copy
							})
						]
					}, step))
				})
			]
		})
	});
}
function FileButton({ className, onPick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: clsx(className, "cursor-pointer"),
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "file",
			accept: "application/pdf,.pdf",
			multiple: true,
			className: "sr-only",
			onChange: (event) => {
				const list = event.target.files;
				if (list && list.length > 0) onPick(list);
				event.target.value = "";
			}
		})]
	});
}
function IconButton({ label, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		title: label,
		onClick,
		className: "grid size-11 place-items-center rounded-full text-ink hover:bg-sheet",
		children
	});
}
function Thumb({ fileId, bytes, pageIndex }) {
	const [src, setSrc] = (0, import_react.useState)(null);
	const [failed, setFailed] = (0, import_react.useState)(false);
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const node = ref.current;
		if (!node) return;
		let cancelled = false;
		const observer = new IntersectionObserver((entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			observer.disconnect();
			import("./pdf-tools-l0YZX2nA.mjs").then(({ renderThumb }) => renderThumb(fileId, bytes, pageIndex).then((url) => {
				if (!cancelled) setSrc(url);
			}, () => {
				if (!cancelled) setFailed(true);
			}));
		}, { rootMargin: "280px" });
		observer.observe(node);
		return () => {
			cancelled = true;
			observer.disconnect();
		};
	}, [
		bytes,
		fileId,
		pageIndex
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "flex aspect-3/4 items-center justify-center overflow-hidden rounded-md bg-line motion-reduce:transition-none",
		children: src ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt: "",
			className: "h-full w-full object-contain"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "px-1 text-center text-xs text-muted motion-reduce:animate-none",
			children: failed ? "Không xem trước" : "Đang vẽ…"
		})
	});
}
function messageOf(err) {
	if (err instanceof Error && err.message) return err.message;
	return "Có lỗi khi xử lý PDF.";
}
function stem(name) {
	return name.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 48);
}
var SplitComponent = PdfDesk;
//#endregion
export { SplitComponent as component };

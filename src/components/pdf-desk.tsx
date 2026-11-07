import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Files,
  Plus,
  RotateCw,
  Scissors,
  Trash2,
  X,
} from "lucide-react";
import type { PdfPiece, PdfSource, Rotation } from "@/lib/pdf-tools";

type Pane = "source" | "out";

const primaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cut px-4 text-sm font-medium text-oncut transition-colors duration-200 hover:opacity-90 disabled:opacity-40";
const quietBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-sheet px-4 text-sm font-medium text-ink transition-colors duration-200 hover:border-ink disabled:opacity-40";
const textBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-ink transition-colors duration-200 hover:bg-paper disabled:opacity-40";

export function PdfDesk() {
  const [files, setFiles] = useState<PdfSource[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pieces, setPieces] = useState<PdfPiece[]>([]);
  const [range, setRange] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>("source");
  const [dragging, setDragging] = useState(false);
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [overUid, setOverUid] = useState<string | null>(null);
  const dragDepth = useRef(0);
  const anchor = useRef<number | null>(null);

  const active = files.find((file) => file.id === activeId) ?? null;
  const selectedHere = active
    ? [...selected].filter((key) => key.startsWith(`${active.id}:`)).length
    : 0;
  const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0);

  function hasFiles(event: DragEvent) {
    return [...event.dataTransfer.types].includes("Files");
  }

  async function ingest(list: FileList | File[]) {
    if (busy) return;
    const picked = [...list].filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    if (picked.length === 0) {
      setError("Chỉ nhận file PDF.");
      return;
    }
    setBusy("Đang đọc PDF…");
    setError(null);
    const { readPdfFile } = await import("@/lib/pdf-tools");
    const loaded: PdfSource[] = [];
    const problems: string[] = [];
    for (const file of picked) {
      try {
        loaded.push({ id: crypto.randomUUID(), ...(await readPdfFile(file)) });
      } catch (err) {
        problems.push(`${file.name}: ${messageOf(err)}`);
      }
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
      const { buildSamples } = await import("@/lib/pdf-tools");
      const samples = await buildSamples();
      const withIds = samples.map((sample) => ({ ...sample, id: crypto.randomUUID() }));
      setFiles((prev) => [...prev, ...withIds]);
      setActiveId(withIds[0]?.id ?? null);
      setPane("source");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  function togglePage(index: number, shift: boolean) {
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

  function selectAll(on: boolean) {
    if (!active) return;
    setSelected((prev) => {
      const next = new Set([...prev].filter((key) => !key.startsWith(`${active.id}:`)));
      if (on) {
        for (let index = 0; index < active.pageCount; index += 1) {
          next.add(`${active.id}:${index}`);
        }
      }
      return next;
    });
  }

  function selectParity(odd: boolean) {
    if (!active) return;
    setSelected((prev) => {
      const next = new Set([...prev].filter((key) => !key.startsWith(`${active.id}:`)));
      for (let index = 0; index < active.pageCount; index += 1) {
        const isOdd = (index + 1) % 2 === 1;
        if (isOdd === odd) next.add(`${active.id}:${index}`);
      }
      return next;
    });
  }

  async function applyRange(event: FormEvent) {
    event.preventDefault();
    if (!active) return;
    try {
      const { parsePageRange } = await import("@/lib/pdf-tools");
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

  function pushIndexes(indexes: number[]) {
    if (!active || indexes.length === 0) {
      setError("Chưa chọn trang nào.");
      return;
    }
    setError(null);
    setPieces((prev) => [
      ...prev,
      ...indexes.map((pageIndex) => ({
        uid: crypto.randomUUID(),
        fileId: active.id,
        pageIndex,
        rotation: 0 as Rotation,
      })),
    ]);
    setPane("out");
  }

  function removeFile(fileId: string) {
    void import("@/lib/pdf-tools").then(({ forgetPdf }) => forgetPdf(fileId));
    const remaining = files.filter((file) => file.id !== fileId);
    setFiles(remaining);
    setActiveId((current) => (current === fileId ? (remaining[0]?.id ?? null) : current));
    setSelected((prev) => new Set([...prev].filter((key) => !key.startsWith(`${fileId}:`))));
    setPieces((prev) => prev.filter((piece) => piece.fileId !== fileId));
  }

  function movePiece(uid: string, dir: -1 | 1) {
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

  function dropPiece(targetUid: string) {
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
      const { composePdf, downloadBytes } = await import("@/lib/pdf-tools");
      const bytes = await composePdf(files, pieces);
      downloadBytes(bytes, "ban-noi.pdf", "application/pdf");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveZip(sourcePieces: PdfPiece[], filename: string) {
    if (sourcePieces.length === 0 || busy) return;
    setBusy("Đang tách từng trang…");
    setError(null);
    try {
      const { zipPieces, downloadBytes } = await import("@/lib/pdf-tools");
      const bytes = await zipPieces(files, sourcePieces);
      downloadBytes(bytes, filename, "application/zip");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink"
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return;
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        void ingest(event.dataTransfer.files);
      }}
    >
      <header className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-medium tracking-widest text-cut uppercase">PDF trên máy bạn</p>
          <h1 className="font-display text-4xl leading-none text-ink sm:text-5xl">
            Cắt Nối
            <span className="mt-3 block h-1 w-12 bg-cut" />
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Cắt trang ra, sắp xếp lại, rồi nối thành một file. Mọi thao tác chạy trong trình duyệt —
            PDF không rời máy.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <FileButton className={primaryBtn} onPick={(list) => void ingest(list)}>
            <Plus className="size-4" aria-hidden />
            Thêm PDF
          </FileButton>
          <button type="button" className={quietBtn} onClick={() => void loadSample()} disabled={!!busy}>
            <Files className="size-4" aria-hidden />
            Thử file mẫu
          </button>
        </div>
      </header>

      <div aria-live="polite" className="mx-auto max-w-6xl px-4 sm:px-6">
        {busy ? <p className="text-sm text-muted">{busy}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-cut">
            {error}
          </p>
        ) : null}
      </div>

      {files.length === 0 ? (
        <EmptyDesk busy={!!busy} onPick={(list) => void ingest(list)} onSample={() => void loadSample()} />
      ) : (
        <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-4 pb-10 sm:px-6">
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            <button
              type="button"
              className={pane === "source" ? primaryBtn : quietBtn}
              onClick={() => setPane("source")}
            >
              Nguồn ({totalPages})
            </button>
            <button
              type="button"
              className={pane === "out" ? primaryBtn : quietBtn}
              onClick={() => setPane("out")}
            >
              Bản nối ({pieces.length})
            </button>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <section className={clsx("min-w-0 flex-1", pane === "source" ? "block" : "hidden lg:block")}>
              <div className="rounded-card border border-line bg-sheet p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl">Nguồn</h2>
                    <p className="text-sm text-muted">
                      {files.length} file · {totalPages} trang · đã chọn {selectedHere}
                    </p>
                  </div>
                  {active ? (
                    <button type="button" className={textBtn} onClick={() => removeFile(active.id)}>
                      <Trash2 className="size-4" aria-hidden />
                      Gỡ file này
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {files.map((file) => {
                    const on = file.id === activeId;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          setActiveId(file.id);
                          anchor.current = null;
                        }}
                        className={clsx(
                          "max-w-56 shrink-0 rounded-full border px-3 py-2 text-left text-sm",
                          on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink",
                        )}
                      >
                        <span className="block truncate">{file.name}</span>
                        <span className={on ? "text-paper/70" : "text-muted"}>{file.pageCount} trang</span>
                      </button>
                    );
                  })}
                </div>

                {active ? (
                  <>
                    <form onSubmit={(event) => void applyRange(event)} className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">Dải trang</span>
                        <input
                          value={range}
                          onChange={(event) => setRange(event.target.value)}
                          placeholder="Dải trang: 1-3, 5, 8-10"
                          inputMode="text"
                          className="min-h-11 w-full rounded-full border border-line bg-paper px-4 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        />
                      </label>
                      <button type="submit" className={quietBtn}>
                        Chọn dải
                      </button>
                    </form>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className={textBtn} onClick={() => selectAll(true)}>
                        Chọn tất cả
                      </button>
                      <button type="button" className={textBtn} onClick={() => selectAll(false)}>
                        Bỏ chọn
                      </button>
                      <button type="button" className={textBtn} onClick={() => selectParity(true)}>
                        Trang lẻ
                      </button>
                      <button type="button" className={textBtn} onClick={() => selectParity(false)}>
                        Trang chẵn
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      Bấm một trang để chọn. Giữ Shift để chọn cả dải. File gốc không bị sửa.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {Array.from({ length: active.pageCount }, (_, index) => {
                        const on = selected.has(`${active.id}:${index}`);
                        return (
                          <button
                            key={`${active.id}:${index}`}
                            type="button"
                            aria-pressed={on}
                            aria-label={`Trang ${index + 1} của ${active.name}`}
                            onClick={(event) => togglePage(index, event.shiftKey)}
                            className={clsx(
                              "flex flex-col gap-2 rounded-card border p-2 text-left",
                              on ? "border-cut bg-paper" : "border-line bg-paper",
                            )}
                          >
                            <Thumb fileId={active.id} bytes={active.bytes} pageIndex={index} />
                            <span className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-medium">Trang {index + 1}</span>
                              {on ? (
                                <span className="rounded-full bg-cut px-2 py-1 text-oncut">Đã chọn</span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        className={primaryBtn}
                        disabled={selectedHere === 0 || !!busy}
                        onClick={() => {
                          if (!active) return;
                          const indexes: number[] = [];
                          for (let index = 0; index < active.pageCount; index += 1) {
                            if (selected.has(`${active.id}:${index}`)) indexes.push(index);
                          }
                          pushIndexes(indexes);
                        }}
                      >
                        <Scissors className="size-4" aria-hidden />
                        Cắt trang đã chọn
                      </button>
                      <button
                        type="button"
                        className={quietBtn}
                        disabled={!!busy}
                        onClick={() => pushIndexes(Array.from({ length: active.pageCount }, (_, index) => index))}
                      >
                        Nối cả file này
                      </button>
                      <button
                        type="button"
                        className={quietBtn}
                        disabled={!!busy}
                        onClick={() =>
                          void saveZip(
                            Array.from({ length: active.pageCount }, (_, pageIndex) => ({
                              uid: `${active.id}:${pageIndex}`,
                              fileId: active.id,
                              pageIndex,
                              rotation: 0 as Rotation,
                            })),
                            stem(active.name) + "-tach.zip",
                          )
                        }
                      >
                        Tách mỗi trang một file
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </section>

            <aside className={clsx("w-full lg:sticky lg:top-0 lg:max-h-screen lg:w-96 lg:overflow-y-auto", pane === "out" ? "block" : "hidden lg:block")}>
              <div className="rounded-card border border-line bg-sheet p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl">Bản nối</h2>
                    <p className="text-sm text-muted">
                      {pieces.length === 0
                        ? "Chưa có trang. Cắt từ nguồn rồi thả vào đây."
                        : `${pieces.length} trang · kéo hoặc dùng mũi tên để đổi chỗ`}
                    </p>
                  </div>
                  {pieces.length > 0 ? (
                    <button type="button" className={textBtn} onClick={() => setPieces([])}>
                      <X className="size-4" aria-hidden />
                      Xóa
                    </button>
                  ) : null}
                </div>

                <ol className="mt-4 flex flex-col gap-2">
                  {pieces.map((piece, index) => {
                    const file = files.find((item) => item.id === piece.fileId);
                    return (
                      <li
                        key={piece.uid}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", piece.uid);
                          setDragUid(piece.uid);
                        }}
                        onDragOver={(event) => {
                          if (hasFiles(event)) return;
                          event.preventDefault();
                          setOverUid(piece.uid);
                        }}
                        onDrop={(event) => {
                          if (hasFiles(event)) return;
                          event.preventDefault();
                          event.stopPropagation();
                          dropPiece(piece.uid);
                        }}
                        className={clsx(
                          "rounded-card border bg-paper p-2",
                          overUid === piece.uid ? "border-cut" : "border-line",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 shrink-0">
                            {file ? (
                              <Thumb fileId={file.id} bytes={file.bytes} pageIndex={piece.pageIndex} />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {index + 1}. Trang {piece.pageIndex + 1}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {file?.name ?? "Đã gỡ"}
                              {piece.rotation ? ` · xoay ${piece.rotation}°` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1 flex justify-between">
                          <IconButton label="Đưa lên" onClick={() => movePiece(piece.uid, -1)}>
                            <ChevronUp className="size-4" aria-hidden />
                          </IconButton>
                          <IconButton label="Đưa xuống" onClick={() => movePiece(piece.uid, 1)}>
                            <ChevronDown className="size-4" aria-hidden />
                          </IconButton>
                          <IconButton
                            label="Xoay 90 độ"
                            onClick={() => {
                              void import("@/lib/pdf-tools").then(({ nextRotation }) => {
                                setPieces((prev) =>
                                  prev.map((item) =>
                                    item.uid === piece.uid
                                      ? { ...item, rotation: nextRotation(item.rotation) }
                                      : item,
                                  ),
                                );
                              });
                            }}
                          >
                            <RotateCw className="size-4" aria-hidden />
                          </IconButton>
                          <IconButton
                            label="Bỏ trang"
                            onClick={() => setPieces((prev) => prev.filter((item) => item.uid !== piece.uid))}
                          >
                            <X className="size-4" aria-hidden />
                          </IconButton>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <div className="mt-4 flex flex-col gap-2">
                  <button type="button" className={primaryBtn} disabled={pieces.length === 0 || !!busy} onClick={() => void savePdf()}>
                    <Download className="size-4" aria-hidden />
                    Tải bản đã nối
                  </button>
                  <button
                    type="button"
                    className={quietBtn}
                    disabled={pieces.length === 0 || !!busy}
                    onClick={() => void saveZip(pieces, "ban-noi-tach.zip")}
                  >
                    Tách bản nối thành từng trang
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      )}

      {dragging ? (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-ink/50 p-6">
          <p className="rounded-card bg-sheet px-6 py-4 font-display text-3xl text-ink">Thả PDF vào đây</p>
        </div>
      ) : null}
    </div>
  );
}

function EmptyDesk({
  busy,
  onPick,
  onSample,
}: {
  busy: boolean;
  onPick: (list: FileList) => void;
  onSample: () => void;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-2 pb-12 sm:px-6">
      <div className="relative rounded-card border border-dashed border-line bg-sheet px-5 py-10 sm:px-10">
        <span className="absolute top-4 left-4 size-5 border-t-2 border-l-2 border-cut" />
        <span className="absolute top-4 right-4 size-5 border-t-2 border-r-2 border-cut" />
        <span className="absolute bottom-4 left-4 size-5 border-b-2 border-l-2 border-cut" />
        <span className="absolute right-4 bottom-4 size-5 border-r-2 border-b-2 border-cut" />
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl">Đặt file PDF lên bàn</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Kéo thả một hoặc nhiều file. Xem từng trang, giữ trang muốn cắt, rồi nối chúng thành file mới để tải về.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <FileButton className={primaryBtn} onPick={onPick}>
              <Plus className="size-4" aria-hidden />
              Chọn PDF
            </FileButton>
            <button type="button" className={quietBtn} onClick={onSample} disabled={busy}>
              <Files className="size-4" aria-hidden />
              Thử file mẫu
            </button>
          </div>
        </div>
        <ol className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Thêm PDF", "Một file để cắt, hoặc nhiều file để nối."],
            ["2", "Chọn trang", "Bấm, giữ Shift, hoặc gõ dải như 1-3, 5."],
            ["3", "Tải bản nối", "Đổi thứ tự, xoay trang, rồi lưu PDF mới."],
          ].map(([step, title, copy]) => (
            <li key={step} className="rounded-card border border-line bg-paper p-4 text-left">
              <p className="font-display text-2xl text-cut">{step}</p>
              <p className="mt-1 font-medium">{title}</p>
              <p className="mt-1 text-sm text-muted">{copy}</p>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}

function FileButton({
  className,
  onPick,
  children,
}: {
  className: string;
  onPick: (list: FileList) => void;
  children: ReactNode;
}) {
  return (
    <label className={clsx(className, "cursor-pointer")}>
      {children}
      <input
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        onChange={(event) => {
          const list = event.target.files;
          if (list && list.length > 0) onPick(list);
          event.target.value = "";
        }}
      />
    </label>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full text-ink hover:bg-sheet"
    >
      {children}
    </button>
  );
}

function Thumb({
  fileId,
  bytes,
  pageIndex,
}: {
  fileId: string;
  bytes: Uint8Array;
  pageIndex: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void import("@/lib/pdf-tools").then(({ renderThumb }) =>
          renderThumb(fileId, bytes, pageIndex).then(
            (url) => {
              if (!cancelled) setSrc(url);
            },
            () => {
              if (!cancelled) setFailed(true);
            },
          ),
        );
      },
      { rootMargin: "280px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [bytes, fileId, pageIndex]);

  return (
    <div
      ref={ref}
      className="flex aspect-3/4 items-center justify-center overflow-hidden rounded-md bg-line motion-reduce:transition-none"
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-contain" />
      ) : (
        <span className="px-1 text-center text-xs text-muted motion-reduce:animate-none">
          {failed ? "Không xem trước" : "Đang vẽ…"}
        </span>
      )}
    </div>
  );
}

function messageOf(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Có lỗi khi xử lý PDF.";
}

function stem(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 48);
}

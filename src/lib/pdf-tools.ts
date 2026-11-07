import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export type Rotation = 0 | 90 | 180 | 270;

export type PdfSource = {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
};

export type PdfPiece = {
  uid: string;
  fileId: string;
  pageIndex: number;
  rotation: Rotation;
};

type PdfjsModule = typeof import("pdfjs-dist");
type PdfDoc = Awaited<ReturnType<PdfjsModule["getDocument"]>["promise"]>;

const thumbs = new Map<string, string>();
const inflightThumbs = new Map<string, Promise<string>>();
const docs = new Map<string, Promise<PdfDoc>>();

let workerReady = false;
let activeRenders = 0;
const renderQueue: Array<() => void> = [];

function withSlot<T>(work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
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
  const lib = await import("pdfjs-dist");
  if (!workerReady) {
    lib.GlobalWorkerOptions.workerSrc = workerUrl;
    workerReady = true;
  }
  return lib;
}

async function docFor(fileId: string, bytes: Uint8Array): Promise<PdfDoc> {
  let pending = docs.get(fileId);
  if (!pending) {
    pending = (async () => {
      const lib = await loadPdfjs();
      const task = lib.getDocument({ data: bytes.slice() });
      return task.promise;
    })();
    pending.catch(() => {
      if (docs.get(fileId) === pending) docs.delete(fileId);
    });
    docs.set(fileId, pending);
  }
  return pending;
}

export function forgetPdf(fileId: string) {
  const pending = docs.get(fileId);
  docs.delete(fileId);
  for (const key of thumbs.keys()) {
    if (key.startsWith(`${fileId}:`)) thumbs.delete(key);
  }
  for (const key of inflightThumbs.keys()) {
    if (key.startsWith(`${fileId}:`)) inflightThumbs.delete(key);
  }
  pending?.then((doc) => {
    void doc.cleanup();
    void doc.loadingTask.destroy();
  }).catch(() => undefined);
}

export function renderThumb(
  fileId: string,
  bytes: Uint8Array,
  pageIndex: number,
): Promise<string> {
  const key = `${fileId}:${pageIndex}`;
  const cached = thumbs.get(key);
  if (cached) return Promise.resolve(cached);
  const pending = inflightThumbs.get(key);
  if (pending) return pending;

  const job = withSlot(async () => {
    const doc = await docFor(fileId, bytes);
    const page = await doc.getPage(pageIndex + 1);
    try {
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 320 / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const url = canvas.toDataURL("image/jpeg", 0.72);
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

export async function readPdfFile(file: File): Promise<Omit<PdfSource, "id">> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lib = await loadPdfjs();
  const task = lib.getDocument({ data: bytes.slice() });
  try {
    const doc = await task.promise;
    const pageCount = doc.numPages;
    await doc.cleanup();
    await task.destroy();
    if (pageCount < 1) throw new Error("File PDF không có trang nào.");
    return { name: file.name, bytes, pageCount };
  } catch (err) {
    throw toPdfError(err);
  }
}

export function parsePageRange(input: string, pageCount: number): number[] {
  const parts = input
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new Error("Nhập số trang, ví dụ 1-3, 5.");

  const result: number[] = [];
  const seen = new Set<number>();
  for (const part of parts) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    const single = /^(\d+)$/.exec(part);
    if (!range && !single) {
      throw new Error(`Không hiểu “${part}”. Dùng dạng 1-3, 5.`);
    }
    const from = Number(range ? range[1] : single?.[1]);
    const to = Number(range ? range[2] : single?.[1]);
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    if (lo < 1 || hi > pageCount) {
      throw new Error(`Trang phải từ 1 đến ${pageCount}.`);
    }
    for (let n = lo; n <= hi; n += 1) {
      if (seen.has(n)) continue;
      seen.add(n);
      result.push(n - 1);
    }
  }
  return result;
}

export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 90) % 360) as Rotation;
}

async function loadSource(bytes: Uint8Array) {
  const { PDFDocument } = await import("pdf-lib");
  try {
    return await PDFDocument.load(bytes.slice());
  } catch {
    return PDFDocument.load(bytes.slice(), { ignoreEncryption: true });
  }
}

export async function composePdf(files: PdfSource[], pieces: PdfPiece[]): Promise<Uint8Array> {
  if (pieces.length === 0) throw new Error("Bản nối chưa có trang nào.");
  const { PDFDocument, degrees } = await import("pdf-lib");
  const out = await PDFDocument.create();
  const loaded = new Map<string, Awaited<ReturnType<typeof loadSource>>>();

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

export async function zipPieces(files: PdfSource[], pieces: PdfPiece[]): Promise<Uint8Array> {
  if (pieces.length === 0) throw new Error("Chưa có trang để tách.");
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    if (!piece) continue;
    const bytes = await composePdf(files, [{ ...piece, rotation: piece.rotation }]);
    zip.file(pieceFileName(files, piece, index), bytes);
  }
  return zip.generateAsync({ type: "uint8array" });
}

export function downloadBytes(bytes: Uint8Array, filename: string, type: string) {
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

export async function buildSamples(): Promise<Array<Omit<PdfSource, "id">>> {
  const contract = await drawSample("HOP DONG", 4, [
    [0.77, 0.27, 0.18],
    [0.2, 0.34, 0.32],
    [0.45, 0.32, 0.18],
    [0.16, 0.16, 0.15],
  ]);
  const annex = await drawSample("PHU LUC", 2, [
    [0.18, 0.28, 0.45],
    [0.55, 0.22, 0.24],
  ]);
  return [
    { name: "hop-dong-mau.pdf", ...contract },
    { name: "phu-luc-mau.pdf", ...annex },
  ];
}

async function drawSample(
  label: string,
  count: number,
  tones: Array<[number, number, number]>,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const display = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);

  for (let index = 0; index < count; index += 1) {
    const page = doc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const tone = tones[index % tones.length] ?? [0.2, 0.2, 0.2];
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.97, 0.95, 0.91),
    });
    page.drawRectangle({
      x: 0,
      y: height - 36,
      width,
      height: 36,
      color: rgb(tone[0], tone[1], tone[2]),
    });
    page.drawText(String(index + 1).padStart(2, "0"), {
      x: 48,
      y: height / 2 - 36,
      size: 92,
      font: display,
      color: rgb(0.11, 0.1, 0.09),
    });
    page.drawText(`${label}  /  TRANG ${index + 1}`, {
      x: 48,
      y: 64,
      size: 14,
      font: body,
      color: rgb(0.35, 0.32, 0.28),
    });
  }

  return { bytes: await doc.save(), pageCount: doc.getPageCount() };
}

function pieceFileName(files: PdfSource[], piece: PdfPiece, index: number) {
  const file = files.find((item) => item.id === piece.fileId);
  const base = (file?.name ?? "tai-lieu")
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 48);
  const order = String(index + 1).padStart(2, "0");
  return `${order}-${base}-trang-${piece.pageIndex + 1}.pdf`;
}

function toPdfError(err: unknown): Error {
  if (isPasswordError(err)) {
    return new Error("File đang khóa mật khẩu. Hãy mở khóa rồi thử lại.");
  }
  return new Error("Không đọc được file PDF này.");
}

function isPasswordError(err: unknown) {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  const message = "message" in err ? String(err.message) : "";
  return name === "PasswordException" || /password/i.test(message);
}

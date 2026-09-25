// ============================================================
// lib/pdfEngine.ts
// SchoraHub — Fast, Compatibility-First PDF Engine
// ============================================================
//
// Centralizes what used to be copy-pasted PDF.js glue in
// ResourceDetailModal.tsx and SharedPdfViewer.tsx, and adds the pieces
// that make page-flipping feel instant instead of "wait for a re-render
// every time":
//
//   1. RENDERED-PAGE CACHE — once a page has been drawn to a canvas, that
//      canvas is kept (capped, LRU-ish) so flipping back to it is a single
//      drawImage() instead of a full PDF.js render pass.
//   2. BACKGROUND PREFETCH — right after the current page finishes, the
//      next (and previous) page renders quietly in the background via
//      requestIdleCallback, so by the time the learner taps "Next" it's
//      often already sitting in the cache.
//   3. PROGRESSIVE PAINT — the very first paint of a page happens at a
//      lower, cheap scale so something legible appears almost instantly,
//      then a full-quality pass swaps in a moment later. Feels fast,
//      still ends up sharp.
//   4. OLD-BROWSER SAFETY — plain <canvas> everywhere (no OffscreenCanvas
//      requirement), requestIdleCallback / devicePixelRatio / TextLayer
//      are all feature-detected with sane fallbacks so this keeps working
//      on older WebViews instead of throwing on first use.
//
// Every render call is cancellable: switching pages fast (flicking
// through) aborts the in-flight render for the page you left instead of
// letting it finish uselessly in the background.

let pdfjsInstance: any = null;
let workerUrlPromise: Promise<string> | null = null;

async function getPdfjsLib() {
  if (pdfjsInstance) return pdfjsInstance;
  const [lib, workerUrlMod] = await Promise.all([
    import("pdfjs-dist"),
    workerUrlPromise ?? (workerUrlPromise = import("pdfjs-dist/build/pdf.worker.min.mjs?url").then(m => m.default)),
  ]);
  lib.GlobalWorkerOptions.workerSrc = workerUrlMod;
  pdfjsInstance = lib;
  return lib;
}

// ── Document cache — keyed by URL, shared across every open reader ──────────
const docCache = new Map<string, Promise<any>>();

export async function getPdfDocument(url: string) {
  if (!docCache.has(url)) {
    const load = getPdfjsLib().then(lib =>
      // disableAutoFetch/disableStream stay default (false): PDF.js streams
      // and range-requests the file, so opening page 1 of a 40MB textbook
      // doesn't wait on the whole download — this is most of the "fast
      // loading" story for big files, before any of our own caching kicks in.
      lib.getDocument({ url, withCredentials: false }).promise
    );
    docCache.set(url, load);
  }
  return docCache.get(url)!;
}

// ── Adaptive quality cap ─────────────────────────────────────────────────────
// Full retina (devicePixelRatio) rendering on a low-memory/old device can
// make page turns noticeably slower. Scale the cap down on devices that
// report themselves as constrained; devicePixelRatio itself is undefined
// on some ancient browsers, so default sensibly.
function qualityCap(): number {
  const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
  const mem = (navigator as any)?.deviceMemory as number | undefined; // Chrome-only, may be undefined
  if (mem && mem <= 2) return Math.min(dpr, 1.5);
  if (mem && mem <= 4) return Math.min(dpr, 2);
  return Math.min(dpr, 3);
}

function idle(fn: () => void, timeout = 800) {
  if (typeof (window as any).requestIdleCallback === "function") {
    (window as any).requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 60); // old-browser fallback — still async, just not idle-aware
  }
}

// ── Per-page rendered-canvas cache (LRU-ish, capped) ─────────────────────────
type CacheKey = string; // `${docUrl}:${page}:${cssWidth}`
const pageCache = new Map<CacheKey, HTMLCanvasElement>();
const CACHE_LIMIT = 12; // ~a few chapters' worth of pages, bounded so memory doesn't creep

function cacheKey(docUrl: string, page: number, cssWidth: number): CacheKey {
  return `${docUrl}:${page}:${Math.round(cssWidth)}`;
}

function putInCache(key: CacheKey, canvas: HTMLCanvasElement) {
  if (pageCache.has(key)) pageCache.delete(key); // re-insert to bump recency
  pageCache.set(key, canvas);
  while (pageCache.size > CACHE_LIMIT) {
    const oldest = pageCache.keys().next().value;
    if (oldest === undefined) break;
    pageCache.delete(oldest);
  }
}

// ── Cancellation ──────────────────────────────────────────────────────────
// One token per (doc, target canvas). Bumping it tells any in-flight
// render for that canvas to stop touching it once done.
const renderTokens = new WeakMap<HTMLCanvasElement, number>();
function nextToken(canvas: HTMLCanvasElement) {
  const t = (renderTokens.get(canvas) ?? 0) + 1;
  renderTokens.set(canvas, t);
  return t;
}
function isStale(canvas: HTMLCanvasElement, token: number) {
  return renderTokens.get(canvas) !== token;
}

async function renderToOffscreen(doc: any, pageNum: number, cssWidth: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNum);
  const vp = page.getViewport({ scale: 1 });
  const cssScale = cssWidth / vp.width;
  const viewport = page.getViewport({ scale: cssScale * scale });

  const canvas = document.createElement("canvas"); // plain canvas — works on every browser, no OffscreenCanvas needed
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

function paint(target: HTMLCanvasElement, source: HTMLCanvasElement, dpr: number) {
  target.width = source.width;
  target.height = source.height;
  target.style.width = `${source.width / dpr}px`;
  target.style.height = `${source.height / dpr}px`;
  const ctx = target.getContext("2d")!;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0);
}

export interface RenderOptions {
  docUrl: string;
  onFirstPaint?: () => void; // fires after the cheap/fast pass lands
}

/**
 * Renders `pageNum` of `doc` onto `canvas`, sized to its parent's width.
 * Cache hit → instant draw. Cache miss → fast low-scale pass first (quick
 * to feel responsive), then a full-quality pass swaps in.
 */
export async function renderPage(doc: any, pageNum: number, canvas: HTMLCanvasElement, opts: RenderOptions): Promise<void> {
  const token = nextToken(canvas);
  const dpr = qualityCap();
  const cssWidth = canvas.parentElement?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
  const key = cacheKey(opts.docUrl, pageNum, cssWidth);

  const cached = pageCache.get(key);
  if (cached) {
    paint(canvas, cached, dpr);
    opts.onFirstPaint?.();
    return;
  }

  // Fast pass: scale 1 (CSS-resolution only, no DPR multiplier) — cheap to
  // rasterize even on a slow device, so something readable appears fast.
  const fast = await renderToOffscreen(doc, pageNum, cssWidth, 1);
  if (isStale(canvas, token)) return;
  paint(canvas, fast, 1);
  opts.onFirstPaint?.();

  if (dpr <= 1) {
    putInCache(key, fast);
    return;
  }

  // Sharp pass: full device-pixel-ratio quality, swapped in once ready.
  const sharp = await renderToOffscreen(doc, pageNum, cssWidth, dpr);
  if (isStale(canvas, token)) return;
  paint(canvas, sharp, dpr);
  putInCache(key, sharp);
}

/** Quietly renders a page into the cache without touching any visible canvas — used to prefetch neighbours. */
export function prefetchPage(doc: any, pageNum: number, docUrl: string, cssWidth: number) {
  if (pageNum < 1 || pageNum > doc.numPages) return;
  const dpr = qualityCap();
  const key = cacheKey(docUrl, pageNum, cssWidth);
  if (pageCache.has(key)) return;
  idle(() => {
    renderToOffscreen(doc, pageNum, cssWidth, dpr)
      .then(canvas => putInCache(key, canvas))
      .catch(() => { /* prefetch is best-effort — a failure here is invisible to the reader */ });
  });
}

// ── Text layer (selection, highlighting, and real text for TTS) ─────────────
// Feature-detected: some very old bundler/browser combos may not resolve
// the TextLayer export. When that happens we skip the text layer entirely
// — the canvas image still renders fine, the learner just loses
// highlighting/read-aloud on that device rather than the whole page.
export async function getPageText(doc: any, pageNum: number): Promise<string> {
  try {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    return content.items.map((it: any) => it.str ?? "").join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

export async function buildTextLayer(doc: any, pageNum: number, container: HTMLDivElement, cssWidth: number): Promise<boolean> {
  try {
    const lib = await getPdfjsLib();
    if (typeof lib.TextLayer !== "function") return false; // feature not available — degrade gracefully

    const page = await doc.getPage(pageNum);
    const vp = page.getViewport({ scale: 1 });
    const cssScale = cssWidth / vp.width;
    const viewport = page.getViewport({ scale: cssScale });

    container.innerHTML = "";
    container.style.setProperty("--scale-factor", String(viewport.scale));
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;

    const textLayer = new lib.TextLayer({
      textContentSource: page.streamTextContent(),
      container,
      viewport,
    });
    await textLayer.render();
    return true;
  } catch {
    return false;
  }
}

export function clearPdfCaches() {
  pageCache.clear();
  docCache.clear();
}

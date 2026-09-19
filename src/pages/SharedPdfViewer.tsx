import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { FileText, X, Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { takeSharedFile } from "@/lib/sharedFileStore";

// Standalone reader for a PDF that came from OUTSIDE SchoraHub — shared in
// from the phone's file manager (Android, via share_target in
// manifest.json) or opened directly on desktop (via file_handlers). Not
// tied to a marketplace resource, so no purchase/rating/download logic —
// just open it and let them read.

let pdfjsLib: any = null;
async function getPdf() {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = workerUrl;
  pdfjsLib = lib;
  return lib;
}

async function renderPage(doc: any, pageNum: number, canvas: HTMLCanvasElement) {
  const page = await doc.getPage(pageNum);
  const w = canvas.parentElement?.clientWidth || window.innerWidth;
  const vp = page.getViewport({ scale: 1 });
  const scale = w / vp.width;
  const scaled = page.getViewport({ scale });
  canvas.width = scaled.width;
  canvas.height = scaled.height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: scaled }).promise;
}

type LoadState = "loading" | "empty" | "error" | "ready";

export default function SharedPdfViewer() {
  const [, navigate] = useLocation();

  const [state,     setState]     = useState<LoadState>("loading");
  const [fileName,  setFileName]  = useState("Document.pdf");
  const [doc,       setDoc]       = useState<any>(null);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [rendering, setRendering] = useState(true);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const renderingRef = useRef(false);
  const objectUrlRef  = useRef<string | null>(null);

  const goToDocument = useCallback(async (blob: Blob, name: string) => {
    try {
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setFileName(name);
      const lib = await getPdf();
      const loaded = await lib.getDocument({ url, withCredentials: false }).promise;
      setDoc(loaded);
      setTotal(loaded.numPages);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  // Two ways a file can land here: desktop file-handling (window.launchQueue,
  // Chrome/Edge only) or the Android share-target flow, where the service
  // worker already stashed the file in IndexedDB before redirecting here.
  useEffect(() => {
    let handledByLaunchQueue = false;

    if ("launchQueue" in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams.files?.length) return;
        handledByLaunchQueue = true;
        const fileHandle = launchParams.files[0];
        const file = await fileHandle.getFile();
        goToDocument(file, file.name);
      });
    }

    // Give launchQueue a beat to fire before falling back to IndexedDB —
    // on desktop both could theoretically be present, but only one will
    // actually have a file waiting.
    const t = setTimeout(async () => {
      if (handledByLaunchQueue) return;
      const shared = await takeSharedFile();
      if (shared) {
        goToDocument(shared.file, shared.name);
      } else {
        setState("empty");
      }
    }, 150);

    return () => clearTimeout(t);
  }, [goToDocument]);

  useEffect(() => {
    return () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); };
  }, []);

  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    if (renderingRef.current) return;
    renderingRef.current = true;
    setRendering(true);
    renderPage(doc, page, canvasRef.current)
      .catch(() => setState("error"))
      .finally(() => { setRendering(false); renderingRef.current = false; });
  }, [doc, page]);

  const goTo = (p: number) => {
    if (!total || p < 1 || p > total || renderingRef.current) return;
    setPage(p);
  };

  const close = () => navigate("/");

  if (state === "loading") {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4"
        style={{ background: "linear-gradient(160deg,#0d0d1a 0%,#111128 60%,#0a0a14 100%)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        <p className="text-sm text-white/50">Opening document…</p>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 px-8"
        style={{ background: "linear-gradient(160deg,#0d0d1a 0%,#111128 60%,#0a0a14 100%)" }}>
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <FileText className="w-7 h-7 text-sky-400" />
        </div>
        <p className="text-sm text-white/60 font-medium text-center">No document was shared</p>
        <p className="text-xs text-white/30 text-center">Share a PDF to SchoraHub from your file manager to open it here.</p>
        <button onClick={close} className="px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-semibold">
          Back to SchoraHub
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 px-8"
        style={{ background: "linear-gradient(160deg,#0d0d1a 0%,#111128 60%,#0a0a14 100%)" }}>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400/60" />
        </div>
        <p className="text-sm text-white/50 font-medium text-center">Could not open this document</p>
        <button onClick={close} className="px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs font-semibold">
          Back to SchoraHub
        </button>
      </div>
    );
  }

  const progress = total ? (page / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col select-none"
      style={{ background: "linear-gradient(160deg,#0d0d1a 0%,#111128 60%,#0a0a14 100%)", touchAction: "pan-y" }}>

      <div className="absolute top-0 left-0 right-0 z-20">
        <div className="flex items-center gap-2.5 px-3 pt-10 pb-5"
          style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,transparent 100%)" }}>
          <button onClick={close}
            className="w-8 h-8 rounded-full bg-white/12 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform shrink-0">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-white/90 truncate">{fileName}</p>
            <p className="text-[9px] text-white/35">Opened from your device</p>
          </div>
          {total > 0 && (
            <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
              <span className="text-[10px] text-white/70 font-mono">{page}<span className="text-white/30">/{total}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {rendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span className="text-xs text-white/60">Page {page}</span>
            </div>
          </div>
        )}
        <div className="w-full h-full overflow-y-auto">
          <div className="px-1 py-2">
            <div className="rounded-xl overflow-hidden shadow-2xl"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.04)", opacity: rendering ? 0.4 : 1, transition: "opacity 0.2s ease" }}>
              <canvas ref={canvasRef} className="w-full block bg-white" />
            </div>
          </div>
        </div>
      </div>

      {total > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="px-4 pt-6 pb-8" style={{ background: "linear-gradient(to top,rgba(0,0,0,0.90) 0%,transparent 100%)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] text-white/30 font-mono w-4 text-right shrink-0">1</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(to right,#0284c7,#3b82f6)" }} />
              </div>
              <span className="text-[9px] text-white/30 font-mono shrink-0">{total}</span>
            </div>
            <div className="flex items-center justify-between">
              <button onClick={() => goTo(page - 1)} disabled={page <= 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <div className="flex flex-col items-center">
                <span className="text-white font-bold text-sm">{page}</span>
                <span className="text-white/30 text-[9px]">of {total}</span>
              </div>
              <button onClick={() => goTo(page + 1)} disabled={page >= total}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-25 active:scale-95 transition-all shadow-md"
                style={{ background: "linear-gradient(135deg,#0284c7,#3b82f6)" }}>
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

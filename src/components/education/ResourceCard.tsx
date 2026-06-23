import { useState, useEffect } from "react";
import { FileText, Download, Lock, Star, BadgeCheck, Eye, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const CAT_COLORS: Record<string, string> = {
  "Past Papers": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Textbooks":   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Notes":       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Research":    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "Other":       "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-300",
};

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb/1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

function PdfReaderModal({ resource, onClose }: { resource: any; onClose: () => void }) {
  const [url, setUrl]       = useState<string | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error,   setError] = useState("");

  useEffect(() => {
    supabase.storage.from("otechy-docs").createSignedUrl(resource.file_url, 600)
      .then(({ data, error: e }) => {
        if (e || !data) setError("Could not load file.");
        else setUrl(data.signedUrl);
        setLoad(false);
      });
  }, [resource.file_url]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-bold text-sm truncate">{resource.title}</p>
          <p className="text-[10px] text-muted-foreground">Reading inside app</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
        {loading && <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>}
        {error   && <div className="h-full flex items-center justify-center"><p className="text-sm text-muted-foreground">{error}</p></div>}
        {url && !loading && (
          <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className="w-full h-full border-0" title={resource.title} />
        )}
      </div>
    </div>
  );
}

interface Props {
  resource: any;
  isPurchased: boolean;
  onBuy: (r: any) => void;
  onDownload: (r: any) => void;
  onOpen: (r: any) => void;
}

export function ResourceCard({ resource, isPurchased, onBuy, onDownload, onOpen }: Props) {
  const [showReader,  setShowReader]  = useState(false);
  const [thumbUrl,    setThumbUrl]    = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  const isFree    = !resource.price || Number(resource.price) === 0;
  const canAccess = isFree || isPurchased;
  const size      = formatSize(resource.file_size);
  const hasRating = resource.review_count > 0;
  const isPdf     = resource.file_name?.toLowerCase().endsWith(".pdf");

  // Load signed thumbnail URL immediately on mount
  useEffect(() => {
    if (!resource.thumbnail_url) return;
    supabase.storage.from("otechy-docs")
      .createSignedUrl(resource.thumbnail_url, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setThumbUrl(data.signedUrl);
        else setThumbFailed(true);
      })
      .catch(() => setThumbFailed(true));
  }, [resource.thumbnail_url]);

  const showThumb = thumbUrl && !thumbFailed;

  return (
    <>
      <div onClick={() => onOpen(resource)}
        className="group relative flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 cursor-pointer active:scale-[0.98]">

        {/* ── Book cover / thumbnail ── */}
        <div className="relative w-full bg-gradient-to-br from-purple-900/30 to-blue-900/20"
          style={{ aspectRatio: "2/3", maxHeight: 180 }}>

          {showThumb ? (
            <img src={thumbUrl!} alt={resource.title}
              className="w-full h-full object-cover object-top"
              onError={() => setThumbFailed(true)} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
              <div className="w-12 h-14 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg border-l-4 border-purple-400">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
                {resource.category}
              </span>
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-1.5 left-1.5 right-1.5 flex justify-between">
            {showThumb && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
                {resource.category}
              </span>
            )}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${
              isFree ? "bg-emerald-500 text-white" : isPurchased ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
            }`}>
              {isFree ? "FREE" : isPurchased ? "OWNED" : `MK ${Number(resource.price).toLocaleString()}`}
            </span>
          </div>

          {/* Read/preview button */}
          {isPdf && (
            <button onClick={e => { e.stopPropagation(); setShowReader(true); }}
              className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/65 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full active:scale-90 transition-transform">
              <Eye className="w-3 h-3" /> Read
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="p-3 flex flex-col gap-2">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{resource.title}</h3>

          {resource.uploader_verified && (
            <div className="flex items-center gap-1">
              <BadgeCheck className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-medium">Verified</span>
            </div>
          )}

          {hasRating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[11px] font-semibold">{Number(resource.avg_rating).toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({resource.review_count})</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Download className="w-3 h-3" />
            <span>{resource.download_count ?? 0}</span>
            {size && <><span className="opacity-40">·</span><span>{size}</span></>}
          </div>

          {canAccess ? (
            <button onClick={e => { e.stopPropagation(); onDownload(resource); }}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.98] transition-all">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          ) : (
            <button onClick={e => { e.stopPropagation(); onBuy(resource); }}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.98] transition-all">
              <Lock className="w-3.5 h-3.5" /> Buy
            </button>
          )}
        </div>
      </div>

      {showReader && <PdfReaderModal resource={resource} onClose={() => setShowReader(false)} />}
    </>
  );
}

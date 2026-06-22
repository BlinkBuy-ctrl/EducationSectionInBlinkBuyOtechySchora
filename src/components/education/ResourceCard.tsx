import { useState } from "react";
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

// In-app PDF preview modal
function PdfPreviewModal({ resource, onClose }: { resource: any; onClose: () => void }) {
  const [url, setUrl]       = useState<string | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error,   setError] = useState("");

  useState(() => {
    supabase.storage.from("otechy-docs").createSignedUrl(resource.file_url, 300)
      .then(({ data, error }) => {
        if (error || !data) { setError("Could not load preview."); setLoad(false); return; }
        setUrl(data.signedUrl);
        setLoad(false);
      });
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex-1 min-w-0 mr-3">
          <p className="font-bold text-sm text-foreground truncate">{resource.title}</p>
          <p className="text-[10px] text-muted-foreground">Preview — first pages only</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        )}
        {error && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
        {url && !loading && (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&page=1`}
            className="w-full h-full border-0"
            title={resource.title}
          />
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
  const [showPreview, setShowPreview] = useState(false);
  const [thumbUrl,    setThumbUrl]    = useState<string | null>(null);
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbError,  setThumbError]  = useState(false);

  const isFree    = !resource.price || Number(resource.price) === 0;
  const canAccess = isFree || isPurchased;
  const size      = formatSize(resource.file_size);
  const hasRating = resource.review_count > 0;
  const isPdf     = resource.file_name?.toLowerCase().endsWith(".pdf");

  // Lazy-load thumbnail signed URL
  const loadThumb = () => {
    if (!resource.thumbnail_url || thumbUrl || thumbError) return;
    supabase.storage.from("otechy-docs")
      .createSignedUrl(resource.thumbnail_url, 3600)
      .then(({ data }) => {
        if (data?.signedUrl) setThumbUrl(data.signedUrl);
        else setThumbError(true);
      });
  };

  return (
    <>
      <div
        onClick={() => onOpen(resource)}
        onMouseEnter={loadThumb}
        onTouchStart={loadThumb}
        className="group relative flex flex-col gap-3 bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.98]"
      >
        {/* Thumbnail or fallback */}
        <div className="relative w-full bg-gradient-to-br from-purple-900/30 to-blue-900/20"
          style={{ aspectRatio: "3/4", maxHeight: 160 }}>
          {thumbUrl && !thumbError ? (
            <img
              src={thumbUrl}
              alt={resource.title}
              onLoad={() => setThumbLoaded(true)}
              onError={() => setThumbError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${thumbLoaded ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
                {resource.category}
              </span>
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1">
            {thumbUrl && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
                {resource.category}
              </span>
            )}
            {isFree
              ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white ml-auto">FREE</span>
              : isPurchased
              ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white ml-auto">OWNED</span>
              : null}
          </div>

          {/* Preview button for PDFs */}
          {isPdf && canAccess && (
            <button
              onClick={e => { e.stopPropagation(); setShowPreview(true); }}
              className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Card body */}
        <div className="px-3 pb-3 flex flex-col gap-2">
          <div>
            <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{resource.title}</h3>
            {resource.uploader_verified && (
              <div className="flex items-center gap-1 mt-0.5">
                <BadgeCheck className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-blue-400 font-medium">Verified</span>
              </div>
            )}
          </div>

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
            <span className="ml-auto font-bold text-sm text-foreground">
              {isFree ? "Free" : `MK ${Number(resource.price).toLocaleString()}`}
            </span>
          </div>

          {canAccess ? (
            <button onClick={e => { e.stopPropagation(); onDownload(resource); }}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-sm">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          ) : (
            <button onClick={e => { e.stopPropagation(); onBuy(resource); }}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-xs font-semibold py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-sm">
              <Lock className="w-3.5 h-3.5" /> Buy · MK {Number(resource.price).toLocaleString()}
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        <PdfPreviewModal resource={resource} onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}

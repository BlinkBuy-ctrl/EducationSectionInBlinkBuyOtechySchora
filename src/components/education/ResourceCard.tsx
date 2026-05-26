import { FileText, Download, Lock, Star, BadgeCheck } from "lucide-react";

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

interface ResourceCardProps {
  resource: any;
  isPurchased: boolean;
  onBuy: (r: any) => void;
  onDownload: (r: any) => void;
  onOpen: (r: any) => void;   // opens detail modal
}

export function ResourceCard({ resource, isPurchased, onBuy, onDownload, onOpen }: ResourceCardProps) {
  const isFree    = !resource.price || Number(resource.price) === 0;
  const canAccess = isFree || isPurchased;
  const size      = formatSize(resource.file_size);
  const hasRating = resource.review_count > 0;

  return (
    <div
      onClick={() => onOpen(resource)}
      className="group relative flex flex-col gap-3 bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden cursor-pointer active:scale-[0.98]"
    >
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />

      {/* Top badges */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[80px] ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
          {resource.category}
        </span>
        {isFree
          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">FREE</span>
          : isPurchased
          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">OWNED</span>
          : null
        }
      </div>

      {/* Icon + title */}
      <div className="flex gap-2.5 items-start">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <FileText className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">{resource.title}</h3>
          {/* Uploader verified badge inline */}
          {resource.uploader_verified && (
            <div className="flex items-center gap-1 mt-0.5">
              <BadgeCheck className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] text-blue-400 font-medium">Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Rating row */}
      {hasRating && (
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-[11px] font-semibold text-foreground">{Number(resource.avg_rating).toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">({resource.review_count})</span>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto">
        <Download className="w-3 h-3" />
        <span>{resource.download_count ?? 0}</span>
        {size && <><span className="text-muted-foreground/50">·</span><span>{size}</span></>}
        <span className="ml-auto font-bold text-sm text-foreground">
          {isFree ? "Free" : `MK ${Number(resource.price).toLocaleString()}`}
        </span>
      </div>

      {/* CTA */}
      {canAccess ? (
        <button
          onClick={e => { e.stopPropagation(); onDownload(resource); }}
          className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </button>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); onBuy(resource); }}
          className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-sm"
        >
          <Lock className="w-3.5 h-3.5" /> Buy · MK {Number(resource.price).toLocaleString()}
        </button>
      )}
    </div>
  );
}

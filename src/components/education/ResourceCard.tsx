import { FileText, Download, Lock, Eye } from "lucide-react";

interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  file_name: string;
  file_size?: number;
  download_count: number;
}

interface ResourceCardProps {
  resource: Resource;
  isPurchased: boolean;
  onBuy: (resource: Resource) => void;
  onDownload: (resource: Resource) => void;
}

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
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

export function ResourceCard({ resource, isPurchased, onBuy, onDownload }: ResourceCardProps) {
  const isFree = !resource.price || resource.price === 0;
  const canAccess = isFree || isPurchased;
  const size = formatSize(resource.file_size);

  return (
    <div className="group relative flex flex-col gap-3 bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Subtle glow top-right */}
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />

      {/* Top row: category + free badge */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CAT_COLORS[resource.category] ?? CAT_COLORS["Other"]}`}>
          {resource.category}
        </span>
        {isFree ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            FREE
          </span>
        ) : isPurchased ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            OWNED
          </span>
        ) : null}
      </div>

      {/* Icon + title */}
      <div className="flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
            {resource.title}
          </h3>
          {resource.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
              {resource.description}
            </p>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          {resource.download_count ?? 0}
        </span>
        {size && <span className="text-muted-foreground/60">·</span>}
        {size && <span>{size}</span>}
        <span className="ml-auto font-bold text-sm text-foreground">
          {isFree ? "Free" : `MK ${Number(resource.price).toLocaleString()}`}
        </span>
      </div>

      {/* CTA */}
      {canAccess ? (
        <button
          onClick={() => onDownload(resource)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      ) : (
        <button
          onClick={() => onBuy(resource)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-sm"
        >
          <Lock className="w-3.5 h-3.5" />
          Buy · MK {Number(resource.price).toLocaleString()}
        </button>
      )}
    </div>
  );
}

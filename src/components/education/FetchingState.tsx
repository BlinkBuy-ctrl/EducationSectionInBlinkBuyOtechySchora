import type { LucideIcon } from "lucide-react";

interface FetchingStateProps {
  /** Icon shown at the center of the spinning ring. */
  icon: LucideIcon;
  /** Text shown under the icon, e.g. "Fetching resources". Animated dots are added automatically. */
  label: string;
  /** Tailwind bg class for the icon chip, e.g. "bg-sky-500/10". */
  accentBg: string;
  /** Tailwind text class for the icon, e.g. "text-sky-400". */
  accentText: string;
  /** Tailwind border-top color class for the spinning ring, e.g. "border-t-sky-500". */
  ringColor: string;
  /** How many shimmer placeholder cards to show under the indicator. */
  skeletonCount?: number;
  /** Tailwind height class for each placeholder card. */
  skeletonHeight?: string;
  /** "grid" for a 2-col resource/audiobook grid, "list" for stacked rows (tutors, jobs, scholarships). */
  layout?: "grid" | "list";
  /** When true, shows only the icon + label (no shimmer placeholder cards) — for smaller loading spots like carousels. */
  compact?: boolean;
}

/**
 * Animated "fetching data" indicator: a spinning ring around a section icon,
 * a label with animated dots, and shimmer placeholder cards underneath.
 * Used anywhere the app is fetching resources/audiobooks/scholarships/tutors/jobs
 * so the user sees "this is loading" instead of a flash of an empty state.
 */
export function FetchingState({
  icon: Icon,
  label,
  accentBg,
  accentText,
  ringColor,
  skeletonCount = 6,
  skeletonHeight = "h-48",
  layout = "grid",
  compact = false,
}: FetchingStateProps) {
  return (
    <div className={`flex flex-col gap-4 ${compact ? "py-4" : ""}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-2.5 py-2 text-center">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className={`fetch-ring absolute inset-0 rounded-full border-2 border-transparent ${ringColor}`} />
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentBg}`}>
            <Icon className={`w-4 h-4 ${accentText}`} />
          </div>
        </div>
        <p className="text-xs font-semibold text-muted-foreground">
          {label}
          <span className="fetch-dot" style={{ animationDelay: "0ms" }}>.</span>
          <span className="fetch-dot" style={{ animationDelay: "160ms" }}>.</span>
          <span className="fetch-dot" style={{ animationDelay: "320ms" }}>.</span>
        </p>
      </div>

      {!compact && (
        <div className={layout === "grid" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className={`${skeletonHeight} rounded-2xl skeleton`}
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

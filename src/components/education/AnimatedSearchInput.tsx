import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface AnimatedSearchInputProps {
  value: string;
  onChange: (v: string) => void;
  /** Rotating hint phrases shown when the field is empty, e.g. "Search Physics…" */
  phrases: string[];
  /** Tailwind focus ring class, e.g. "focus:ring-purple-500/50" */
  ringColorClass?: string;
  /** Extra classes on the outer wrapper (use for flex-1 etc.) */
  className?: string;
  /** Extra classes on the <input> itself */
  inputClassName?: string;
  showClear?: boolean;
  /** How long each phrase stays on screen before rotating, in ms */
  intervalMs?: number;
  ariaLabel?: string;
}

/**
 * A search input whose placeholder cycles through a list of example phrases
 * (e.g. "Search Physics…" → "Search Agriculture…" → "Fawema Scholarships…")
 * whenever the field is empty. Purely cosmetic/UX — it does not fetch or
 * scrape anything, it just rotates through the words passed in via `phrases`.
 */
export function AnimatedSearchInput({
  value,
  onChange,
  phrases,
  ringColorClass = "focus:ring-purple-500/50",
  className = "",
  inputClassName = "",
  showClear = true,
  intervalMs = 2600,
  ariaLabel = "Search",
}: AnimatedSearchInputProps) {
  const safePhrases = phrases.length > 0 ? phrases : ["Search…"];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (safePhrases.length <= 1) return;
    timerRef.current = setInterval(() => {
      setVisible(false);
      fadeRef.current = setTimeout(() => {
        setIdx(i => (i + 1) % safePhrases.length);
        setVisible(true);
      }, 280);
    }, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePhrases.length, intervalMs]);

  const showAnimated = !value;

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={showAnimated ? "" : undefined}
        aria-label={ariaLabel}
        className={`w-full bg-background border border-border rounded-xl pl-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${ringColorClass} ${showClear && value ? "pr-8" : "pr-3"} ${inputClassName}`}
      />
      {showAnimated && (
        <span
          aria-hidden="true"
          className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none select-none transition-opacity duration-300 truncate max-w-[80%]"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {safePhrases[idx]}
        </span>
      )}
      {showClear && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
          aria-label="Clear search"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

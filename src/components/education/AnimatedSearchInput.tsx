import { useEffect, useMemo, useRef, useState } from "react";
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
  /**
   * Pool of known terms (titles, categories, tags, names…) already loaded
   * client-side (no network calls) to autocomplete against. As the person
   * types, matching entries show up in a dropdown, like browser/Copilot
   * search suggestions — tapping one fills the field.
   */
  suggestionPool?: string[];
  maxSuggestions?: number;
}

/**
 * A search input whose placeholder cycles through a list of example phrases
 * (e.g. "Search Physics…" → "Search Agriculture…" → "Fawema Scholarships…")
 * whenever the field is empty, and optionally shows a live autocomplete
 * dropdown built from a client-side suggestion pool as the person types.
 * Purely cosmetic/UX — nothing here fetches or scrapes anything.
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
  suggestionPool = [],
  maxSuggestions = 6,
}: AnimatedSearchInputProps) {
  const safePhrases = phrases.length > 0 ? phrases : ["Search…"];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [focused, setFocused] = useState(false);
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

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || suggestionPool.length === 0) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of suggestionPool) {
      if (!s) continue;
      const low = s.toLowerCase();
      if (low === q) continue; // don't suggest an exact match of what's already typed
      if (low.includes(q) && !seen.has(low)) {
        seen.add(low);
        out.push(s);
        if (out.length >= maxSuggestions) break;
      }
    }
    return out;
  }, [value, suggestionPool, maxSuggestions]);

  const showDropdown = focused && suggestions.length > 0;

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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
      {showDropdown && (
        <div
          onMouseDown={e => e.preventDefault()} // keep input focused so onClick below fires before blur closes the dropdown
          className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
        >
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setFocused(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 text-left transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


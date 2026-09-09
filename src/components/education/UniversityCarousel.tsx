import { useEffect, useRef, useState } from "react";
import { School } from "lucide-react";
import type { University } from "@/lib/universities";

interface Props {
  universities: University[];
  onOpen: (u: University) => void;
  title?: string;
}

const AUTO_SCROLL_SPEED = 0.45; // px per animation frame
const RESUME_DELAY_MS = 3000; // idle time before auto-scroll resumes

function MiniUniversityCard({ u, onOpen }: { u: University; onOpen: (u: University) => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showLogo = !!u.logo_url && !imgFailed;

  return (
    <div
      onClick={() => onOpen(u)}
      className="snap-start shrink-0 w-[124px] flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-3.5 active:scale-[0.97] transition-all cursor-pointer"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
        {showLogo ? (
          <img src={u.logo_url!} alt={u.name} className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <School className="w-7 h-7 text-sky-400" />
        )}
      </div>
      <p className="text-xs font-bold text-foreground text-center line-clamp-2 leading-snug">{u.name}</p>
    </div>
  );
}

export function UniversityCarousel({ universities, onOpen, title = "Browse Universities" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Duplicate the list so the loop reset is invisible — once we scroll
  // past the first copy we snap scrollLeft back by exactly its width.
  const loopList = universities.length ? [...universities, ...universities] : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || universities.length === 0) return;

    const step = () => {
      if (!pausedRef.current) {
        el.scrollLeft += AUTO_SCROLL_SPEED;
        const singleSetWidth = el.scrollWidth / 2;
        if (singleSetWidth > 0 && el.scrollLeft >= singleSetWidth) {
          el.scrollLeft -= singleSetWidth;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [universities.length]);

  if (!universities.length) return null;

  const pauseNow = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };
  const scheduleResume = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_DELAY_MS);
  };

  return (
    <div className="-mx-4 px-4 py-1">
      <p className="font-bold text-sm text-foreground mb-2">{title}</p>
      <div
        ref={scrollRef}
        onPointerDown={pauseNow}
        onPointerUp={scheduleResume}
        onPointerCancel={scheduleResume}
        onTouchStart={pauseNow}
        onTouchEnd={scheduleResume}
        onWheel={() => {
          pauseNow();
          scheduleResume();
        }}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide"
      >
        {loopList.map((u, i) => (
          <MiniUniversityCard key={`${u.id}-${i}`} u={u} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

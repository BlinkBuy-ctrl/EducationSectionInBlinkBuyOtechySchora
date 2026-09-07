import { useRef } from "react";
import { Award, Calendar, ChevronRight, Shield, Check } from "lucide-react";

interface Props {
  scholarships: any[];
  onOpen: (s: any) => void;
  onSeeAll: () => void;
}

function ScholarshipMiniCard({ s, onOpen }: { s: any; onOpen: (s: any) => void }) {
  return (
    <div
      onClick={() => onOpen(s)}
      className="snap-start shrink-0 w-[62%] xs:w-[56%] sm:w-[42%] max-w-[220px] bg-card border border-border rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform shadow-sm"
    >
      {/* Featured visual on top — real scholarship banner, gradient fallback if none */}
      <div className="relative w-full bg-muted/30" style={{ height: 96 }}>
        {s.image_url ? (
          <>
            <img src={s.image_url} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40" />
            <img src={s.image_url} alt={s.title} className="relative w-full h-full object-contain" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        )}
        {s.amount && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300">
            {s.amount}
          </span>
        )}
      </div>

      <div className="p-2.5">
        <div className="flex items-center gap-1">
          <h4 className="font-bold text-[11.5px] text-foreground leading-snug line-clamp-2 flex-1">{s.title}</h4>
          {s.is_verified && (
            <span className="relative w-3 h-3 shrink-0 flex items-center justify-center">
              <Shield className="w-3 h-3 text-blue-600 fill-blue-600" />
              <Check className="w-1.5 h-1.5 text-white absolute" strokeWidth={3.5} />
            </span>
          )}
        </div>
        <p className="text-[10px] text-yellow-500 font-semibold truncate mt-0.5">{s.provider}</p>
        {s.deadline && (
          <p className="flex items-center gap-1 text-[9px] text-muted-foreground mt-1">
            <Calendar className="w-2.5 h-2.5" />
            {new Date(s.deadline).toLocaleDateString("en-MW", { day: "numeric", month: "short" })}
          </p>
        )}
        <div className="mt-2 text-[10px] font-bold text-sky-500 flex items-center gap-0.5">
          Apply <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

export function ScholarshipCarousel({ scholarships, onOpen, onSeeAll }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!scholarships.length) return null;

  const nudge = () => {
    scrollRef.current?.scrollBy({ left: 180, behavior: "smooth" });
  };

  return (
    <div className="-mx-4 px-4 py-1 mb-1 relative" data-tour="scholarship-carousel">
      <div className="flex items-center justify-between mb-2 px-0">
        <p className="flex items-center gap-1.5 font-bold text-sm text-foreground">
          <Award className="w-4 h-4 text-yellow-500" /> Scholarships For You
        </p>
        <button onClick={onSeeAll} className="text-[11px] font-semibold text-sky-500">
          See all
        </button>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth pb-1"
        >
          {scholarships.slice(0, 12).map(s => (
            <ScholarshipMiniCard key={s.id} s={s} onOpen={onOpen} />
          ))}
        </div>

        {/* Visual cue that more cards are scrollable to the right */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-background to-transparent" />
        <button
          onClick={nudge}
          aria-label="Scroll scholarships"
          className="pointer-events-auto absolute right-0.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

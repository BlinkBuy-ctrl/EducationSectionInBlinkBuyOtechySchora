import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, ReactNode } from "react";
import { safeGetItem, safeSetItem } from "@/lib/storage";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeamMember {
  name: string;
  fullName: string;
  role: string;
  photo: string;
  initials: string;
  isFounder?: boolean;
  accent: string;
  accentFrom: string;
  accentTo: string;
  bio: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const teamMembers: TeamMember[] = [
  {
    name: "Peter",
    fullName: "Peter Mlandula",
    role: "Founder & Lead Developer",
    photo: "/ceo.jpg",
    initials: "PM",
    isFounder: true,
    accent: "#0284c7",
    accentFrom: "#0284c7",
    accentTo: "#3B82F6",
    bio: "Self-taught from the ground up. Built SchoraHub to solve the resource problem he lived through himself.",
  },
  {
    name: "Theodora",
    fullName: "Theodora Liva",
    role: "Marketing Manager",
    photo: "/theo.jpg",
    initials: "TL",
    accent: "#DB2777",
    accentFrom: "#DB2777",
    accentTo: "#0284c7",
    bio: "Brings the OTECHY story to the world with precision and creative instinct.",
  },
  {
    name: "Elisha",
    fullName: "Elisha Mkango",
    role: "Software Developer",
    photo: "/elisha.jpg",
    initials: "EM",
    accent: "#2563EB",
    accentFrom: "#2563EB",
    accentTo: "#0891B2",
    bio: "Ensures every line of code is tested, polished, and ready for real users.",
  },
  {
    name: "Elijah",
    fullName: "Elijah Mkango",
    role: "Security Manager",
    photo: "/elijah.jpg",
    initials: "EJ",
    accent: "#059669",
    accentFrom: "#059669",
    accentTo: "#2563EB",
    bio: "Guards the platform so students can learn without worrying about what's underneath.",
  },
];

const CAROUSEL_HINT_KEY = "otechy_team_carousel_hint_enabled";

/** Fires onTriple only after exactly 3 taps land within 650ms of each other. */
function handleTripleTap(stateRef: MutableRefObject<{ count: number; timer: ReturnType<typeof setTimeout> | null }>, onTriple: () => void) {
  const state = stateRef.current;
  state.count += 1;
  if (state.timer) clearTimeout(state.timer);
  if (state.count >= 3) {
    state.count = 0;
    onTriple();
  } else {
    state.timer = setTimeout(() => { state.count = 0; }, 650);
  }
}

// ─── Reveal ───────────────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(20px)",
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-sky-200" />
      <p className="text-[9px] font-black tracking-[0.35em] uppercase text-sky-400">{children}</p>
      <div className="h-px flex-1 bg-sky-200" />
    </div>
  );
}

// ─── Team Carousel ────────────────────────────────────────────────────────────
function TeamCarousel({ members }: { members: TeamMember[] }) {
  const [active, setActive] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);
  const [imgErr, setImgErr] = useState(false);

  const goTo = (i: number) => setActive(Math.max(0, Math.min(members.length - 1, i)));

  useEffect(() => { setImgErr(false); }, [active]);

  // ── Auto-advance "scroll hint" ─────────────────────────────────────
  // Slowly cycles through team members on its own, bouncing back at the
  // ends, as a hint that the card is browsable. Pauses on manual
  // swipe/drag, resumes after a short idle period, and can be toggled
  // on/off with a triple-tap on the card.
  const [hintEnabled, setHintEnabled] = useState(() => {
    const saved = safeGetItem(CAROUSEL_HINT_KEY);
    return saved === null ? true : saved === "1";
  });
  const pausedRef = useRef(false);
  const dirRef = useRef(1);
  const tapState = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null });

  useEffect(() => {
    if (!hintEnabled) return;
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      setActive(prev => {
        let next = prev + dirRef.current;
        if (next >= members.length - 1) { next = members.length - 1; dirRef.current = -1; }
        else if (next <= 0) { next = 0; dirRef.current = 1; }
        return next;
      });
    }, 3200);
    return () => clearInterval(interval);
  }, [hintEnabled, members.length]);

  const pauseHint = () => {
    pausedRef.current = true;
    setTimeout(() => { pausedRef.current = false; }, 4000);
  };

  const handleCardTap = () => handleTripleTap(tapState, () => {
    setHintEnabled(prev => {
      const next = !prev;
      safeSetItem(CAROUSEL_HINT_KEY, next ? "1" : "0");
      return next;
    });
  });

  const m = members[active];

  return (
    <div className="select-none">
      {/* Card — data-no-swipe stops the page's swipe-between-tabs from
          firing when someone swipes through the team. */}
      <div
        data-no-swipe
        className="rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ background: "#fff", border: `1.5px solid ${m.accent}25`, boxShadow: `0 4px 24px rgba(0,0,0,0.08), 0 1px 4px ${m.accent}18` }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; dragging.current = true; pauseHint(); }}
        onTouchEnd={(e) => {
          if (!dragging.current) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
          else handleCardTap();
          dragging.current = false;
        }}
        onMouseDown={(e) => { startX.current = e.clientX; dragging.current = true; pauseHint(); }}
        onMouseUp={(e) => {
          if (!dragging.current) return;
          const dx = e.clientX - startX.current;
          if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
          else handleCardTap();
          dragging.current = false;
        }}
      >
        {/* Accent top bar */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${m.accentFrom}, ${m.accentTo})` }} />

        {/* Photo */}
        <div className="relative" style={{ height: 360 }}>
          {!imgErr ? (
            <img
              src={m.photo}
              alt={m.fullName}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover object-top"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-sky-50">
              <span className="text-8xl font-black select-none" style={{ color: m.accent + "40" }}>{m.initials}</span>
            </div>
          )}

          {/* Soft gradient at bottom */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.4) 35%, transparent 65%)" }} />

          {/* Founder badge */}
          {m.isFounder && (
            <div className="absolute top-3.5 left-3.5">
              <span
                className="text-[9px] font-black tracking-[0.25em] uppercase px-3 py-1.5 rounded-full"
                style={{ background: m.accent, color: "#fff" }}
              >
                ★ Founder
              </span>
            </div>
          )}

          {/* Nav arrows */}
          <div className="absolute bottom-3.5 right-3.5 flex gap-2 z-10">
            <button
              onClick={() => { pauseHint(); goTo(active - 1); }}
              disabled={active === 0}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity bg-white shadow-sm border border-slate-100"
              style={{ opacity: active === 0 ? 0.3 : 1 }}
              aria-label="Previous"
            >
              <ChevronLeft size={16} className="text-slate-500" />
            </button>
            <button
              onClick={() => { pauseHint(); goTo(active + 1); }}
              disabled={active === members.length - 1}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity bg-white shadow-sm border border-slate-100"
              style={{ opacity: active === members.length - 1 ? 0.3 : 1 }}
              aria-label="Next"
            >
              <ChevronRight size={16} className="text-slate-500" />
            </button>
          </div>

          {/* Name on photo */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <p className="font-black text-xl tracking-tight leading-tight" style={{ color: m.accent }}>
              {m.fullName}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="px-5 pt-4 pb-5">
          <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-2.5" style={{ color: m.accent }}>{m.role}</p>
          <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{m.bio}</p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {members.map((mem, i) => (
          <button
            key={i}
            onClick={() => { pauseHint(); goTo(i); }}
            aria-label={`Go to ${mem.name}`}
            className="rounded-full transition-all duration-300"
            style={{ width: i === active ? 20 : 7, height: 7, background: i === active ? m.accent : "#DDD6FE" }}
          />
        ))}
      </div>
      <p className="text-center text-[10px] text-slate-400 font-medium mt-2">
        ← swipe to meet the team → {hintEnabled ? "" : "· auto-play off"}
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface AboutUsProps {
  onBack?: () => void;
}

export default function AboutUs({ onBack }: AboutUsProps) {
  return (
    <div className="relative min-h-screen" style={{ background: "#F9F7FF" }}>

      {/* ── Watermark: faint Otechy logo behind everything ───────────────
          "multiply" makes the logo's white background disappear into the
          page colour, so only the artwork shows, very softly. Change
          `opacity` to make it fainter (0.04) or stronger (0.12). */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: "url(/otechy.jpg)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "min(78vw, 420px)",
          opacity: 0.07,
          mixBlendMode: "multiply",
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{ background: "rgba(249,247,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid #f0f9ff" }}
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm active:scale-90 transition-transform"
            >
              <ArrowLeft size={16} className="text-slate-500" />
            </button>
          )}

          {/* Logo */}
          <img
            src="/otechy.jpg"
            alt="OTECHY"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget.nextElementSibling as HTMLElement;
              if (fb) fb.style.display = "flex";
            }}
          />
          <div className="items-center gap-2" style={{ display: "none" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0284c7, #3B82F6)" }}>
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-[13px] font-black text-slate-800 tracking-tight">OTECHY</span>
          </div>

          <span
            className="ml-auto text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: "#f0f9ff", color: "#0284c7" }}
          >
            Est. 2025
          </span>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto" style={{ zIndex: 1 }}>

        {/* ════════════ OUR STORY ════════════ */}
        <section className="px-4 pt-9 pb-12">
          <Reveal><SectionLabel>Our Story</SectionLabel></Reveal>

          <Reveal delay={40}>
            <h2 className="text-2xl font-black tracking-tight text-slate-800 mb-4 leading-tight">
              Born in a{" "}
              <span style={{ background: "linear-gradient(135deg, #0284c7, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                school holiday.
              </span>
            </h2>
          </Reveal>

          <Reveal delay={70}>
            <p className="text-[13.5px] text-slate-600 leading-relaxed font-medium mb-4">
              A small group of self-taught students from Malawi decided to learn technology — Python first, then
              JavaScript, then React — through slow internet, late nights, and projects that failed before they
              worked. That group became <span className="font-black text-sky-600">OTECHY</span>.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="pl-4 py-1" style={{ borderLeft: "3px solid #0284c7" }}>
              <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">
                "I used to struggle to access books because of limited resources — but internet and phones were
                always around. So I asked: what if all learning resources were online? That question became{" "}
                <span className="font-black not-italic text-sky-600">SchoraHub.</span>"
              </p>
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-sky-500 mt-2">— Peter Mlandula, Founder</p>
            </div>
          </Reveal>
        </section>

        {/* ════════════ MISSION ════════════ */}
        <section className="px-4 pb-8">
          <Reveal><SectionLabel>Mission</SectionLabel></Reveal>

          <Reveal delay={40}>
            <div className="rounded-2xl p-5 border border-sky-100 shadow-sm" style={{ background: "rgba(255,255,255,0.75)" }}>
              <p className="text-[15px] text-slate-700 font-bold leading-snug">
                Free access to books, tutors, and scholarships — so every Malawian student can{" "}
                <span className="text-sky-600">unlock their potential</span>, no matter their{" "}
                <span className="text-blue-600">geography or income.</span>
              </p>
            </div>
          </Reveal>
        </section>

        {/* ════════════ VISION ════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Vision</SectionLabel></Reveal>

          <Reveal delay={40}>
            <div className="rounded-2xl p-5 border border-sky-100 shadow-sm" style={{ background: "rgba(255,255,255,0.75)" }}>
              <h3 className="text-lg font-black tracking-tight text-slate-800 leading-tight mb-2">
                No more <span className="text-sky-600">"I didn't have the content."</span>
              </h3>
              <p className="text-[13.5px] text-slate-600 leading-relaxed font-medium">
                We see a Malawi where no student can blame missing content for falling behind. When books, tutors
                and opportunities are always within reach, the only thing left between a student and success is
                the student. In an age full of technology, we're here to make student life easier — so effort,
                not access, makes the difference.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ════════════ MEET THE TEAM ════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Meet the Team</SectionLabel></Reveal>

          <Reveal delay={40}>
            <h2 className="text-xl font-black tracking-tight text-slate-800 mb-6 leading-tight">
              Real people.{" "}
              <span className="text-slate-400 italic font-black">Building something real.</span>
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <TeamCarousel members={teamMembers} />
          </Reveal>
        </section>

        {/* ════════════ CONTACT ════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Contact</SectionLabel></Reveal>

          <Reveal delay={40}>
            <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm" style={{ background: "rgba(255,255,255,0.85)" }}>
              <a href="mailto:otechy8@gmail.com" className="flex items-center gap-4 px-5 py-4 active:bg-slate-50 border-b border-slate-50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-sky-50">
                  <Mail size={16} className="text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-400 mb-0.5">Email</p>
                  <p className="text-[13px] font-bold text-slate-700 truncate">otechy8@gmail.com</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
              </a>

              {[{ number: "0888258180", label: "Main" }, { number: "0888712272", label: "Support" }, { number: "0999626944", label: "Alt" }].map((phone, i, arr) => (
                <a
                  key={phone.number}
                  href={`tel:${phone.number}`}
                  className="flex items-center gap-4 px-5 py-4 active:bg-slate-50"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid #F8FAFC" : "none" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <Phone size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-400 mb-0.5">{phone.label}</p>
                    <p className="text-[13px] font-bold text-slate-700">{phone.number}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal delay={70}>
            <div className="mt-3 flex items-center gap-4 rounded-2xl px-5 py-4 border border-emerald-100 shadow-sm" style={{ background: "rgba(255,255,255,0.85)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50">
                <MapPin size={16} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-500 mb-0.5">Based in</p>
                <p className="text-[13px] font-bold text-slate-700">Malawi 🇲🇼</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ════════════ FOOTER ════════════ */}
        <footer className="px-4 pb-10 pt-4 text-center border-t border-slate-100">
          <Reveal>
            <p className="text-[11px] text-slate-400 font-semibold mt-4">Made with care in Malawi 🇲🇼</p>
            <p className="text-[10px] text-slate-300 font-medium mt-1">© {new Date().getFullYear()} Otechy · All rights reserved</p>
          </Reveal>
        </footer>

      </main>
    </div>
  );
}

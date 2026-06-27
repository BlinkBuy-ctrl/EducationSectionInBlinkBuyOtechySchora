import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Shield,
  Code2,
  Megaphone,
  TestTube,
  Palette,
  Sparkles,
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
  skills: { icon: React.ReactNode; label: string }[];
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
    accent: "#8B5CF6",
    accentFrom: "#7C3AED",
    accentTo: "#3B82F6",
    skills: [
      { icon: <Code2 size={10} />, label: "Full Stack" },
      { icon: <Sparkles size={10} />, label: "AI / Prompt Eng." },
    ],
    bio: "Self-taught from the ground up. Built SchoraHub to solve the resource problem he lived through himself.",
  },
  {
    name: "Theodora",
    fullName: "Theodora Liva",
    role: "Marketing Manager",
    photo: "/theo.jpg",
    initials: "TL",
    accent: "#EC4899",
    accentFrom: "#EC4899",
    accentTo: "#8B5CF6",
    skills: [
      { icon: <Megaphone size={10} />, label: "Marketing" },
      { icon: <Palette size={10} />, label: "UI / UX" },
    ],
    bio: "Brings the OTECHY story to the world with precision and creative instinct.",
  },
  {
    name: "Elisha",
    fullName: "Elisha Mkango",
    role: "Software Developer",
    photo: "/elisha.jpg",
    initials: "EM",
    accent: "#3B82F6",
    accentFrom: "#3B82F6",
    accentTo: "#06B6D4",
    skills: [
      { icon: <Code2 size={10} />, label: "Dev" },
      { icon: <TestTube size={10} />, label: "QA" },
      { icon: <Palette size={10} />, label: "UX" },
    ],
    bio: "Ensures every line of code is tested, polished, and ready for real users.",
  },
  {
    name: "Elijah",
    fullName: "Elijah Mkango",
    role: "Security Manager",
    photo: "/elijah.jpg",
    initials: "EJ",
    accent: "#10B981",
    accentFrom: "#10B981",
    accentTo: "#3B82F6",
    skills: [
      { icon: <Shield size={10} />, label: "Cybersecurity" },
      { icon: <Code2 size={10} />, label: "Dev" },
    ],
    bio: "Guards the platform so students can learn without worrying about what's underneath.",
  },
];

const storyScenes = [
  { date: "2025", lines: ["The MSCE holiday began.", "Most students rested."] },
  {
    date: "Week 1",
    lines: [
      "A small group decided differently.",
      "No classroom. No teacher.",
      "No equipment to speak of.",
    ],
  },
  {
    date: "Week 2",
    lines: ["Only curiosity.", "Slow internet.", "Late nights."],
  },
  {
    date: "Week 3",
    lines: [
      "Python first.",
      "Then JavaScript.",
      "Then React.",
      "Projects that failed.",
      "Projects that worked.",
    ],
  },
  {
    date: "Week 4",
    lines: ["AI. Cybersecurity. Prompt Engineering.", "Learning never stopped."],
  },
  {
    date: "Today",
    lines: [
      "That group became OTECHY.",
      "And OTECHY built SchoraHub.",
      "For every Malawian student who needs it.",
    ],
    highlight: true,
  },
];

const techStack = [
  "Python",
  "JavaScript",
  "React",
  "TypeScript",
  "Supabase",
  "Tailwind CSS",
  "AI Engineering",
  "Prompt Engineering",
  "Cybersecurity",
  "Software Dev",
];

// ─── Reveal Hook ──────────────────────────────────────────────────────────────
function useReveal(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Reveal Wrapper ───────────────────────────────────────────────────────────
function Reveal({
  children, delay = 0, className = "", from = "bottom",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  from?: "bottom" | "left" | "right" | "none";
}) {
  const { ref, visible } = useReveal();
  const transforms: Record<string, string> = {
    bottom: "translateY(24px)", left: "translateX(-24px)",
    right: "translateX(24px)", none: "none",
  };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[from],
        transition: `opacity 0.6s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.6s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Divider ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-7">
      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, rgba(100,80,200,0.35))" }} />
      <p className="text-[9px] font-black tracking-[0.35em] uppercase" style={{ color: "#7C3AED" }}>
        {children}
      </p>
      <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(100,80,200,0.35), transparent)" }} />
    </div>
  );
}

// ─── Floating Image ───────────────────────────────────────────────────────────
function Img({ src, alt, initials, className = "" }: { src: string; alt: string; initials: string; className?: string }) {
  const [error, setError] = useState(false);
  return (
    <div className={className}>
      {!error ? (
        <img src={src} alt={alt} onError={() => setError(true)} className="w-full h-full object-cover object-top" />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(30,20,60,0.6)" }}>
          <span className="text-5xl font-black select-none" style={{ color: "#6D4EC0" }}>{initials}</span>
        </div>
      )}
    </div>
  );
}

// ─── Team Carousel ───────────────────────────────────────────────────────────
function TeamCarousel({ members }: { members: TeamMember[] }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(members.length - 1, idx));
    setActive(clamped);
  };

  // Touch / mouse swipe
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
    isDragging.current = false;
  };
  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    isDragging.current = true;
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
    isDragging.current = false;
  };

  const member = members[active];
  const [imgError, setImgError] = useState(false);

  // Reset imgError when member changes
  useEffect(() => { setImgError(false); }, [active]);

  return (
    <div className="select-none">
      {/* Card */}
      <div
        ref={trackRef}
        className="relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          border: `1px solid ${member.accent}30`,
          boxShadow: `0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px ${member.accent}10`,
          background: "#0D0D1E",
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {/* Accent stripe top */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px] z-10"
          style={{ background: `linear-gradient(90deg, ${member.accentFrom}, ${member.accentTo})`, transition: "background 0.4s" }}
        />

        {/* Photo — tall, full-width */}
        <div className="relative" style={{ height: 380 }}>
          {!imgError ? (
            <img
              src={member.photo}
              alt={member.fullName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-top"
              style={{ transition: "opacity 0.3s" }}
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${member.accentFrom}22, ${member.accentTo}18)` }}
            >
              <span className="text-8xl font-black select-none" style={{ color: `${member.accent}50` }}>
                {member.initials}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(13,13,30,1) 0%, rgba(13,13,30,0.55) 45%, rgba(13,13,30,0.05) 80%, transparent 100%)" }}
          />

          {/* Founder badge */}
          {member.isFounder && (
            <div className="absolute top-4 left-4 z-10">
              <span
                className="text-[9px] font-black tracking-[0.28em] uppercase px-3 py-1.5 rounded-full"
                style={{ background: "rgba(90,40,180,0.82)", backdropFilter: "blur(10px)", border: "1px solid rgba(160,120,250,0.35)", color: "#EDE9FF" }}
              >
                ★ Founder
              </span>
            </div>
          )}

          {/* Nav arrows — on photo */}
          <div className="absolute bottom-4 right-4 flex gap-2 z-10">
            <button
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                opacity: active === 0 ? 0.3 : 1,
              }}
              aria-label="Previous member"
            >
              <ChevronLeft size={16} className="text-white" />
            </button>
            <button
              onClick={() => goTo(active + 1)}
              disabled={active === members.length - 1}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                opacity: active === members.length - 1 ? 0.3 : 1,
              }}
              aria-label="Next member"
            >
              <ChevronRight size={16} className="text-white" />
            </button>
          </div>

          {/* Name on photo bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
            <p className="text-white font-black text-xl tracking-tight leading-tight">
              {member.fullName}
            </p>
          </div>
        </div>

        {/* Info panel */}
        <div className="px-5 pt-4 pb-5">
          <p
            className="text-[10px] font-black tracking-[0.22em] uppercase mb-3"
            style={{ color: member.accent, transition: "color 0.4s" }}
          >
            {member.role}
          </p>

          <p className="text-[13px] text-slate-400 leading-relaxed font-medium mb-4">
            {member.bio}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {member.skills.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{
                  color: member.accent,
                  background: `${member.accent}12`,
                  border: `1px solid ${member.accent}28`,
                }}
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {members.map((m, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to ${m.name}`}
            className="rounded-full transition-all"
            style={{
              width: i === active ? 20 : 7,
              height: 7,
              background: i === active ? member.accent : "rgba(255,255,255,0.15)",
              transition: "width 0.3s, background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Swipe hint */}
      <p className="text-center text-[10px] text-slate-600 font-medium mt-2">
        ← swipe to see the team →
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AboutUsProps {
  onBack?: () => void;
}

export default function AboutUs({ onBack }: AboutUsProps) {
  const founder = teamMembers.find((m) => m.isFounder)!;

  const [scrollY, setScrollY] = useState(0);
  const handleScroll = useCallback(() => setScrollY(window.scrollY), []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen text-white" style={{ background: "#0A0A16" }}>

      {/* ── Sticky Header ── */}
      <header
        className="sticky top-0 z-50"
        style={{ background: "rgba(10,10,22,0.9)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <ArrowLeft size={16} className="text-slate-400" />
            </button>
          )}

          {/* Logo in header */}
          <div className="flex items-center gap-2">
            <img
              src="/otechy"
              alt="OTECHY"
              className="h-7 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                const fallback = e.currentTarget.nextSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            {/* Fallback if logo not found */}
            <div
              className="items-center gap-1.5 hidden"
              style={{ display: "none" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6D28D9, #2563EB)" }}
              >
                <GraduationCap size={14} className="text-white" />
              </div>
              <span className="text-[13px] font-black text-white tracking-tight">OTECHY</span>
            </div>
          </div>

          <div className="ml-auto">
            <span
              className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ background: "rgba(100,70,200,0.12)", border: "1px solid rgba(100,70,200,0.22)", color: "#9D7FEA" }}
            >
              Est. 2025
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">

        {/* ════════════════════════════════════════════════
            HERO — with OTECHY logo prominently
        ════════════════════════════════════════════════ */}
        <section className="relative px-4 pt-10 pb-12 overflow-hidden">
          {/* Subtle background glow — toned down */}
          <div
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(100,60,200,0.10) 0%, transparent 70%)",
              transform: `translateY(${scrollY * 0.1}px)`,
            }}
          />
          <div
            className="absolute top-40 -left-20 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(50,100,220,0.07) 0%, transparent 70%)",
              transform: `translateY(${scrollY * 0.06}px)`,
            }}
          />

          <div className="relative z-10">
            {/* ── OTECHY Logo — hero feature ── */}
            <Reveal>
              <div className="mb-7">
                {/* Try to load the logo image */}
                <img
                  src="/otechy"
                  alt="OTECHY"
                  className="h-14 w-auto object-contain mb-1"
                  onError={(e) => {
                    // Logo not found — show text logo fallback
                    const el = e.currentTarget;
                    el.style.display = "none";
                    const next = el.nextElementSibling as HTMLElement;
                    if (next) next.style.display = "flex";
                  }}
                />
                {/* Text fallback logo — hidden by default, shown if image fails */}
                <div className="items-center gap-3" style={{ display: "none" }}>
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: "linear-gradient(135deg, #6D28D9, #2563EB)" }}
                  >
                    <GraduationCap size={26} className="text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-white tracking-tight leading-none">OTECHY</p>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5" style={{ color: "#7C6AC4" }}>
                      Technology · Malawi
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={40}>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase mb-3" style={{ color: "#6D50BB" }}>
                Malawi · Technology · 2025
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1
                className="font-black leading-[0.93] tracking-tight mb-5"
                style={{ fontSize: "clamp(38px, 11vw, 52px)", color: "#EEEAFF" }}
              >
                We built{" "}
                <span style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  something
                </span>
                <br />
                from{" "}
                <span style={{ color: "#6B7280", fontStyle: "italic" }}>nothing.</span>
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="text-[13.5px] text-slate-500 leading-relaxed font-medium max-w-xs mb-7">
                A group of self-taught students from Malawi — during a school holiday —
                decided to learn technology. That decision became OTECHY.
              </p>
            </Reveal>

            {/* Founder photo — cinematic strip */}
            <Reveal delay={160}>
              <div
                className="relative rounded-2xl overflow-hidden mb-5"
                style={{ height: 230, border: "1px solid rgba(100,70,180,0.18)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
              >
                <Img src="/ceo.jpg" alt="Peter Mlandula" initials="PM" className="w-full h-full" />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(10,10,22,0.9) 0%, rgba(10,10,22,0.3) 50%, transparent 100%)" }}
                />
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="text-white font-black text-[15px] tracking-tight">Peter Mlandula</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: "#8B72D0" }}>
                    Founder of OTECHY · Builder of SchoraHub
                  </p>
                </div>
                <div className="absolute top-0 left-0 right-0 h-5" style={{ background: "rgba(10,10,22,0.5)" }} />
              </div>
            </Reveal>

            {/* Stats */}
            <Reveal delay={200}>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { number: "2025", label: "Founded" },
                  { number: "4", label: "Team members" },
                  { number: "∞", label: "Curiosity" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-lg font-black tracking-tight" style={{ color: "#8B72D0" }}>{stat.number}</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wide mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            ORIGIN STORY — Documentary timeline
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>The Origin</SectionLabel></Reveal>

          <Reveal delay={40}>
            <h2 className="text-xl font-black tracking-tight text-white mb-7 leading-tight">
              A holiday that changed{" "}
              <span style={{ background: "linear-gradient(135deg, #6D28D9, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                everything.
              </span>
            </h2>
          </Reveal>

          <div className="relative">
            <div
              className="absolute left-[22px] top-0 bottom-0 w-px"
              style={{ background: "linear-gradient(to bottom, rgba(100,60,190,0.5), rgba(50,90,200,0.2), transparent)" }}
            />
            <div className="space-y-0">
              {storyScenes.map((scene, i) => (
                <Reveal key={i} delay={i * 70}>
                  <div className="flex gap-5 pb-7">
                    <div className="flex-shrink-0 w-11 flex items-start justify-center pt-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: scene.highlight ? "linear-gradient(135deg, #7C3AED, #3B82F6)" : "rgba(100,60,180,0.45)",
                          border: scene.highlight ? "2px solid #9D7FEA" : "2px solid rgba(100,60,180,0.35)",
                          boxShadow: scene.highlight ? "0 0 10px rgba(110,60,200,0.5)" : "none",
                        }}
                      />
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <p
                        className="text-[9px] font-black tracking-[0.25em] uppercase mb-1.5"
                        style={{ color: scene.highlight ? "#8B72D0" : "#374151" }}
                      >
                        {scene.date}
                      </p>
                      {scene.lines.map((line, j) => (
                        <p
                          key={j}
                          className="font-bold leading-snug mb-1"
                          style={{ fontSize: "14.5px", color: scene.highlight ? "#E8E2FF" : "#CBD5E1", letterSpacing: "-0.01em" }}
                        >
                          {line}
                        </p>
                      ))}
                      {scene.highlight && (
                        <div
                          className="mt-3 rounded-xl px-4 py-3"
                          style={{ background: "rgba(90,50,170,0.1)", border: "1px solid rgba(100,60,190,0.2)" }}
                        >
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                            OTECHY is more than a startup — it's proof that talent can emerge from anywhere when people choose to learn.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            FOUNDER SPOTLIGHT
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Founder</SectionLabel></Reveal>

          <Reveal delay={50}>
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(100,60,180,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
            >
              {/* Portrait */}
              <div className="relative" style={{ height: 340 }}>
                <Img src="/ceo.jpg" alt="Peter Mlandula" initials="PM" className="w-full h-full" />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(10,10,22,1) 0%, rgba(10,10,22,0.5) 40%, rgba(10,10,22,0.05) 75%, transparent 100%)" }}
                />
                <div className="absolute top-4 left-4">
                  <span
                    className="text-[9px] font-black tracking-[0.28em] uppercase px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(80,35,160,0.78)", backdropFilter: "blur(10px)", border: "1px solid rgba(150,110,240,0.3)", color: "#EBE4FF" }}
                  >
                    ★ Founder
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="px-5 pt-4 pb-6" style={{ background: "#0A0A16" }}>
                <p className="text-xl font-black text-white tracking-tight mb-0.5">Peter Mlandula</p>
                <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-4" style={{ color: "#6D50BB" }}>
                  Founder & Lead Developer · OTECHY
                </p>

                {/* Quote */}
                <div className="relative mb-4">
                  <div className="absolute -left-1 top-0 bottom-0 w-[3px] rounded-full" style={{ background: "linear-gradient(to bottom, #6D28D9, #2563EB)" }} />
                  <div className="pl-5">
                    <p className="text-[13px] text-slate-400 leading-relaxed font-medium italic">
                      "I used to struggle to access books due to limited resources — but internet and phones were always around. So I asked: what if all learning resources were online? That question became{" "}
                      <span className="font-black not-italic" style={{ color: "#9D7FEA" }}>SchoraHub.</span>"
                    </p>
                  </div>
                </div>

                {/* Vision box */}
                <div
                  className="rounded-xl p-4 mb-4"
                  style={{ background: "rgba(80,45,150,0.08)", border: "1px solid rgba(90,50,160,0.14)" }}
                >
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-2" style={{ color: "#6D50BB" }}>Vision</p>
                  <p className="text-[12px] text-slate-400 leading-relaxed font-medium">
                    A Malawi where every student has the same access to quality learning — regardless of their school, family, or location.
                  </p>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {founder.skills.map((s) => (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold"
                      style={{ color: "#9D7FEA", background: "rgba(90,50,160,0.1)", border: "1px solid rgba(100,60,180,0.2)" }}
                    >
                      {s.icon} {s.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ════════════════════════════════════════════════
            MISSION & VISION
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Purpose</SectionLabel></Reveal>

          <div className="space-y-3">
            <Reveal delay={40}>
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{ background: "rgba(80,45,160,0.07)", border: "1px solid rgba(90,50,160,0.16)" }}
              >
                <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-3" style={{ color: "#6D50BB" }}>Mission</p>
                <p className="text-[14px] text-white font-bold leading-snug tracking-tight">
                  Provide free access to books, tutors, and scholarships — so every Malawian student can{" "}
                  <span style={{ color: "#9D7FEA" }}>unlock their potential.</span>
                </p>
              </div>
            </Reveal>

            <Reveal delay={70}>
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{ background: "rgba(37,80,190,0.06)", border: "1px solid rgba(40,90,200,0.14)" }}
              >
                <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-3" style={{ color: "#4B7ED0" }}>Vision</p>
                <p className="text-[14px] text-white font-bold leading-snug tracking-tight">
                  A future where geography and income never determine a student's{" "}
                  <span style={{ color: "#7BA8E8" }}>access to knowledge.</span>
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={100}>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {[
                { emoji: "🎓", label: "Education First" },
                { emoji: "🤝", label: "Community" },
                { emoji: "🇲🇼", label: "Built in Malawi" },
              ].map((v) => (
                <div
                  key={v.label}
                  className="flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide leading-tight">{v.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ════════════════════════════════════════════════
            TECH STACK
        ════════════════════════════════════════════════ */}
        <section className="pb-12 overflow-hidden">
          <Reveal className="px-4"><SectionLabel>What we've learned</SectionLabel></Reveal>
          <Reveal>
            <div className="flex gap-2.5 overflow-x-auto pb-2 px-4" style={{ scrollbarWidth: "none" }}>
              {techStack.map((tech, i) => (
                <span
                  key={tech}
                  className="flex-shrink-0 text-[11px] font-black px-4 py-2.5 rounded-full whitespace-nowrap"
                  style={{
                    background: i % 3 === 0 ? "rgba(80,45,160,0.1)" : i % 3 === 1 ? "rgba(37,80,190,0.08)" : "rgba(255,255,255,0.04)",
                    border: i % 3 === 0 ? "1px solid rgba(100,60,200,0.22)" : i % 3 === 1 ? "1px solid rgba(50,100,220,0.18)" : "1px solid rgba(255,255,255,0.07)",
                    color: i % 3 === 0 ? "#9D7FEA" : i % 3 === 1 ? "#7BA8E8" : "#6B7280",
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ════════════════════════════════════════════════
            MEET THE TEAM — Swipe carousel
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Meet the Team</SectionLabel></Reveal>

          <Reveal delay={40}>
            <h2 className="text-xl font-black tracking-tight text-white mb-6 leading-tight">
              Real people.{" "}
              <span style={{ color: "#4B5563", fontStyle: "italic" }}>Building something real.</span>
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <TeamCarousel members={teamMembers} />
          </Reveal>
        </section>

        {/* ════════════════════════════════════════════════
            WHAT'S NEXT
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal>
            <div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{ background: "rgba(80,45,150,0.07)", border: "1px solid rgba(90,50,160,0.16)" }}
            >
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(80,45,160,0.14), transparent)" }} />
              <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-3 relative z-10" style={{ color: "#8B72D0" }}>
                What's next
              </p>
              <h2 className="text-xl font-black text-white leading-tight mb-3 relative z-10 tracking-tight">
                We're just getting started.
              </h2>
              <p className="text-[13px] text-slate-500 leading-relaxed font-medium relative z-10 mb-4">
                More features. More partnerships. More students reached. OTECHY is growing — and we're looking for mentors, collaborators, and organizations who believe what we believe.
              </p>
              <div className="flex flex-wrap gap-2 relative z-10">
                {["Partnerships", "Mentorship", "Resources", "Collaboration"].map((item) => (
                  <span
                    key={item}
                    className="text-[10px] font-bold px-3 py-1 rounded-full"
                    style={{ color: "#8B72D0", background: "rgba(80,45,150,0.1)", border: "1px solid rgba(90,50,160,0.18)" }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ════════════════════════════════════════════════
            CONTACT
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Contact</SectionLabel></Reveal>

          <Reveal delay={40}>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <a
                href="mailto:otechy8@gmail.com"
                className="flex items-center gap-4 px-5 py-4 transition-colors active:bg-white/5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(80,45,160,0.14)" }}>
                  <Mail size={16} style={{ color: "#9D7FEA" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-600 mb-0.5">Email</p>
                  <p className="text-[13px] font-bold text-white truncate">otechy8@gmail.com</p>
                </div>
                <ChevronRight size={14} className="text-slate-700 flex-shrink-0" />
              </a>

              {[
                { number: "0888258180", label: "Main" },
                { number: "0888712272", label: "Support" },
                { number: "0999626944", label: "Alt" },
              ].map((phone, i, arr) => (
                <a
                  key={phone.number}
                  href={`tel:${phone.number}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors active:bg-white/5"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,80,190,0.12)" }}>
                    <Phone size={16} style={{ color: "#7BA8E8" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-600 mb-0.5">{phone.label}</p>
                    <p className="text-[13px] font-bold text-white">{phone.number}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-700 flex-shrink-0" />
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal delay={70}>
            <div
              className="mt-3 flex items-center gap-4 rounded-2xl px-5 py-4"
              style={{ background: "rgba(10,120,80,0.06)", border: "1px solid rgba(15,150,100,0.13)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(12,130,90,0.12)" }}>
                <MapPin size={16} style={{ color: "#4ADE80" }} />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-[0.2em] uppercase mb-0.5" style={{ color: "#2D7A50" }}>Based in</p>
                <p className="text-[13px] font-bold text-white">Malawi 🇲🇼</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════ */}
        <footer className="px-4 pb-10 pt-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <Reveal>
            <div className="flex flex-col items-center gap-2 mt-4 mb-3">
              {/* Footer logo */}
              <img
                src="/otechy"
                alt="OTECHY"
                className="h-8 w-auto object-contain opacity-70"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const next = el.nextElementSibling as HTMLElement;
                  if (next) next.style.display = "flex";
                }}
              />
              <div className="items-center gap-1.5" style={{ display: "none" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6D28D9, #2563EB)" }}>
                  <GraduationCap size={12} className="text-white" />
                </div>
                <span className="text-[12px] font-black text-white tracking-tight">OtechySchora</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-700 font-semibold">Made with care in Malawi 🇲🇼</p>
            <p className="text-[10px] text-slate-800 font-medium mt-1">© {new Date().getFullYear()} Otechy · All rights reserved</p>
          </Reveal>
        </footer>

      </main>
    </div>
  );
}

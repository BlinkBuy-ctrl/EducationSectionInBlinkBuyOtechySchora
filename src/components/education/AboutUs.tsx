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
    accent: "#7C3AED",
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
    accent: "#DB2777",
    accentFrom: "#DB2777",
    accentTo: "#7C3AED",
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
    accent: "#2563EB",
    accentFrom: "#2563EB",
    accentTo: "#0891B2",
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
    accent: "#059669",
    accentFrom: "#059669",
    accentTo: "#2563EB",
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
    lines: ["A small group decided differently.", "No classroom. No teacher.", "No equipment to speak of."],
  },
  { date: "Week 2", lines: ["Only curiosity.", "Slow internet.", "Late nights."] },
  {
    date: "Week 3",
    lines: ["Python first.", "Then JavaScript.", "Then React.", "Projects that failed.", "Projects that worked."],
  },
  { date: "Week 4", lines: ["AI. Cybersecurity. Prompt Engineering.", "Learning never stopped."] },
  {
    date: "Today",
    lines: ["That group became OTECHY.", "And OTECHY built SchoraHub.", "For every Malawian student who needs it."],
    highlight: true,
  },
];

const techStack = [
  "Python", "JavaScript", "React", "TypeScript", "Supabase",
  "Tailwind CSS", "AI Engineering", "Prompt Engineering", "Cybersecurity", "Software Dev",
];

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

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-violet-200" />
      <p className="text-[9px] font-black tracking-[0.35em] uppercase text-violet-400">{children}</p>
      <div className="h-px flex-1 bg-violet-200" />
    </div>
  );
}

// ─── Safe Image ───────────────────────────────────────────────────────────────
function SafeImg({ src, alt, initials, accent, className = "" }: {
  src: string; alt: string; initials: string; accent: string; className?: string;
}) {
  const [err, setErr] = useState(false);
  return (
    <div className={className}>
      {!err ? (
        <img src={src} alt={alt} onError={() => setErr(true)} className="w-full h-full object-cover object-top" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-violet-50">
          <span className="text-5xl font-black select-none" style={{ color: accent + "80" }}>{initials}</span>
        </div>
      )}
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

  const m = members[active];

  return (
    <div className="select-none">
      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ background: "#fff", border: `1.5px solid ${m.accent}25`, boxShadow: `0 4px 24px rgba(0,0,0,0.08), 0 1px 4px ${m.accent}18` }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; dragging.current = true; }}
        onTouchEnd={(e) => {
          if (!dragging.current) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
          dragging.current = false;
        }}
        onMouseDown={(e) => { startX.current = e.clientX; dragging.current = true; }}
        onMouseUp={(e) => {
          if (!dragging.current) return;
          const dx = e.clientX - startX.current;
          if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
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
            <div className="w-full h-full flex items-center justify-center bg-violet-50">
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
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity bg-white shadow-sm border border-slate-100"
              style={{ opacity: active === 0 ? 0.3 : 1 }}
              aria-label="Previous"
            >
              <ChevronLeft size={16} className="text-slate-500" />
            </button>
            <button
              onClick={() => goTo(active + 1)}
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
          <p className="text-[13px] text-slate-500 leading-relaxed font-medium mb-4">{m.bio}</p>
          <div className="flex flex-wrap gap-1.5">
            {m.skills.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ color: m.accent, background: m.accent + "10", border: `1px solid ${m.accent}25` }}
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {members.map((mem, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to ${mem.name}`}
            className="rounded-full transition-all duration-300"
            style={{ width: i === active ? 20 : 7, height: 7, background: i === active ? m.accent : "#DDD6FE" }}
          />
        ))}
      </div>
      <p className="text-center text-[10px] text-slate-400 font-medium mt-2">← swipe to meet the team →</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface AboutUsProps {
  onBack?: () => void;
}

export default function AboutUs({ onBack }: AboutUsProps) {
  const founder = teamMembers.find((m) => m.isFounder)!;

  const [scrollY, setScrollY] = useState(0);
  const onScroll = useCallback(() => setScrollY(window.scrollY), []);
  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return (
    <div className="min-h-screen" style={{ background: "#F9F7FF" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{ background: "rgba(249,247,255,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid #EDE9FE" }}
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
            src="/otechy"
            alt="OTECHY"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fb = e.currentTarget.nextElementSibling as HTMLElement;
              if (fb) fb.style.display = "flex";
            }}
          />
          <div className="items-center gap-2" style={{ display: "none" }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)" }}>
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-[13px] font-black text-slate-800 tracking-tight">OTECHY</span>
          </div>

          <span
            className="ml-auto text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ background: "#EDE9FE", color: "#7C3AED" }}
          >
            Est. 2025
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto">

        {/* ════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════ */}
        <section className="relative px-4 pt-9 pb-11 overflow-hidden">
          {/* Warm background blobs */}
          <div
            className="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,0.13) 0%, transparent 70%)", transform: `translateY(${scrollY * 0.08}px)` }}
          />
          <div
            className="absolute top-36 -left-16 w-44 h-44 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(196,181,253,0.1) 0%, transparent 70%)", transform: `translateY(${scrollY * 0.05}px)` }}
          />

          <div className="relative z-10">
            {/* Big logo in hero */}
            <Reveal>
              <div className="mb-6">
                <img
                  src="/otechy"
                  alt="OTECHY"
                  className="h-12 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fb = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = "flex";
                  }}
                />
                {/* Text fallback */}
                <div className="items-center gap-3" style={{ display: "none" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)" }}>
                    <GraduationCap size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">OTECHY</p>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5 text-violet-400">Technology · Malawi</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={50}>
              <p className="text-[10px] font-black tracking-[0.3em] uppercase text-violet-400 mb-3">
                Malawi · Technology · 2025
              </p>
            </Reveal>

            <Reveal delay={90}>
              <h1 className="font-black leading-[0.93] tracking-tight mb-5 text-slate-800" style={{ fontSize: "clamp(36px, 10vw, 50px)" }}>
                We built{" "}
                <span style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  something
                </span>
                <br />
                from{" "}
                <span className="text-slate-400 italic">nothing.</span>
              </h1>
            </Reveal>

            <Reveal delay={130}>
              <p className="text-[13.5px] text-slate-500 leading-relaxed font-medium max-w-xs mb-7">
                A group of self-taught students from Malawi — during a school holiday — decided to learn technology. That decision became OTECHY.
              </p>
            </Reveal>

            {/* Founder photo strip */}
            <Reveal delay={170}>
              <div
                className="relative rounded-2xl overflow-hidden mb-5"
                style={{ height: 230, border: "1.5px solid #EDE9FE", boxShadow: "0 8px 32px rgba(124,58,237,0.10)" }}
              >
                <SafeImg src="/ceo.jpg" alt="Peter Mlandula" initials="PM" accent="#7C3AED" className="w-full h-full" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(249,247,255,0.92) 0%, rgba(249,247,255,0.25) 45%, transparent 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="font-black text-[15px] tracking-tight text-slate-800">Peter Mlandula</p>
                  <p className="text-[11px] font-semibold mt-0.5 text-violet-500">Founder of OTECHY · Builder of SchoraHub</p>
                </div>
              </div>
            </Reveal>

            {/* Stats */}
            <Reveal delay={200}>
              <div className="grid grid-cols-3 gap-2">
                {[{ number: "2025", label: "Founded" }, { number: "4", label: "Team members" }, { number: "∞", label: "Curiosity" }].map((s) => (
                  <div key={s.label} className="rounded-xl p-3 text-center bg-white border border-slate-100 shadow-sm">
                    <p className="text-lg font-black tracking-tight text-violet-600">{s.number}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            ORIGIN STORY
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>The Origin</SectionLabel></Reveal>

          <Reveal delay={40}>
            <h2 className="text-xl font-black tracking-tight text-slate-800 mb-7 leading-tight">
              A holiday that changed{" "}
              <span style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                everything.
              </span>
            </h2>
          </Reveal>

          <div className="relative">
            {/* Rail */}
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-violet-100" />

            {storyScenes.map((scene, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="flex gap-5 pb-7">
                  <div className="flex-shrink-0 w-11 flex items-start justify-center pt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: scene.highlight ? "linear-gradient(135deg, #7C3AED, #3B82F6)" : "#DDD6FE",
                        border: scene.highlight ? "2px solid #7C3AED" : "2px solid #C4B5FD",
                        boxShadow: scene.highlight ? "0 0 8px rgba(124,58,237,0.35)" : "none",
                      }}
                    />
                  </div>
                  <div className="flex-1 -mt-0.5">
                    <p className="text-[9px] font-black tracking-[0.25em] uppercase mb-1.5" style={{ color: scene.highlight ? "#7C3AED" : "#C4B5FD" }}>
                      {scene.date}
                    </p>
                    {scene.lines.map((line, j) => (
                      <p key={j} className="font-semibold leading-snug mb-1" style={{ fontSize: "14.5px", color: scene.highlight ? "#1E1B4B" : "#64748B" }}>
                        {line}
                      </p>
                    ))}
                    {scene.highlight && (
                      <div className="mt-3 rounded-xl px-4 py-3 bg-violet-50 border border-violet-100">
                        <p className="text-[11px] text-violet-700 leading-relaxed font-medium">
                          OTECHY is more than a startup — it's proof that talent can emerge from anywhere when people choose to learn.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            FOUNDER SPOTLIGHT
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal><SectionLabel>Founder</SectionLabel></Reveal>

          <Reveal delay={50}>
            <div className="rounded-2xl overflow-hidden bg-white border border-violet-100 shadow-sm">
              {/* Portrait */}
              <div className="relative" style={{ height: 320 }}>
                <SafeImg src="/ceo.jpg" alt="Peter Mlandula" initials="PM" accent="#7C3AED" className="w-full h-full" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.45) 38%, transparent 65%)" }} />
                <div className="absolute top-4 left-4">
                  <span className="text-[9px] font-black tracking-[0.25em] uppercase px-3 py-1.5 rounded-full text-white" style={{ background: "#7C3AED" }}>
                    ★ Founder
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="text-xl font-black text-slate-800 tracking-tight">Peter Mlandula</p>
                </div>
              </div>

              {/* Info */}
              <div className="px-5 pt-3 pb-6">
                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-violet-500 mb-4">Founder & Lead Developer · OTECHY</p>

                {/* Quote */}
                <div className="relative mb-4 pl-4" style={{ borderLeft: "3px solid #7C3AED" }}>
                  <p className="text-[13px] text-slate-500 leading-relaxed font-medium italic">
                    "I used to struggle to access books due to limited resources — but internet and phones were always around. So I asked: what if all learning resources were online? That question became{" "}
                    <span className="font-black not-italic text-violet-600">SchoraHub.</span>"
                  </p>
                </div>

                {/* Vision */}
                <div className="rounded-xl p-4 mb-4 bg-violet-50 border border-violet-100">
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase text-violet-400 mb-2">Vision</p>
                  <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                    A Malawi where every student has the same access to quality learning — regardless of their school, family, or location.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {founder.skills.map((s) => (
                    <span key={s.label} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200">
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
              <div className="rounded-2xl p-5 bg-white border border-violet-100 shadow-sm">
                <p className="text-[9px] font-black tracking-[0.3em] uppercase text-violet-400 mb-3">Mission</p>
                <p className="text-[14px] text-slate-700 font-bold leading-snug">
                  Provide free access to books, tutors, and scholarships — so every Malawian student can{" "}
                  <span className="text-violet-600">unlock their potential.</span>
                </p>
              </div>
            </Reveal>

            <Reveal delay={70}>
              <div className="rounded-2xl p-5 bg-white border border-blue-100 shadow-sm">
                <p className="text-[9px] font-black tracking-[0.3em] uppercase text-blue-400 mb-3">Vision</p>
                <p className="text-[14px] text-slate-700 font-bold leading-snug">
                  A future where geography and income never determine a student's{" "}
                  <span className="text-blue-600">access to knowledge.</span>
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={100}>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {[{ emoji: "🎓", label: "Education First" }, { emoji: "🤝", label: "Community" }, { emoji: "🇲🇼", label: "Built in Malawi" }].map((v) => (
                <div key={v.label} className="flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center bg-white border border-slate-100 shadow-sm">
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-tight">{v.label}</span>
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
                    background: i % 3 === 0 ? "#EDE9FE" : i % 3 === 1 ? "#DBEAFE" : "#F1F5F9",
                    color: i % 3 === 0 ? "#7C3AED" : i % 3 === 1 ? "#2563EB" : "#64748B",
                    border: i % 3 === 0 ? "1px solid #C4B5FD" : i % 3 === 1 ? "1px solid #BFDBFE" : "1px solid #E2E8F0",
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ════════════════════════════════════════════════
            MEET THE TEAM — swipe carousel
        ════════════════════════════════════════════════ */}
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

        {/* ════════════════════════════════════════════════
            WHAT'S NEXT
        ════════════════════════════════════════════════ */}
        <section className="px-4 pb-12">
          <Reveal>
            <div className="rounded-2xl p-6 bg-white border border-violet-100 shadow-sm">
              <p className="text-[9px] font-black tracking-[0.3em] uppercase text-violet-400 mb-3">What's next</p>
              <h2 className="text-xl font-black text-slate-800 leading-tight mb-3 tracking-tight">We're just getting started.</h2>
              <p className="text-[13px] text-slate-500 leading-relaxed font-medium mb-4">
                More features. More partnerships. More students reached. OTECHY is growing — and we're looking for mentors, collaborators, and organizations who believe what we believe.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Partnerships", "Mentorship", "Resources", "Collaboration"].map((item) => (
                  <span key={item} className="text-[10px] font-bold px-3 py-1 rounded-full text-violet-600 bg-violet-50 border border-violet-200">{item}</span>
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
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
              <a href="mailto:otechy8@gmail.com" className="flex items-center gap-4 px-5 py-4 active:bg-slate-50 border-b border-slate-50">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-50">
                  <Mail size={16} className="text-violet-500" />
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
            <div className="mt-3 flex items-center gap-4 rounded-2xl px-5 py-4 bg-white border border-emerald-100 shadow-sm">
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

        {/* ════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════ */}
        <footer className="px-4 pb-10 pt-4 text-center border-t border-slate-100">
          <Reveal>
            <div className="flex flex-col items-center gap-2 mt-5 mb-3">
              <img
                src="/otechy"
                alt="OTECHY"
                className="h-7 w-auto object-contain opacity-60"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fb = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fb) fb.style.display = "flex";
                }}
              />
              <div className="items-center gap-1.5" style={{ display: "none" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #3B82F6)" }}>
                  <GraduationCap size={12} className="text-white" />
                </div>
                <span className="text-[12px] font-black text-slate-600 tracking-tight">OtechySchora</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">Made with care in Malawi 🇲🇼</p>
            <p className="text-[10px] text-slate-300 font-medium mt-1">© {new Date().getFullYear()} Otechy · All rights reserved</p>
          </Reveal>
        </footer>

      </main>
    </div>
  );
}

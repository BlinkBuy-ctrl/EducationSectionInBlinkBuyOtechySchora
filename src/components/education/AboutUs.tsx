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
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
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
  children,
  delay = 0,
  className = "",
  from = "bottom",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  from?: "bottom" | "left" | "right" | "none";
}) {
  const { ref, visible } = useReveal(0.05);

  const transforms: Record<string, string> = {
    bottom: "translateY(28px)",
    left: "translateX(-28px)",
    right: "translateX(28px)",
    none: "none",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : transforms[from],
        transition: `opacity 0.65s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.65s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Floating Image ───────────────────────────────────────────────────────────
function FloatingImage({
  src,
  alt,
  initials,
  className = "",
}: {
  src: string;
  alt: string;
  initials: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  return (
    <div className={className}>
      {!error ? (
        <img
          src={src}
          alt={alt}
          onError={() => setError(true)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/60 to-blue-900/40">
          <span className="text-5xl font-black text-violet-300 select-none">
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────
function TeamCard({ member, index }: { member: TeamMember; index: number }) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Reveal delay={index * 80} className="h-full">
      <div
        className="relative rounded-2xl overflow-hidden h-full flex flex-col cursor-default"
        style={{
          background: "rgba(15,12,40,0.85)",
          border: `1px solid ${member.accent}28`,
          boxShadow: hovered
            ? `0 0 28px ${member.accent}25, 0 8px 32px rgba(0,0,0,0.4)`
            : "0 2px 16px rgba(0,0,0,0.3)",
          transition: "box-shadow 0.35s ease, transform 0.35s ease",
          transform: hovered ? "translateY(-3px)" : "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={() => setHovered(true)}
        onTouchEnd={() => setHovered(false)}
      >
        {/* Photo */}
        <div className="relative h-44 flex-shrink-0 overflow-hidden">
          {!imgError ? (
            <img
              src={member.photo}
              alt={member.fullName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-top"
              style={{
                transform: hovered ? "scale(1.04)" : "scale(1)",
                transition: "transform 0.5s cubic-bezier(.22,1,.36,1)",
              }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${member.accentFrom}33, ${member.accentTo}22)`,
              }}
            >
              <span className="text-4xl font-black text-white/40 select-none">
                {member.initials}
              </span>
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(8,8,18,0.92) 0%, rgba(8,8,18,0.2) 55%, transparent 100%)",
            }}
          />
          {/* Accent line top */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, ${member.accentFrom}, ${member.accentTo})`,
              opacity: hovered ? 1 : 0.5,
              transition: "opacity 0.3s",
            }}
          />
        </div>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col gap-2.5">
          <div>
            <p className="text-white font-black text-[13px] tracking-tight leading-tight">
              {member.fullName}
            </p>
            <p
              className="text-[10px] font-bold mt-0.5 tracking-wide uppercase"
              style={{ color: member.accent }}
            >
              {member.role}
            </p>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-medium flex-1">
            {member.bio}
          </p>

          <div className="flex flex-wrap gap-1">
            {member.skills.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  color: member.accent,
                  background: `${member.accent}14`,
                  border: `1px solid ${member.accent}30`,
                }}
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AboutUsProps {
  onBack?: () => void;
}

export default function AboutUs({ onBack }: AboutUsProps) {
  const founder = teamMembers.find((m) => m.isFounder)!;
  const crew = teamMembers.filter((m) => !m.isFounder);

  // Scroll progress for hero parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div
      className="min-h-screen text-white selection:bg-violet-500/30"
      style={{ background: "#080812" }}
    >
      {/* ── Sticky Header ───────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgba(8,8,18,0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(124,58,237,0.12)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <ArrowLeft size={16} className="text-slate-300" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
              }}
            >
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-[13px] font-black text-white tracking-tight">
              About OTECHY
            </span>
          </div>

          {/* Subtle year badge */}
          <div className="ml-auto">
            <span
              className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#A78BFA",
              }}
            >
              Est. 2025
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">

        {/* ═══════════════════════════════════════════════════════════════════
            HERO — Full-bleed cinematic opening
        ═══════════════════════════════════════════════════════════════════ */}
        <section ref={heroRef} className="relative px-4 pt-10 pb-12 overflow-hidden">
          {/* Background glow orbs */}
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
              transform: `translateY(${scrollY * 0.12}px)`,
            }}
          />
          <div
            className="absolute top-32 -left-24 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
              transform: `translateY(${scrollY * 0.08}px)`,
            }}
          />

          <div className="relative z-10">
            {/* Eyebrow */}
            <Reveal>
              <p
                className="text-[10px] font-black tracking-[0.3em] uppercase mb-4"
                style={{ color: "#7C3AED" }}
              >
                Malawi · Technology · 2025
              </p>
            </Reveal>

            {/* Main headline — editorial, staggered */}
            <Reveal delay={60}>
              <h1
                className="font-black leading-[0.92] tracking-tight mb-6"
                style={{ fontSize: "clamp(42px, 12vw, 58px)", color: "#F8F6FF" }}
              >
                We built{" "}
                <span
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  something
                </span>
                <br />
                from{" "}
                <span style={{ color: "#94A3B8", fontStyle: "italic" }}>
                  nothing.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="text-[14px] text-slate-400 leading-relaxed font-medium max-w-xs mb-8">
                A group of self-taught students from Malawi — during a school
                holiday — decided to learn technology. That decision became OTECHY.
              </p>
            </Reveal>

            {/* Hero image — cinematic portrait strip */}
            <Reveal delay={180}>
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  height: 240,
                  border: "1px solid rgba(124,58,237,0.2)",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
                }}
              >
                <FloatingImage
                  src="/ceo.jpg"
                  alt="Peter Mlandula — Founder of OTECHY"
                  initials="PM"
                  className="w-full h-full"
                />
                {/* Cinematic overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(8,8,18,0.7) 0%, transparent 40%, transparent 60%, rgba(8,8,18,0.5) 100%), linear-gradient(to top, rgba(8,8,18,0.85) 0%, transparent 50%)",
                  }}
                />
                {/* Bottom caption */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="text-white font-black text-base tracking-tight">
                    Peter Mlandula
                  </p>
                  <p className="text-violet-300 text-[11px] font-semibold mt-0.5">
                    Founder of OTECHY · Builder of SchoraHub
                  </p>
                </div>
                {/* Letterbox bars */}
                <div
                  className="absolute top-0 left-0 right-0 h-6"
                  style={{ background: "rgba(8,8,18,0.6)" }}
                />
              </div>
            </Reveal>

            {/* Stats row */}
            <Reveal delay={240}>
              <div className="grid grid-cols-3 gap-2 mt-5">
                {[
                  { number: "2025", label: "Founded" },
                  { number: "4", label: "Team members" },
                  { number: "∞", label: "Curiosity" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-3 text-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <p
                      className="text-xl font-black tracking-tight"
                      style={{ color: "#A78BFA" }}
                    >
                      {stat.number}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            DOCUMENTARY TIMELINE — The Origin Story
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="px-4 pb-14">
          {/* Chapter header */}
          <Reveal>
            <div className="flex items-center gap-3 mb-8">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(124,58,237,0.5))",
                }}
              />
              <p
                className="text-[9px] font-black tracking-[0.35em] uppercase"
                style={{ color: "#7C3AED" }}
              >
                The Origin
              </p>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.5), transparent)",
                }}
              />
            </div>
          </Reveal>

          <Reveal delay={40}>
            <h2
              className="text-2xl font-black tracking-tight text-white mb-8 leading-tight"
            >
              A holiday that changed
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #60A5FA)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                everything.
              </span>
            </h2>
          </Reveal>

          {/* Timeline scenes */}
          <div className="relative">
            {/* Vertical rail */}
            <div
              className="absolute left-[22px] top-0 bottom-0 w-px"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(124,58,237,0.6), rgba(59,130,246,0.3), transparent)",
              }}
            />

            <div className="space-y-0">
              {storyScenes.map((scene, i) => (
                <Reveal key={i} delay={i * 80}>
                  <div className="flex gap-5 pb-8 relative">
                    {/* Node */}
                    <div className="flex-shrink-0 w-11 flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{
                          background: scene.highlight
                            ? "linear-gradient(135deg, #7C3AED, #3B82F6)"
                            : "rgba(124,58,237,0.5)",
                          border: scene.highlight
                            ? "2px solid #A78BFA"
                            : "2px solid rgba(124,58,237,0.4)",
                          boxShadow: scene.highlight
                            ? "0 0 12px rgba(124,58,237,0.6)"
                            : "none",
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 -mt-0.5">
                      <p
                        className="text-[9px] font-black tracking-[0.25em] uppercase mb-2"
                        style={{
                          color: scene.highlight ? "#A78BFA" : "#4B5563",
                        }}
                      >
                        {scene.date}
                      </p>
                      {scene.lines.map((line, j) => (
                        <p
                          key={j}
                          className="font-bold leading-snug mb-1"
                          style={{
                            fontSize: "15px",
                            color: scene.highlight ? "#F8F6FF" : "#CBD5E1",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {line}
                        </p>
                      ))}

                      {scene.highlight && (
                        <div
                          className="mt-3 rounded-xl px-4 py-3"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.1))",
                            border: "1px solid rgba(124,58,237,0.25)",
                          }}
                        >
                          <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                            OTECHY is more than a startup — it's proof that
                            talent can emerge from anywhere when people choose to
                            learn.
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

        {/* ═══════════════════════════════════════════════════════════════════
            FOUNDER SPOTLIGHT — Cinematic
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          className="px-4 pb-14"
        >
          <Reveal>
            <div className="flex items-center gap-3 mb-8">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(124,58,237,0.5))",
                }}
              />
              <p
                className="text-[9px] font-black tracking-[0.35em] uppercase"
                style={{ color: "#7C3AED" }}
              >
                Founder
              </p>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.5), transparent)",
                }}
              />
            </div>
          </Reveal>

          {/* Large portrait card */}
          <Reveal delay={60}>
            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                border: "1px solid rgba(124,58,237,0.25)",
                boxShadow:
                  "0 0 60px rgba(124,58,237,0.12), 0 32px 64px rgba(0,0,0,0.5)",
              }}
            >
              {/* Portrait — tall, cinematic */}
              <div className="relative" style={{ height: 360 }}>
                <FloatingImage
                  src="/ceo.jpg"
                  alt="Peter Mlandula"
                  initials="PM"
                  className="w-full h-full"
                />
                {/* Multi-layer overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(8,8,18,1) 0%, rgba(8,8,18,0.6) 40%, rgba(8,8,18,0.1) 70%, transparent 100%)",
                  }}
                />
                {/* Animated glow border */}
                <div
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{
                    boxShadow: "inset 0 0 40px rgba(124,58,237,0.08)",
                  }}
                />
                {/* FOUNDER badge — top left */}
                <div className="absolute top-4 left-4">
                  <span
                    className="text-[9px] font-black tracking-[0.3em] uppercase px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(124,58,237,0.85)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(167,139,250,0.4)",
                      color: "#F8F6FF",
                    }}
                  >
                    ★ Founder
                  </span>
                </div>
              </div>

              {/* Info panel */}
              <div
                className="p-6"
                style={{ background: "rgba(8,8,18,0.95)" }}
              >
                <div className="mb-4">
                  <p
                    className="text-2xl font-black tracking-tight text-white leading-tight"
                  >
                    Peter Mlandula
                  </p>
                  <p
                    className="text-[11px] font-bold mt-1 tracking-wide uppercase"
                    style={{ color: "#7C3AED" }}
                  >
                    Founder & Lead Developer · OTECHY
                  </p>
                </div>

                {/* Quote — the emotional center */}
                <div className="relative mb-5">
                  <div
                    className="absolute -left-1 top-0 bottom-0 w-[3px] rounded-full"
                    style={{
                      background:
                        "linear-gradient(to bottom, #7C3AED, #3B82F6)",
                    }}
                  />
                  <div className="pl-5">
                    <p className="text-[13px] text-slate-300 leading-relaxed font-medium italic">
                      "I used to struggle to access books due to limited
                      resources — but internet and phones were always around. So
                      I asked: what if all learning resources were online? That
                      question became{" "}
                      <span
                        className="font-black not-italic"
                        style={{ color: "#A78BFA" }}
                      >
                        SchoraHub.
                      </span>
                      "
                    </p>
                  </div>
                </div>

                {/* Vision */}
                <div
                  className="rounded-xl p-4 mb-5"
                  style={{
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.15)",
                  }}
                >
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase text-violet-500 mb-2">
                    Vision
                  </p>
                  <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                    A Malawi where every student has the same access to quality
                    learning resources — regardless of their school, family, or
                    location.
                  </p>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {founder.skills.map((s) => (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        color: "#A78BFA",
                        background: "rgba(124,58,237,0.12)",
                        border: "1px solid rgba(124,58,237,0.25)",
                      }}
                    >
                      {s.icon} {s.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MISSION & VISION — side-by-side
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="px-4 pb-14">
          <Reveal>
            <div className="flex items-center gap-3 mb-8">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(124,58,237,0.5))",
                }}
              />
              <p
                className="text-[9px] font-black tracking-[0.35em] uppercase"
                style={{ color: "#7C3AED" }}
              >
                Purpose
              </p>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.5), transparent)",
                }}
              />
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-3">
            <Reveal delay={40}>
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: "rgba(124,58,237,0.07)",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                <div
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(124,58,237,0.2), transparent)",
                  }}
                />
                <p
                  className="text-[9px] font-black tracking-[0.3em] uppercase mb-3"
                  style={{ color: "#7C3AED" }}
                >
                  Mission
                </p>
                <p className="text-[14px] text-white font-bold leading-snug tracking-tight">
                  Provide free access to books, tutors, and scholarships — so
                  every Malawian student can{" "}
                  <span style={{ color: "#A78BFA" }}>
                    unlock their potential.
                  </span>
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div
                className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(59,130,246,0.18)",
                }}
              >
                <div
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(59,130,246,0.15), transparent)",
                  }}
                />
                <p
                  className="text-[9px] font-black tracking-[0.3em] uppercase mb-3"
                  style={{ color: "#60A5FA" }}
                >
                  Vision
                </p>
                <p className="text-[14px] text-white font-bold leading-snug tracking-tight">
                  A future where geography and income never determine a
                  student's{" "}
                  <span style={{ color: "#60A5FA" }}>access to knowledge.</span>
                </p>
              </div>
            </Reveal>
          </div>

          {/* Core Values — three pills */}
          <Reveal delay={120}>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {[
                { emoji: "🎓", label: "Education First" },
                { emoji: "🤝", label: "Community" },
                { emoji: "🇲🇼", label: "Built in Malawi" },
              ].map((v) => (
                <div
                  key={v.label}
                  className="flex flex-col items-center gap-2 rounded-2xl p-3.5 text-center"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span className="text-2xl">{v.emoji}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-tight">
                    {v.label}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            TECH STACK — scrolling pill strip
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="pb-14 overflow-hidden">
          <Reveal className="px-4">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(124,58,237,0.5))",
                }}
              />
              <p
                className="text-[9px] font-black tracking-[0.35em] uppercase"
                style={{ color: "#7C3AED" }}
              >
                What we've learned
              </p>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.5), transparent)",
                }}
              />
            </div>
          </Reveal>

          <Reveal>
            <div
              className="flex gap-2.5 overflow-x-auto pb-2 px-4 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              {techStack.map((tech, i) => (
                <span
                  key={tech}
                  className="flex-shrink-0 text-[11px] font-black px-4 py-2.5 rounded-full whitespace-nowrap"
                  style={{
                    background:
                      i % 3 === 0
                        ? "rgba(124,58,237,0.12)"
                        : i % 3 === 1
                        ? "rgba(59,130,246,0.1)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      i % 3 === 0
                        ? "1px solid rgba(124,58,237,0.3)"
                        : i % 3 === 1
                        ? "1px solid rgba(59,130,246,0.25)"
                        : "1px solid rgba(255,255,255,0.08)",
                    color:
                      i % 3 === 0
                        ? "#A78BFA"
                        : i % 3 === 1
                        ? "#93C5FD"
                        : "#94A3B8",
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            MEET THE TEAM
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="px-4 pb-14">
          <Reveal>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(124,58,237,0.5))",
                }}
              />
              <p
                className="text-[9px] font-black tracking-[0.35em] uppercase"
                style={{ color: "#7C3AED" }}
              >
                The Team
              </p>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.5), transparent)",
                }}
              />
            </div>
          </Reveal>

          <Reveal delay={40}>
            <p
              className="text-xl font-black tracking-tight text-white mb-6 mt-2 leading-tight"
            >
              Real people.
              <br />
              <span style={{ color: "#94A3B8", fontStyle: "italic" }}>
                Building something real.
              </span>
            </p>
          </Reveal>

          {/* Crew grid */}
          <div className="grid grid-cols-2 gap-3">
            {crew.map((member, i) => (
              <TeamCard key={member.fullName} member={member} index={i} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            FUTURE — Where we're headed
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="px-4 pb-14">
          <Reveal>
            <div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(59,130,246,0.08))",
                border: "1px solid rgba(124,58,237,0.2)",
              }}
            >
              {/* Glow orbs */}
              <div
                className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(124,58,237,0.2), transparent)",
                }}
              />
              <div
                className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(59,130,246,0.15), transparent)",
                }}
              />

              <p
                className="text-[9px] font-black tracking-[0.3em] uppercase mb-3 relative z-10"
                style={{ color: "#A78BFA" }}
              >
                What's next
              </p>
              <h2 className="text-xl font-black text-white leading-tight mb-3 relative z-10 tracking-tight">
                We're just getting started.
              </h2>
              <p className="text-[13px] text-slate-400 leading-relaxed font-medium relative z-10 mb-4">
                More features. More partnerships. More students reached. OTECHY
                is growing — and we're looking for mentors, collaborators, and
                organizations who believe what we believe.
              </p>

              <div className="flex flex-wrap gap-2 relative z-10">
                {[
                  "Partnerships",
                  "Mentorship",
                  "Resources",
                  "Collaboration",
                ].map((item) => (
                  <span
                    key={item}
                    className="text-[10px] font-bold px-3 py-1 rounded-full"
                    style={{
                      color: "#A78BFA",
                      background: "rgba(124,58,237,0.12)",
                      border: "1px solid rgba(124,58,237,0.2)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            CONTACT
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="px-4 pb-14">
          <Reveal>
            <div className="flex items-center gap-3 mb-6">
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(124,58,237,0.5))",
                }}
              />
              <p
                className="text-[9px] font-black tracking-[0.35em] uppercase"
                style={{ color: "#7C3AED" }}
              >
                Contact
              </p>
              <div
                className="h-px flex-1"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(124,58,237,0.5), transparent)",
                }}
              />
            </div>
          </Reveal>

          <Reveal delay={40}>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Email */}
              <a
                href="mailto:otechy8@gmail.com"
                className="flex items-center gap-4 px-5 py-4 transition-colors active:bg-white/5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(124,58,237,0.18)" }}
                >
                  <Mail size={16} style={{ color: "#A78BFA" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-500 mb-0.5">
                    Email
                  </p>
                  <p className="text-[13px] font-bold text-white truncate">
                    otechy8@gmail.com
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
              </a>

              {/* Phones */}
              {[
                { number: "0888258180", label: "Main" },
                { number: "0888712272", label: "Support" },
                { number: "0999626944", label: "Alt" },
              ].map((phone, i, arr) => (
                <a
                  key={phone.number}
                  href={`tel:${phone.number}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors active:bg-white/5"
                  style={{
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)" }}
                  >
                    <Phone size={16} style={{ color: "#60A5FA" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-500 mb-0.5">
                      {phone.label}
                    </p>
                    <p className="text-[13px] font-bold text-white">
                      {phone.number}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                </a>
              ))}
            </div>
          </Reveal>

          {/* Location */}
          <Reveal delay={80}>
            <div
              className="mt-3 flex items-center gap-4 rounded-2xl px-5 py-4"
              style={{
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.15)",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(16,185,129,0.15)" }}
              >
                <MapPin size={16} style={{ color: "#34D399" }} />
              </div>
              <div>
                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-600 mb-0.5">
                  Based in
                </p>
                <p className="text-[13px] font-bold text-white">Malawi 🇲🇼</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════ */}
        <footer
          className="px-4 pb-10 pt-2 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <Reveal>
            <div className="flex items-center justify-center gap-2 mt-6 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #3B82F6)",
                }}
              >
                <GraduationCap size={12} className="text-white" />
              </div>
              <span className="text-[12px] font-black text-white tracking-tight">
                OtechySchora
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-semibold">
              Made with care in Malawi 🇲🇼
            </p>
            <p className="text-[10px] text-slate-700 font-medium mt-1">
              © {new Date().getFullYear()} Otechy · All rights reserved
            </p>
          </Reveal>
        </footer>

      </main>
    </div>
  );
}

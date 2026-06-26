import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Heart,
  Sparkles,
  GraduationCap,
  Star,
  Quote,
  Shield,
  Code2,
  Megaphone,
  TestTube,
  Palette,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeamMember {
  name: string;
  fullName: string;
  role: string;
  photo: string;
  initials: string;
  isFounder?: boolean;
  accentFrom: string;
  accentTo: string;
  skills: { icon: React.ReactNode; label: string }[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const teamMembers: TeamMember[] = [
  {
    name: "Peter",
    fullName: "Peter Mlandula",
    role: "Lead & Founder of Otechy",
    photo: "/ceo.jpg",
    initials: "PM",
    isFounder: true,
    accentFrom: "#7C3AED",
    accentTo: "#3B82F6",
    skills: [
      { icon: <Code2 size={11} />, label: "Full Stack Dev" },
      { icon: <Sparkles size={11} />, label: "Founder" },
    ],
  },
  {
    name: "Theodora",
    fullName: "Theodora Liva",
    role: "Marketing Manager",
    photo: "/theo.jpg",
    initials: "TL",
    accentFrom: "#EC4899",
    accentTo: "#8B5CF6",
    skills: [
      { icon: <Megaphone size={11} />, label: "Marketing" },
      { icon: <Palette size={11} />, label: "UI/UX Design" },
    ],
  },
  {
    name: "Elisha",
    fullName: "Elisha Mkango",
    role: "Software Developer",
    photo: "/elisha.jpg",
    initials: "EM",
    accentFrom: "#3B82F6",
    accentTo: "#06B6D4",
    skills: [
      { icon: <Code2 size={11} />, label: "Software Dev" },
      { icon: <TestTube size={11} />, label: "QA Tester" },
      { icon: <Palette size={11} />, label: "UX Design" },
    ],
  },
  {
    name: "Elijah",
    fullName: "Elijah Mkango",
    role: "Security Manager",
    photo: "/elijah.jpg",
    initials: "EJ",
    accentFrom: "#10B981",
    accentTo: "#3B82F6",
    skills: [
      { icon: <Shield size={11} />, label: "Security" },
      { icon: <Code2 size={11} />, label: "Software Dev" },
    ],
  },
];

const storyParagraphs = [
  "OTECHY was founded in 2025 by a group of passionate young developers who believed that determination and curiosity could overcome limited resources. During the MSCE holiday, while many were taking a break, we chose to invest our time in learning technology, building projects, and developing skills that could create opportunities for ourselves and others.",
  "The initiative began with Peter Mlandula, who shared a vision of creating a team where members could learn together, challenge one another, and grow through practical experience. What started as a small group of self-taught learners has grown into a community driven by continuous improvement, collaboration, and innovation.",
  "Since then, our team has explored a wide range of technologies, including Python, JavaScript, React, and modern web development. We have also expanded our knowledge in artificial intelligence, AI engineering, prompt engineering, cybersecurity, and software development. Every project we build represents another step in our journey of learning and applying new skills to solve real-world problems.",
  "Our path has not been without challenges. Access to learning resources, reliable internet, and computers has often been limited, making it difficult to dedicate as much time to hands-on practice as we would like. Despite these obstacles, our commitment to learning has never changed. We continue to study independently, share knowledge within our team, and build projects that strengthen our experience.",
];

// ─── FadeIn ───────────────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(20px)",
        transition: "opacity 0.55s cubic-bezier(.4,0,.2,1), transform 0.55s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-300 to-violet-400 dark:via-violet-700 dark:to-violet-600" />
      <h2 className="text-[13px] font-black text-slate-800 dark:text-white px-1 tracking-widest uppercase whitespace-nowrap">
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-300 to-violet-400 dark:via-violet-700 dark:to-violet-600" />
    </div>
  );
}

// ─── Founder Card ─────────────────────────────────────────────────────────────
function FounderCard({ member }: { member: TeamMember }) {
  const [imgError, setImgError] = useState(false);

  return (
    <FadeIn delay={60} className="col-span-2">
      <div className="rounded-3xl overflow-hidden shadow-lg border border-violet-100 dark:border-violet-900/30 bg-white dark:bg-slate-800/80">
        {/* Photo */}
        <div className="relative h-72 bg-gradient-to-br from-violet-100 via-indigo-100 to-blue-100 dark:from-violet-900/50 dark:via-indigo-900/30 dark:to-blue-900/30">
          {!imgError ? (
            <img
              src={member.photo}
              alt={member.fullName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl font-black text-violet-300 dark:text-violet-600 select-none">
                {member.initials}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0B2E]/90 via-[#0F0B2E]/20 to-transparent" />

          {/* Founder badge */}
          <div className="absolute top-3.5 left-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black bg-violet-600 text-white shadow-xl tracking-wide">
              <Star size={9} fill="white" strokeWidth={0} /> FOUNDER
            </span>
          </div>

          {/* Name on photo */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
            <p className="text-white font-black text-xl leading-tight tracking-tight">
              {member.fullName}
            </p>
            <p className="text-violet-300 text-xs font-semibold mt-1 tracking-wide">
              {member.role}
            </p>
            {/* skill tags */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {member.skills.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/15 text-white backdrop-blur-sm border border-white/20"
                >
                  {s.icon} {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Team Member Card ─────────────────────────────────────────────────────────
function MemberCard({ member, index }: { member: TeamMember; index: number }) {
  const [imgError, setImgError] = useState(false);

  return (
    <FadeIn delay={index * 90}>
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/40 shadow-sm h-full flex flex-col">
        {/* Photo area */}
        <div className="relative h-48 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${member.accentFrom}22, ${member.accentTo}33)` }}>
          {!imgError ? (
            <img
              src={member.photo}
              alt={member.fullName}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${member.accentFrom}, ${member.accentTo})` }}
              >
                <span className="text-2xl font-black text-white select-none">{member.initials}</span>
              </div>
            </div>
          )}
          {/* bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

          {/* Name pinned at bottom of photo */}
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
            <p className="text-white font-black text-sm leading-tight tracking-tight drop-shadow-sm">
              {member.fullName}
            </p>
          </div>
        </div>

        {/* Info below photo */}
        <div className="p-3 flex-1 flex flex-col gap-2">
          {/* Role with accent dot */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: member.accentFrom }}
            />
            <p className="text-[11px] font-bold leading-snug"
              style={{ color: member.accentFrom }}>
              {member.role}
            </p>
          </div>

          {/* Skill chips */}
          <div className="flex flex-wrap gap-1">
            {member.skills.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border"
                style={{
                  color: member.accentFrom,
                  borderColor: `${member.accentFrom}40`,
                  background: `${member.accentFrom}10`,
                }}
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface AboutUsProps {
  onBack?: () => void;
}

export default function AboutUs({ onBack }: AboutUsProps) {
  const founder = teamMembers.find((m) => m.isFounder)!;
  const crew = teamMembers.filter((m) => !m.isFounder);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F1A] text-slate-800 dark:text-slate-100">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 bg-slate-50/95 dark:bg-[#0F0F1A]/95 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/60">
        <div className="flex items-center gap-3 px-4 py-3.5 max-w-lg mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full
                bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700
                text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow">
              <GraduationCap size={14} className="text-white" />
            </div>
            <h1 className="text-[15px] font-black text-slate-900 dark:text-white tracking-tight">
              About Us
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 pb-20 space-y-8">

        {/* ── HERO ── */}
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#2D2780] to-[#4C1D95] p-6 shadow-2xl">
            {/* Blobs */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/5 blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-start gap-4">
              {/* Company logo */}
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-xl flex-shrink-0">
                <GraduationCap size={30} className="text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-violet-300 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                  Education Hub · Malawi
                </p>
                <h2 className="text-2xl font-black text-white leading-tight tracking-tight">
                  Schora<span className="text-violet-300">Hub</span>
                </h2>
                <p className="text-slate-300 text-[13px] mt-2 leading-relaxed">
                  Built entirely for{" "}
                  <span className="text-white font-black">Malawian Students</span>
                </p>
              </div>
            </div>

            {/* Tagline below */}
            <div className="relative z-10 mt-5 pt-4 border-t border-white/10">
              <p className="text-slate-300 text-[12px] leading-relaxed italic">
                "Empowering young minds through technology, one resource at a time."
              </p>
            </div>
          </div>
        </FadeIn>

        {/* ── MISSION ── */}
        <FadeIn delay={70}>
          <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-md flex-shrink-0">
                <Heart size={17} className="text-white" fill="white" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Our Mission
              </p>
            </div>
            <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              To provide the best access to online books, tutors, and scholarships — so that
              every Malawian Student can unlock their full potential{" "}
              <span className="font-black text-violet-600 dark:text-violet-400">
                without spending a dime.
              </span>
            </p>
          </div>
        </FadeIn>

        {/* ── STORY BEHIND SCHORAHUB ── */}
        <FadeIn delay={70}>
          <SectionTitle>The Story Behind SchoraHub</SectionTitle>

          <div className="rounded-3xl overflow-hidden shadow-lg border border-violet-100 dark:border-violet-900/30 bg-white dark:bg-slate-800/80">
            {/* Founder photo */}
            <div className="relative h-72 bg-gradient-to-br from-violet-100 to-indigo-200 dark:from-violet-900/40 dark:to-indigo-900/30">
              <img
                src="/ceo.jpg"
                alt="Peter Mlandula"
                className="w-full h-full object-cover object-top"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0B2E]/90 via-[#0F0B2E]/15 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-violet-600 text-white tracking-wide">
                    FOUNDER
                  </span>
                </div>
                <p className="text-white font-black text-xl leading-tight tracking-tight">
                  Peter Mlandula
                </p>
                <p className="text-violet-300 text-xs font-semibold mt-0.5">
                  Founder & Sole Developer of SchoraHub
                </p>
              </div>
            </div>

            {/* Quote */}
            <div className="p-5">
              <div className="flex gap-3 items-start">
                <Quote size={20} className="text-violet-400 flex-shrink-0 mt-0.5" fill="currentColor" />
                <p className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed italic font-medium">
                  I used to face a lot of problems accessing books due to limited resources,
                  but one thing that was mostly abundant was internet and access to phones.
                  So I wondered — what if all learning resources could be found online?
                  That question is what made Schora Hub possible, all through{" "}
                  <span className="font-black not-italic text-[#1E1B4B] dark:text-indigo-300 tracking-wide">
                    Otechy
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── OTECHY STORY ── */}
        <FadeIn delay={70}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-300 to-violet-400 dark:via-violet-700 dark:to-violet-600" />
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-violet-500" />
              <h2 className="text-[13px] font-black text-slate-800 dark:text-white tracking-widest uppercase">
                Otechy
              </h2>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-300 to-violet-400 dark:via-violet-700 dark:to-violet-600" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-500 dark:text-violet-400 text-center mb-5">
            Our Story
          </p>

          <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 p-5 shadow-sm space-y-4">
            {storyParagraphs.map((para, i) => (
              <p key={i} className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {para}
              </p>
            ))}

            {/* "Today" highlight block */}
            <div className="rounded-xl bg-violet-50 dark:bg-violet-900/25 border-l-[3px] border-violet-500 pl-4 pr-3 py-3.5">
              <p className="text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                <span className="font-black text-violet-600 dark:text-violet-400">Today</span>,
                OTECHY is more than just a group of developers — it is a vision for empowering
                young people through technology, education, and innovation. We believe that
                talent can emerge from anywhere when people are given the opportunity to learn,
                create, and collaborate.
              </p>
            </div>

            <p className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              As we continue to grow, we welcome mentorship, partnerships, access to learning
              resources, and opportunities to collaborate with individuals and organizations
              that share our passion for technology and education. Every form of support helps
              us move closer to our mission of creating impactful digital solutions while
              inspiring the next generation of innovators.
            </p>
          </div>
        </FadeIn>

        {/* ── MEET OUR TEAM ── */}
        <FadeIn delay={60}>
          <SectionTitle>Meet Our Team</SectionTitle>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center -mt-3 mb-5 font-semibold tracking-wide">
            The people building the future of education in Malawi
          </p>

          {/* Founder — full width */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <FounderCard member={founder} />
          </div>

          {/* Crew — 2 column grid */}
          <div className="grid grid-cols-2 gap-3">
            {crew.map((member, i) => (
              <MemberCard key={member.fullName} member={member} index={i} />
            ))}
          </div>
        </FadeIn>

        {/* ── VALUES ── */}
        <FadeIn delay={60}>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: "🎓", label: "Education First", from: "#7C3AED", to: "#6D28D9" },
              { icon: "🤝", label: "Community Driven", from: "#3B82F6", to: "#2563EB" },
              { icon: "🇲🇼", label: "Built in Malawi", from: "#10B981", to: "#059669" },
            ].map((v) => (
              <div
                key={v.label}
                className="flex flex-col items-center gap-2 rounded-2xl p-3.5 shadow-sm text-center border border-slate-100 dark:border-slate-700/40 bg-white dark:bg-slate-800/60"
              >
                <span className="text-2xl">{v.icon}</span>
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 leading-tight tracking-wide uppercase">
                  {v.label}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ── CONTACT ── */}
        <FadeIn delay={70}>
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#2D2780] to-[#4C1D95] shadow-2xl relative">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />

            <div className="relative z-10 p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg">
                  <Phone size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[15px] font-black text-white tracking-tight">
                    Contact & Support
                  </h3>
                  <p className="text-[11px] text-violet-300 font-semibold mt-0.5">
                    For support and reports
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Email */}
                <a
                  href="mailto:otechy8@gmail.com"
                  className="flex items-center gap-3.5 rounded-2xl bg-white/10 active:bg-white/20 px-4 py-3.5 transition-all active:scale-[0.97]"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/40 flex items-center justify-center flex-shrink-0 shadow">
                    <Mail size={17} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-violet-300 font-black uppercase tracking-[0.15em]">
                      Email
                    </p>
                    <p className="text-[13px] text-white font-bold truncate mt-0.5">
                      otechy8@gmail.com
                    </p>
                  </div>
                </a>

                {/* Phones */}
                {[
                  { number: "0888258180", label: "Main Line" },
                  { number: "0888712272", label: "Support" },
                  { number: "0999626944", label: "Alternative" },
                ].map((phone) => (
                  <a
                    key={phone.number}
                    href={`tel:${phone.number}`}
                    className="flex items-center gap-3.5 rounded-2xl bg-white/10 active:bg-white/20 px-4 py-3.5 transition-all active:scale-[0.97]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/40 flex items-center justify-center flex-shrink-0 shadow">
                      <Phone size={17} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-300 font-black uppercase tracking-[0.15em]">
                        {phone.label}
                      </p>
                      <p className="text-[13px] text-white font-bold mt-0.5">{phone.number}</p>
                    </div>
                  </a>
                ))}

                {/* Location */}
                <div className="flex items-center gap-3.5 rounded-2xl bg-white/10 px-4 py-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/40 flex items-center justify-center flex-shrink-0 shadow">
                    <MapPin size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-300 font-black uppercase tracking-[0.15em]">
                      Based In
                    </p>
                    <p className="text-[13px] text-white font-bold mt-0.5">Malawi 🇲🇼</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── FOOTER ── */}
        <FadeIn delay={40}>
          <div className="text-center space-y-1.5 pt-1 pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                <GraduationCap size={12} className="text-white" />
              </div>
              <span className="text-[12px] font-black text-slate-700 dark:text-slate-300 tracking-tight">
                OtechySchora
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
              Made with ❤️ in Malawi
            </p>
            <p className="text-[10px] text-slate-300 dark:text-slate-600 font-medium">
              © {new Date().getFullYear()} Otechy · All rights reserved
            </p>
          </div>
        </FadeIn>

      </main>
    </div>
  );
}

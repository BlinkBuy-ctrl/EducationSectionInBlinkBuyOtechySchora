import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Heart,
  Sparkles,
  BookOpen,
  Star,
  Quote,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeamMember {
  name: string;
  role: string;
  photo: string;
  tags: string[];
  isFounder?: boolean;
  initials: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const teamMembers: TeamMember[] = [
  {
    name: "Peter Mlandula",
    role: "Lead & Founder of Otechy",
    photo: "/ceo.png",
    tags: ["Founder", "Full Stack Dev"],
    isFounder: true,
    initials: "PM",
  },
  {
    name: "Theo",
    role: "Marketing Manager",
    photo: "/theo.png",
    tags: ["Marketing", "UI/UX Design"],
    initials: "TH",
  },
  {
    name: "Elisha",
    role: "Software Developer",
    photo: "/elisha.png",
    tags: ["Dev", "UX Design", "QA Tester"],
    initials: "EL",
  },
  {
    name: "Elijah Mkango",
    role: "Security Manager",
    photo: "/elijah.png",
    tags: ["Security", "Software Dev"],
    initials: "EM",
  },
];

const storyParagraphs = [
  "OTECHY was founded in 2025 by a group of passionate young developers who believed that determination and curiosity could overcome limited resources. During the MSCE holiday, while many were taking a break, we chose to invest our time in learning technology, building projects, and developing skills that could create opportunities for ourselves and others.",
  "The initiative began with Peter Mlandula, who shared a vision of creating a team where members could learn together, challenge one another, and grow through practical experience. What started as a small group of self-taught learners has grown into a community driven by continuous improvement, collaboration, and innovation.",
  "Since then, our team has explored a wide range of technologies, including Python, JavaScript, React, and modern web development. We have also expanded our knowledge in artificial intelligence, AI engineering, prompt engineering, cybersecurity, and software development. Every project we build represents another step in our journey of learning and applying new skills to solve real-world problems.",
  "Our path has not been without challenges. Access to learning resources, reliable internet, and computers has often been limited, making it difficult to dedicate as much time to hands-on practice as we would like. Despite these obstacles, our commitment to learning has never changed. We continue to study independently, share knowledge within our team, and build projects that strengthen our experience.",
];

// ─── FadeIn animation wrapper ─────────────────────────────────────────────────
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
      { threshold: 0.1 }
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
        transform: visible ? "translateY(0px)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200 to-violet-300 dark:via-violet-800 dark:to-violet-700" />
      <h2 className="text-sm font-bold text-slate-800 dark:text-white px-1 tracking-wide whitespace-nowrap">
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-200 to-violet-300 dark:via-violet-800 dark:to-violet-700" />
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────
function TeamCard({ member, index }: { member: TeamMember; index: number }) {
  const [imgError, setImgError] = useState(false);

  if (member.isFounder) {
    return (
      <FadeIn delay={index * 80} className="col-span-2">
        <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800/80 border border-violet-100 dark:border-violet-900/40 shadow-md">
          {/* Photo */}
          <div className="relative h-64 bg-gradient-to-br from-violet-100 via-indigo-100 to-blue-100 dark:from-violet-900/40 dark:via-indigo-900/30 dark:to-blue-900/30">
            {!imgError ? (
              <img
                src={member.photo}
                alt={member.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl font-bold text-violet-300 dark:text-violet-600 select-none">
                  {member.initials}
                </span>
              </div>
            )}
            {/* gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B4B]/75 via-[#1E1B4B]/10 to-transparent" />

            {/* Founder badge */}
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-violet-600 text-white shadow-lg">
                <Star size={10} fill="white" strokeWidth={0} /> Founder
              </span>
            </div>

            {/* Name overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white font-bold text-lg leading-tight">{member.name}</p>
              <p className="text-violet-300 text-xs font-medium mt-0.5">{member.role}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="px-4 py-3 flex flex-wrap gap-1.5">
            {member.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full text-xs font-semibold
                  bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300
                  border border-violet-100 dark:border-violet-800/50"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn delay={index * 80}>
      <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700/40 shadow-sm h-full">
        {/* Photo */}
        <div className="relative h-44 bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/20">
          {!imgError ? (
            <img
              src={member.photo}
              alt={member.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-bold text-violet-300 dark:text-violet-600 select-none">
                {member.initials}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
            {member.name}
          </p>
          <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium mt-0.5 leading-snug">
            {member.role}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {member.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[9px] font-semibold
                  bg-slate-100 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400"
              >
                {tag}
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
          <h1 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">
            About Us
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 pb-20 space-y-9">

        {/* ── HERO ── */}
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#2E2880] to-[#4C1D95] p-6 shadow-2xl min-h-[180px]">
            {/* Decorative blobs */}
            <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-violet-500/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
            <div className="absolute top-1/2 right-6 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5 blur-xl pointer-events-none" />

            <div className="relative z-10">
              {/* Logo icon */}
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-5 border border-white/20 shadow-lg">
                <BookOpen size={24} className="text-white" />
              </div>

              <p className="text-violet-300 text-xs font-semibold uppercase tracking-widest mb-1.5">
                Education Hub · Malawi
              </p>
              <h2 className="text-2xl font-extrabold text-white leading-tight">
                Welcome to{" "}
                <span className="text-violet-300">Schora Hub</span>
              </h2>
              <p className="text-slate-300 text-sm mt-2.5 leading-relaxed max-w-xs">
                An education platform built entirely for{" "}
                <span className="text-white font-semibold">Malawian Students</span>
              </p>
            </div>
          </div>
        </FadeIn>

        {/* ── MISSION ── */}
        <FadeIn delay={80}>
          <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <Heart size={16} className="text-white" fill="white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Our Mission
              </p>
            </div>
            <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed">
              To provide the best access to online books, tutors, and scholarships. We believe
              that with this platform, Malawian Students can unlock their full potential —{" "}
              <span className="font-bold text-violet-600 dark:text-violet-400">
                without spending a dime.
              </span>
            </p>
          </div>
        </FadeIn>

        {/* ── THE STORY BEHIND SCHORAHUB ── */}
        <FadeIn delay={80}>
          <SectionTitle>The Story Behind SchoraHub</SectionTitle>

          {/* Founder card */}
          <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800/70 border border-violet-100 dark:border-violet-900/30 shadow-md">
            {/* Photo with gradient overlay */}
            <div className="relative h-64 bg-gradient-to-br from-violet-100 to-indigo-200 dark:from-violet-900/40 dark:to-indigo-900/30">
              <img
                src="/ceo.png"
                alt="Peter Mlandula"
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12103A]/85 via-[#12103A]/20 to-transparent" />

              {/* Name on photo */}
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-extrabold text-lg leading-tight">
                  Peter Mlandula
                </p>
                <p className="text-violet-300 text-xs font-medium mt-0.5">
                  Founder & Sole Developer of SchoraHub
                </p>
              </div>
            </div>

            {/* Quote */}
            <div className="p-5">
              <div className="flex gap-3">
                <Quote
                  size={22}
                  className="text-violet-400 dark:text-violet-500 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                />
                <p className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  I used to face a lot of problems accessing books due to limited resources,
                  but one thing that was mostly abundant was internet and access to phones.
                  So I wondered — what if all learning resources could be found online?
                  That question is what made Schora Hub possible, all through{" "}
                  <span className="font-extrabold not-italic text-[#1E1B4B] dark:text-indigo-300 tracking-wide">
                    Otechy
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── OTECHY COMPANY STORY ── */}
        <FadeIn delay={80}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200 to-violet-300 dark:via-violet-800 dark:to-violet-700" />
            <div className="flex items-center gap-1.5 px-1">
              <Sparkles size={13} className="text-violet-500" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">
                Otechy
              </h2>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-violet-200 to-violet-300 dark:via-violet-800 dark:to-violet-700" />
          </div>

          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500 dark:text-violet-400 text-center mb-5">
            Our Story
          </p>

          <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/40 p-5 shadow-sm space-y-4">
            {storyParagraphs.map((para, i) => (
              <p
                key={i}
                className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed"
              >
                {para}
              </p>
            ))}

            {/* "Today" paragraph — highlighted */}
            <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-500 pl-4 pr-3 py-3">
              <p className="text-[13.5px] text-slate-700 dark:text-slate-200 leading-relaxed">
                <span className="font-extrabold text-violet-600 dark:text-violet-400">
                  Today
                </span>
                , OTECHY is more than just a group of developers — it is a vision for
                empowering young people through technology, education, and innovation. We
                believe that talent can emerge from anywhere when people are given the
                opportunity to learn, create, and collaborate.
              </p>
            </div>

            {/* Closing paragraph */}
            <p className="text-[13.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
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
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center -mt-3 mb-5 font-medium">
            The people building the future of education in Malawi
          </p>

          <div className="grid grid-cols-2 gap-3">
            {teamMembers.map((member, i) => (
              <TeamCard key={member.name} member={member} index={i} />
            ))}
          </div>
        </FadeIn>

        {/* ── VALUES ── */}
        <FadeIn delay={60}>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: "🎓", label: "Education First", color: "from-violet-500/10 to-violet-600/5" },
              { icon: "🤝", label: "Community Driven", color: "from-blue-500/10 to-blue-600/5" },
              { icon: "🇲🇼", label: "Built in Malawi", color: "from-emerald-500/10 to-emerald-600/5" },
            ].map((v) => (
              <div
                key={v.label}
                className={`flex flex-col items-center gap-2 rounded-2xl
                  bg-gradient-to-br ${v.color}
                  border border-white dark:border-slate-700/40
                  bg-white dark:bg-slate-800/60 p-3.5 shadow-sm text-center`}
              >
                <span className="text-2xl">{v.icon}</span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                  {v.label}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ── CONTACT ── */}
        <FadeIn delay={80}>
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#2E2880] to-[#4C1D95] shadow-xl relative">
            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-violet-400/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-indigo-400/15 blur-2xl pointer-events-none" />

            <div className="relative z-10 p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <Phone size={17} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Contact & Support</h3>
                  <p className="text-[11px] text-violet-300 mt-0.5">
                    For support and reports
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Email */}
                <a
                  href="mailto:otechy8@gmail.com"
                  className="flex items-center gap-3.5 rounded-2xl bg-white/10 active:bg-white/20 px-4 py-3.5 transition-all active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-500/40 flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-violet-300 font-bold uppercase tracking-wider">
                      Email
                    </p>
                    <p className="text-[13px] text-white font-semibold truncate">
                      otechy8@gmail.com
                    </p>
                  </div>
                </a>

                {/* Phone numbers */}
                {[
                  { number: "0888258180", label: "Main Line" },
                  { number: "0888712272", label: "Support" },
                  { number: "0999626944", label: "Alternative" },
                ].map((phone) => (
                  <a
                    key={phone.number}
                    href={`tel:${phone.number}`}
                    className="flex items-center gap-3.5 rounded-2xl bg-white/10 active:bg-white/20 px-4 py-3.5 transition-all active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/40 flex items-center justify-center flex-shrink-0">
                      <Phone size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">
                        {phone.label}
                      </p>
                      <p className="text-[13px] text-white font-semibold">{phone.number}</p>
                    </div>
                  </a>
                ))}

                {/* Location */}
                <div className="flex items-center gap-3.5 rounded-2xl bg-white/10 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/40 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                      Based In
                    </p>
                    <p className="text-[13px] text-white font-semibold">Malawi 🇲🇼</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ── FOOTER ── */}
        <FadeIn delay={40}>
          <div className="text-center space-y-1 pt-2 pb-2">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Made with ❤️ in Malawi
            </p>
            <p className="text-[11px] text-slate-300 dark:text-slate-600">
              © {new Date().getFullYear()} Otechy · OtechySchora
            </p>
          </div>
        </FadeIn>

      </main>
    </div>
  );
}

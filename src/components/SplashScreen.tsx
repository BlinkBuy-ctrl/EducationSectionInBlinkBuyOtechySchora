import { useEffect, useState } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 2400);
    const t2 = setTimeout(() => onDone(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none"
      style={{
        background: "linear-gradient(160deg,#0d0f1e 0%,#150d2e 50%,#0a1628 100%)",
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: hiding ? "none" : "all",
      }}
    >
      <style>{`
        @keyframes page1 {
          0%,100% { d: path("M 60 20 L 60 100 L 110 100 L 110 20 Z"); fill: #e9d5ff; }
          50%      { d: path("M 60 20 C 60 20 40 60 60 100 L 60 100 L 60 20 Z"); fill: #c4b5fd; }
        }
        @keyframes page2 {
          0%,100% { d: path("M 60 20 L 60 100 L 110 100 L 110 20 Z"); fill: #dbeafe; }
          50%      { d: path("M 60 20 C 60 20 38 58 60 100 L 60 100 L 60 20 Z"); fill: #93c5fd; }
        }
        @keyframes page3 {
          0%,100% { d: path("M 60 20 L 60 100 L 110 100 L 110 20 Z"); fill: #ede9fe; }
          50%      { d: path("M 60 20 C 60 20 36 56 60 100 L 60 100 L 60 20 Z"); fill: #a78bfa; }
        }
        @keyframes floatBook {
          0%,100% { transform: translateY(0px);  }
          50%      { transform: translateY(-8px); }
        }
        @keyframes shimmerDot {
          0%,100% { opacity:0.3; transform:scale(0.8); }
          50%      { opacity:1;   transform:scale(1.2); }
        }
        @keyframes glowPulse {
          0%,100% { opacity:0.4; r: 55; }
          50%      { opacity:0.7; r: 65; }
        }
        .book-float { animation: floatBook 2s ease-in-out infinite; }
        .pg1 { animation: page1 0.45s ease-in-out 0s   infinite; }
        .pg2 { animation: page2 0.45s ease-in-out 0.15s infinite; }
        .pg3 { animation: page3 0.45s ease-in-out 0.3s  infinite; }
      `}</style>

      {/* Book SVG */}
      <div className="book-float">
        <svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
          {/* Glow */}
          <circle cx="70" cy="75" r="55" fill="url(#glow)" opacity="0.5">
            <animate attributeName="r" values="50;65;50" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5b21b6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="spineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>

          {/* Back cover */}
          <rect x="28" y="22" width="58" height="88" rx="4" fill="#1e3a8a" />

          {/* Turning pages — animate via SMIL since CSS `d` not supported everywhere */}
          {/* Page 3 (back) */}
          <path fill="#ede9fe" opacity="0.9">
            <animate attributeName="d"
              values="M60,22 L108,22 L108,110 L60,110 Z;M60,22 C60,22 34,66 60,110 L60,110 Z;M60,22 L108,22 L108,110 L60,110 Z"
              dur="0.9s" begin="0.3s" repeatCount="indefinite" calcMode="spline"
              keySplines="0.4 0 0.2 1;0.4 0 0.2 1" />
          </path>
          {/* Page 2 */}
          <path fill="#dbeafe" opacity="0.95">
            <animate attributeName="d"
              values="M60,22 L108,22 L108,110 L60,110 Z;M60,22 C60,22 36,64 60,110 L60,110 Z;M60,22 L108,22 L108,110 L60,110 Z"
              dur="0.9s" begin="0.15s" repeatCount="indefinite" calcMode="spline"
              keySplines="0.4 0 0.2 1;0.4 0 0.2 1" />
          </path>
          {/* Page 1 (front) */}
          <path fill="#f5f3ff">
            <animate attributeName="d"
              values="M60,22 L108,22 L108,110 L60,110 Z;M60,22 C60,22 38,62 60,110 L60,110 Z;M60,22 L108,22 L108,110 L60,110 Z"
              dur="0.9s" begin="0s" repeatCount="indefinite" calcMode="spline"
              keySplines="0.4 0 0.2 1;0.4 0 0.2 1" />
          </path>

          {/* Front cover */}
          <rect x="28" y="22" width="32" height="88" rx="3" fill="url(#coverGrad)" />
          {/* Spine */}
          <rect x="28" y="22" width="8" height="88" rx="2" fill="url(#spineGrad)" />

          {/* Lines on cover */}
          <line x1="36" y1="50" x2="56" y2="50" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <line x1="36" y1="60" x2="54" y2="60" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
          <line x1="36" y1="70" x2="56" y2="70" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

          {/* Star sparkles */}
          <circle cx="112" cy="28" r="2" fill="#c4b5fd">
            <animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="0s" repeatCount="indefinite" />
          </circle>
          <circle cx="22" cy="90" r="1.5" fill="#93c5fd">
            <animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="118" cy="95" r="1.5" fill="#818cf8">
            <animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* App name */}
      <h1 className="text-2xl font-black text-white mt-2 tracking-tight">OtechySchora</h1>
      <p className="text-purple-300 text-xs font-medium mt-1">Education Hub · Malawi</p>

      {/* Loading dots */}
      <div className="flex gap-2 mt-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-purple-500"
            style={{ animation: `shimmerDot 0.8s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 text-white/25 text-[10px] tracking-widest uppercase">
        Powered by Otechy
      </p>
    </div>
  );
}

import { useEffect, useState } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 2200);
    const t2 = setTimeout(() => onDone(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(135deg, hsl(220,25%,6%) 0%, hsl(250,40%,10%) 100%)",
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: hiding ? "none" : "all",
      }}
    >
      <style>{`
        @keyframes flip {
          0%   { transform: rotateY(0deg);   }
          100% { transform: rotateY(-180deg); }
        }
        @keyframes flip2 {
          0%   { transform: rotateY(0deg);   }
          100% { transform: rotateY(-180deg); }
        }
        .page { transform-style: preserve-3d; transform-origin: left center; }
        .p1 { animation: flip  0.4s ease-in-out 0.1s infinite alternate; }
        .p2 { animation: flip  0.4s ease-in-out 0.25s infinite alternate; }
        .p3 { animation: flip  0.4s ease-in-out 0.4s  infinite alternate; }
        .p4 { animation: flip2 0.4s ease-in-out 0.55s infinite alternate; }
        @keyframes glow {
          0%,100% { opacity: 0.6; } 50% { opacity: 1; }
        }
        .glow { animation: glow 1.2s ease-in-out infinite; }
      `}</style>

      {/* Book */}
      <div className="relative" style={{ width: 90, height: 110, perspective: 400 }}>
        {/* Cover back */}
        <div className="absolute inset-0 rounded-r-lg rounded-l-sm"
          style={{ background: "linear-gradient(135deg,#4c1d95,#1e3a8a)", boxShadow: "4px 4px 20px rgba(139,92,246,0.4)" }} />

        {/* Spine */}
        <div className="absolute left-0 top-0 bottom-0 w-3 rounded-l-sm"
          style={{ background: "linear-gradient(180deg,#6d28d9,#1d4ed8)" }} />

        {/* Pages */}
        {[0,1,2,3].map(i => (
          <div key={i} className={`page p${i+1} absolute`}
            style={{
              left: 12, top: 8, right: 4, bottom: 8,
              background: i % 2 === 0
                ? "linear-gradient(90deg,#e8e0ff,#fff)"
                : "linear-gradient(90deg,#dbeafe,#fff)",
              borderRadius: "0 4px 4px 0",
              boxShadow: "2px 0 6px rgba(0,0,0,0.2)",
            }}
          />
        ))}

        {/* Cover front */}
        <div className="absolute inset-0 rounded-r-lg rounded-l-sm flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,#5b21b6,#1e40af)",
            boxShadow: "-2px 0 10px rgba(0,0,0,0.3)",
            left: 12,
          }}>
          <span style={{ fontSize: 32 }}>📚</span>
        </div>

        {/* Glow */}
        <div className="glow absolute -inset-4 rounded-full"
          style={{ background: "radial-gradient(circle,rgba(139,92,246,0.25) 0%,transparent 70%)", zIndex: -1 }} />
      </div>

      {/* Text */}
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-black text-white tracking-tight">OtechySchora</h1>
        <p className="text-purple-300 text-xs font-medium mt-1">Education Hub · Malawi</p>
      </div>

      {/* Dots loader */}
      <div className="flex gap-1.5 mt-6">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400"
            style={{ animation: `glow 0.8s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>

      {/* Footer */}
      <p className="absolute bottom-8 text-white/25 text-[10px] font-medium">Powered by Otechy</p>
    </div>
  );
}

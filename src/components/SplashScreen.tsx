import { useEffect, useState, useRef } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [hiding,   setHiding]   = useState(false);
  const [page,     setPage]     = useState(0); // 0=cover, 1=page turning
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const DURATION = 3000; // ms

  useEffect(() => {
    // Show cover for 600ms then start turning
    const coverTimer = setTimeout(() => setPage(1), 600);

    // Smooth progress bar
    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setHiding(true), 200);
        setTimeout(() => onDone(), 700);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(coverTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none"
      style={{
        background: "linear-gradient(160deg,#0d0f1e 0%,#150d2e 55%,#0a1628 100%)",
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: hiding ? "none" : "all",
      }}
    >
      <style>{`
        @keyframes floatBook {
          0%,100% { transform:translateY(0px); }
          50%      { transform:translateY(-6px); }
        }
        @keyframes coverFlip {
          0%   { transform: perspective(400px) rotateY(0deg); }
          100% { transform: perspective(400px) rotateY(-160deg); }
        }
        @keyframes pageTurn {
          0%   { transform: perspective(400px) rotateY(0deg);    }
          100% { transform: perspective(400px) rotateY(-170deg); }
        }
        @keyframes sparkle {
          0%,100% { opacity:0; transform:scale(0.5); }
          50%      { opacity:1; transform:scale(1.2); }
        }
        .book-float  { animation: floatBook 2.4s ease-in-out infinite; }
        .cover-flip  { transform-origin: left center; animation: coverFlip 0.55s ease-in-out 0.6s 1 forwards; }
        .page-turn-1 { transform-origin: left center; animation: pageTurn 0.38s ease-in-out 1.2s infinite alternate; }
        .page-turn-2 { transform-origin: left center; animation: pageTurn 0.38s ease-in-out 1.35s infinite alternate; }
        .page-turn-3 { transform-origin: left center; animation: pageTurn 0.38s ease-in-out 1.5s infinite alternate; }
      `}</style>

      {/* Book */}
      <div className="book-float" style={{ width: 160, height: 180, position: "relative" }}>

        {/* ── BACK COVER ── */}
        <div style={{
          position:"absolute", left:50, top:10, width:100, height:140,
          borderRadius:"2px 8px 8px 2px",
          background:"linear-gradient(135deg,#1e3a8a,#0f2060)",
          boxShadow:"4px 4px 20px rgba(30,58,138,0.5)",
        }} />

        {/* ── PAGES (white stack) ── */}
        <div style={{ position:"absolute", left:54, top:13, width:94, height:134, background:"#e8e4f0", borderRadius:"0 6px 6px 0" }} />
        <div style={{ position:"absolute", left:54, top:14, width:92, height:132, background:"#f0edf8", borderRadius:"0 6px 6px 0" }} />
        <div style={{ position:"absolute", left:54, top:15, width:90, height:130, background:"#f5f3ff", borderRadius:"0 6px 6px 0" }} />

        {/* ── TURNING PAGES (animate) ── */}
        <div className="page-turn-3" style={{
          position:"absolute", left:50, top:13, width:96, height:134,
          background:"linear-gradient(90deg,#ddd6fe,#ede9fe)",
          borderRadius:"2px 8px 8px 2px",
          boxShadow:"2px 0 8px rgba(0,0,0,0.15)",
        }} />
        <div className="page-turn-2" style={{
          position:"absolute", left:50, top:13, width:96, height:134,
          background:"linear-gradient(90deg,#bfdbfe,#dbeafe)",
          borderRadius:"2px 8px 8px 2px",
          boxShadow:"2px 0 8px rgba(0,0,0,0.15)",
        }} />
        <div className="page-turn-1" style={{
          position:"absolute", left:50, top:13, width:96, height:134,
          background:"linear-gradient(90deg,#c4b5fd,#ede9fe)",
          borderRadius:"2px 8px 8px 2px",
          boxShadow:"2px 0 8px rgba(0,0,0,0.2)",
        }} />

        {/* ── FRONT COVER (flips open once) ── */}
        <div className="cover-flip" style={{
          position:"absolute", left:50, top:10, width:100, height:140,
          borderRadius:"2px 8px 8px 2px",
          background:"linear-gradient(135deg,#5b21b6,#1e40af)",
          boxShadow:"4px 4px 24px rgba(91,33,182,0.5)",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:6,
          padding: "0 12px",
        }}>
          {/* Cover text */}
          <div style={{
            background:"rgba(255,255,255,0.15)", borderRadius:6,
            padding:"4px 8px", textAlign:"center",
          }}>
            <p style={{ color:"#e9d5ff", fontSize:9, fontWeight:900, letterSpacing:1, textTransform:"uppercase" }}>OtechySchora</p>
          </div>
          <p style={{ color:"#c4b5fd", fontSize:7, fontWeight:700, textAlign:"center", lineHeight:1.4 }}>Education Hub{"\n"}Malawi</p>
          {/* Decorative lines */}
          <div style={{ width:"70%", height:1, background:"rgba(196,181,253,0.4)", borderRadius:1 }} />
          <div style={{ width:"50%", height:1, background:"rgba(196,181,253,0.25)", borderRadius:1 }} />
        </div>

        {/* ── SPINE ── */}
        <div style={{
          position:"absolute", left:44, top:10, width:10, height:140,
          borderRadius:"4px 0 0 4px",
          background:"linear-gradient(180deg,#4c1d95,#1e3a8a)",
          boxShadow:"-2px 0 8px rgba(0,0,0,0.3)",
        }} />

        {/* Sparkles */}
        {[
          { cx:138, cy:18,  r:2.5, color:"#c4b5fd", delay:"0s"    },
          { cx:28,  cy:100, r:1.8, color:"#93c5fd", delay:"0.5s"  },
          { cx:145, cy:120, r:1.8, color:"#818cf8", delay:"1.0s"  },
          { cx:20,  cy:30,  r:1.5, color:"#a78bfa", delay:"0.75s" },
        ].map((s,i) => (
          <div key={i} style={{
            position:"absolute",
            left: s.cx, top: s.cy,
            width: s.r*2, height: s.r*2,
            borderRadius:"50%",
            background: s.color,
            animation: `sparkle 1.2s ease-in-out ${s.delay} infinite`,
          }} />
        ))}
      </div>

      {/* Title */}
      <h1 style={{ color:"#fff", fontSize:22, fontWeight:900, marginTop:20, letterSpacing:-0.5 }}>
        OtechySchora
      </h1>
      <p style={{ color:"#a78bfa", fontSize:11, fontWeight:600, marginTop:4 }}>
        Education Hub · Malawi
      </p>

      {/* Progress bar with book icon */}
      <div style={{ marginTop:28, width:220 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:14 }}>📚</span>
            <span style={{ color:"#c4b5fd", fontSize:10, fontWeight:700 }}>Loading...</span>
          </div>
          <span style={{ color:"#a78bfa", fontSize:11, fontWeight:800 }}>{progress}%</span>
        </div>
        {/* Track */}
        <div style={{ width:"100%", height:5, background:"rgba(255,255,255,0.1)", borderRadius:99, overflow:"hidden" }}>
          {/* Fill */}
          <div style={{
            height:"100%", width:`${progress}%`,
            background:"linear-gradient(90deg,#7c3aed,#2563eb)",
            borderRadius:99,
            transition:"width 0.1s linear",
            boxShadow:"0 0 8px rgba(124,58,237,0.6)",
          }} />
        </div>
      </div>

      {/* Footer */}
      <p style={{
        position:"absolute", bottom:32,
        color:"rgba(255,255,255,0.2)", fontSize:9,
        fontWeight:600, letterSpacing:3, textTransform:"uppercase",
      }}>
        Powered by Otechy
      </p>
    </div>
  );
}

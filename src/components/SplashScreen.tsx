import { useEffect, useRef, useState } from "react";

const PAGE_DATA = [
  {
    title: "MSCE Past Papers",
    lines: ["Mathematics 2023","Biology Paper 1","English Language","Physics Theory","Chemistry P2"],
    color: "#f5f3ff", accent: "#7c3aed",
  },
  {
    title: "Scholarships",
    lines: ["AfDB Young Africa","MDF Bursary 2024","DAAD Germany","Mastercard Found.","AU Scholarships"],
    color: "#dbeafe", accent: "#1d4ed8",
  },
  {
    title: "Textbooks",
    lines: ["Malawi Phunziro","Biology Form 3","Mathematics Std 8","Chichewa Grade 7","Integrated Sci."],
    color: "#ede9fe", accent: "#6d28d9",
  },
  {
    title: "Notes & Tutors",
    lines: ["Algebra Notes","Mr. Banda - Maths","Physics Summary","Mrs. Phiri - Bio","Chemistry Tips"],
    color: "#fce7f3", accent: "#be185d",
  },
  {
    title: "Resources",
    lines: ["Study Timetable","Exam Techniques","Past Paper Tips","Revision Guide","Subject Syllabus"],
    color: "#ecfdf5", accent: "#065f46",
  },
];

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [hiding,   setHiding]   = useState(false);
  const DURATION = 3500;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const CW = 280, CH = 260;
    canvas.width  = CW * DPR;
    canvas.height = CH * DPR;
    canvas.style.width  = CW + "px";
    canvas.style.height = CH + "px";
    ctx.scale(DPR, DPR);

    const SPINE_X = 82, BOOK_Y = 30, BW = 108, BH = 162;
    let raf = 0, start = 0;
    let pageAngle = 0, pagePhase = 0, coverAngle = 0, coverFlipped = false;
    let lastPhaseChange = 0;

    function drawGlow(t: number) {
      const p = 0.5 + 0.5 * Math.sin(t * 0.003);
      const g = ctx.createRadialGradient(CW/2, BOOK_Y+BH/2, 10, CW/2, BOOK_Y+BH/2, 90+p*25);
      g.addColorStop(0, `rgba(124,58,237,${0.22+p*0.1})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
    }

    function drawBackCover() {
      const g = ctx.createLinearGradient(SPINE_X, BOOK_Y, SPINE_X+BW, BOOK_Y+BH);
      g.addColorStop(0, "#1e3a8a"); g.addColorStop(1, "#0f2060");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(SPINE_X, BOOK_Y, BW, BH, [0,8,8,0]); ctx.fill();
    }

    function drawSpine() {
      const g = ctx.createLinearGradient(SPINE_X-16, 0, SPINE_X, 0);
      g.addColorStop(0, "#2e1065"); g.addColorStop(1, "#4c1d95");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(SPINE_X-16, BOOK_Y, 16, BH, [4,0,0,4]); ctx.fill();
      // spine label
      ctx.save();
      ctx.translate(SPINE_X-8, BOOK_Y+BH/2);
      ctx.rotate(-Math.PI/2);
      ctx.fillStyle = "rgba(196,181,253,0.6)";
      ctx.font = "bold 6px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SchoraHub", 0, 3);
      ctx.restore();
    }

    function drawPageContent(pd: typeof PAGE_DATA[0], scaleX: number) {
      if (scaleX < 0.15) return;
      const px = 8, py = -BH/2 + 12;
      const tw = (BW - 16) * scaleX;
      if (tw < 10) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, -BH/2, BW, BH);
      ctx.clip();

      // Title bar
      ctx.fillStyle = pd.accent + "22";
      ctx.fillRect(px, py, BW-16, 16);
      ctx.fillStyle = pd.accent;
      ctx.font = `bold ${Math.max(5, 7*scaleX)}px sans-serif`;
      ctx.textAlign = "left";
      ctx.globalAlpha = Math.min(1, scaleX * 1.5);
      ctx.fillText(pd.title, px+3, py+11);

      // Lines with text
      pd.lines.forEach((line, i) => {
        const ly = py + 26 + i * 22;
        // rule line
        ctx.strokeStyle = pd.accent + "30";
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(px, ly+14); ctx.lineTo(BW-px, ly+14); ctx.stroke();
        // bullet
        ctx.fillStyle = pd.accent + "99";
        ctx.beginPath(); ctx.arc(px+4, ly+7, 2, 0, Math.PI*2); ctx.fill();
        // text
        ctx.fillStyle = "#1a1a2e";
        ctx.font = `${Math.max(4, 6*scaleX)}px sans-serif`;
        ctx.globalAlpha = Math.min(1, scaleX * 1.8);
        ctx.fillText(line, px+10, ly+10);
      });

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawPage(angle: number, phaseIdx: number, shadow: number) {
      const pd = PAGE_DATA[phaseIdx % PAGE_DATA.length];
      ctx.save();
      ctx.translate(SPINE_X, BOOK_Y + BH/2);
      const scaleX = Math.cos(angle);
      ctx.transform(scaleX, 0, 0, 1, 0, 0);

      // Shadow
      ctx.shadowColor = `rgba(0,0,0,${shadow})`;
      ctx.shadowBlur = 10;
      ctx.fillStyle = scaleX >= 0 ? pd.color : "#c4b5fd";
      ctx.beginPath(); ctx.roundRect(0, -BH/2, BW, BH, [0,5,5,0]); ctx.fill();
      ctx.shadowBlur = 0;

      // Page edge shading
      if (scaleX >= 0) {
        const eg = ctx.createLinearGradient(BW-12, 0, BW, 0);
        eg.addColorStop(0, "rgba(0,0,0,0)");
        eg.addColorStop(1, "rgba(0,0,0,0.08)");
        ctx.fillStyle = eg;
        ctx.fillRect(BW-12, -BH/2, 12, BH);
      }

      if (scaleX >= 0) drawPageContent(pd, scaleX);
      ctx.restore();
    }

    function drawCover(angle: number) {
      ctx.save();
      ctx.translate(SPINE_X, BOOK_Y + BH/2);
      const scaleX = Math.cos(angle);
      ctx.transform(scaleX, 0, 0, 1, 0, 0);

      if (scaleX >= 0) {
        const g = ctx.createLinearGradient(0, -BH/2, BW, BH/2);
        g.addColorStop(0, "#5b21b6"); g.addColorStop(1, "#1e40af");
        ctx.fillStyle = g;
        ctx.shadowColor = "rgba(91,33,182,0.5)"; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.roundRect(0, -BH/2, BW, BH, [0,8,8,0]); ctx.fill();
        ctx.shadowBlur = 0;

        // Badge
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath(); ctx.roundRect(14, -BH/2+18, BW-28, 36, 6); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("SchoraHub", BW/2, -BH/2+32);
        ctx.fillStyle = "#c4b5fd";
        ctx.font = "7px sans-serif";
        ctx.fillText("Education Hub · Malawi", BW/2, -BH/2+46);

        // Divider
        ctx.strokeStyle = "rgba(196,181,253,0.35)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(14, -BH/2+62); ctx.lineTo(BW-14, -BH/2+62); ctx.stroke();

        // Preview lines on cover
        ["Past Papers", "Textbooks", "Scholarships", "Tutors", "Notes"].forEach((t, i) => {
          const ly = -BH/2 + 74 + i*16;
          ctx.fillStyle = "rgba(196,181,253,0.5)";
          ctx.beginPath(); ctx.arc(14, ly+4, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.font = "7px sans-serif"; ctx.textAlign = "left";
          ctx.fillText(t, 20, ly+7);
        });
      } else {
        // Inside of cover
        ctx.fillStyle = "#3b0764";
        ctx.beginPath(); ctx.roundRect(0, -BH/2, BW, BH, [0,8,8,0]); ctx.fill();
      }
      ctx.restore();
    }

    function drawSparkles(t: number) {
      [[220,25],[25,110],[242,175],[12,45],[250,80]].forEach(([x,y],i) => {
        const a = 0.3 + 0.7*Math.abs(Math.sin(t*0.0018+i*1.3));
        const r = 1.5 + Math.sin(t*0.003+i)*0.8;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle = `rgba(196,181,253,${a})`; ctx.fill();
      });
    }

    function frame(now: number) {
      if (!start) start = now;
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      setProgress(pct);

      ctx.clearRect(0, 0, CW, CH);
      drawGlow(now);

      // Cover flip 600-1000ms
      if (elapsed < 600) coverAngle = 0;
      else if (elapsed < 1000) coverAngle = ((elapsed-600)/400) * Math.PI;
      else { coverAngle = Math.PI; coverFlipped = true; }

      // Page turns after cover (every 420ms)
      const cycleMs = 420;
      if (coverFlipped) {
        const t2 = elapsed - 1000;
        const cycle = (t2 % (cycleMs*2)) / cycleMs;
        pageAngle = cycle < 1 ? cycle * Math.PI : (2-cycle) * Math.PI;
        // advance phase when page returns
        const phaseTime = Math.floor(t2 / (cycleMs*2));
        if (phaseTime !== lastPhaseChange) {
          pagePhase = phaseTime;
          lastPhaseChange = phaseTime;
        }
      }

      drawBackCover();

      // Stack of pages behind
      for (let i = 3; i >= 1; i--) {
        drawPage(0, (pagePhase+i) % PAGE_DATA.length, 0.03*i);
      }

      // Active turning page
      if (coverFlipped) drawPage(pageAngle, pagePhase % PAGE_DATA.length, 0.18);

      drawSpine();

      if (coverAngle < Math.PI) drawCover(coverAngle);
      else drawCover(coverAngle);

      drawSparkles(now);

      if (pct < 100) {
        raf = requestAnimationFrame(frame);
      } else {
        setTimeout(() => setHiding(true), 150);
        setTimeout(() => onDone(), 650);
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none"
      style={{
        background: "linear-gradient(160deg,#060818 0%,#100820 55%,#071020 100%)",
        opacity: hiding ? 0 : 1, transition: "opacity 0.5s ease",
        pointerEvents: hiding ? "none" : "all",
      }}>
      <canvas ref={canvasRef} />

      <h1 style={{ color:"#fff", fontSize:22, fontWeight:900, marginTop:6, letterSpacing:-0.5 }}>
        SchoraHub
      </h1>
      <p style={{ color:"#a78bfa", fontSize:11, fontWeight:600, marginTop:3 }}>
        Education Hub · Malawi
      </p>

      <div style={{ marginTop:22, width:220 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:13 }}>📚</span>
            <span style={{ color:"#c4b5fd", fontSize:10, fontWeight:700 }}>Loading resources…</span>
          </div>
          <span style={{ color:"#a78bfa", fontSize:11, fontWeight:800 }}>{progress}%</span>
        </div>
        <div style={{ width:"100%", height:5, background:"rgba(255,255,255,0.08)", borderRadius:99, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${progress}%`,
            background:"linear-gradient(90deg,#7c3aed,#2563eb)",
            borderRadius:99, transition:"width 80ms linear",
            boxShadow:"0 0 10px rgba(124,58,237,0.7)",
          }} />
        </div>
      </div>

      <p style={{
        position:"absolute", bottom:28,
        color:"rgba(255,255,255,0.3)", fontSize:11, fontWeight:600,
      }}>
        Powered By OTECHY
      </p>
    </div>
  );
}

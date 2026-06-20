import { useEffect, useRef, useState } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [hiding,   setHiding]   = useState(false);

  const DURATION = 3200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const W = canvas.width  = 280;
    const H = canvas.height = 260;

    let raf = 0;
    let start = 0;

    // Page flip state
    let pageAngle = 0;       // 0 = flat right, Math.PI = fully flipped left
    let pageDir   = 1;       // 1 = flipping, -1 = returning
    let pagePhase = 0;       // which page (0-4)
    let coverFlipped = false;
    let coverAngle = 0;

    const SPINE_X  = 80;
    const BOOK_Y   = 40;
    const BW       = 110;   // half-book width
    const BH       = 160;
    const PAGE_COLORS = ["#f5f3ff","#dbeafe","#ede9fe","#fce7f3","#ecfdf5"];

    function drawHardCover(angle: number, flipped: boolean) {
      ctx.save();
      ctx.translate(SPINE_X, BOOK_Y + BH / 2);
      // 3D skew based on angle
      const scaleX = Math.cos(angle);
      ctx.transform(scaleX, 0, 0, 1, 0, 0);

      if (!flipped || scaleX >= 0) {
        // Front face
        const grd = ctx.createLinearGradient(0, -BH/2, BW, BH/2);
        grd.addColorStop(0, "#5b21b6");
        grd.addColorStop(1, "#1e40af");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.roundRect(0, -BH/2, BW, BH, [0, 8, 8, 0]);
        ctx.fill();

        // Cover text
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("OtechySchora", BW/2, -BH/2 + 38);
        ctx.fillStyle = "rgba(196,181,253,0.9)";
        ctx.font = "8px sans-serif";
        ctx.fillText("Education Hub", BW/2, -BH/2 + 54);
        ctx.fillText("Malawi", BW/2, -BH/2 + 66);

        // Lines
        ctx.strokeStyle = "rgba(196,181,253,0.4)";
        ctx.lineWidth = 1;
        [90,105,120].forEach(y => {
          ctx.beginPath();
          ctx.moveTo(14, -BH/2+y);
          ctx.lineTo(BW-14, -BH/2+y);
          ctx.stroke();
        });
      } else {
        // Back face (inner side of cover)
        ctx.fillStyle = "#3b0764";
        ctx.beginPath();
        ctx.roundRect(0, -BH/2, BW, BH, [0, 8, 8, 0]);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawPage(offsetAngle: number, color: string, shadowAlpha: number) {
      ctx.save();
      ctx.translate(SPINE_X, BOOK_Y + BH / 2);
      const scaleX = Math.cos(offsetAngle);
      ctx.transform(scaleX, 0, 0, 1, 0, 0);

      ctx.fillStyle = scaleX >= 0 ? color : "#d8d0f0";
      ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.roundRect(0, -BH/2, BW, BH, [0,4,4,0]);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Page lines
      if (scaleX >= 0) {
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 7; i++) {
          const ly = -BH/2 + 30 + i*18;
          ctx.beginPath();
          ctx.moveTo(10, ly); ctx.lineTo(BW-10, ly);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawSpine() {
      const grd = ctx.createLinearGradient(SPINE_X-18, 0, SPINE_X, 0);
      grd.addColorStop(0, "#2e1065");
      grd.addColorStop(1, "#4c1d95");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.roundRect(SPINE_X-18, BOOK_Y, 18, BH, [4,0,0,4]);
      ctx.fill();
    }

    function drawBackCover() {
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.roundRect(SPINE_X, BOOK_Y, BW, BH, [0,8,8,0]);
      ctx.fill();
    }

    function drawGlow(t: number) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.003);
      const grd = ctx.createRadialGradient(W/2, BOOK_Y+BH/2, 0, W/2, BOOK_Y+BH/2, 100+pulse*20);
      grd.addColorStop(0, `rgba(124,58,237,${0.18 + pulse*0.1})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    function drawSparkles(t: number) {
      const pts = [
        {x:220,y:30}, {x:30,y:120}, {x:240,y:180}, {x:15,y:50},
      ];
      pts.forEach((p, i) => {
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(t*0.002 + i*1.1));
        const r = 2 + Math.sin(t*0.003 + i) * 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(196,181,253,${alpha})`;
        ctx.fill();
      });
    }

    function frame(now: number) {
      if (!start) start = now;
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / DURATION) * 100));
      setProgress(pct);

      ctx.clearRect(0, 0, W, H);
      drawGlow(now);

      // Cover flips at 600ms
      if (elapsed < 600) {
        coverAngle = 0;
      } else if (elapsed < 1100) {
        coverAngle = ((elapsed - 600) / 500) * Math.PI;
      } else {
        coverAngle = Math.PI;
        coverFlipped = true;
      }

      // Page flip cycle after cover done
      if (coverFlipped) {
        const cycleMs = 380;
        const cycle   = ((elapsed - 1100) % (cycleMs * 2)) / cycleMs;
        if (cycle < 1) {
          pageAngle = cycle * Math.PI;
          pageDir   = 1;
        } else {
          pageAngle = (2 - cycle) * Math.PI;
          pageDir   = -1;
        }
        if (pageDir === -1 && pageAngle < 0.05) {
          pagePhase = (pagePhase + 1) % PAGE_COLORS.length;
        }
      }

      drawBackCover();

      // Draw stacked pages (back ones first)
      const baseColors = [...PAGE_COLORS, ...PAGE_COLORS];
      for (let i = 3; i >= 1; i--) {
        const c = baseColors[(pagePhase + i) % PAGE_COLORS.length];
        drawPage(0, c, 0.04 * i);
      }

      // Draw the actively turning page
      if (coverFlipped) {
        const c = PAGE_COLORS[pagePhase % PAGE_COLORS.length];
        drawPage(pageAngle, c, 0.15);
      }

      drawSpine();

      // Draw cover
      if (coverAngle < Math.PI) drawHardCover(coverAngle, false);
      else drawHardCover(coverAngle, true);

      drawSparkles(now);

      if (pct < 100) {
        raf = requestAnimationFrame(frame);
      } else {
        setTimeout(() => setHiding(true), 100);
        setTimeout(() => onDone(), 600);
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none"
      style={{
        background: "linear-gradient(160deg,#060818 0%,#100820 55%,#071020 100%)",
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: hiding ? "none" : "all",
      }}
    >
      <canvas ref={canvasRef} style={{ width: 280, height: 260 }} />

      <h1 style={{ color:"#fff", fontSize:22, fontWeight:900, marginTop:4, letterSpacing:-0.5 }}>
        OtechySchora
      </h1>
      <p style={{ color:"#a78bfa", fontSize:11, fontWeight:600, marginTop:3 }}>
        Education Hub · Malawi
      </p>

      {/* Progress bar */}
      <div style={{ marginTop:24, width:220 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:13 }}>📚</span>
            <span style={{ color:"#c4b5fd", fontSize:10, fontWeight:700 }}>Loading resources…</span>
          </div>
          <span style={{ color:"#a78bfa", fontSize:11, fontWeight:800 }}>{progress}%</span>
        </div>
        <div style={{ width:"100%", height:5, background:"rgba(255,255,255,0.08)", borderRadius:99, overflow:"hidden" }}>
          <div style={{
            height:"100%",
            width:`${progress}%`,
            background:"linear-gradient(90deg,#7c3aed,#2563eb)",
            borderRadius:99,
            transition:"width 80ms linear",
            boxShadow:"0 0 10px rgba(124,58,237,0.7)",
          }} />
        </div>
      </div>

      <p style={{
        position:"absolute", bottom:28,
        color:"rgba(255,255,255,0.18)", fontSize:9,
        fontWeight:600, letterSpacing:3, textTransform:"uppercase",
      }}>
        Powered by Otechy
      </p>
    </div>
  );
}

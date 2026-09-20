import { useState, useEffect, useLayoutEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";
import { Play, Pause, Rewind, FastForward, X, Loader2 } from "lucide-react";
import { safeGetItem, safeSetItem } from "@/lib/storage";

/**
 * Mrs SchoraHub — the floating deep-focus audio player.
 *
 * - Lives in Layout, so it follows people to every screen and the music
 *   never stops when they navigate.
 * - Drag it anywhere; it remembers where you left it.
 * - Tap it for a small menu (rewind / play-pause / forward). The menu closes
 *   by itself after a few seconds.
 * - The little ✕ tucks it into the top bar (headphones icon). Music keeps
 *   playing; tap the headphones icon to bring her back.
 * - Says hi once, the very first time, then never again.
 *
 * The audio streams from Supabase Storage. preload="none" means nothing is
 * downloaded until someone presses play.
 */

// ── Settings ─────────────────────────────────────────────────────────────────
const FOCUS_AUDIO_URL =
  "https://sahxijuxztcdncgoorun.supabase.co/storage/v1/object/public/focus-audio/focus-music.mp3";
const PLAYER_NAME = "Mrs SchoraHub";
const SKIP_SECONDS = 15;

const BTN = 56;        // size of the floating button (px)
const EDGE = 8;        // minimum gap from screen edges (px)
const POP_W = 184;     // width of the menu / greeting bubble (px)
const MENU_AUTOCLOSE_MS = 7000;

const POS_KEY = "otechyschora_focus_pos";
const HIDDEN_KEY = "otechyschora_focus_hidden";
const GREETED_KEY = "otechyschora_focus_greeted";

// ── Shared state for Layout (top-bar icon needs to know these) ──────────────
export function useFocusPlayer() {
  const [hidden, setHiddenState] = useState<boolean>(() => safeGetItem(HIDDEN_KEY) === "1");
  const [playing, setPlaying] = useState(false);
  const setHidden = (v: boolean) => {
    setHiddenState(v);
    safeSetItem(HIDDEN_KEY, v ? "1" : "0");
  };
  return { hidden, setHidden, playing, setPlaying };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function getBounds() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const header = document.querySelector("header");
  const nav = document.querySelector('nav[data-tour="bottom-nav"]');
  const minY = (header ? header.getBoundingClientRect().bottom : 56) + EDGE;
  const navTop = nav ? nav.getBoundingClientRect().top : h - 72;
  return {
    minX: EDGE,
    maxX: Math.max(EDGE, w - BTN - EDGE),
    minY,
    maxY: Math.max(minY, navTop - BTN - EDGE),
  };
}

function loadSavedPos(): { x: number; y: number } | null {
  try {
    const raw = safeGetItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.x === "number" && typeof p?.y === "number") return { x: p.x, y: p.y };
  } catch { /* ignore bad saved value */ }
  return null;
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/** Pause any other audio/video that's on the page (audiobooks, adverts…). */
function pauseOtherMedia(except: HTMLMediaElement | null) {
  document.querySelectorAll("audio, video").forEach((el) => {
    if (el !== except) (el as HTMLMediaElement).pause();
  });
}

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  hidden: boolean;
  onHide: () => void;
  onPlayingChange?: (playing: boolean) => void;
}

export default function FocusPlayer({ hidden, onHide, onPlayingChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: EDGE + 4, y: 200 });
  const posInitRef = useRef(false);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean; id: number } | null>(null);
  const menuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [above, setAbove] = useState(true);
  const [alignRight, setAlignRight] = useState(false);
  const [leaving, setLeaving] = useState<{ tx: number; ty: number } | null>(null);
  const [progress, setProgress] = useState({ cur: 0, dur: NaN });

  const applyTransform = () => {
    const el = wrapRef.current;
    if (el) el.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`;
  };

  // ── Tell Layout when music starts/stops (for the top-bar indicator) ──
  useEffect(() => { onPlayingChange?.(playing); }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Place the button (saved spot, or bottom-left above the nav) ──
  useLayoutEffect(() => {
    if (hidden) return;
    const b = getBounds();
    if (!posInitRef.current) {
      posInitRef.current = true;
      const saved = loadSavedPos();
      posRef.current = saved ?? { x: EDGE + 4, y: b.maxY - 24 };
    }
    posRef.current = {
      x: clamp(posRef.current.x, b.minX, b.maxX),
      y: clamp(posRef.current.y, b.minY, b.maxY),
    };
    applyTransform();
  }, [hidden]);

  // ── Keep it on-screen if the window/orientation changes ──
  useEffect(() => {
    const onResize = () => {
      const b = getBounds();
      posRef.current = {
        x: clamp(posRef.current.x, b.minX, b.maxX),
        y: clamp(posRef.current.y, b.minY, b.maxY),
      };
      applyTransform();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── First-time greeting (once per phone) ──
  useEffect(() => {
    if (hidden || safeGetItem(GREETED_KEY) === "1") return;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const showTimer = setTimeout(() => {
      const p = posRef.current;
      setAbove(p.y > 190);
      setAlignRight(p.x + POP_W > window.innerWidth - EDGE);
      setShowBubble(true);
      safeSetItem(GREETED_KEY, "1");
      hideTimer = setTimeout(() => setShowBubble(false), 9000);
    }, 2500);
    return () => {
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [hidden]);

  // ── Only one thing should make sound at a time ──
  useEffect(() => {
    // Any other audio/video that starts playing pauses the focus music.
    // The prototype hook also catches audio that isn't on the page (new Audio()).
    const proto = HTMLMediaElement.prototype;
    const originalPlay = proto.play;
    proto.play = function (this: HTMLMediaElement) {
      if (this !== audioRef.current) audioRef.current?.pause();
      return originalPlay.call(this);
    };
    const onAnyPlay = (e: Event) => {
      if (e.target !== audioRef.current) audioRef.current?.pause();
    };
    document.addEventListener("play", onAnyPlay, true);
    return () => {
      proto.play = originalPlay;
      document.removeEventListener("play", onAnyPlay, true);
    };
  }, []);

  // ── Lock-screen / notification controls ──
  useEffect(() => {
    const ms = (navigator as any).mediaSession;
    if (!ms) return;
    const skip = (d: number) => skipBy(d);
    try {
      if (typeof (window as any).MediaMetadata === "function") {
        ms.metadata = new (window as any).MediaMetadata({
          title: "Deep Focus",
          artist: PLAYER_NAME,
          album: "SchoraHub",
          artwork: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          ],
        });
      }
      ms.setActionHandler("play", () => { audioRef.current?.play().catch(() => {}); });
      ms.setActionHandler("pause", () => audioRef.current?.pause());
      ms.setActionHandler("seekbackward", () => skip(-SKIP_SECONDS));
      ms.setActionHandler("seekforward", () => skip(SKIP_SECONDS));
    } catch { /* some browsers don't support every action — that's fine */ }
    return () => {
      try {
        ["play", "pause", "seekbackward", "seekforward"].forEach((a) => ms.setActionHandler(a, null));
      } catch { /* ignore */ }
    };
  }, []);

  // ── Close the menu when tapping anywhere else ──
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: Event) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [menuOpen]);

  // ── Clean up timers ──
  useEffect(() => () => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  }, []);

  // ── Actions ──
  const bumpMenuTimer = () => {
    if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    menuTimerRef.current = setTimeout(() => setMenuOpen(false), MENU_AUTOCLOSE_MS);
  };

  const openMenu = () => {
    const p = posRef.current;
    setAbove(p.y > 190);
    setAlignRight(p.x + POP_W > window.innerWidth - EDGE);
    setShowBubble(false);
    setMenuOpen(true);
    bumpMenuTimer();
  };

  const toggleMenu = () => {
    if (menuOpen) {
      if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
      setMenuOpen(false);
    } else {
      openMenu();
    }
  };

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    bumpMenuTimer();
    if (!a.paused) { a.pause(); return; }
    setError(false);
    setLoading(true);
    pauseOtherMedia(a);
    try {
      await a.play();
    } catch (err: any) {
      // AbortError just means pause() was pressed while it was starting
      if (err?.name !== "AbortError") setError(true);
      setLoading(false);
    }
  };

  function skipBy(delta: number) {
    const a = audioRef.current;
    if (!a) return;
    let t = a.currentTime + delta;
    if (isFinite(a.duration)) t = Math.min(t, Math.max(0, a.duration - 0.5));
    a.currentTime = Math.max(0, t);
  }

  const handleClose = () => {
    setMenuOpen(false);
    setShowBubble(false);
    const slot = document.getElementById("mrs-header-slot");
    if (slot) {
      // Fly toward where the new headphones icon will appear in the top bar
      const r = slot.getBoundingClientRect();
      setLeaving({ tx: r.left - 22 - BTN / 2, ty: r.top + r.height / 2 - BTN / 2 });
    } else {
      setLeaving({ tx: posRef.current.x, ty: posRef.current.y });
    }
    leaveTimerRef.current = setTimeout(() => {
      onHide();
      setLeaving(null);
    }, 430);
  };

  // ── Drag (with a small threshold so a tap still counts as a tap) ──
  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    dragRef.current = {
      sx: e.clientX, sy: e.clientY,
      ox: posRef.current.x, oy: posRef.current.y,
      moved: false, id: e.pointerId,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      d.moved = true;
      setMenuOpen(false);
      setShowBubble(false);
    }
    const b = getBounds();
    posRef.current = {
      x: clamp(d.ox + dx, b.minX, b.maxX),
      y: clamp(d.oy + dy, b.minY, b.maxY),
    };
    applyTransform();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) safeSetItem(POS_KEY, JSON.stringify(posRef.current));
    else toggleMenu();
  };

  const onPointerCancel = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.moved) safeSetItem(POS_KEY, JSON.stringify(posRef.current));
  };

  // ── Render ──
  const popPos: CSSProperties = {
    position: "absolute",
    width: POP_W,
    ...(above ? { bottom: BTN + 10 } : { top: BTN + 10 }),
    ...(alignRight ? { right: 0 } : { left: 0 }),
  };
  const tailPos: CSSProperties = {
    position: "absolute",
    ...(above ? { bottom: -6 } : { top: -6 }),
    ...(alignRight ? { right: BTN / 2 - 6 } : { left: BTN / 2 - 6 }),
  };
  const tailBorder = above ? "border-r border-b" : "border-l border-t";
  const pct = isFinite(progress.dur) && progress.dur > 0 ? (progress.cur / progress.dur) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={FOCUS_AUDIO_URL}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); setLoading(false); }}
        onPlaying={() => { setLoading(false); setError(false); }}
        onWaiting={() => setLoading(true)}
        onError={() => { setError(true); setLoading(false); setPlaying(false); }}
        onLoadedMetadata={(e) => setProgress((p) => ({ ...p, dur: e.currentTarget.duration }))}
        onTimeUpdate={(e) => { if (menuOpen) setProgress({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration }); }}
      />

      {!hidden && (
        <div
          ref={wrapRef}
          style={{
            position: "fixed", left: 0, top: 0, width: BTN, height: BTN, zIndex: 45,
            transform: leaving
              ? `translate3d(${leaving.tx}px, ${leaving.ty}px, 0) scale(0.3)`
              : `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`,
            opacity: leaving ? 0 : 1,
            transition: leaving ? "transform 420ms cubic-bezier(.4,0,.2,1), opacity 420ms ease" : "none",
          }}
        >
          <style>{`
            @keyframes mrs-pop { 0% { transform: scale(.3); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
            @keyframes mrs-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
            @keyframes mrs-ring { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(1.7); opacity: 0; } }
            @keyframes mrs-blink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.1); } }
            @keyframes mrs-note { 0% { transform: translate(0,0) scale(.7); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(8px,-26px) scale(1); opacity: 0; } }
            @keyframes mrs-bubble { 0% { transform: scale(.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
            .mrs-pop { animation: mrs-pop .4s ease-out; }
            .mrs-bob { animation: mrs-bob 2.6s ease-in-out infinite; }
            .mrs-ring { animation: mrs-ring 2.2s ease-out infinite; }
            .mrs-ring-slow { animation: mrs-ring 3.6s ease-out infinite; }
            .mrs-eye { transform-box: fill-box; transform-origin: center; animation: mrs-blink 4s ease-in-out infinite; }
            .mrs-note { animation: mrs-note 2.4s ease-out infinite; }
            .mrs-bubble { animation: mrs-bubble .25s ease-out; }
            @media (prefers-reduced-motion: reduce) {
              .mrs-pop, .mrs-bob, .mrs-ring, .mrs-ring-slow, .mrs-eye, .mrs-note, .mrs-bubble { animation: none !important; }
            }
          `}</style>

          <div className="mrs-pop" style={{ position: "relative", width: BTN, height: BTN }}>

            {/* ── First-time greeting ── */}
            {showBubble && !menuOpen && (
              <div style={popPos} className="mrs-bubble">
                <div className="relative rounded-2xl bg-card text-foreground border border-border shadow-xl px-3 py-2.5">
                  <p className="text-xs font-black leading-tight">Hie! 👋</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    I'm {PLAYER_NAME}. Press me for deep focus audio 🎧
                  </p>
                  <span style={tailPos} className={`w-3 h-3 rotate-45 bg-card border-border ${tailBorder}`} />
                </div>
              </div>
            )}

            {/* ── Small menu ── */}
            {menuOpen && (
              <div style={popPos} className="mrs-bubble" onPointerDown={bumpMenuTimer}>
                <div className="relative rounded-2xl bg-card text-foreground border border-border shadow-xl p-3">
                  <div className="mb-2.5">
                    <p className="text-xs font-black leading-tight">{PLAYER_NAME}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {error ? "Couldn't load the audio — check your internet" : "Deep focus audio 🎧"}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => { skipBy(-SKIP_SECONDS); bumpMenuTimer(); }}
                      aria-label={`Back ${SKIP_SECONDS} seconds`}
                      className="w-10 h-10 rounded-full bg-muted flex flex-col items-center justify-center text-foreground"
                    >
                      <Rewind className="w-3.5 h-3.5" />
                      <span style={{ fontSize: 8 }} className="font-bold leading-none mt-0.5">{SKIP_SECONDS}s</span>
                    </button>

                    <button
                      onClick={togglePlay}
                      aria-label={playing ? "Pause" : "Play"}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/30"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" />
                        : playing ? <Pause className="w-5 h-5" />
                        : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => { skipBy(SKIP_SECONDS); bumpMenuTimer(); }}
                      aria-label={`Forward ${SKIP_SECONDS} seconds`}
                      className="w-10 h-10 rounded-full bg-muted flex flex-col items-center justify-center text-foreground"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span style={{ fontSize: 8 }} className="font-bold leading-none mt-0.5">{SKIP_SECONDS}s</span>
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-muted-foreground" style={{ fontSize: 9 }}>
                      <span>{fmt(progress.cur)}</span>
                      <span>{fmt(progress.dur)}</span>
                    </div>
                  </div>

                  <span style={tailPos} className={`w-3 h-3 rotate-45 bg-card border-border ${tailBorder}`} />
                </div>
              </div>
            )}

            {/* ── The floating button ── */}
            <div className={playing ? "" : "mrs-bob"} style={{ position: "relative", width: BTN, height: BTN }}>
              <span
                aria-hidden
                className={playing ? "mrs-ring-slow" : "mrs-ring"}
                style={{ position: "absolute", inset: 0, borderRadius: "9999px", background: "rgba(56,189,248,0.45)", pointerEvents: "none" }}
              />

              {playing && (
                <>
                  <span aria-hidden className="mrs-note" style={{ position: "absolute", top: 4, right: 6, fontSize: 14, color: "#7dd3fc", pointerEvents: "none" }}>♪</span>
                  <span aria-hidden className="mrs-note" style={{ position: "absolute", top: 8, left: 6, fontSize: 12, color: "#bae6fd", pointerEvents: "none", animationDelay: "1.1s" }}>♫</span>
                </>
              )}

              <button
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onClick={(e) => { if (e.detail === 0) toggleMenu(); }}
                onContextMenu={(e) => e.preventDefault()}
                aria-label={`${PLAYER_NAME} — deep focus audio`}
                className="no-press"
                style={{
                  position: "relative", width: BTN, height: BTN, borderRadius: "9999px",
                  background: "linear-gradient(135deg,#38bdf8,#2563eb)",
                  boxShadow: "0 6px 18px rgba(37,99,235,.45)",
                  border: "2px solid rgba(255,255,255,.35)",
                  touchAction: "none", cursor: "grab", padding: 0,
                }}
              >
                <svg viewBox="0 0 56 56" width={BTN - 4} height={BTN - 4} style={{ display: "block", pointerEvents: "none" }}>
                  {/* headphones */}
                  <path d="M10 31 C10 11, 46 11, 46 31" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
                  <rect x="6" y="28" width="9" height="15" rx="3.5" fill="#fff" />
                  <rect x="41" y="28" width="9" height="15" rx="3.5" fill="#fff" />
                  {/* face */}
                  <circle cx="28" cy="33" r="12.5" fill="#fff" />
                  <ellipse className="mrs-eye" cx="23.5" cy="31.5" rx="1.9" ry="2.5" fill="#0c4a6e" />
                  <ellipse className="mrs-eye" cx="32.5" cy="31.5" rx="1.9" ry="2.5" fill="#0c4a6e" />
                  <circle cx="20.5" cy="36" r="2.2" fill="#fda4af" opacity=".6" />
                  <circle cx="35.5" cy="36" r="2.2" fill="#fda4af" opacity=".6" />
                  <path d="M24 37.5 Q28 41 32 37.5" fill="none" stroke="#0c4a6e" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* ── Small ✕ — tucks her into the top bar ── */}
            <button
              onClick={handleClose}
              aria-label={`Hide ${PLAYER_NAME}`}
              style={{ position: "absolute", top: -10, right: -10, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
            >
              <span
                style={{
                  width: 20, height: 20, borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(15,23,42,.85)", border: "1px solid rgba(255,255,255,.35)", color: "#fff",
                }}
              >
                <X style={{ width: 11, height: 11 }} />
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

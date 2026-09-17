import { useState, useRef } from "react";

/**
 * TEMPORARY maintenance overlay — delete this file + its one import/usage
 * in App.tsx when the update is done. Nothing else in the app depends on it.
 *
 * Behavior:
 *  - Shows an "under maintenance" message to all visitors.
 *  - Tapping the word "SchoraHub" 7 times within 3s reveals a password box.
 *  - Correct password unlocks the real app for this browser (localStorage),
 *    so you don't have to re-enter it every reload.
 */

const UNLOCK_KEY = "schorahub_maintenance_bypass";
const PASSWORD = "Teddy@210"; // hardcoded on purpose, temporary — remove with this file
const TAP_TARGET = 7;
const TAP_WINDOW_MS = 3000;

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [showPasswordBox, setShowPasswordBox] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (unlocked) return <>{children}</>;

  const handleTap = () => {
    tapCount.current += 1;

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, TAP_WINDOW_MS);

    if (tapCount.current >= TAP_TARGET) {
      tapCount.current = 0;
      setShowPasswordBox(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      try {
        localStorage.setItem(UNLOCK_KEY, "true");
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } else {
      setError(true);
      setPassword("");
      setTimeout(() => setError(false), 600);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        color: "#f1f5f9",
      }}
    >
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛠️</div>

      <h1
        onClick={handleTap}
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
          userSelect: "none",
          cursor: "default",
        }}
      >
        SchoraHub
      </h1>

      <p style={{ maxWidth: 420, lineHeight: 1.6, color: "#cbd5e1" }}>
        We apologize for the inconvenience 🙏 SchoraHub is currently being
        updated to better meet your needs. When it's ready, you'll be
        automatically informed. Thank you for your patience!
      </p>

      {showPasswordBox && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            alignItems: "center",
            animation: error ? "shake 0.4s" : undefined,
          }}
        >
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            style={{
              padding: "0.6rem 0.9rem",
              borderRadius: "0.5rem",
              border: error ? "1px solid #ef4444" : "1px solid #475569",
              background: "#1e293b",
              color: "#f1f5f9",
              outline: "none",
              width: "220px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.55rem 1.2rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#0ea5e9",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </form>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

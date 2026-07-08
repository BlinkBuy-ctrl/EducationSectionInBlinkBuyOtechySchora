import { useState } from "react";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { signInAdmin, type AdminProfile } from "@/lib/adminAuth";

interface AdminLoginFormProps {
  onSuccess: (profile: AdminProfile) => void;
  /** Called if the person backs out without logging in (e.g. presses Escape). */
  onCancel: () => void;
}

/**
 * Plain-looking login form shown after the left-swipe gesture.
 * The actual verification happens in adminAuth.signInAdmin(), which checks
 * the password against Supabase's real auth system, then confirms is_admin
 * on the matching profile. This component just handles the UI + errors.
 */
export function AdminLoginForm({ onSuccess, onCancel }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError("");

    const result = await signInAdmin(email.trim(), password);

    setLoading(false);

    if (!result.success || !result.profile) {
      setError(result.error || "Login failed.");
      return;
    }

    onSuccess(result.profile);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[hsl(215,55%,8%)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-card border border-border rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-center mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <input
            type="email"
            autoComplete="off"
            autoFocus
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
          />
          <input
            type="password"
            autoComplete="off"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl mt-4 bg-blue-600 text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log in"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full text-center text-xs text-muted-foreground mt-3 py-1"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

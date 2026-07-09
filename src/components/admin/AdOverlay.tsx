import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeGetItem, safeSetItem } from "@/lib/storage";

type AdConfig = {
  id: string;
  is_enabled: boolean;
  days_of_week: string[];
  trigger_time: string;   // "HH:MM:SS"
  countdown_seconds: number;
  title: string | null;
  image_url: string | null;
  link_url: string | null;
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const CHECK_INTERVAL_MS = 20_000; // how often we quietly check the clock against the schedule
const SHOWN_KEY_PREFIX = "otechyschora_ad_shown_"; // + today's date, so it resets daily

function todayKey() {
  return SHOWN_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

function isScheduledNow(config: AdConfig): boolean {
  if (!config.is_enabled) return false;

  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  if (!config.days_of_week.includes(todayName)) return false;

  const [triggerH, triggerM] = config.trigger_time.split(":").map(Number);
  const triggerMinutes = triggerH * 60 + triggerM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Fires any time at/after the trigger minute (until midnight), rather than
  // requiring an exact-second match, so a slow/backgrounded tab doesn't miss it.
  return nowMinutes >= triggerMinutes;
}

/**
 * Mounted once near the app root. Invisible unless a scheduled ad is
 * currently due — in which case it takes over the whole screen.
 * Shows at most once per matching day per device (tracked via localStorage).
 */
export function AdOverlay() {
  const [config, setConfig] = useState<AdConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const checkedRef = useRef(false);

  // Load the active ad config once, then re-check periodically.
  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      const { data } = await supabase
        .from("otechy_ad_config")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setConfig(data as AdConfig | null);
    };

    fetchConfig();
    const refreshTimer = setInterval(fetchConfig, 5 * 60_000); // pick up admin changes every 5 min
    return () => { cancelled = true; clearInterval(refreshTimer); };
  }, []);

  // Decide whether to show, and re-check on an interval.
  useEffect(() => {
    if (!config) return;

    const maybeShow = () => {
      if (safeGetItem(todayKey()) === "1") return; // already shown today
      if (isScheduledNow(config)) {
        setVisible(true);
        setCountdown(config.countdown_seconds);
        safeSetItem(todayKey(), "1");
      }
    };

    if (!checkedRef.current) {
      checkedRef.current = true;
      maybeShow();
    }
    const timer = setInterval(maybeShow, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [config]);

  // Countdown ticker while visible.
  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [visible, countdown]);

  if (!visible || !config) return null;

  const canClose = countdown <= 0;

  const handleBodyClick = () => {
    if (config.link_url) window.open(config.link_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center px-5">
      <div
        onClick={handleBodyClick}
        className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
      >
        {config.image_url && (
          <img src={config.image_url} alt={config.title || "Advertisement"} className="w-full aspect-square object-cover" />
        )}
        <div className="p-4 text-center">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Advertisement</p>
          {config.title && <p className="text-sm font-bold">{config.title}</p>}
        </div>
      </div>

      <div className="mt-6 h-11 flex items-center justify-center">
        {canClose ? (
          <button
            onClick={() => setVisible(false)}
            className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center"
            aria-label="Close ad"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <p className="text-xs font-semibold text-white/70">Closes in {countdown}s</p>
        )}
      </div>
    </div>
  );
}

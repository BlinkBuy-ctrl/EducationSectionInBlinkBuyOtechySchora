// Read Section v3.0 — Tool 2: Adaptive Audio Reader
//
// Wraps the native browser speech engine (window.speechSynthesis) — no
// external TTS service, so it works offline and needs no API key. Feature
// detected: older/embedded WebViews without speechSynthesis just get the
// tool disabled instead of the reader crashing.

import { useCallback, useRef, useState } from "react";

export type AudioSpeed = 1 | 1.25 | 1.5;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useAudioReader(getPageText: (page: number) => Promise<string>) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<AudioSpeed>(1);
  const [activePage, setActivePage] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
    setPlaying(false);
    setActivePage(null);
    utteranceRef.current = null;
  }, []);

  const readPage = useCallback(async (page: number) => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.cancel();
    const text = await getPageText(page);
    if (!text) { setPlaying(false); setActivePage(null); return; }

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = speed;
    utt.onend = () => { setPlaying(false); setActivePage(null); };
    utt.onerror = () => { setPlaying(false); setActivePage(null); };
    utteranceRef.current = utt;
    setActivePage(page);
    setPlaying(true);
    window.speechSynthesis.speak(utt);
  }, [getPageText, speed]);

  const togglePause = useCallback(() => {
    if (!isSpeechSupported() || !utteranceRef.current) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
    }
  }, []);

  const changeSpeed = useCallback((next: AudioSpeed, page: number | null) => {
    setSpeed(next);
    // speechSynthesis can't change rate mid-utterance — restart the current page at the new speed.
    if (page != null) readPage(page);
  }, [readPage]);

  return { playing, speed, activePage, readPage, togglePause, changeSpeed, stop, supported: isSpeechSupported() };
}

// Read Section v3.0 — local study data.
//
// Everything here is local-first (localStorage via the safe wrapper in
// storage.ts), same spirit as readingProgress.ts: per-device convenience,
// no backend round-trip needed to jot a highlight or a note mid-read.
//
// Two kinds of state live here:
//   1. Durable per-document data — highlights + Cornell notes. These
//      persist across sessions so a learner's notes are still there next
//      time they open the same book.
//   2. Per-sitting Pomodoro/goal state — kept in the same store but meant
//      to be short-lived; ReadSession resets it whenever a fresh 4-step
//      flow starts.

import { safeGetItem, safeSetItem } from "@/lib/storage";

export type HighlightColor = "yellow" | "green" | "pink" | "blue";

export interface Highlight {
  id: string;
  page: number;
  color: HighlightColor;
  text: string;
  createdAt: number;
}

export interface CornellNotes {
  cues: string;
  main: string;
  summary: string;
}

export interface StudyGoals {
  goal1: string;
  goal2: string;
  goal3: string;
  setAt: number;
}

export interface ResourceStudyData {
  resourceId: string;
  goals?: StudyGoals;
  /** Every goal-set the learner has ever written for this book — the "study
   *  journal" of questions they've asked themselves, kept on their own
   *  phone. Newest first, capped so it doesn't grow forever. */
  goalHistory: StudyGoals[];
  highlights: Highlight[];
  notes: CornellNotes;
  pomodorosCompleted: number;
  updatedAt: number;
}

const STORAGE_KEY = "otechy_study_sessions";
const EVENT_NAME = "otechy:study-session-updated";
const MAX_ENTRIES = 50; // mirrors readingProgress.ts — bound localStorage growth
const MAX_GOAL_HISTORY = 20; // per resource — a book someone reopens often shouldn't grow this file forever

function emptyEntry(resourceId: string): ResourceStudyData {
  return {
    resourceId,
    goalHistory: [],
    highlights: [],
    notes: { cues: "", main: "", summary: "" },
    pomodorosCompleted: 0,
    updatedAt: Date.now(),
  };
}

function readAll(): Record<string, ResourceStudyData> {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, ResourceStudyData>) {
  try {
    const trimmed = Object.values(all)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ENTRIES);
    const next: Record<string, ResourceStudyData> = {};
    for (const e of trimmed) next[e.resourceId] = e;
    safeSetItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full/unavailable — study session still works in-memory for
    // this sitting, it just won't be there next time. Not worth surfacing.
  }
  try { window.dispatchEvent(new Event(EVENT_NAME)); } catch { /* SSR/no-window guard */ }
}

export function getStudyData(resourceId: string): ResourceStudyData {
  const entry = readAll()[resourceId];
  if (!entry) return emptyEntry(resourceId);
  return { ...emptyEntry(resourceId), ...entry, goalHistory: entry.goalHistory ?? [] };
}

function patch(resourceId: string, fn: (entry: ResourceStudyData) => ResourceStudyData) {
  const all = readAll();
  const current = all[resourceId] ? { ...emptyEntry(resourceId), ...all[resourceId], goalHistory: all[resourceId].goalHistory ?? [] } : emptyEntry(resourceId);
  all[resourceId] = { ...fn(current), updatedAt: Date.now() };
  writeAll(all);
  return all[resourceId];
}

export function saveGoals(resourceId: string, goals: Omit<StudyGoals, "setAt">) {
  return patch(resourceId, entry => {
    const entered: StudyGoals = { ...goals, setAt: Date.now() };
    const history = [entered, ...entry.goalHistory].slice(0, MAX_GOAL_HISTORY);
    return { ...entry, goals: entered, goalHistory: history };
  });
}

/** The learner's past study-goal entries for this book, newest first — their own saved study journal. */
export function getGoalHistory(resourceId: string): StudyGoals[] {
  return getStudyData(resourceId).goalHistory;
}

export function addHighlight(resourceId: string, highlight: Omit<Highlight, "id" | "createdAt">) {
  const entry: Highlight = { ...highlight, id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() };
  patch(resourceId, current => ({ ...current, highlights: [...current.highlights, entry] }));
  return entry;
}

export function removeHighlight(resourceId: string, highlightId: string) {
  patch(resourceId, current => ({ ...current, highlights: current.highlights.filter(h => h.id !== highlightId) }));
}

export function saveNotes(resourceId: string, notes: Partial<CornellNotes>) {
  patch(resourceId, current => ({ ...current, notes: { ...current.notes, ...notes } }));
}

export function incrementPomodoro(resourceId: string) {
  return patch(resourceId, current => ({ ...current, pomodorosCompleted: current.pomodorosCompleted + 1 })).pomodorosCompleted;
}

export function resetPomodoroCount(resourceId: string) {
  patch(resourceId, current => ({ ...current, pomodorosCompleted: 0 }));
}

export function onStudyDataChange(callback: () => void): () => void {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}

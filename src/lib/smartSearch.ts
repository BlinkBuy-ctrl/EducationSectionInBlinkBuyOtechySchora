/**
 * Smart search — one shared helper used by every search bar in the app.
 *
 * What it does compared with a plain "does the title contain exactly what was
 * typed" check:
 *  - Word order doesn't matter, and every word must match somewhere:
 *    "biology paper" finds "Biology 2019 Paper 1".
 *  - Searches several fields at once (title, subject, category, …), and a
 *    match in the title ranks above one buried in the description.
 *  - Forgives small typos ("phyics" finds "Physics") and plurals
 *    ("papers" finds "Paper").
 *  - Partial words work while typing ("bio" finds "Biology").
 *  - Ignores capitals, accents and punctuation.
 *  - Ignores filler words like "the", "of", "and".
 *
 * It runs on the list already loaded on the phone — no server, no waiting.
 * With an empty search box it returns the list untouched, in its original order.
 */

export interface SearchField {
  /** The text to search in (null/undefined is fine — it's skipped). */
  text: string | null | undefined;
  /** How important a match here is. Suggested: title 3, subject/author 2, description 1. */
  weight: number;
}

const STOP_WORDS = new Set(["the", "of", "and", "for", "a", "an", "to", "in", "on", "at", "is"]);

// Cache so the same text isn't re-cleaned on every keystroke.
const NORM_CACHE = new Map<string, string>();

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalizeText(input: string): string {
  const hit = NORM_CACHE.get(input);
  if (hit !== undefined) return hit;
  let s = input.toLowerCase();
  try {
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch { /* very old browsers: skip accent stripping */ }
  s = s
    .replace(/['’`]/g, "")
    .replace(/[\s\-_.,;:!?"()[\]{}/\\|+*&^%$#@~<>=]+/g, " ")
    .trim();
  if (NORM_CACHE.size > 4000) NORM_CACHE.clear();
  NORM_CACHE.set(input, s);
  return s;
}

/** Very light plural handling: papers → paper, categories → category. */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** True if a and b are at most `max` edits apart (a swapped pair counts as 1 edit). */
function withinEdits(a: string, b: string, max: number): boolean {
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > max) return false;
  let prev2: number[] = [];
  let prev: number[] = [];
  for (let j = 0; j <= bl; j++) prev.push(j);
  for (let i = 1; i <= al; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev2 = prev;
    prev = cur;
  }
  return prev[bl] <= max;
}

/** Split a typed query into useful words (filler words dropped). */
function tokenize(query: string): string[] {
  const all = normalizeText(query).split(" ").filter(Boolean);
  const useful = all.filter((w) => !STOP_WORDS.has(w));
  return useful.length > 0 ? useful : all;
}

/** How well one typed word matches one field. 0 = no match, 10 = perfect. */
function tokenScore(token: string, tokenStem: string, fieldNorm: string, fieldWords: string[], allowFuzzy: boolean): number {
  let best = 0;
  for (const w of fieldWords) {
    if (w === token || w === tokenStem) return 10;
    if (stem(w) === tokenStem) best = Math.max(best, 9.5);
    else if (w.startsWith(token) || w.startsWith(tokenStem)) best = Math.max(best, 8);
  }
  if (best > 0) return best;

  if (token.length >= 2 && fieldNorm.indexOf(token) !== -1) return 5;

  // Typos — only for words of 4+ letters so short words don't match randomly.
  if (allowFuzzy && token.length >= 4) {
    const max = token.length >= 7 ? 2 : 1;
    for (const w of fieldWords) {
      if (withinEdits(token, w, max)) return 3;
      // still typing a longer word with a typo: compare against its beginning
      if (w.length > token.length && withinEdits(token, w.slice(0, token.length), max)) best = 2.5;
    }
  }
  return best;
}

/** Score one item for a query. 0 means it doesn't match. */
function scoreItem(tokens: string[], phrase: string, fields: SearchField[], allowFuzzy: boolean): number {
  const prepared: { norm: string; words: string[]; weight: number }[] = [];
  for (const f of fields) {
    if (!f.text) continue;
    const norm = normalizeText(String(f.text));
    if (!norm) continue;
    prepared.push({ norm, words: norm.split(" "), weight: f.weight });
  }
  if (prepared.length === 0) return 0;

  let total = 0;
  for (const token of tokens) {
    const tokenStem = stem(token);
    let best = 0;
    for (const f of prepared) {
      const s = tokenScore(token, tokenStem, f.norm, f.words, allowFuzzy) * f.weight;
      if (s > best) best = s;
    }
    if (best === 0) return 0; // every word must match somewhere
    total += best;
  }

  // Bonus when the whole phrase appears together, or the first field starts with it.
  if (tokens.length > 1) {
    for (const f of prepared) {
      if (f.norm.indexOf(phrase) !== -1) { total += 20 * f.weight; break; }
    }
  }
  if (prepared[0].norm.indexOf(phrase) === 0) total += 15 * prepared[0].weight;

  return total;
}

/**
 * Filter + rank a list by a typed query.
 * `getFields` says which parts of each item to search (and how much each counts).
 * Empty query → the original list, unchanged.
 */
export function smartFilter<T>(
  items: T[],
  query: string,
  getFields: (item: T) => SearchField[],
): T[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return items;
  const phrase = tokens.join(" ");

  const run = (allowFuzzy: boolean) => {
    const out: { item: T; score: number; idx: number }[] = [];
    for (let i = 0; i < items.length; i++) {
      const score = scoreItem(tokens, phrase, getFields(items[i]), allowFuzzy);
      if (score > 0) out.push({ item: items[i], score, idx: i });
    }
    return out;
  };

  // First pass is the fast one (exact, starts-with, contains). Only when that
  // finds almost nothing do we spend time on typo-forgiving matching.
  let scored = run(false);
  if (scored.length < 3 && tokens.some((tk) => tk.length >= 4)) scored = run(true);

  // Best match first; ties keep their original order.
  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
  return scored.map((s) => s.item);
}

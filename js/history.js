// Chord history: the last HISTORY_MAX chords the user has finished with, newest first.
// Pure helpers (sanitize / push) plus localStorage persistence wrapped in try/catch.
import { CHORDS_BY_ID } from './chords.js';

export const HISTORY_MAX = 12;
const KEY = 'inStudyChord.history.v1';

// entry: { rootPc: 0-11, chordId, result: 'ok' | 'miss' | null, bassPc: 0-11 | null }
//   result  - only used by Exercise mode
//   bassPc  - Free mode inversions: the lowest note when it is not the root (G/D = root 7, chord maj, bassPc 2)
export function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const e of raw) {
    if (!e || !Number.isInteger(e.rootPc) || e.rootPc < 0 || e.rootPc > 11 || !CHORDS_BY_ID[e.chordId]) continue;
    const bassPc = Number.isInteger(e.bassPc) && e.bassPc >= 0 && e.bassPc <= 11 && e.bassPc !== e.rootPc ? e.bassPc : null;
    out.push({ rootPc: e.rootPc, chordId: e.chordId, result: e.result === 'ok' || e.result === 'miss' ? e.result : null, bassPc });
    if (out.length === HISTORY_MAX) break;
  }
  return out;
}

// Returns a new list with `entry` first. The same chord (same root, type AND bass) twice in a row is kept
// once (the newest wins); G and G/D are different entries.
export function pushHistory(list, entry) {
  const [top] = list;
  const bass = e => (Number.isInteger(e.bassPc) && e.bassPc !== e.rootPc ? e.bassPc : null);
  const rest = top && top.rootPc === entry.rootPc && top.chordId === entry.chordId && bass(top) === bass(entry) ? list.slice(1) : list;
  return sanitizeHistory([entry, ...rest]);
}

export function loadHistory() {
  try { return sanitizeHistory(JSON.parse(localStorage.getItem(KEY))); } catch { return []; }
}

export function saveHistory(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable - fine */ }
}

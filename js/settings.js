// Persisted settings. localStorage may be missing or throw (private mode,
// blocked site data), so every access is wrapped and the app works without it.
import { GROUPS, CHORDS_BY_ID } from './chords.js';

const KEY = 'inStudyChord.settings.v1';

export function defaults() {
  return {
    mode: 'name2keys',          // 'name2keys' | 'keys2name' | 'exercise' | 'free' | 'explore'
    explore: { rootPc: 0, chordId: 'maj7' }, // chord shown in explore mode
    schema: 2,                  // bump when a default changes meaning (see sanitize)
    revealSec: 0,               // seconds until the answer side appears (0 = never automatically: tap to reveal)
    autoNextSec: 0,             // 0 = wait for a tap after reveal
    groups: Object.fromEntries(GROUPS.map(g => [g.id, true])),
    roots: Array(12).fill(true),
    accidentals: 'jazz',        // 'jazz' | 'flats' | 'sharps'
    sound: false,
    noteNames: false,
    degreeLabels: true,
    colorBefore: false,         // keys2name: colour-code before reveal
    exactVoicing: false,        // exercise: require the exact voicing (octaves) instead of just the notes
  };
}

const num = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);

export function sanitize(raw) {
  const d = defaults();
  const r = raw && typeof raw === 'object' ? raw : {};
  const groups = {};
  for (const g of GROUPS) groups[g.id] = bool(r.groups?.[g.id], d.groups[g.id]);
  return {
    mode: ['keys2name', 'exercise', 'free', 'explore'].includes(r.mode) ? r.mode : 'name2keys',
    explore: {
      rootPc: Number.isInteger(r.explore?.rootPc) && r.explore.rootPc >= 0 && r.explore.rootPc < 12
        ? r.explore.rootPc : d.explore.rootPc,
      chordId: CHORDS_BY_ID[r.explore?.chordId] ? r.explore.chordId : d.explore.chordId,
    },
    schema: 2,
    // schema < 2 stored the old default of 5 s; an untouched 5 becomes the new default 0
    revealSec: r.schema !== 2 && r.revealSec === 5 ? 0 : num(r.revealSec, 0, 30, d.revealSec),
    autoNextSec: num(r.autoNextSec, 0, 30, d.autoNextSec),
    groups,
    roots: Array.from({ length: 12 }, (_, i) => bool(r.roots?.[i], true)),
    accidentals: ['jazz', 'flats', 'sharps'].includes(r.accidentals) ? r.accidentals : d.accidentals,
    sound: bool(r.sound, d.sound),
    noteNames: bool(r.noteNames, d.noteNames),
    degreeLabels: bool(r.degreeLabels, d.degreeLabels),
    colorBefore: bool(r.colorBefore, d.colorBefore),
    exactVoicing: bool(r.exactVoicing, d.exactVoicing),
  };
}

export function loadSettings() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return defaults();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch { /* storage unavailable - fine */ }
}

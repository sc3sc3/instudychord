// Exercise-mode judging. Pure module (no DOM) so it can be tested with `node --test`.
//
// `selected` is a Set of MIDI numbers the user tapped on the keyboard.
//  - pitch-class mode (default): only the set of notes matters, any octave counts;
//  - exact mode: the keys must be exactly the voicing the app draws (octaves included).
import { pitchClasses } from './chords.js';
import { chordMidi } from './notes.js';

// How many notes make a complete answer.
export function needed(rootPc, chordDef, exact = false) {
  return exact ? chordDef.semis.length : pitchClasses(rootPc, chordDef).length;
}

// How many of the user's taps count towards that total.
export function selectedCount(selected, exact = false) {
  return exact ? selected.size : new Set([...selected].map(m => m % 12)).size;
}

// Auto-check as soon as the answer has at least as many notes as the chord needs.
export function readyToCheck(selected, rootPc, chordDef, exact = false) {
  return selected.size > 0 && selectedCount(selected, exact) >= needed(rootPc, chordDef, exact);
}

// -> { ok, wrong: [midi of taps that do not belong], missing: number of chord notes not yet found }
export function evaluate(selected, rootPc, chordDef, exact = false) {
  const sel = [...selected];
  if (exact) {
    const want = new Set(chordMidi(rootPc, chordDef));
    const wrong = sel.filter(m => !want.has(m));
    const missing = [...want].filter(m => !selected.has(m)).length;
    return { ok: wrong.length === 0 && missing === 0, wrong, missing };
  }
  const want = new Set(pitchClasses(rootPc, chordDef));
  const have = new Set(sel.map(m => m % 12));
  const wrong = sel.filter(m => !want.has(m % 12));
  const missing = [...want].filter(pc => !have.has(pc)).length;
  return { ok: wrong.length === 0 && missing === 0, wrong, missing };
}

// Is this tapped key acceptable for the chord?
export function isRightKey(midi, rootPc, chordDef, exact = false) {
  return exact ? chordMidi(rootPc, chordDef).includes(midi) : pitchClasses(rootPc, chordDef).includes(midi % 12);
}

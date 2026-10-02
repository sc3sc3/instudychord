// Note names, letter-based spelling and MIDI math. Pure module (no DOM).

export const KEY_LOW = 48;  // C3 - first key of the keyboard
export const KEY_HIGH = 83; // B5 - last key (max chord reach is B3 + 21 = 80)

const FLAT = '♭', SHARP = '♯';

// Root-name tables for the three accidental preferences.
export const ROOT_NAMES = {
  jazz: ['C', 'D' + FLAT, 'D', 'E' + FLAT, 'E', 'F', 'F' + SHARP, 'G', 'A' + FLAT, 'A', 'B' + FLAT, 'B'],
  flats: ['C', 'D' + FLAT, 'D', 'E' + FLAT, 'E', 'F', 'G' + FLAT, 'G', 'A' + FLAT, 'A', 'B' + FLAT, 'B'],
  sharps: ['C', 'C' + SHARP, 'D', 'D' + SHARP, 'E', 'F', 'F' + SHARP, 'G', 'G' + SHARP, 'A', 'A' + SHARP, 'B'],
};

export function rootName(pc, pref = 'jazz') {
  return (ROOT_NAMES[pref] || ROOT_NAMES.jazz)[pc];
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

function parseRoot(name) {
  const li = LETTERS.indexOf(name[0]);
  if (li < 0) throw new Error(`bad root "${name}"`);
  let acc = 0;
  for (const ch of name.slice(1)) acc += ch === SHARP ? 1 : ch === FLAT ? -1 : 0;
  return { li, pc: (((NATURAL[li] + acc) % 12) + 12) % 12 };
}

function accidental(d) {
  if (d === 0) return '';
  if (d === 1) return SHARP;
  if (d === 2) return '𝔪'; // double sharp
  if (d < 0) return FLAT.repeat(-d);
  return SHARP.repeat(d);
}

// Spell one chord tone with the correct letter: the letter is the root's letter
// advanced by (degree - 1); the accidental makes the pitch fit.
export function spellTone(root, tone) {
  const { li, pc } = parseRoot(root);
  const letter = (li + tone.n - 1) % 7;
  const pitch = (pc + tone.semis) % 12;
  let d = (((pitch - NATURAL[letter]) % 12) + 12) % 12;
  if (d > 6) d -= 12;
  return LETTERS[letter] + accidental(d);
}

export function spellChord(root, chordDef) {
  return chordDef.tones.map(t => spellTone(root, t));
}

export function chordName(root, chordDef) {
  return root + chordDef.symbol;
}

// MIDI notes of a chord in root position; the root sits in the C3-B3 octave.
export function chordMidi(rootPc, chordDef) {
  return chordDef.semis.map(s => KEY_LOW + rootPc + s);
}

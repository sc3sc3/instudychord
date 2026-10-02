// Free mode: name the chord a user has played. Pure module (no DOM) so it can be tested with `node --test`.
//
// Input: the MIDI keys the user selected. A chord matches when it sounds exactly the same set of pitch
// classes (octaves and doubling don't matter). Several chords usually share the notes (C6 = Am7/C ...),
// so matches are ranked; the first is the primary reading:
//   1. the chord whose root is the lowest note (root position) beats an inversion (slash chord),
//   2. then a chord whose own voicing is exactly the keys played,
//   3. then the simpler chord (catalogue order: triads, suspended, add, sixths, sevenths, ...).
import { CHORDS, pitchClasses } from './chords.js';
import { chordMidi } from './notes.js';

const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const MAX_NEAR = 6;

// -> { tooFew, midis, pcs, bassPc, matches: [{rootPc, chord, rootIsBass, exactVoicing}], near: [{rootPc, chord, rootIsBass, missingPc}] }
//    `near` = chords that contain all the played notes plus exactly one more (an omitted 5th, a shell voicing...);
//    only worth showing when there is no exact match.
export function identify(selected) {
  const midis = [...selected].sort((a, b) => a - b);
  const pcs = [...new Set(midis.map(m => m % 12))].sort((a, b) => a - b);
  const bassPc = midis.length ? midis[0] % 12 : null;
  if (pcs.length < 2) return { tooFew: true, midis, pcs, bassPc, matches: [], near: [] };

  const matches = [], near = [];
  CHORDS.forEach((chord, idx) => {
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      const cp = pitchClasses(rootPc, chord);
      if (same(cp, pcs)) {
        matches.push({ rootPc, chord, idx, rootIsBass: rootPc === bassPc, exactVoicing: same(chordMidi(rootPc, chord), midis) });
      } else if (cp.length === pcs.length + 1 && pcs.every(p => cp.includes(p))) {
        near.push({ rootPc, chord, idx, rootIsBass: rootPc === bassPc, missingPc: cp.find(p => !pcs.includes(p)) });
      }
    }
  });

  matches.sort((a, b) => (b.rootIsBass - a.rootIsBass) || (b.exactVoicing - a.exactVoicing) || (a.idx - b.idx) || (a.rootPc - b.rootPc));
  near.sort((a, b) => (b.rootIsBass - a.rootIsBass) || (a.idx - b.idx) || (a.rootPc - b.rootPc));
  return { tooFew: false, midis, pcs, bassPc, matches, near: near.slice(0, MAX_NEAR) };
}

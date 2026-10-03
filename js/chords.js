// Chord catalogue. Pure module (no DOM) so it can be tested with `node --test`.
//
// Each chord is defined by a `tones` formula in ASCENDING PITCH ORDER. A token is
// an optional accidental (b, bb, #) plus a degree number; degrees above 7 are
// compound (9 = 2nd + octave, 10 = 3rd + octave, 11, 13 ...). Semitones are
// derived from the formula, never typed by hand.

const BASE = [0, 2, 4, 5, 7, 9, 11]; // major-scale semitones for degrees 1..7
const ACC = { '': 0, '#': 1, b: -1, bb: -2 };
const ACC_GLYPH = { '-2': '♭♭', '-1': '♭', '0': '', '1': '♯' };

export const GROUPS = [
  { id: 'triads', label: 'Triads' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'add', label: 'Add chords' },
  { id: 'sixths', label: 'Sixths' },
  { id: 'sevenths', label: 'Sevenths' },
  { id: 'ninths', label: 'Ninths' },
  { id: 'elevenths', label: 'Elevenths' },
  { id: 'thirteenths', label: 'Thirteenths' },
  { id: 'lydian', label: 'Lydian / ♯11' },
  { id: 'altered_fifths', label: 'Altered fifths' },
  { id: 'altered_dominants', label: 'Altered dominants' },
  { id: 'quartal', label: 'Quartal & quintal' },
];

// Tone role -> colour class on the keyboard.
export const ROLES = ['root', 'third', 'fifth', 'seventh', 'extension'];

export function parseTone(token) {
  const m = /^(bb|b|#)?(\d{1,2})$/.exec(token);
  if (!m) throw new Error(`bad tone token "${token}"`);
  const n = Number(m[2]);
  if (n < 1) throw new Error(`bad degree in "${token}"`);
  const acc = ACC[m[1] || ''];
  const semis = BASE[(n - 1) % 7] + 12 * Math.floor((n - 1) / 7) + acc;
  return { token, n, acc, semis, role: roleOf(n), label: labelOf(n, acc) };
}

// 1 root | 3/10 + simple 2/4 (sus) third | 5 fifth | 7 + simple 6 seventh | 9/11/13 extension
function roleOf(n) {
  if (n === 9 || n === 11 || n === 13) return 'extension';
  if (n === 1 || n === 8) return 'root';
  if (n === 2 || n === 4) return 'third';
  if (n === 6) return 'seventh';
  const simple = ((n - 1) % 7) + 1;
  if (simple === 3) return 'third';
  if (simple === 5) return 'fifth';
  if (simple === 7) return 'seventh';
  throw new Error(`no role for degree ${n}`);
}

// Compound 10/12/14 are shown as 3/5/7; 9/11/13 keep their extension names.
function labelOf(n, acc) {
  const shown = n === 9 || n === 11 || n === 13 ? n : ((n - 1) % 7) + 1;
  if (shown === 1 && acc === 0) return 'R';
  return ACC_GLYPH[acc] + shown;
}

// id, group, symbol, long name, aliases, tones, fromFile (listed in Chord.java)
function chord(id, group, symbol, name, aliases, formula, fromFile = false) {
  const tones = formula.split(' ').map(parseTone);
  return Object.freeze({
    id, group, symbol, name, aliases, formula, fromFile,
    tones: Object.freeze(tones),
    semis: Object.freeze(tones.map(t => t.semis)),
  });
}

const F = true;
const b = '♭', s = '♯';

export const CHORDS = Object.freeze([
  // --- triads
  chord('maj', 'triads', '', 'major triad', ['maj', 'M'], '1 3 5', F),
  chord('min', 'triads', 'm', 'minor triad', ['min', '-'], '1 b3 5', F),
  chord('dim', 'triads', 'dim', 'diminished triad', ['°', 'm' + b + '5'], '1 b3 b5', F),
  chord('aug', 'triads', 'aug', 'augmented triad', ['+', s + '5'], '1 3 #5', F),
  chord('majb5', 'triads', '(' + b + '5)', 'major flat five', ['maj' + b + '5', 'M' + b + '5'], '1 3 b5'),
  chord('mins5', 'triads', 'm' + s + '5', 'minor sharp five', ['m(' + s + '5)', '-' + s + '5'], '1 b3 #5'),
  chord('power', 'triads', '5', 'power chord (root and fifth)', [], '1 5'),

  // --- suspended
  chord('sus2', 'suspended', 'sus2', 'suspended second', ['2'], '1 2 5', F),
  chord('sus4', 'suspended', 'sus4', 'suspended fourth', ['sus'], '1 4 5', F),
  chord('sus24', 'suspended', 'sus2sus4', 'suspended second and fourth', ['sus24', 'sus2/4'], '1 2 4 5'),
  chord('dom7sus2', 'suspended', '7sus2', 'dominant seventh suspended second', ['7(sus2)'], '1 2 5 b7'),
  chord('dom7sus4', 'suspended', '7sus4', 'dominant seventh suspended fourth', ['7sus'], '1 4 5 b7'),
  chord('dom7sus4b9', 'suspended', '7sus4' + b + '9', 'dominant seventh suspended fourth flat nine', ['7sus' + b + '9', '7sus4(' + b + '9)'], '1 4 5 b7 b9'),
  chord('dom9sus4', 'suspended', '9sus4', 'dominant ninth suspended fourth', ['9sus'], '1 4 5 b7 9'),
  chord('dom13sus4', 'suspended', '13sus4', 'dominant thirteenth suspended fourth', ['13sus'], '1 4 5 b7 9 13'),
  chord('maj7sus2', 'suspended', 'maj7sus2', 'major seventh suspended second', ['Δ7sus2', 'M7sus2'], '1 2 5 7'),
  chord('maj7sus4', 'suspended', 'maj7sus4', 'major seventh suspended fourth', ['Δ7sus4', 'M7sus4'], '1 4 5 7'),
  chord('maj9sus4', 'suspended', 'maj9sus4', 'major ninth suspended fourth', ['Δ9sus4', 'M9sus4'], '1 4 5 7 9'),

  // --- add chords
  chord('add9', 'add', 'add9', 'major added ninth', ['(add9)', 'add2'], '1 3 5 9', F),
  chord('minadd9', 'add', 'm(add9)', 'minor added ninth', ['madd9', 'm add9'], '1 b3 5 9'),
  chord('add11', 'add', 'add11', 'major added eleventh', ['(add11)', 'add4'], '1 3 5 11'),
  chord('minadd11', 'add', 'm(add11)', 'minor added eleventh', ['madd11', 'madd4'], '1 b3 5 11'),
  chord('adds11', 'add', 'add' + s + '11', 'major added sharp eleven', ['(add' + s + '11)', 'add' + s + '4'], '1 3 5 #11'),
  chord('addb9', 'add', 'add' + b + '9', 'major added flat nine', ['(add' + b + '9)'], '1 3 5 b9'),
  chord('adds9', 'add', 'add' + s + '9', 'major added sharp nine', ['(add' + s + '9)'], '1 3 5 #9'),
  chord('augadd9', 'add', 'aug(add9)', 'augmented added ninth', ['+add9', '+(add9)'], '1 3 #5 9'),

  // --- sixths
  chord('maj6', 'sixths', '6', 'major sixth', ['maj6', 'M6'], '1 3 5 6', F),
  chord('min6', 'sixths', 'm6', 'minor sixth', ['min6', '-6'], '1 b3 5 6', F),
  chord('maj69', 'sixths', '6/9', 'major six-nine', ['69', '6add9'], '1 3 5 6 9'),
  chord('min69', 'sixths', 'm6/9', 'minor six-nine', ['m69', '-6/9'], '1 b3 5 6 9'),
  chord('maj6sus4', 'sixths', '6sus4', 'major sixth suspended fourth', ['6sus'], '1 4 5 6'),
  chord('maj69s11', 'sixths', '6/9' + s + '11', 'major six-nine sharp eleven', ['6/9(' + s + '11)'], '1 3 5 6 9 #11'),

  // --- sevenths
  chord('dom7', 'sevenths', '7', 'dominant seventh', ['dom7'], '1 3 5 b7', F),
  chord('maj7', 'sevenths', 'maj7', 'major seventh', ['Δ7', 'M7', 'Δ'], '1 3 5 7', F),
  chord('min7', 'sevenths', 'm7', 'minor seventh', ['min7', '-7'], '1 b3 5 b7', F),
  chord('dim7', 'sevenths', 'dim7', 'diminished seventh', ['°7'], '1 b3 b5 bb7', F),
  chord('min7b5', 'sevenths', 'm7' + b + '5', 'half-diminished seventh', ['ø7', 'ø', 'min7' + b + '5'], '1 b3 b5 b7'),
  chord('minmaj7', 'sevenths', 'm(maj7)', 'minor-major seventh', ['mMaj7', '-Δ7', 'mΔ7'], '1 b3 5 7', F),
  chord('dimmaj7', 'sevenths', 'dim(maj7)', 'diminished major seventh', ['°(maj7)', 'dimΔ7'], '1 b3 b5 7'),

  // --- ninths
  chord('dom9', 'ninths', '9', 'dominant ninth', ['dom9'], '1 3 5 b7 9', F),
  chord('maj9', 'ninths', 'maj9', 'major ninth', ['Δ9', 'M9'], '1 3 5 7 9', F),
  chord('min9', 'ninths', 'm9', 'minor ninth', ['min9', '-9'], '1 b3 5 b7 9', F),
  chord('minmaj9', 'ninths', 'm(maj9)', 'minor-major ninth', ['mMaj9', '-Δ9'], '1 b3 5 7 9'),
  chord('min9b5', 'ninths', 'm9' + b + '5', 'half-diminished ninth', ['ø9'], '1 b3 b5 b7 9'),
  chord('dim9', 'ninths', 'dim9', 'diminished ninth', ['°9', 'dim7(add9)'], '1 b3 b5 bb7 9'),
  chord('min7b9', 'ninths', 'm7' + b + '9', 'minor seventh flat nine', ['m7(' + b + '9)', 'min7' + b + '9'], '1 b3 5 b7 b9'),
  chord('min7b5b9', 'ninths', 'm7' + b + '5' + b + '9', 'half-diminished flat nine', ['ø' + b + '9', 'm7' + b + '5(' + b + '9)'], '1 b3 b5 b7 b9'),

  // --- elevenths (dom11 omits the 3rd on purpose: it clashes with the 11th)
  chord('dom11', 'elevenths', '11', 'dominant eleventh', ['dom11'], '1 5 b7 9 11', F),
  chord('min11', 'elevenths', 'm11', 'minor eleventh', ['min11', '-11'], '1 b3 5 b7 9 11', F),
  chord('maj11', 'elevenths', 'maj11', 'major eleventh', ['Δ11', 'M11'], '1 3 5 7 9 11'),
  chord('minmaj11', 'elevenths', 'm(maj11)', 'minor-major eleventh', ['mMaj11', '-Δ11'], '1 b3 5 7 9 11'),
  chord('min11b5', 'elevenths', 'm11' + b + '5', 'half-diminished eleventh', ['ø11'], '1 b3 b5 b7 9 11'),
  chord('min7add11', 'elevenths', 'm7(add11)', 'minor seventh added eleventh', ['m7add11'], '1 b3 5 b7 11'),
  chord('maj7add11', 'elevenths', 'maj7(add11)', 'major seventh added eleventh', ['Δ7(add11)', 'maj7add11'], '1 3 5 7 11'),

  // --- thirteenths
  chord('dom13', 'thirteenths', '13', 'dominant thirteenth', ['dom13'], '1 3 5 b7 9 13', F),
  chord('min13', 'thirteenths', 'm13', 'minor thirteenth', ['min13', '-13'], '1 b3 5 b7 9 13', F),
  chord('maj13', 'thirteenths', 'maj13', 'major thirteenth', ['Δ13', 'M13'], '1 3 5 7 9 13', F),
  chord('minmaj13', 'thirteenths', 'm(maj13)', 'minor-major thirteenth', ['mMaj13', '-Δ13'], '1 b3 5 7 9 13'),
  chord('dom7add13', 'thirteenths', '7(add13)', 'dominant seventh added thirteenth', ['7/13', '7add13'], '1 3 5 b7 13'),
  chord('min7add13', 'thirteenths', 'm7(add13)', 'minor seventh added thirteenth', ['m7add13'], '1 b3 5 b7 13'),
  chord('maj7add13', 'thirteenths', 'maj7(add13)', 'major seventh added thirteenth', ['Δ7(add13)', 'maj7add13'], '1 3 5 7 13'),

  // --- lydian / sharp 11
  chord('maj7s11', 'lydian', 'maj7' + s + '11', 'major seventh sharp eleven', ['Δ7' + s + '11', 'maj7(' + s + '11)'], '1 3 5 7 #11'),
  chord('maj9s11', 'lydian', 'maj9' + s + '11', 'major ninth sharp eleven', ['Δ9' + s + '11', 'maj9(' + s + '11)'], '1 3 5 7 9 #11'),
  chord('maj13s11', 'lydian', 'maj13' + s + '11', 'major thirteenth sharp eleven', ['Δ13' + s + '11', 'maj13(' + s + '11)'], '1 3 5 7 9 #11 13'),
  chord('dom7s11', 'lydian', '7' + s + '11', 'dominant seventh sharp eleven', ['7(' + s + '11)'], '1 3 5 b7 #11'),
  chord('dom9s11', 'lydian', '9' + s + '11', 'dominant ninth sharp eleven', ['9(' + s + '11)'], '1 3 5 b7 9 #11'),
  chord('dom13s11', 'lydian', '13' + s + '11', 'dominant thirteenth sharp eleven', ['13(' + s + '11)'], '1 3 b7 9 #11 13'),
  chord('min7s11', 'lydian', 'm7' + s + '11', 'minor seventh sharp eleven', ['m7(' + s + '11)'], '1 b3 5 b7 #11'),
  chord('min9s11', 'lydian', 'm9' + s + '11', 'minor ninth sharp eleven', ['m9(' + s + '11)'], '1 b3 5 b7 9 #11'),
  chord('maj7s5s11', 'lydian', 'maj7' + s + '5' + s + '11', 'major seventh sharp five sharp eleven (lydian augmented)', ['Δ7' + s + '5' + s + '11'], '1 3 #5 7 #11'),

  // --- altered fifths
  chord('dom7b5', 'altered_fifths', '7' + b + '5', 'dominant seventh flat five', ['7(' + b + '5)', '7-5'], '1 3 b5 b7', F),
  chord('dom7s5', 'altered_fifths', '7' + s + '5', 'dominant seventh sharp five', ['7+', 'aug7', '7(' + s + '5)'], '1 3 #5 b7', F),
  chord('maj7b5', 'altered_fifths', 'maj7' + b + '5', 'major seventh flat five', ['Δ7' + b + '5'], '1 3 b5 7', F),
  chord('maj7s5', 'altered_fifths', 'maj7' + s + '5', 'major seventh sharp five', ['Δ7' + s + '5', 'maj7+'], '1 3 #5 7', F),
  chord('dom9b5', 'altered_fifths', '9' + b + '5', 'dominant ninth flat five', ['9(' + b + '5)'], '1 3 b5 b7 9'),
  chord('dom9s5', 'altered_fifths', '9' + s + '5', 'dominant ninth sharp five', ['9+', 'aug9'], '1 3 #5 b7 9'),
  chord('maj9b5', 'altered_fifths', 'maj9' + b + '5', 'major ninth flat five', ['Δ9' + b + '5'], '1 3 b5 7 9'),
  chord('maj9s5', 'altered_fifths', 'maj9' + s + '5', 'major ninth sharp five', ['Δ9' + s + '5', 'maj9+'], '1 3 #5 7 9'),
  chord('min7s5', 'altered_fifths', 'm7' + s + '5', 'minor seventh sharp five', ['m7(' + s + '5)', 'm7+'], '1 b3 #5 b7'),
  chord('min9s5', 'altered_fifths', 'm9' + s + '5', 'minor ninth sharp five', ['m9(' + s + '5)', 'm9+'], '1 b3 #5 b7 9'),
  chord('minmaj7s5', 'altered_fifths', 'm(maj7' + s + '5)', 'minor-major seventh sharp five', ['mMaj7' + s + '5'], '1 b3 #5 7'),
  chord('dom9s5s11', 'altered_fifths', '9' + s + '5' + s + '11', 'dominant ninth sharp five sharp eleven (whole-tone)', ['9(' + s + '5,' + s + '11)'], '1 3 #5 b7 9 #11'),

  // --- altered dominants
  chord('dom7b9', 'altered_dominants', '7' + b + '9', 'dominant seventh flat nine', ['7(' + b + '9)'], '1 3 5 b7 b9'),
  chord('dom7s9', 'altered_dominants', '7' + s + '9', 'dominant seventh sharp nine', ['7(' + s + '9)'], '1 3 5 b7 #9'),
  chord('dom7b5b9', 'altered_dominants', '7' + b + '5' + b + '9', 'dominant seventh flat five flat nine', ['7(' + b + '5,' + b + '9)'], '1 3 b5 b7 b9', F),
  chord('dom7b5s9', 'altered_dominants', '7' + b + '5' + s + '9', 'dominant seventh flat five sharp nine', ['7(' + b + '5,' + s + '9)'], '1 3 b5 b7 #9', F),
  chord('dom7s5b9', 'altered_dominants', '7' + s + '5' + b + '9', 'dominant seventh sharp five flat nine', ['7(' + s + '5,' + b + '9)'], '1 3 #5 b7 b9', F),
  chord('dom7s5s9', 'altered_dominants', '7' + s + '5' + s + '9', 'dominant seventh sharp five sharp nine', ['7(' + s + '5,' + s + '9)'], '1 3 #5 b7 #9', F),
  chord('dom13b9', 'altered_dominants', '13' + b + '9', 'dominant thirteenth flat nine', ['13(' + b + '9)'], '1 3 5 b7 b9 13'),
  chord('alt', 'altered_dominants', '7alt', 'altered dominant (7' + s + '9' + b + '13)', ['7' + s + '9' + b + '13', 'alt'], '1 3 b7 #9 b13'),
  chord('dom7b9s11', 'altered_dominants', '7' + b + '9' + s + '11', 'dominant seventh flat nine sharp eleven', ['7(' + b + '9,' + s + '11)'], '1 3 5 b7 b9 #11'),
  chord('dom7s9s11', 'altered_dominants', '7' + s + '9' + s + '11', 'dominant seventh sharp nine sharp eleven', ['7(' + s + '9,' + s + '11)'], '1 3 5 b7 #9 #11'),
  chord('dom7b9b13', 'altered_dominants', '7' + b + '9' + b + '13', 'dominant seventh flat nine flat thirteen', ['7(' + b + '9,' + b + '13)'], '1 3 b7 b9 b13'),
  chord('dom7b13', 'altered_dominants', '7' + b + '13', 'dominant seventh flat thirteen', ['7(' + b + '13)', '7' + b + '6'], '1 3 5 b7 b13'),
  chord('dom9b13', 'altered_dominants', '9' + b + '13', 'dominant ninth flat thirteen', ['9(' + b + '13)'], '1 3 b7 9 b13'),
  chord('dom13s9', 'altered_dominants', '13' + s + '9', 'dominant thirteenth sharp nine', ['13(' + s + '9)'], '1 3 5 b7 #9 13'),
  chord('dom13b9s11', 'altered_dominants', '13' + b + '9' + s + '11', 'dominant thirteenth flat nine sharp eleven', ['13(' + b + '9,' + s + '11)'], '1 3 b7 b9 #11 13'),

  // --- quartal & quintal (stacked perfect fourths / fifths from the root)
  chord('quartal3', 'quartal', 'quartal', 'quartal triad (stacked fourths)', [], '1 4 b7'),
  chord('quartal4', 'quartal', 'quartal4', 'quartal tetrad (four stacked fourths)', [], '1 4 b7 b10'),
  chord('quartal5', 'quartal', 'quartal5', 'quartal pentad (five stacked fourths)', [], '1 4 b7 b10 b13'),
  chord('quintal3', 'quartal', 'quintal', 'quintal triad (stacked fifths)', [], '1 5 9'),
  chord('quintal4', 'quartal', 'quintal4', 'quintal tetrad (four stacked fifths)', [], '1 5 9 13'),
]);

export const CHORDS_BY_ID = Object.freeze(Object.fromEntries(CHORDS.map(c => [c.id, c])));

export function chordsInGroups(enabledGroupIds) {
  const on = new Set(enabledGroupIds);
  return CHORDS.filter(c => on.has(c.group));
}

// Sorted unique pitch classes (0-11) of a chord on a root.
export function pitchClasses(rootPc, chordDef) {
  return [...new Set(chordDef.semis.map(s => (rootPc + s) % 12))].sort((a, b) => a - b);
}

// Other root/chord combinations sounding the identical set of pitch classes
// (C6 = Am7, Cdim7 = E♭dim7 ...). Excludes the chord itself.
export function sameNotes(rootPc, chordDef) {
  const key = pitchClasses(rootPc, chordDef).join(',');
  const out = [];
  for (const other of CHORDS) {
    for (let pc = 0; pc < 12; pc++) {
      if (pc === rootPc && other.id === chordDef.id) continue;
      if (pitchClasses(pc, other).join(',') === key) out.push({ rootPc: pc, chord: other });
    }
  }
  return out;
}

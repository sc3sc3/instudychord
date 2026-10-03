import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHORDS, CHORDS_BY_ID, voicing } from '../js/chords.js';
import { chordMidi } from '../js/notes.js';
import { evaluate, needed, readyToCheck, selectedCount, isRightKey } from '../js/exercise.js';
import { sanitize } from '../js/settings.js';

const set = (...m) => new Set(m);
const C = 0, G = 7;

test('exact voicing is judged strictly', () => {
  const maj7 = CHORDS_BY_ID.maj7;                         // C E G B = 48 52 55 59
  assert.deepEqual(chordMidi(C, maj7), [48, 52, 55, 59]);
  assert.equal(evaluate(set(48, 52, 55, 59), C, maj7, true).ok, true);
  const octave = evaluate(set(60, 52, 55, 59), C, maj7, true); // root an octave up
  assert.equal(octave.ok, false);
  assert.deepEqual(octave.wrong, [60]);
  assert.equal(octave.missing, 1);
});

test('pitch-class mode accepts any octave and any order', () => {
  const dom7 = CHORDS_BY_ID.dom7;                          // G B D F
  assert.equal(evaluate(set(55, 59, 62, 65), G, dom7).ok, true);
  assert.equal(evaluate(set(67, 71, 62, 53), G, dom7).ok, true);   // G4 B4 D4 F3
  assert.equal(evaluate(set(55, 67, 59, 62, 65), G, dom7).ok, true); // doubled root is fine
});

test('wrong notes and missing notes are reported', () => {
  const m7 = CHORDS_BY_ID.min7;                            // C Eb G Bb
  const r = evaluate(set(48, 52, 55, 58), C, m7);          // E natural instead of Eb
  assert.equal(r.ok, false);
  assert.deepEqual(r.wrong, [52]);
  assert.equal(r.missing, 1);
  assert.equal(evaluate(set(48, 51), C, m7).missing, 2);   // incomplete, nothing wrong yet
  assert.deepEqual(evaluate(set(48, 51), C, m7).wrong, []);
});

test('enharmonic spelling is irrelevant: only the key matters', () => {
  assert.equal(evaluate(set(49, 53, 56), 1, CHORDS_BY_ID.maj).ok, true); // Db F Ab (C# F G#)
});

test('counts and the auto-check threshold', () => {
  const maj13 = CHORDS_BY_ID.maj13;                        // 6 distinct pitch classes
  assert.equal(needed(C, maj13), 6);
  assert.equal(needed(C, maj13, true), 6);
  // two octaves of the same note count once in pitch-class mode, twice in exact mode
  assert.equal(selectedCount(set(48, 60), false), 1);
  assert.equal(selectedCount(set(48, 60), true), 2);
  const maj = CHORDS_BY_ID.maj;
  assert.equal(readyToCheck(set(48, 52), C, maj), false);
  assert.equal(readyToCheck(set(48, 52, 55), C, maj), true);
  assert.equal(readyToCheck(set(48, 60, 52), C, maj), false);   // 2 distinct pitch classes only
  assert.equal(readyToCheck(set(), C, maj), false);
});

test('isRightKey', () => {
  assert.equal(isRightKey(60, C, CHORDS_BY_ID.maj), true);        // C in another octave
  assert.equal(isRightKey(60, C, CHORDS_BY_ID.maj, true), false);
  assert.equal(isRightKey(49, C, CHORDS_BY_ID.maj), false);
});

for (const full of [false, true]) test(`every chord in every root solves with its own voicing in both modes (full voicings: ${full})`, () => {
  for (const chord of CHORDS.map(c => voicing(c, full))) for (let pc = 0; pc < 12; pc++) {
    const keys = new Set(chordMidi(pc, chord));
    for (const exact of [false, true]) {
      assert.equal(evaluate(keys, pc, chord, exact).ok, true, `${chord.id}@${pc} exact=${exact}`);
      assert.equal(readyToCheck(keys, pc, chord, exact), true, `${chord.id}@${pc} ready exact=${exact}`);
      // dropping any one key must never be "ok"
      for (const k of keys) { const less = new Set(keys); less.delete(k); assert.equal(evaluate(less, pc, chord, exact).ok, false); }
    }
  }
});

test('settings: exercise mode and exactVoicing are sanitized', () => {
  assert.equal(sanitize({ mode: 'exercise' }).mode, 'exercise');
  assert.equal(sanitize({ mode: 'free' }).mode, 'free');
  assert.equal(sanitize({}).exactVoicing, false);
  assert.equal(sanitize({ exactVoicing: true }).exactVoicing, true);
  assert.equal(sanitize({ exactVoicing: 'yes' }).exactVoicing, false);
  assert.equal(sanitize({}).fullVoicings, false);
  assert.equal(sanitize({ fullVoicings: true }).fullVoicings, true);
  assert.equal(sanitize({ fullVoicings: 1 }).fullVoicings, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHORDS, CHORDS_BY_ID, GROUPS, parseTone, sameNotes, pitchClasses, voicing } from '../js/chords.js';
import { spellChord, spellTone, chordMidi, rootName, KEY_LOW, KEY_HIGH } from '../js/notes.js';
import { defaults, sanitize } from '../js/settings.js';

// Verbatim from ChkromaLib/src/sound/intrah/Chord.java (comment table).
const JAVA = {
  maj: [0, 4, 7], min: [0, 3, 7], aug: [0, 4, 8], dim: [0, 3, 6],
  dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10],
  sus4: [0, 5, 7], sus2: [0, 2, 7], maj6: [0, 4, 7, 9], min6: [0, 3, 7, 9],
  dom9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], min9: [0, 3, 7, 10, 14],
  dim7: [0, 3, 6, 9], add9: [0, 4, 7, 14],
  min11: [0, 7, 10, 14, 15, 17], dom11: [0, 7, 10, 14, 17],
  dom13: [0, 7, 10, 14, 16, 21], min13: [0, 7, 10, 14, 15, 21], maj13: [0, 7, 11, 14, 16, 21],
  dom7b5: [0, 4, 6, 10], dom7s5: [0, 4, 8, 10], maj7b5: [0, 4, 6, 11], maj7s5: [0, 4, 8, 11],
  minmaj7: [0, 3, 7, 11],
  dom7b5b9: [0, 4, 6, 10, 13], dom7b5s9: [0, 4, 6, 10, 15],
  dom7s5b9: [0, 4, 8, 10, 13], dom7s5s9: [0, 4, 8, 10, 15],
};

// Chord.java stacks the 3rd above the 9th in these; the app uses close degree order instead (same notes).
const REVOICED = new Set(['min11', 'dom13', 'min13', 'maj13']);

test('all 30 Chord.java chords are present (same semitones, revoiced ones same notes)', () => {
  assert.equal(Object.keys(JAVA).length, 30);
  for (const [id, semis] of Object.entries(JAVA)) {
    const c = CHORDS_BY_ID[id];
    assert.ok(c, `missing chord ${id}`);
    if (REVOICED.has(id)) {
      assert.deepEqual([...new Set(c.semis.map(x => x % 12))].sort((a, b) => a - b), [...new Set(semis.map(x => x % 12))].sort((a, b) => a - b), id);
      assert.ok(c.semis.every((x, i) => i === 0 || x > c.semis[i - 1]), `${id} ascending`);
    } else {
      assert.deepEqual([...c.semis], semis, id);
    }
    assert.equal(c.fromFile, true, `${id} should be flagged fromFile`);
  }
  assert.equal(CHORDS.filter(c => c.fromFile).length, 30);
});

test('catalogue invariants', () => {
  const groups = new Set(GROUPS.map(g => g.id));
  const ids = new Set();
  assert.equal(CHORDS.length, 102);
  assert.equal(new Set(CHORDS.map(c => c.symbol)).size, CHORDS.length, 'chord symbols must be unique');
  for (const c of CHORDS) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(groups.has(c.group), `${c.id}: unknown group`);
    assert.equal(c.semis[0], 0, `${c.id}: root first`);
    for (let i = 1; i < c.semis.length; i++) {
      assert.ok(c.semis[i] > c.semis[i - 1], `${c.id}: not strictly ascending`);
    }
    assert.ok(c.semis.at(-1) <= 21, `${c.id}: reach > 21`);
    assert.equal(new Set(c.semis.map(x => x % 12)).size, c.semis.length, `${c.id}: repeated pitch class`);
    assert.ok(c.symbol !== undefined && c.name && Array.isArray(c.aliases));
  }
  for (const g of GROUPS) assert.ok(CHORDS.some(c => c.group === g.id), `empty group ${g.id}`);
});

test('non-file chords: tones in degree order, 3rd below the 9th', () => {
  for (const c of CHORDS.filter(c => !c.fromFile)) {
    const third = c.tones.find(t => t.role === 'third' && t.n === 3);
    const ninth = c.tones.find(t => t.n === 9);
    if (third && ninth) assert.ok(third.semis < ninth.semis, `${c.id}: 3rd above 9th`);
    const simples = c.tones.map(t => ((t.n - 1) % 7) + 1);
    // degree numbers (as typed) must be non-decreasing
    const typed = c.tones.map(t => t.n);
    assert.deepEqual(typed, [...typed].sort((a, b) => a - b), `${c.id}: degrees out of order`);
    assert.ok(simples.length === c.tones.length);
  }
});

test('every chord fits on the keyboard for every root', () => {
  for (const c of CHORDS) {
    for (let pc = 0; pc < 12; pc++) {
      for (const m of chordMidi(pc, c)) assert.ok(m >= KEY_LOW && m <= KEY_HIGH, `${c.id} root ${pc}: midi ${m}`);
    }
  }
});

test('tone parser', () => {
  assert.equal(parseTone('b10').semis, 15);
  assert.equal(parseTone('#11').semis, 18);
  assert.equal(parseTone('b13').semis, 20);
  assert.equal(parseTone('bb7').semis, 9);
  assert.throws(() => parseTone('x3'));
  assert.throws(() => parseTone('0'));
});

test('role classification', () => {
  const role = (id, label) => CHORDS_BY_ID[id].tones.find(t => t.label === label)?.role;
  assert.equal(role('sus4', '4'), 'third');
  assert.equal(role('sus2', '2'), 'third');
  assert.equal(role('maj6', '6'), 'seventh');
  assert.equal(role('dom9', '9'), 'extension');
  assert.equal(role('dom11', '11'), 'extension');
  assert.equal(role('dom13', '13'), 'extension');
  assert.equal(role('dom13', '3'), 'third');       // 10th shown as 3
  assert.equal(role('min13', '♭3'), 'third');
  assert.equal(role('dom7s5b9', '♯5'), 'fifth');
  assert.equal(role('dom7s5b9', '♭9'), 'extension');
  assert.equal(role('dim7', '♭♭7'), 'seventh');
  assert.equal(role('maj', 'R'), 'root');
});

test('spelling', () => {
  const sp = (root, id) => spellChord(root, CHORDS_BY_ID[id]).join(' ');
  assert.equal(sp('C', 'dom7b5'), 'C E G♭ B♭');
  assert.equal(sp('F♯', 'dim7'), 'F♯ A C E♭');
  assert.equal(sp('B', 'dom13'), 'B D♯ F♯ A C♯ G♯');
  assert.equal(sp('G', 'dom13'), 'G B D F A E');
  assert.equal(sp('D♭', 'maj9'), 'D♭ F A♭ C E♭');
});

test('spelling: altered tones', () => {
  // G7#5#9: G B D# F A#  (#5 = D#, #9 = A#)
  assert.equal(spellChord('G', CHORDS_BY_ID.dom7s5s9).join(' '), 'G B D♯ F A♯');
  assert.equal(spellTone('C', CHORDS_BY_ID.alt.tones.at(-1)), 'A♭'); // b13
  assert.equal(spellChord('E', CHORDS_BY_ID.aug).join(' '), 'E G♯ B♯');
});

test('settings sanitize clamps and defaults junk input', () => {
  const d = defaults();
  assert.deepEqual(sanitize(undefined), d);
  assert.deepEqual(sanitize(null), d);
  const s = sanitize({ mode: 'bogus', revealSec: 'x', autoNextSec: 999, groups: null, roots: [1, false], accidentals: 'x', sound: 'yes' });
  assert.equal(s.mode, 'name2keys');
  assert.equal(s.revealSec, d.revealSec);
  assert.equal(s.autoNextSec, 30);
  assert.equal(s.roots.length, 12);
  assert.equal(s.roots[0], true);   // non-boolean falls back to enabled
  assert.equal(s.roots[1], false);
  assert.equal(s.accidentals, 'jazz');
  assert.equal(s.sound, false);
  assert.equal(d.revealSec, 0);                            // default: reveal immediately
  assert.equal(sanitize({ revealSec: -5 }).revealSec, 0);   // clamped to the new minimum
  assert.equal(sanitize({ revealSec: 99, schema: 2 }).revealSec, 30);
  // one-time migration: the old untouched default (5, no schema) becomes 0; deliberate values survive
  assert.equal(sanitize({ revealSec: 5 }).revealSec, 0);
  assert.equal(sanitize({ revealSec: 8 }).revealSec, 8);
  assert.equal(sanitize({ revealSec: 5, schema: 2 }).revealSec, 5);
  assert.equal(sanitize({ mode: 'explore' }).mode, 'explore');
  assert.deepEqual(sanitize({ explore: { rootPc: 99, chordId: 'nope' } }).explore, d.explore);
  assert.deepEqual(sanitize({ explore: { rootPc: 7, chordId: 'dom7s9' } }).explore, { rootPc: 7, chordId: 'dom7s9' });
  assert.deepEqual(Object.keys(s.groups), GROUPS.map(g => g.id));
});

test('spelling: newer chord families', () => {
  const sp = (root, id) => spellChord(root, CHORDS_BY_ID[id]).join(' ');
  assert.equal(sp('C', 'dom7sus2'), 'C D G B\u266d');
  assert.equal(sp('C', 'maj7sus2'), 'C D G B');
  assert.equal(sp('C', 'quartal5'), 'C F B\u266d E\u266d A\u266d');
  assert.equal(sp('C', 'quintal4'), 'C G D A');
  assert.equal(sp('C', 'dom9s5s11'), 'C E G\u266f B\u266d D F\u266f'); // whole-tone
  assert.equal(sp('C', 'dom7b13'), 'C E G B\u266d A\u266d');
  assert.equal(sp('D', 'dom7sus4b9'), 'D G A C E\u266d');
  assert.equal(sp('C', 'adds11'), 'C E G F\u266f');
  assert.equal(sp('C', 'power'), 'C G');
});

test('sus2 family is present', () => {
  for (const id of ['sus2', 'sus24', 'dom7sus2', 'maj7sus2']) assert.ok(CHORDS_BY_ID[id], id);
});

test('root names per preference', () => {
  assert.equal(rootName(6, 'jazz'), 'F♯');
  assert.equal(rootName(6, 'flats'), 'G♭');
  assert.equal(rootName(1, 'sharps'), 'C♯');
});

test('enharmonic equivalents', () => {
  const key = (r, id) => `${rootName(r)}${CHORDS_BY_ID[id].symbol}`;
  const names = (rootPc, id) => sameNotes(rootPc, CHORDS_BY_ID[id]).map(x => key(x.rootPc, x.chord.id));
  assert.ok(names(0, 'maj6').includes('Am7'));
  assert.ok(names(0, 'min6').includes('Am7♭5'));
  assert.ok(names(0, 'dim7').includes('E♭dim7'));
  assert.ok(!names(0, 'maj7').includes('Cmaj7'));
  assert.deepEqual(pitchClasses(0, CHORDS_BY_ID.dom9), [0, 2, 4, 7, 10]);
});

test('omitted notes: (tone) in a formula is left out of the usual voicing and listed', () => {
  const omits = Object.fromEntries(CHORDS.filter(c => c.omitted.length).map(c => [c.id, c.omitted.map(t => t.token).join(' ')]));
  assert.deepEqual(omits, { dom11: '3', dom13s11: '5', alt: '5', dom7b9b13: '5', dom9b13: '5', dom13b9s11: '5' });
  assert.deepEqual([...CHORDS_BY_ID.dom9b13.semis], [0, 4, 10, 14, 20]);
  assert.deepEqual([...voicing(CHORDS_BY_ID.dom9b13, true).semis], [0, 4, 7, 10, 14, 20]);
  assert.deepEqual([...voicing(CHORDS_BY_ID.dom11, true).semis], [0, 4, 7, 10, 14, 17]);
  assert.equal(voicing(CHORDS_BY_ID.dom9b13, false), CHORDS_BY_ID.dom9b13);
  assert.equal(voicing(CHORDS_BY_ID.maj7, true), CHORDS_BY_ID.maj7);          // nothing omitted: same chord
  assert.deepEqual(voicing(CHORDS_BY_ID.dom9b13, true).omitted, []);
  assert.equal(spellChord('F\u266f', voicing(CHORDS_BY_ID.dom9b13, true)).join(' '), 'F\u266f A\u266f C\u266f E G\u266f D');
  assert.equal(spellTone('F\u266f', CHORDS_BY_ID.dom9b13.omitted[0]), 'C\u266f');
});

test('full voicings: same identity, strictly ascending, within the keyboard, no repeated pitch class', () => {
  for (const c of CHORDS) {
    const f = voicing(c, true);
    assert.deepEqual([f.id, f.symbol, f.name, f.group], [c.id, c.symbol, c.name, c.group]);
    assert.equal(f.semis.length, c.semis.length + c.omitted.length, c.id);
    for (let i = 1; i < f.semis.length; i++) assert.ok(f.semis[i] > f.semis[i - 1], `${c.id}: full not ascending`);
    assert.ok(f.semis.at(-1) <= 21, `${c.id}: full reach > 21`);
    assert.equal(new Set(f.semis.map(x => x % 12)).size, f.semis.length, `${c.id}: full repeats a pitch class`);
  }
});

test('sameNotes compares like with like when full voicings are on', () => {
  const full = voicing(CHORDS_BY_ID.dom9b13, true);
  for (const x of sameNotes(0, full, true)) assert.deepEqual(pitchClasses(x.rootPc, x.chord), pitchClasses(0, full));
});

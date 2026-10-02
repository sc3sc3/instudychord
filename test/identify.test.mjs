import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHORDS } from '../js/chords.js';
import { chordMidi, rootName } from '../js/notes.js';
import { identify } from '../js/identify.js';

const set = (...m) => new Set(m);
const names = res => res.matches.map(m => `${rootName(m.rootPc)}${m.chord.symbol}${m.rootIsBass ? '' : '/' + rootName(res.bassPc)}`);
const C3 = 48;

test('too few notes', () => {
  assert.equal(identify(set()).tooFew, true);
  assert.equal(identify(set(60)).tooFew, true);
  assert.equal(identify(set(60, 72)).tooFew, true);       // same pitch class twice = one note
  assert.equal(identify(set(60, 64)).tooFew, false);
});

test('names a chord in root position', () => {
  assert.equal(names(identify(set(C3, C3 + 4, C3 + 7, C3 + 11)))[0], 'Cmaj7');
  assert.equal(names(identify(set(55, 59, 62, 65)))[0], 'G7');        // G B D F
  assert.equal(names(identify(set(C3, C3 + 7)))[0], 'C5');             // power chord
});

test('inversions are named as slash chords', () => {
  const r = identify(set(C3 + 4, C3 + 7, C3 + 11, C3 + 12));           // E G B C
  assert.equal(r.matches[0].rootIsBass, false);
  assert.equal(names(r)[0], 'Cmaj7/E');
  assert.equal(names(identify(set(C3 + 7, C3 + 12, C3 + 16)))[0], 'C/G');   // G C E = C major over G
});

test('the root-position reading wins and the other readings are kept', () => {
  const c6 = identify(set(C3, C3 + 4, C3 + 7, C3 + 9));                // C E G A
  assert.equal(names(c6)[0], 'C6');
  assert.ok(names(c6).includes('Am7/C'));
  const am7 = identify(set(C3 + 9, C3 + 12, C3 + 16, C3 + 19));        // A C E G, A in the bass
  assert.equal(names(am7)[0], 'Am7');
  assert.ok(names(am7).includes('C6/A'));
});

test('octave doubling does not change the answer', () => {
  assert.equal(names(identify(set(C3, C3 + 12, C3 + 4, C3 + 19, C3 + 7)))[0], 'C');
});

test('symmetric chords still pick the lowest note as the root', () => {
  assert.equal(names(identify(set(C3, C3 + 3, C3 + 6, C3 + 9)))[0], 'Cdim7');
  assert.equal(names(identify(set(C3 + 3, C3 + 6, C3 + 9, C3 + 12)))[0], 'E♭dim7');
  assert.equal(names(identify(set(C3, C3 + 4, C3 + 8)))[0], 'Caug');
});

test('no exact match -> near matches with the omitted note', () => {
  const r = identify(set(C3, C3 + 4, C3 + 11));                        // C E B: Cmaj7 without the 5th
  assert.equal(r.matches.length, 0);
  assert.ok(r.near.some(n => n.rootPc === 0 && n.chord.id === 'maj7' && n.missingPc === 7));
  assert.equal(r.near[0].rootIsBass, true);                            // root-position readings first
  assert.equal(identify(set(C3, C3 + 1, C3 + 2, C3 + 3, C3 + 4)).matches.length, 0);   // a cluster: nothing
});

test('every chord, on every root, is recognised from its own voicing', () => {
  for (const chord of CHORDS) for (let pc = 0; pc < 12; pc++) {
    const keys = new Set(chordMidi(pc, chord));
    const r = identify(keys);
    if (r.tooFew) { assert.equal(keys.size < 2 || new Set([...keys].map(m => m % 12)).size < 2, true); continue; }
    const mine = r.matches.find(m => m.rootPc === pc && m.chord.id === chord.id);
    assert.ok(mine, `${chord.id}@${pc} not found`);
    assert.equal(mine.rootIsBass, true, `${chord.id}@${pc} root should be the lowest note`);
    assert.equal(mine.exactVoicing, true);
    assert.equal(r.matches[0].rootIsBass, true);                       // the primary reading is always a root-position one
    // the exact voicing always ranks first among root-position readings
    assert.equal(r.matches[0].exactVoicing, true, `${chord.id}@${pc}: primary should be the exact voicing`);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_MAX, sanitizeHistory, pushHistory } from '../js/history.js';

const e = (rootPc, chordId, result = null, bassPc = null) => ({ rootPc, chordId, result, bassPc });

test('history keeps the last 12, newest first', () => {
  assert.equal(HISTORY_MAX, 12);
  let list = [];
  const ids = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', 'dom7', 'maj7', 'min7', 'dim7', 'dom9', 'maj9', 'min9', 'dom11', 'dom13'];
  ids.forEach((id, i) => { list = pushHistory(list, e(i % 12, id)); });
  assert.equal(list.length, 12);
  assert.deepEqual(list.map(x => x.chordId), ids.slice(3).reverse());   // 15 pushed -> newest 12, newest first
  assert.equal(list[0].chordId, 'dom13');
});

test('the same chord twice in a row is kept once (newest verdict wins)', () => {
  let list = pushHistory([], e(0, 'maj7', 'miss'));
  list = pushHistory(list, e(0, 'maj7', 'ok'));
  assert.deepEqual(list, [e(0, 'maj7', 'ok')]);
  list = pushHistory(list, e(1, 'maj7'));                 // other root: a new entry
  list = pushHistory(list, e(0, 'maj7'));                 // not consecutive with the top: kept
  assert.equal(list.length, 3);
});

test('sanitize drops junk and caps the length', () => {
  assert.deepEqual(sanitizeHistory(null), []);
  assert.deepEqual(sanitizeHistory('x'), []);
  const raw = [e(0, 'maj7', 'ok'), e(12, 'maj7'), e(-1, 'maj7'), e(1.5, 'maj7'), e(0, 'nope'), null, 7, { rootPc: 2 },
    e(3, 'min7', 'weird'), e(4, 'dom7', 'miss')];
  assert.deepEqual(sanitizeHistory(raw), [e(0, 'maj7', 'ok'), e(3, 'min7', null), e(4, 'dom7', 'miss')]);
  assert.equal(sanitizeHistory(Array.from({ length: 30 }, () => e(0, 'maj'))).length, 12);
});

test('inversions keep their bass note: G and G/D are different entries', () => {
  let list = pushHistory([], e(7, 'maj'));
  list = pushHistory(list, e(7, 'maj', null, 2));            // G/D
  assert.deepEqual(list, [e(7, 'maj', null, 2), e(7, 'maj')]);
  list = pushHistory(list, e(7, 'maj', null, 2));            // G/D again: collapsed
  assert.equal(list.length, 2);
  list = pushHistory(list, e(7, 'maj', null, 11));           // G/B: another bass, new entry
  assert.equal(list.length, 3);
  list = pushHistory(list, e(7, 'maj'));                     // back to root position: new entry
  assert.deepEqual(list.map(x => x.bassPc), [null, 11, 2, null]);
});

test('sanitize validates the bass note and migrates old entries', () => {
  assert.deepEqual(sanitizeHistory([{ rootPc: 7, chordId: 'maj' }]), [e(7, 'maj')]);                 // saved before bassPc existed
  assert.equal(sanitizeHistory([e(7, 'maj', null, 2)])[0].bassPc, 2);
  assert.equal(sanitizeHistory([e(7, 'maj', null, 7)])[0].bassPc, null);                              // bass == root is no inversion
  assert.equal(sanitizeHistory([e(7, 'maj', null, 12)])[0].bassPc, null);
  assert.equal(sanitizeHistory([e(7, 'maj', null, 'x')])[0].bassPc, null);
});

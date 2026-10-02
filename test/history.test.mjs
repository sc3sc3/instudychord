import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_MAX, sanitizeHistory, pushHistory } from '../js/history.js';

const e = (rootPc, chordId, result = null) => ({ rootPc, chordId, result });

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

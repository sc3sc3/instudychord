// inStudyChord - UI, quiz state machine and timers.
import { CHORDS, CHORDS_BY_ID, GROUPS, ROLES, chordsInGroups, sameNotes, voicing } from './chords.js';
import { rootName, spellChord, spellTone, chordMidi } from './notes.js';
import { renderKeyboard } from './keyboard.js';
import { createAudio } from './audio.js';
import { evaluate, isRightKey, needed, readyToCheck, selectedCount } from './exercise.js';
import { loadSettings, saveSettings } from './settings.js';
import { loadHistory, saveHistory, pushHistory } from './history.js';
import { identify } from './identify.js';

const $ = id => document.getElementById(id);
const el = {
  name: $('chordName'), long: $('chordLong'), kb: $('keyboard'), legend: $('legend'),
  details: $('details'), dNotes: $('dNotes'), dDegrees: $('dDegrees'),
  dAliasLabel: $('dAliasLabel'), dSameLabel: $('dSameLabel'), dAliasRow: $('dAliasRow'), dAliases: $('dAliases'), dSameRow: $('dSameRow'), dSame: $('dSame'),
  barFill: $('barFill'), statusText: $('statusText'), history: $('history'),
  pause: $('pauseBtn'), play: $('playBtn'), action: $('actionBtn'), stage: $('stage'), dialog: $('settings'),
};

const ROLE_LABELS = {
  root: 'Root', third: '3rd / sus', fifth: '5th', seventh: '7th / 6th', extension: '9 / 11 / 13',
};

let settings = loadSettings();
const audio = createAudio();

// phase: 'prompt' (question side shown, counting to reveal) | 'revealed'
// exercise mode adds: sel = keys the user tapped, exResult = last verdict, exSolved, counted (scored once per card)
const st = {
  card: null, phase: 'prompt', paused: false, dialogOpen: false, dirtyPool: false, elapsed: 0, last: 0,
  sel: new Set(), exResult: null, exSolved: false, counted: false, firstOk: false, score: { right: 0, total: 0 },
  booted: false,             // false until the first card is on screen (launch must not count as an explore pick)
  history: loadHistory(),    // last 12 chords finished with, newest first
  free: null,                // free mode: result of identify() once the user pressed Reveal
};
const shown = { bar: -1, text: null, action: null, pause: null };

const persist = () => saveSettings(settings);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ---------------------------------------------------------------- pool & cards
function enabledRoots() {
  return settings.roots.map((on, pc) => (on ? pc : -1)).filter(pc => pc >= 0);
}
function enabledChords() {
  return chordsInGroups(GROUPS.filter(g => settings.groups[g.id]).map(g => g.id));
}

function nextCard() {
  const chords = enabledChords();
  const roots = enabledRoots();
  st.dirtyPool = false;
  if (freeing()) {   // free: no random chord; the user builds one (a reading is recorded when it is revealed)
    st.card = null;
    st.phase = 'prompt';
    st.elapsed = 0;
    st.sel = new Set();
    st.free = null;
    st.exResult = null; st.exSolved = false; st.counted = false; st.firstOk = false;
    render();
    return;
  }
  if (settings.mode === 'explore') {
    // explore: the chosen chord, always shown fully, no timers
    const next = { rootPc: settings.explore.rootPc, chord: voicing(CHORDS_BY_ID[settings.explore.chordId], settings.fullVoicings) };
    st.card = next;
    st.phase = 'revealed';
    st.elapsed = 0;
    render();
    if (st.booted) recordHistory(next);   // an explored chord is on screen in full: record it straight away
    return;
  }
  if (!chords.length || !roots.length) {
    st.card = null;
  } else {
    const prev = st.card;
    let card;
    for (let tries = 0; tries < 20; tries++) {
      card = { rootPc: pick(roots), chord: voicing(pick(chords), settings.fullVoicings) };
      if (!prev) break;
      // several chord types: never the same type twice; a single type: never the same root twice
      const repeat = chords.length > 1
        ? card.chord.id === prev.chord.id
        : roots.length > 1 && card.rootPc === prev.rootPc;
      if (!repeat) break;
    }
    st.card = card;
  }
  st.phase = 'prompt';
  st.elapsed = 0;
  st.sel = new Set();
  st.exResult = null;
  st.exSolved = false;
  st.counted = false;
  st.firstOk = false;
  render();
}

// ---------------------------------------------------------------- history
// A chord goes into the history the moment its answer is on screen: a quiz reveal, an exercise solve /
// "Show answer", a Free-mode Reveal that found a chord, or an explore pick. Nothing is recorded for a card
// whose answer was never shown. The same chord twice in a row is kept once (newest verdict wins).
function recordHistory(card, result = null, bassPc = null) {
  if (!card) return;
  st.history = pushHistory(st.history, { rootPc: card.rootPc, chordId: card.chord.id, result, bassPc });
  saveHistory(st.history);
  renderHistory();
}

let historyKey = '';

// "· left out: 5 (C♯)": the notes this chord conventionally omits (none when 'include' is on), after the long name
function appendOmitted(chord, root) {
  if (!chord.omitted.length) return;
  const tag = document.createElement('span');
  tag.className = 'omitted';
  tag.textContent = `left out: ${chord.omitted.map(t => `${t.label} (${spellTone(root, t)})`).join(', ')}`;
  el.long.append(tag);
}

// long names (slash chords, ...) get a smaller font so they never run under the Play button
function setName(text) {
  el.name.textContent = text;
  el.name.classList.toggle('long', text.length > 12);
}

function renderHistory() {
  const key = JSON.stringify(st.history) + settings.accidentals;
  if (key === historyKey) return;     // only rebuild when something changed
  historyKey = key;
  if (!st.history.length) {
    const none = document.createElement('span');
    none.className = 'none';
    none.textContent = 'Your last 12 chords will appear here';
    el.history.replaceChildren(none);
    return;
  }
  el.history.replaceChildren(...st.history.map(h => {
    const chord = CHORDS_BY_ID[h.chordId];
    const chip = document.createElement('span');
    chip.className = 'chip';
    const bass = h.bassPc == null ? '' : '/' + rootName(h.bassPc, settings.accidentals);   // inversion: G/D
    const name = rootName(h.rootPc, settings.accidentals) + chord.symbol + bass;
    if (h.result) {   // exercise verdict as a glyph, not a colour
      const mark = document.createElement('b');
      mark.textContent = h.result === 'ok' ? '\u2713' : '\u2715';
      chip.append(mark);
    }
    chip.append(name);
    chip.title = `${name} \u2014 ${chord.name}${h.bassPc == null ? '' : ' over ' + rootName(h.bassPc, settings.accidentals)}${h.result ? (h.result === 'ok' ? ' (first try)' : ' (missed)') : ''}`;
    return chip;
  }));
}

// ---------------------------------------------------------------- free mode (the user builds a chord, the app names it)
const freeing = () => settings.mode === 'free';
const noTimers = () => settings.mode === 'explore' || settings.mode === 'exercise' || freeing();
const distinctPcs = () => new Set([...st.sel].map(m => m % 12)).size;
const freeResult = () => (st.phase === 'revealed' ? st.free : null);
const sortedSel = () => [...st.sel].sort((a, b) => a - b);

// "C", "Cmaj7/E": the chord symbol plus the bass note when the lowest key is not the root (an inversion)
function readingName(m, bassPc) {
  const base = rootName(m.rootPc, settings.accidentals) + m.chord.symbol;
  return m.rootIsBass ? base : `${base}/${rootName(bassPc, settings.accidentals)}`;
}

function toggleFree(midi) {
  if (st.phase === 'revealed') {   // editing after a reveal starts a new attempt
    st.card = null; st.free = null; st.phase = 'prompt';
  }
  if (st.sel.has(midi)) st.sel.delete(midi); else st.sel.add(midi);
  render();
}

function revealFree() {
  if (!freeing() || st.phase === 'revealed' || distinctPcs() < 2) return;
  const res = identify(st.sel, settings.fullVoicings);
  st.free = res;
  const top = res.matches[0];
  st.card = top ? { rootPc: top.rootPc, chord: top.chord } : null;
  st.phase = 'revealed';
  render();
  recordHistory(st.card, null, top && !top.rootIsBass ? res.bassPc : null);   // an inversion is kept as a slash chord; nothing when no chord matched
  if (settings.sound) audio.play(sortedSel());
}

function clearFree() {
  st.sel = new Set(); st.free = null; st.card = null; st.phase = 'prompt';
  render();
}

function renderFree() {
  const acc = settings.accidentals;
  const sorted = sortedSel();
  const res = freeResult();
  const top = res?.matches[0];
  const pcName = m => rootName(m % 12, acc);

  let title, sub;
  if (!res) {
    title = sorted.length ? `${sorted.length} note${sorted.length > 1 ? 's' : ''}` : '\u266a';
    sub = sorted.length ? 'press Reveal to name the chord' : 'tap keys to build your own chord';
  } else if (top) {
    title = readingName(top, res.bassPc);
    sub = top.chord.name + (top.rootIsBass ? '' : ` over ${rootName(res.bassPc, acc)}`);
  } else {
    title = '?';
    sub = 'no chord in the catalogue sounds exactly these notes';
  }
  setName(title);
  el.long.textContent = sub;
  if (top) appendOmitted(top.chord, rootName(top.rootPc, acc));

  // the user's own keys; once named they get the colour-coded degree numbers relative to the found root
  const notes = new Map();
  if (top) {
    const spelled = spellChord(rootName(top.rootPc, acc), top.chord);
    const rel = new Map(top.chord.tones.map((t, i) => [t.semis % 12, { role: t.role, degree: t.label, name: spelled[i] }]));
    for (const m of sorted) notes.set(m, rel.get((((m - top.rootPc) % 12) + 12) % 12) ?? { plain: true, name: pcName(m) });
  } else {
    for (const m of sorted) notes.set(m, { plain: true, name: pcName(m) });
  }
  renderKeyboard(el.kb, notes, { neutral: false, degrees: settings.degreeLabels, names: settings.noteNames });

  el.play.disabled = !sorted.length;
  el.details.hidden = !res;
  if (!res) return;
  el.dNotes.textContent = sorted.map(m => notes.get(m).name).join('  ');
  el.dDegrees.textContent = top ? sorted.map(m => notes.get(m).degree).join('  ') : '\u2014';
  if (top) {
    const slash = top.rootIsBass ? '' : '/' + rootName(res.bassPc, acc);
    const aliases = top.chord.aliases.map(a => rootName(top.rootPc, acc) + a + slash);
    el.dAliasLabel.textContent = 'Also written';
    el.dAliasRow.hidden = !aliases.length;
    el.dAliases.textContent = aliases.join('   \u00b7   ');
    const others = res.matches.slice(1, 7).map(m => readingName(m, res.bassPc));
    el.dSameLabel.textContent = 'Could also be';
    el.dSameRow.hidden = !others.length;
    el.dSame.textContent = others.join(',  ');
  } else {   // nothing sounds exactly these notes: offer chords that contain them plus one more (an omitted note)
    const near = res.near.map(n => {
      const sp = spellChord(rootName(n.rootPc, acc), n.chord);
      const missing = sp[n.chord.tones.findIndex(t => (n.rootPc + t.semis) % 12 === n.missingPc)];
      return `${readingName(n, res.bassPc)} (no ${missing})`;
    });
    el.dAliasLabel.textContent = 'Close to';
    el.dAliasRow.hidden = !near.length;
    el.dAliases.textContent = near.join(',  ');
    el.dSameRow.hidden = true;
  }
}

function updateFreeStatus(force) {
  const n = st.sel.size, pcs = distinctPcs(), res = freeResult();
  let text;
  if (res) text = res.matches.length ? `Found \u00b7 ${res.matches.length === 1 ? '1 reading' : res.matches.length + ' readings'}` : 'No exact match';
  else if (!n) text = 'Tap keys to build a chord';
  else if (pcs < 2) text = `${n} note \u2014 pick at least 2 different notes`;
  else text = `${n} notes selected \u00b7 press Reveal`;
  const frac = res ? (res.matches.length ? 1 : 0) : Math.min(1, pcs / 3);
  const barKey = Math.round(frac * 1000);
  if (force || barKey !== shown.bar) { el.barFill.style.transform = `scaleX(${frac})`; shown.bar = barKey; }
  if (force || text !== shown.text) { el.statusText.textContent = text; shown.text = text; }
  if (force || shown.action !== 'Reveal') { el.action.textContent = 'Reveal'; shown.action = 'Reveal'; }
  if (force || shown.pause !== 'Clear') { el.pause.textContent = 'Clear'; shown.pause = 'Clear'; }
  el.action.disabled = pcs < 2 || !!res;
  el.pause.disabled = n === 0;
}

// ---------------------------------------------------------------- exercise (name -> keys, tapped by the user)
const exercising = () => settings.mode === 'exercise';

// score once per card: only a correct FIRST verdict counts as right
function countCard(ok) {
  if (st.counted) return;
  st.counted = true;
  st.firstOk = ok;
  st.score.total++;
  if (ok) st.score.right++;
}

function checkExercise() {
  if (!st.card || st.phase === 'revealed' || !st.sel.size) return;
  const res = evaluate(st.sel, st.card.rootPc, st.card.chord, settings.exactVoicing);
  st.exResult = res;
  countCard(res.ok);
  if (res.ok) finishExercise(true); else render();
}

function finishExercise(solved) {
  st.exSolved = solved;
  st.phase = 'revealed';
  st.elapsed = 0;
  render();
  recordHistory(st.card, st.firstOk ? 'ok' : 'miss');   // right on the first check = check mark, anything else = cross
  if (solved && settings.sound) audio.play(chordMidi(st.card.rootPc, st.card.chord));
}

function giveUp() {
  if (!st.card || st.phase === 'revealed') return;
  countCard(false);
  finishExercise(false);
}

function toggleKey(midi) {
  if (freeing()) { toggleFree(midi); return; }
  if (!exercising() || !st.card || st.phase !== 'prompt') return;
  if (st.sel.has(midi)) st.sel.delete(midi); else st.sel.add(midi);
  st.exResult = null; // any change clears the previous verdict's crosses
  if (readyToCheck(st.sel, st.card.rootPc, st.card.chord, settings.exactVoicing)) checkExercise(); else render();
}

// what the keyboard shows in exercise mode: the user's taps, plus the true voicing once resolved
function exerciseNotes(rootPc, chord, chordNotes, revealed, spelled) {
  const exact = settings.exactVoicing;
  const byPc = new Map(chordMidi(rootPc, chord).map((m, i) => [m % 12, spelled[i]]));
  const nameOf = m => byPc.get(m % 12) ?? rootName(m % 12, settings.accidentals);
  const byPcNote = new Map([...chordNotes].map(([m, n]) => [m % 12, n]));
  const flagged = new Set(st.exResult && !st.exResult.ok ? st.exResult.wrong : []);
  const out = new Map();
  const gaveUp = revealed && !st.exSolved;   // "Show answer": the keys of the drawn answer are yellow instead of grey
  if (revealed) for (const [m, n] of chordNotes) out.set(m, gaveUp ? { ...n, answer: true } : n); // the answer, with its colour-coded numbers
  for (const m of st.sel) {
    if (out.has(m)) continue;
    const right = isRightKey(m, rootPc, chord, exact);
    const sameTone = revealed && right ? byPcNote.get(m % 12) : null;   // right note in another octave than the drawn voicing
    out.set(m, sameTone
      ? { ...sameTone }   // keeps its role badge (grey key, never yellow) so it doesn't look like a note the chord ignores
      : !right && (revealed || flagged.has(m))
        ? { mark: true, name: nameOf(m) }
        : { plain: true, name: nameOf(m) });   // never yellow: yellow means exactly the keys of the drawn answer
  }
  return out;
}

// ---------------------------------------------------------------- phase changes
function reveal() {
  if (!st.card || st.phase === 'revealed') return;
  st.phase = 'revealed';
  st.elapsed = 0;
  render();
  recordHistory(st.card);
  if (settings.sound) audio.play(chordMidi(st.card.rootPc, st.card.chord));
}

function advance() {
  if (freeing()) { revealFree(); return; }
  if (!st.card || settings.mode === 'explore') return;
  if (exercising()) { if (st.phase === 'revealed') nextCard(); else checkExercise(); return; }
  if (st.phase === 'prompt') reveal(); else nextCard();
}

function limitMs() {
  if (st.phase === 'prompt') return settings.revealSec > 0 ? settings.revealSec * 1000 : Infinity; // 0 = tap to reveal
  return settings.autoNextSec > 0 ? settings.autoNextSec * 1000 : Infinity;
}

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = st.last ? Math.min(ts - st.last, 250) : 0; // clamp: tab was in background
  st.last = ts;
  if (st.card && !noTimers() && !st.paused && !st.dialogOpen) {
    st.elapsed += dt;
    if (st.elapsed >= limitMs()) advance();
  }
  updateStatus();
}

// ---------------------------------------------------------------- rendering
function render() {
  document.querySelectorAll('.seg button').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.mode === settings.mode)));
  el.stage.dataset.mode = settings.mode;
  syncPicker();
  renderHistory();
  el.dAliasLabel.textContent = 'Also written';   // free mode renames these two rows
  el.dSameLabel.textContent = 'Same notes as';
  if (freeing()) { renderFree(); updateStatus(true); return; }

  const card = st.card;
  el.pause.disabled = el.action.disabled = !card;
  el.play.disabled = true; // enabled below once the chord is visible on the keyboard
  if (!card) {
    setName('—');
    el.long.textContent = 'Select at least one chord group and one root in Settings.';
    renderKeyboard(el.kb, new Map());
    el.details.hidden = true;
    return;
  }

  const { rootPc, chord } = card;
  const root = rootName(rootPc, settings.accidentals);
  const revealed = st.phase === 'revealed';
  const n2k = settings.mode === 'name2keys';
  const ex = exercising();
  const showName = n2k || ex || revealed;
  const showKeys = (!n2k && !ex) || revealed;   // exercise: the answer appears only once resolved
  const spelled = spellChord(root, chord);
  el.play.disabled = !showKeys;

  setName(showName ? root + chord.symbol : '?');
  el.long.textContent = showName ? chord.name : 'name this chord';
  if (showName) appendOmitted(chord, root);

  const notes = new Map();
  chordMidi(rootPc, chord).forEach((m, i) =>
    notes.set(m, { role: chord.tones[i].role, degree: chord.tones[i].label, name: spelled[i] }));
  const kbNotes = ex ? exerciseNotes(rootPc, chord, notes, revealed, spelled) : (showKeys ? notes : new Map());
  renderKeyboard(el.kb, kbNotes, {
    neutral: !n2k && !ex && !revealed && !settings.colorBefore,
    degrees: settings.degreeLabels,
    names: settings.noteNames,
  });

  el.details.hidden = !revealed;
  if (revealed) {
    el.dNotes.textContent = spelled.join('  ');
    el.dDegrees.textContent = chord.tones.map(t => t.label).join('  ');
    const aliases = chord.aliases.map(a => root + a);
    el.dAliasRow.hidden = !aliases.length;
    el.dAliases.textContent = aliases.join('   ·   ');
    const same = sameNotes(rootPc, chord, settings.fullVoicings).slice(0, 6)
      .map(x => rootName(x.rootPc, settings.accidentals) + x.chord.symbol);
    el.dSameRow.hidden = !same.length;
    el.dSame.textContent = same.join(',  ');
  }
  updateStatus(true);
}

function updateStatus(force = false) {
  if (freeing()) { updateFreeStatus(force); return; }
  const card = st.card;
  const ex = exercising();
  const lim = card ? limitMs() : Infinity;
  let frac = card && !ex && Number.isFinite(lim) && lim > 0 ? Math.min(1, st.elapsed / lim) : 0;
  const exNeed = card && ex ? needed(card.rootPc, card.chord, settings.exactVoicing) : 0;
  const exHave = card && ex ? selectedCount(st.sel, settings.exactVoicing) : 0;
  if (card && ex) frac = st.phase === 'revealed' ? (st.exSolved ? 1 : 0) : Math.min(1, exHave / exNeed); // progress: notes found
  const barKey = Math.round(frac * 1000);
  if (force || barKey !== shown.bar) {
    el.barFill.style.transform = `scaleX(${frac})`;
    shown.bar = barKey;
  }

  let text = '';
  if (card && ex) {
    const score = st.score.total ? `  \u00b7  ${st.score.right}/${st.score.total} first try` : '';
    if (st.phase === 'revealed') text = (st.exSolved ? 'Correct \u2713' : 'Answer shown') + score;
    else if (st.exResult && !st.exResult.ok) text = `Not quite \u2014 ${st.exResult.wrong.length} wrong, ${st.exResult.missing} missing` + score;
    else text = `${exHave} / ${exNeed} notes` + score;
  } else if (card) {
    const left = Math.ceil((lim - st.elapsed) / 1000);
    if (st.paused) text = 'Paused';
    else if (st.phase === 'prompt') text = Number.isFinite(lim) ? `Reveal in ${left}s` : 'Tap to reveal';
    else text = Number.isFinite(lim) ? `Next in ${left}s` : 'Tap for next chord';
  }
  if (force || text !== shown.text) { el.statusText.textContent = text; shown.text = text; }

  const action = ex && st.phase === 'prompt' ? 'Check' : st.phase === 'prompt' ? 'Reveal now' : 'Next ›';
  if (force || action !== shown.action) { el.action.textContent = action; shown.action = action; }
  const pause = ex ? 'Show answer' : st.paused ? 'Resume' : 'Pause';
  if (force || pause !== shown.pause) { el.pause.textContent = pause; shown.pause = pause; }
  if (ex) { // buttons follow the exercise state
    el.action.disabled = !card || (st.phase === 'prompt' && !st.sel.size);
    el.pause.disabled = !card || st.phase === 'revealed';
  }
}

// ---------------------------------------------------------------- explore picker
function buildPicker() {
  const roots = $('rootPicker');
  for (let pc = 0; pc < 12; pc++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.pickRoot = pc;
    b.addEventListener('click', () => explore({ rootPc: pc }));
    roots.appendChild(b);
  }

  const select = $('chordPicker');
  for (const g of GROUPS) {
    const og = document.createElement('optgroup');
    og.label = g.label;
    for (const c of CHORDS.filter(c => c.group === g.id)) {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = `${c.symbol || 'maj'} — ${c.name}`;
      og.appendChild(o);
    }
    select.appendChild(og);
  }
  select.addEventListener('change', () => explore({ chordId: select.value }));

  const step = dir => {
    const i = CHORDS.findIndex(c => c.id === settings.explore.chordId);
    explore({ chordId: CHORDS[(i + dir + CHORDS.length) % CHORDS.length].id });
  };
  $('chordPrev').addEventListener('click', () => step(-1));
  $('chordNext').addEventListener('click', () => step(1));
}

function explore(change) {
  Object.assign(settings.explore, change);
  persist();
  nextCard();
  if (settings.sound && st.card) audio.play(chordMidi(st.card.rootPc, st.card.chord));
}

function syncPicker() {
  document.querySelectorAll('[data-pick-root]').forEach(b => {
    const pc = Number(b.dataset.pickRoot);
    b.textContent = rootName(pc, settings.accidentals);
    b.setAttribute('aria-pressed', String(pc === settings.explore.rootPc));
  });
  $('chordPicker').value = settings.explore.chordId;
}

function renderLegend() {
  el.legend.replaceChildren(...ROLES.map(r => {
    const s = document.createElement('span');
    const i = document.createElement('i');
    i.className = `role-${r}`;
    s.append(i, ROLE_LABELS[r]);
    return s;
  }));
}

// ---------------------------------------------------------------- settings UI
function buildSettings() {
  const groupBoxes = $('groupBoxes');
  GROUPS.forEach(g => {
    const count = CHORDS.filter(c => c.group === g.id).length;
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.dataset.group = g.id;
    box.checked = settings.groups[g.id];
    box.addEventListener('change', () => {
      settings.groups[g.id] = box.checked;
      poolChanged();
    });
    label.append(box, `${g.label} (${count})`);
    groupBoxes.appendChild(label);
  });

  const rootBoxes = $('rootBoxes');
  for (let pc = 0; pc < 12; pc++) {
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.dataset.root = pc;
    box.checked = settings.roots[pc];
    box.addEventListener('change', () => {
      settings.roots[pc] = box.checked;
      poolChanged();
    });
    const text = document.createElement('span');
    text.dataset.rootLabel = pc;
    label.append(box, text);
    rootBoxes.appendChild(label);
  }
  refreshRootLabels();

  const setAll = (selector, key, value) => {
    document.querySelectorAll(selector).forEach(b => { b.checked = value; });
    if (key === 'groups') GROUPS.forEach(g => { settings.groups[g.id] = value; });
    else settings.roots.fill(value);
    poolChanged();
  };
  $('groupsAll').addEventListener('click', () => setAll('[data-group]', 'groups', true));
  $('groupsNone').addEventListener('click', () => setAll('[data-group]', 'groups', false));
  $('rootsAll').addEventListener('click', () => setAll('[data-root]', 'roots', true));
  $('rootsNone').addEventListener('click', () => setAll('[data-root]', 'roots', false));

  bindSlider('revealSec', 'revealOut', v => (v === 0 ? 'tap only' : `${v} s`));
  bindSlider('autoNextSec', 'autoNextOut', v => (v === 0 ? 'off (tap)' : `${v} s`));

  const acc = $('accidentals');
  acc.value = settings.accidentals;
  acc.addEventListener('change', () => {
    settings.accidentals = acc.value;
    persist();
    refreshRootLabels();
    render();
  });

  for (const key of ['degreeLabels', 'noteNames', 'colorBefore']) {
    const box = $(key);
    box.checked = settings[key];
    box.addEventListener('change', () => { settings[key] = box.checked; persist(); render(); });
  }
  const full = $('fullVoicings');
  full.checked = settings.fullVoicings;
  full.addEventListener('change', () => { settings.fullVoicings = full.checked; poolChanged(); });   // new notes -> new card once the dialog closes
  const exact = $('exactVoicing');
  exact.checked = settings.exactVoicing;
  exact.addEventListener('change', () => { settings.exactVoicing = exact.checked; persist(); st.exResult = null; render(); });

  $('clearHistory').addEventListener('click', () => { st.history = []; saveHistory(st.history); renderHistory(); });

  const sound = $('sound');
  sound.checked = settings.sound;
  sound.addEventListener('change', () => {
    settings.sound = sound.checked;
    persist();
    if (settings.sound) audio.unlock(); // inside a user gesture
  });

  refreshPoolInfo();
}

function bindSlider(key, outId, fmt) {
  const input = $(key), out = $(outId);
  input.value = settings[key];
  out.textContent = fmt(settings[key]);
  input.addEventListener('input', () => {
    settings[key] = Number(input.value);
    out.textContent = fmt(settings[key]);
    persist();
  });
}

function refreshRootLabels() {
  document.querySelectorAll('[data-root-label]').forEach(s => {
    s.textContent = rootName(Number(s.dataset.rootLabel), settings.accidentals);
  });
}

function refreshPoolInfo() {
  $('poolInfo').textContent = `— ${enabledChords().length} chords × ${enabledRoots().length} roots`;
}

function poolChanged() {
  st.dirtyPool = true;
  persist();
  refreshPoolInfo();
}

// ---------------------------------------------------------------- events
function wire() {
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    if (settings.mode === b.dataset.mode) return;
    settings.mode = b.dataset.mode;
    persist();
    nextCard();
  }));

  // tap anywhere on the stage (but not on buttons / keyboard / details) = reveal or next
  // (in exercise mode the card is only a "next" target once the answer is shown)
  el.stage.addEventListener('click', e => {
    if (e.target.closest('button, .kb-wrap, .details, .history')) return;
    if (freeing() || (exercising() && st.phase !== 'revealed')) return;
    advance();
  });
  el.action.addEventListener('click', advance);
  el.pause.addEventListener('click', () => {
    if (freeing()) { clearFree(); return; }
    if (exercising()) { giveUp(); return; }   // "Show answer"
    st.paused = !st.paused;
    updateStatus(true);
  });

  // every key plays just its own note (chord tone or not); pointerdown = instant, multi-touch friendly.
  // Playing is always on a direct tap, independent of the auto-play setting.
  el.kb.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-midi]');
    if (!g) return;
    e.preventDefault();
    audio.play([Number(g.dataset.midi)]);
    const key = g.querySelector('.key');
    key.classList.add('pressed');
    setTimeout(() => key.classList.remove('pressed'), 160);
    toggleKey(Number(g.dataset.midi)); // exercise mode: also select / deselect the key
  });

  // second way to hear it: the Play button sounds the chord exactly as drawn on the keyboard
  el.play.addEventListener('click', () => {
    if (freeing()) { if (st.sel.size) audio.play(sortedSel()); return; }   // free: play the user's own keys
    if (st.card) audio.play(chordMidi(st.card.rootPc, st.card.chord));
  });

  // iOS only unlocks audio on touchend/click, so unlock on pointerup (any tap) rather than pointerdown
  document.addEventListener('pointerup', () => audio.unlock(), { passive: true });

  document.addEventListener('keydown', e => {
    if (st.dialogOpen || e.target.closest?.('button, input, select, textarea')) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
    else if ((e.key === 'p' || e.key === 'P') && !exercising() && !freeing()) { st.paused = !st.paused; updateStatus(true); }
  });

  $('openSettings').addEventListener('click', () => {
    st.dialogOpen = true;
    el.dialog.showModal();
  });
  el.dialog.addEventListener('close', () => {
    st.dialogOpen = false;
    if (st.dirtyPool && !freeing()) nextCard(); else { st.dirtyPool = false; render(); }   // free mode ignores the chord pool
  });
  el.dialog.addEventListener('click', e => { if (e.target === el.dialog) el.dialog.close(); }); // backdrop
}

// ---------------------------------------------------------------- start
$('appVersion').textContent = self.APP_VERSION || '';
renderLegend();
buildPicker();
buildSettings();
wire();
nextCard();
st.booted = true;
requestAnimationFrame(loop);

if ('serviceWorker' in navigator && window.isSecureContext) {
  // updateViaCache 'none': the update check also revalidates the imported js/version.js instead of trusting the
  // 10-minute HTTP cache GitHub Pages allows (otherwise a new version can go unnoticed for 10 minutes)
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => { /* offline support is optional */ });

  // When an update takes over (new worker activated + claimed), reload once so the page shows the new version
  // right away instead of after the next launch. Not on the very first install (no controller yet).
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    location.reload();
  });
}

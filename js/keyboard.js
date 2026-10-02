// SVG piano keyboard, C3-B5. Active keys are one grey; each chord tone's function
// is shown by a colour-coded degree badge (R, 3, 5, b7, 9 ...) on the key.
//
// The key elements are built ONCE and then only updated in place. Rebuilding the SVG on every tap would
// delete the element under the user's finger in the middle of the touch (Safari drops the touch sequence
// or fails to repaint), which made keys seem to vanish when tapped.
import { KEY_LOW, KEY_HIGH } from './notes.js';

const NS = 'http://www.w3.org/2000/svg';
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const KW = 40, KH = 170;     // white key size (viewBox units)
const BW = 24, BH = 104;     // black key size

const isWhite = midi => WHITE_PCS.includes(midi % 12);

function el(name, attrs, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

// One-time structure: a <g data-midi> per key holding its <rect class="key ...">.
// White keys first, black keys on top (they are centred on the boundary after the white key to their left).
function build(svg) {
  const whites = [];
  for (let m = KEY_LOW; m <= KEY_HIGH; m++) if (isWhite(m)) whites.push(m);
  svg.setAttribute('viewBox', `0 0 ${whites.length * KW} ${KH}`);
  svg.replaceChildren();

  const add = (m, x, w, h, black) => {
    const g = el('g', { 'data-midi': m });
    g.dataset.x = x; g.dataset.w = w; g.dataset.h = h; g.dataset.black = black ? '1' : '';
    g.appendChild(el('rect', { x, y: 0, width: w, height: h, rx: 4, class: `key ${black ? 'black' : 'white'}` }));
    svg.appendChild(g);
  };
  whites.forEach((m, i) => add(m, i * KW, KW, KH, false));
  for (let m = KEY_LOW; m <= KEY_HIGH; m++) {
    if (isWhite(m)) continue;
    add(m, (whites.indexOf(m - 1) + 1) * KW - BW / 2, BW, BH, true);
  }
  svg.dataset.built = '1';
}

// Replace a key's badge / name labels (not the key itself).
function decorate(g, note, opts) {
  for (const old of g.querySelectorAll(':scope > .badge, :scope > text')) old.remove();
  if (!note) return;

  const black = !!g.dataset.black;
  const x = Number(g.dataset.x), w = Number(g.dataset.w), h = Number(g.dataset.h);
  const cx = x + w / 2;
  // note.plain = just selected (no badge); note.mark = wrong pick, drawn as a cross (a shape cue, not a colour)
  const showDegree = note.mark || (!note.plain && opts.degrees && !opts.neutral);
  const label = note.mark ? '✕' : note.degree;
  const fs = black ? 10 : 14;                // badge font size
  const bh = black ? 18 : 24;                // badge height
  const by = h - (black ? 14 : 18) - bh / 2; // badge centre y

  if (showDegree) {
    const bw = Math.max(bh, label.length * fs * 0.6 + 8);
    g.appendChild(el('rect', {
      x: cx - bw / 2, y: by - bh / 2, width: bw, height: bh, rx: bh / 2,
      class: note.mark ? 'badge mark' : `badge role-${note.role}`,
    }));
    g.appendChild(el('text', {
      x: cx, y: by + fs * 0.36, 'text-anchor': 'middle',
      class: `${note.mark ? 'deg mark' : `deg role-${note.role}`}${black ? ' small' : ''}`,
    }, label));
  }
  if (opts.names) {
    g.appendChild(el('text', {
      x: cx, y: showDegree ? by - bh / 2 - 6 : h - 10, 'text-anchor': 'middle',
      class: `name${black ? ' small' : ''}`,
    }, note.name));
  }
}

// notes: Map midi -> { role, degree, name, plain?, mark?, answer? }.  Pass an empty Map for a blank keyboard.
// opts:  neutral (grey keys only: no degree badges), degrees, names (label toggles).
export function renderKeyboard(svg, notes, opts = {}) {
  if (!svg.dataset.built) build(svg);
  for (const g of svg.querySelectorAll(':scope > g[data-midi]')) {
    const note = notes.get(Number(g.dataset.midi));
    const rect = g.firstElementChild;   // classList: keeps a transient "pressed" class intact
    rect.classList.toggle('on', !!note);
    rect.classList.toggle('answer', !!note?.answer);   // exercise "Show answer": the correct keys
    decorate(g, note, opts);
  }
}

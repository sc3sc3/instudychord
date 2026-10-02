import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { report, simulate, lab, luminance, de2000, MATS } from './cvd.mjs';

const css = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const v = name => {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(rootBlock);
  assert.ok(m, `--${name} missing in :root`);
  return m[1];
};
const roles = ['root', 'third', 'fifth', 'seventh', 'extension'];
const pal = Object.fromEntries(roles.map(r => [r, v(`c-${r}`)]));
const lum = h => luminance(simulate(h, 'normal'));
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('role colours stay distinguishable under protan / deutan / tritan vision', () => {
  const r = report(pal);
  for (const [type, { min, pair }] of Object.entries(r)) {
    assert.ok(min >= 20, `${type}: ${pair} only dE2000 ${min} (need >= 20) - palette is not colour-blind safe`);
  }
});

test('every role colour stands apart from the grey active key under every vision type', () => {
  const grey = v('key-on');
  for (const type of Object.keys(MATS)) {
    for (const r of roles) {
      const d = de2000(lab(simulate(pal[r], type)), lab(simulate(grey, type)));
      assert.ok(d >= 15, `${type}: ${r} badge only dE2000 ${d.toFixed(1)} from the grey key (need >= 15)`);
    }
  }
});

test('role colours also differ in lightness (greyscale-safe)', () => {
  const L = roles.map(r => lab(simulate(pal[r], 'normal'))[0]).sort((a, b) => a - b);
  for (let i = 1; i < L.length; i++) assert.ok(L[i] - L[i - 1] >= 8, `lightness gap ${(L[i] - L[i - 1]).toFixed(1)} < 8`);
});

test('badge text is readable on every role colour (>= 4.5:1)', () => {
  const dark = v('ink-on-third'), light = v('ink-on-color');
  for (const r of roles) {
    const best = Math.max(contrast(pal[r], dark), contrast(pal[r], light));
    assert.ok(best >= 4.5, `${r}: best text contrast ${best.toFixed(1)}`);
  }
  // the CSS must actually use the dark ink on the light roles
  const darkRoles = roles.filter(r => contrast(pal[r], dark) > contrast(pal[r], light));
  const rule = /\.deg\.role-root[^{]*\{[^}]*\}/.exec(css)?.[0] ?? '';
  for (const r of darkRoles) assert.ok(rule.includes(`role-${r}`), `${r} needs dark badge text in style.css`);
  for (const r of roles.filter(x => !darkRoles.includes(x))) assert.ok(!rule.includes(`role-${r}`), `${r} should use light badge text`);
});

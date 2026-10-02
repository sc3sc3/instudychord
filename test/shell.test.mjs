import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const sw = read('sw.js');
const shell = [...sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];', sw.indexOf('const SHELL'))).matchAll(/'([^']+)'/g)].map(m => m[1]);

test('version.js defines a vN version and is the only place it lives', () => {
  assert.match(read('js/version.js'), /self\.APP_VERSION = 'v\d+';/);
  assert.ok(sw.includes("importScripts('js/version.js')"), 'sw.js must import js/version.js');
  assert.ok(!/const VERSION\s*=/.test(sw), 'sw.js must not keep its own VERSION constant');
  assert.ok(read('index.html').includes('id="appVersion"'), 'title needs the #appVersion element');
  assert.ok(read('index.html').indexOf('js/version.js') < read('index.html').indexOf('js/app.js'), 'version.js must load before app.js');
});

test('service-worker precache lists every module and asset the app needs', () => {
  for (const f of fs.readdirSync(new URL('../js/', import.meta.url))) assert.ok(shell.includes(`js/${f}`), `js/${f} missing from SHELL`);
  for (const f of ['index.html', 'style.css', 'manifest.webmanifest']) assert.ok(shell.includes(f), `${f} missing from SHELL`);
  for (const f of shell.filter(f => f !== './')) assert.ok(fs.existsSync(new URL(`../${f}`, import.meta.url)), `SHELL lists missing file ${f}`);
});

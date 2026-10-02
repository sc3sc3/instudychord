# inStudyChord

A chord-study trainer that runs in the browser and installs as a PWA (works on iPad Safari).
Vanilla HTML/CSS/ES modules — no build step, no dependencies.

- **Name → Keys:** a random chord name appears; after a configurable delay the chord is drawn on a
  keyboard. Chord keys are all one middle grey; the degree number on each key sits in a colour-coded
  badge by function (root yellow / 3rd-sus sky blue / 5th vermillion / 7th-6th teal / 9-11-13 indigo).
  The colours are colour-blind safe (checked against protan / deutan / tritan simulation and greyscale),
  and every badge also carries its number, so colour is never the only cue. `test/cvd.test.mjs` enforces
  this — re-run `npm test` after changing any `--c-*` colour in `style.css`.
- **Keys → Name:** the keyboard appears first; the name is revealed after the delay or on tap.
- **Exercise** (name → keys, *you* play it): the chord name is shown, the keyboard is blank. Tap the keys of
  the chord (tap again to deselect; every tap sounds its note). It checks automatically once you have as many
  distinct notes as the chord needs, or press **Check**. Wrong keys get a ✕, and the status says how many are
  wrong / missing; fix them and it re-checks. When right the true voicing appears (grey keys with
  colour-coded numbers); after **Show answer** the keys of the drawn answer are **yellow** instead (and only those:
  your own picks stay grey, wrong ones with a ✕), so a miss stands out from a solve. Then **Next**.
  A first-try score is shown (`3/7 first try`). By default any octave counts; the setting *Exercise: require the exact voicing* demands the exact keys as drawn.
- **Free** (you play, the app names it): tap any keys on the blank keyboard (each tap sounds its note; tap a
  selected key again to remove it), then press **Reveal**. The app names the chord, with the lowest key as the
  root when possible and a slash chord for inversions (`Cmaj7/E`), shows your keys with colour-coded numbers
  relative to the found root, and lists other readings under *Could also be* (C E G A → `C6`, also `Am7/C`).
  If nothing sounds exactly those notes it says so and suggests close chords with a note missing (C E B →
  `Cmaj7 (no G)`). **Clear** starts over; ♪ **Play** sounds your own keys. Needs at least 2 different notes.
- **Explore:** pick any root (12 buttons) and any of the 102 chord types (dropdown or ‹ › stepper) and
  see it drawn immediately — no timer, always fully revealed. The choice is remembered.
- **History:** a strip of small chips above the chord card shows the last **12 chords** you finished with,
  newest first (one row of 12 on wide screens, 6×2 in portrait). A chord is recorded **the moment its answer is on
  screen** — a quiz reveal, an Exercise solve or *Show answer*, a Free *Reveal* that found a chord (an inversion is kept as the slash chord, e.g. `G/D`), an Explore
  pick — so the newest chip is the chord you are looking at. In Exercise the chip carries ✓ (right on the
  first check) or ✕ (missed / answer shown). Not recorded: a chord whose answer was never shown (you switched
  mode first) and a Free attempt that matched nothing. The same chord twice in a row counts once (`G` and `G/D` are different). Shared by all
  five modes and kept across restarts; *Clear chord history* is in Settings.
- 102 chords in 12 checkbox groups: triads, suspended (`sus2`, `7sus2`, `maj7sus4`, `7sus4♭9` …), add
  chords (`add♯11`, `m(add11)` …), sixths, sevenths, ninths, elevenths, thirteenths, Lydian / ♯11,
  altered fifths (incl. whole-tone `9♯5♯11`), altered dominants (`7alt`, `13♭9♯11`, `7♭9♭13` …) and
  quartal / quintal stacks.
  The 30 chords of `ChkromaLib/src/sound/intrah/Chord.java` are all included with identical voicings
  (including its 11th/13th voicings, where the 3rd sits above the 9th).
- On reveal: spelled note names, degrees, alternative chord symbols (`Δ7`, `ø7`, `-7` …) and other
  chords with the same notes (C6 = Am7).
- Settings: reveal delay for the two quiz modes (0–30 s; 0 = no automatic reveal, tap to reveal — the default),
  auto-next (0 = tap), chord groups and root notes (used by the quizzes), accidentals (jazz / flats / sharps),
  degree labels, note names, *colour-code before reveal* (Keys → Name), *exact voicing* (Exercise), auto-play,
  *Clear chord history*. Persisted in `localStorage`.

Sound (always on a direct tap, no setting needed): **tap any key** to hear just that note — chord tone or
not, multi-touch works — and press the **♪ Play** button (top-right of the card) to hear the whole chord
exactly as drawn. Play is greyed out while the keys are still hidden (Name → Keys before the reveal). The
*Auto-play* checkbox in Settings additionally sounds the chord by itself on reveal / when picking one.

Controls: in the two quiz modes tap anywhere on the card (or the Reveal / Next button) to reveal and go on;
`Space` / `Enter` / `→` do the same and `P` pauses. In Exercise, `Space` / `Enter` = Check (then Next); in Free,
`Space` / `Enter` = Reveal. Explore needs no controls.

## Live copy (GitHub Pages)

**https://sc3sc3.github.io/instudychord/** — open it in Safari on the iPad, then Share → *Add to Home Screen*.
It is real HTTPS, so the installed app works fully offline and keeps its settings and score in its own storage
(separate from Safari tabs, not wiped after a week of non-use; deleting the icon deletes them).

Publishing is one command — `./deploy-pages.sh` runs the tests, copies this folder to the public mirror repo
[sc3sc3/instudychord](https://github.com/sc3sc3/instudychord) and pushes; Pages rebuilds in about a minute.
Bump `APP_VERSION` in `js/version.js` first (the version shown next to the title tells you which copy the
iPad has; installed apps pick up an update after opening once or twice with a connection). The mirror is a
copy only (no `CLAUDE.md`, no deploy script) and its commits use the GitHub no-reply e-mail address.
One-time setup that was done: create the public repo, then enable Pages (Settings → Pages → *Deploy from a
branch* → `main` / root).

## Running

It is only static files; serve the folder over HTTP:

```
cd tools/inStudyChord
python3 -m http.server 8000
# open http://localhost:8000
```

### On the iPad

| Option | Offline / install | Private |
|---|---|---|
| `python3 -m http.server 8000 --bind 0.0.0.0`, open `http://<laptop-LAN-IP>:8000` | Works in Safari; "Add to Home Screen" gives a full-screen launcher. Plain http is not a secure context, so **no service worker / offline** and the laptop must keep running. | LAN only |
| [Tailscale](https://tailscale.com) `tailscale serve` on the laptop, open the `https://<machine>.<tailnet>.ts.net` URL on the iPad (Tailscale app installed) | Real HTTPS → full PWA, offline after first load | Tailnet only |
| GitHub Pages / any static HTTPS host | Full PWA, offline | **Public.** Pages from a private repo still serves a public site; private Pages needs GitHub Enterprise Cloud. Nothing here is sensitive. |

Install on iPad: Safari → Share → *Add to Home Screen*.

Sound: WebAudio is silenced by the iOS ring/silent switch — turn it to ring. Audio starts only after
a tap (iOS rule); the first tap anywhere unlocks it.

## Development

```
npm test        # node --test test/*.test.mjs  (no install needed)
```

38 tests, all on pure modules plus the static files: the 30 `Chord.java` chords match the file verbatim, catalogue
invariants (ascending, fits the keyboard for every root, unique ids and symbols), spelling and roles; Exercise
judging (octaves, wrong / missing notes, every chord solves with its own voicing); Free-mode identification
(inversions, ambiguous voicings, near matches, every chord recognised on every root); history rules; settings
sanitising and migration; the **colour-blind safety of the role colours** (protan / deutan / tritan simulation,
greyscale, distance from the key, text contrast); and that `sw.js` precaches every file the app needs.

**When you change any shell file, bump `APP_VERSION` in `js/version.js`** (shown next to the title and used as
the service-worker cache name), otherwise installed copies (cache-first) keep serving the old files.

## Files

```
index.html  style.css  manifest.webmanifest  sw.js  icons/  deploy-pages.sh
js/chords.js    chord catalogue + groups + parsing (pure)
js/notes.js     root names, spelling, MIDI math (pure)
js/exercise.js  Exercise-mode judging (pure)
js/identify.js  Free-mode chord identification (pure)
js/history.js   last-12-chords history: rules (pure) + localStorage
js/keyboard.js  SVG keyboard renderer (C3–B5), built once and updated in place
js/audio.js     WebAudio chord synth
js/settings.js  persisted settings (+ migration of changed defaults)
js/version.js   APP_VERSION: single source for the label and the service-worker cache name
js/app.js       state machine for the five modes, timers, UI
test/           node --test suite (cvd.mjs = colour-vision simulation used by the colour test)
```

Adding a chord: one `chord(...)` line in `js/chords.js` — `tones` is a formula in ascending pitch order
(`"1 3 b5 b7 #9"`; degrees > 7 are compound: 9, 10, 11, 13). Icons: edit `icons/icon.svg` and re-render
with `rsvg-convert -w 512 -h 512 icons/icon.svg -o icons/icon-512.png` (also 192 and the 180 px
`apple-touch-icon.png`).

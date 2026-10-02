# inStudyChord

A chord-study trainer that runs in the browser and installs as a PWA (works on iPad Safari).
Vanilla HTML/CSS/ES modules — no build step, no dependencies.

- **Name → Keys:** a random chord name appears; after a configurable delay the chord is drawn on a
  keyboard. Chord keys are all one middle grey; the degree number on each key sits in a colour-coded
  badge by function (root yellow / 3rd-sus sky blue / 5th vermillion / 7th-6th teal / 9-11-13 indigo).
  The colours are colour-blind safe (checked against protan / deutan / tritan simulation and greyscale),
  and every badge also carries its number, so colour is never the only cue. `test/cvd.test.mjs` enforces
  this — re-run `npm test` after changing any `--c-*` colour in `style.css`.
- **Exercise** (name → keys, *you* play it): the chord name is shown, the keyboard is blank. Tap the keys of
  the chord (tap again to deselect; every tap sounds its note). It checks automatically once you have as many
  distinct notes as the chord needs, or press **Check**. Wrong keys get a ✕, and the status says how many are
  wrong / missing; fix them and it re-checks. When right (or after **Show answer**) the true voicing appears
  with its colour-coded numbers, then **Next**. A first-try score is shown (`3/7 first try`). By default any
  octave counts; the setting *Exercise: require the exact voicing* demands the exact keys as drawn.
- **Keys → Name:** the keyboard appears first; the name is revealed after the delay or on tap.
- **Explore:** pick any root (12 buttons) and any of the 102 chord types (dropdown or ‹ › stepper) and
  see it drawn immediately — no timer, always fully revealed. The choice is remembered.
- 102 chords in 12 checkbox groups: triads, suspended (`sus2`, `7sus2`, `maj7sus4`, `7sus4♭9` …), add
  chords (`add♯11`, `m(add11)` …), sixths, sevenths, ninths, elevenths, thirteenths, Lydian / ♯11,
  altered fifths (incl. whole-tone `9♯5♯11`), altered dominants (`7alt`, `13♭9♯11`, `7♭9♭13` …) and
  quartal / quintal stacks.
  The 30 chords of `ChkromaLib/src/sound/intrah/Chord.java` are all included with identical voicings
  (including its 11th/13th voicings, where the 3rd sits above the 9th).
- On reveal: spelled note names, degrees, alternative chord symbols (`Δ7`, `ø7`, `-7` …) and other
  chords with the same notes (C6 = Am7).
- Settings: reveal delay (0–30 s; 0 = no automatic reveal, tap to reveal — the default), auto-next (0 = tap), chord groups, root notes, accidentals
  (jazz / flats / sharps), degree labels, note names, optional sound. Persisted in `localStorage`.

Sound (always on a direct tap, no setting needed): **tap any key** to hear just that note — chord tone or
not, multi-touch works — and press the **♪ Play** button (top-right of the card) to hear the whole chord
exactly as drawn. Play is greyed out while the keys are still hidden (Name → Keys before the reveal). The
*Auto-play* checkbox in Settings additionally sounds the chord by itself on reveal / when picking one.

Tap anywhere on the card to reveal / go to the next chord. Keyboard: `Space`/`Enter`/`→` = reveal/next,
`P` = pause.

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
a tap (iOS rule), which enabling the *Play the chord* checkbox counts as.

## Development

```
npm test        # node --test test/*.test.mjs  (no install needed)
```

Tests check that the derived semitones of all 30 `Chord.java` chords match the file verbatim, catalogue
invariants (ascending, fits the keyboard for every root, unique ids), spelling and role classification.

**When you change any shell file, bump `APP_VERSION` in `js/version.js`** (shown next to the title and used as
the service-worker cache name), otherwise installed copies (cache-first) keep serving the old files.

## Files

```
index.html  style.css  manifest.webmanifest  sw.js  icons/
js/chords.js    chord catalogue + groups + parsing (pure)
js/notes.js     root names, spelling, MIDI math (pure)
js/keyboard.js  SVG keyboard renderer (C3–B5)
js/audio.js     WebAudio chord synth
js/settings.js  persisted settings
js/app.js       state machine, timers, UI
test/           node --test suite
```

Adding a chord: one `chord(...)` line in `js/chords.js` — `tones` is a formula in ascending pitch order
(`"1 3 b5 b7 #9"`; degrees > 7 are compound: 9, 10, 11, 13). Icons: edit `icons/icon.svg` and re-render
with `rsvg-convert -w 512 -h 512 icons/icon.svg -o icons/icon-512.png` (also 192 and the 180 px
`apple-touch-icon.png`).

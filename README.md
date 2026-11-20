# Daily Games Hub

A local hub for my daily games: open them, log results, track streaks. See [REQUIREMENTS.md](REQUIREMENTS.md).

## Use it every day

The built app is served at **http://localhost:5173** by a small hidden server that starts when you log in to Windows. Just open that address (bookmark it, or install it as an app from the browser's address bar).

- Set up once: `npm install`, `npm run build`, then `powershell -ExecutionPolicy Bypass -File scripts\install-startup.ps1` (adds a shortcut to your Startup folder).
- Start it now without logging out: double-click `scripts\serve-hidden.vbs`.
- After changing the code: `npm run build`. The running server picks up the new files; just reload the page.
- Stop it: end the **Node.js JavaScript Runtime** process in Task Manager. Remove it from login: `powershell -ExecutionPolicy Bypass -File scripts\install-startup.ps1 -Remove`.
- Without the background server: `npm run serve` (same address, stops when you close the terminal).

## Online (GitHub Pages)

Every push to `main` rebuilds the app and publishes it to `https://<username>.github.io/daily-games-hub/`
(see `.github/workflows/deploy.yml`). Anyone with the link can use it; each person's results are stored
only in their own browser, so nobody sees anyone else's data.

One-time setup on github.com: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Note: the online site and `localhost:5173` are different sites, so they have separate data.
To move your results, use **Settings → Export backup** on one and **Import backup** on the other.

## Teaching the app a game

Every game, built-in or added, can be edited with **✎** in Settings:

- **How results are measured:** result type, maximum, unit (`$`, `km`…, before or after the number),
  decimals, and **lower is better** (e.g. Costcodle's "$ off", 301's "points left").
- **Share text:** paste one example, pick what the score is (a number you click, how many times an
  emoji appears, or the number of grid lines), click the puzzle number, and optionally set
  "it's a loss when the text contains …". The preview shows how it reads; a second box checks
  another day's text. A taught format takes priority over a built-in reader; **Reset to default**
  undoes edits to a built-in game.
- Unrecognized pastes on Today offer **Teach it**, and the result dialog has a 🎓 link, so teaching
  usually starts from a real paste.
- **Copy setup code** shares a game's settings (never results). Friends paste it under
  Settings → Add a game.

Taught formats are stored as data (the word before/after each number), not as regexes, so setup
codes from other people can't run code. See `src/lib/pattern.ts` and `src/lib/shareCode.ts`.

## Develop

```bash
npm run dev        # http://localhost:5174 — separate data from the real app on 5173
```

Other scripts: `npm run typecheck`, `npm run build`, `npm test` (unit tests).

## Layout

```
src/
  games/catalog.ts     game list: add a game here
  games/parsers/       share-text parsers, one per game; real pasted samples in realSamples.test.ts
  games/discover.ts    hand-picked games for the Discover page (edit to add/remove)
  games/parsers/forGame.ts  picks a game's reader: taught format first, then built-in
  lib/pattern.ts       teach-by-example share-text reader (+ pattern.test.ts)
  lib/shareCode.ts     game setup codes (encode / validated decode)
  lib/similar.ts       "similar to your games" ranking (+ similar.test.ts)
  db.ts                IndexedDB (Dexie): results, prefs, added games, edits to built-ins, React hooks
  types.ts             Game / Result types
  lib/date.ts          local-date helpers, useToday() (rolls over at midnight)
  lib/format.ts        result → short text ("3/6", "540 pts")
  i18n/                en.json / es.json UI strings
  pages/Today.tsx      home page
  lib/stats.ts         streaks, win rate, distributions (+ stats.test.ts)
  lib/theme.ts         system / light / dark theme
  pages/               Today, Stats, History, Discover, Settings
  components/          GameCard, ResultDialog, GameEditor, PasteBox, ShareDialog, ShareCard, …
```

Data lives in your browser's IndexedDB for `localhost:5173`, and only there (the dev server on 5174 has its own, separate data).
Use **Settings → Export backup** now and then; import it to restore or move to another browser.

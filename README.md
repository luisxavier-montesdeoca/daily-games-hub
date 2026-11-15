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
  lib/similar.ts       "similar to your games" ranking (+ similar.test.ts)
  db.ts                IndexedDB (Dexie): results + prefs, React hooks
  types.ts             Game / Result types
  lib/date.ts          local-date helpers, useToday() (rolls over at midnight)
  lib/format.ts        result → short text ("3/6", "540 pts")
  i18n/                en.json / es.json UI strings
  pages/Today.tsx      home page
  lib/stats.ts         streaks, win rate, distributions (+ stats.test.ts)
  lib/theme.ts         system / light / dark theme
  pages/               Today, Stats, History, Discover, Settings
  components/          GameCard, ResultDialog, PasteBox, ShareDialog, ShareCard, …
```

Data lives in your browser's IndexedDB for `localhost:5173`, and only there (the dev server on 5174 has its own, separate data).
Use **Settings → Export backup** now and then; import it to restore or move to another browser.

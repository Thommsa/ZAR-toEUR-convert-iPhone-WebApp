# ZAR ⇄ EUR Converter

A tiny installable web app (PWA) that converts South African Rand to Euro
using the latest published exchange rate, and keeps working offline using
the last rate it managed to fetch.

## How it works

- Rate source: [Frankfurter](https://www.frankfurter.app/) — free, no API
  key, backed by European Central Bank reference rates.
- Every time the app has a connection, it quietly fetches the latest rate
  and stores it in the browser's `localStorage` along with a timestamp.
- If there's no connection, it reuses that stored rate and clearly shows
  "Offline — using cached rate" plus when it was last updated.
- A service worker caches the app's own files (HTML/JS/icons), so the app
  opens instantly even in airplane mode — only the *rate* can go stale,
  never the app itself.

## Run it locally (quick test)

You can't just double-click `index.html` — service workers require the
page to be served over `http://` or `https://`, not `file://`. Easiest
options:

```bash
# Python (already on most Macs)
cd zar-eur
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

or, if you have Node:

```bash
npx serve zar-eur
```

## Put it on GitHub + host it for free

1. Create a new repo on GitHub and push this folder's contents to it.
2. In the repo settings, enable **GitHub Pages**, pointing at the branch
   root (e.g. `main` / `/`).
3. GitHub will give you a URL like
   `https://yourusername.github.io/zar-eur/`. That's a real HTTPS URL, so
   the service worker and "Add to Home Screen" will both work.

## Install on iPhone

1. Open the GitHub Pages URL in **Safari** (must be Safari, not Chrome).
2. Tap the Share icon → **Add to Home Screen**.
3. Open it from your home screen — it launches full-screen, no browser
   chrome, and will still open with no signal since the shell is cached.

## Install on Android (later)

Same idea in Chrome: menu → **Add to Home screen** / **Install app**. No
code changes needed — it's the same manifest and service worker doing the
work on both platforms.

## Files

| File | Purpose |
|---|---|
| `index.html` | Layout and structure |
| `app.js` | Fetch, cache, conversion, and swap logic |
| `manifest.json` | Tells the OS how to install the app (name, icon, colors) |
| `service-worker.js` | Caches the app shell for offline loading |
| `icons/` | Home screen icons |

## Ideas if you want to keep iterating

- Swap Frankfurter for another rate provider if you want more currencies.
- Add a small history chart of the ZAR/EUR rate over time.
- Store a *few* days of rate history instead of just the latest one, so
  you can see how stale the cached rate is at a glance.

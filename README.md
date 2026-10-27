# 📡 NewsPulse

A fast, clean, single-page website that gives you **live updates on current affairs, breaking news, and new technology** — no backend, no API keys, just static files.

## ✨ Features

- **Live news** — headlines are fetched directly from the public RSS feeds of top publishers (BBC, Times of India, NDTV, TechCrunch, The Verge, AI News, MIT Tech Review, ScienceDaily, CNBC)
- **7 categories** — All, 🌍 World, 🇮🇳 India, 💻 Tech, 🤖 AI, 🔬 Science, 📈 Business
- **Breaking ticker** — a live scrolling bar of the latest headlines
- **Instant search** — filter headlines as you type
- **Dark / light mode** — with your preference saved locally
- **Auto-refresh** — re-fetches every 10 minutes; manual refresh button too
- **Fully responsive** — looks great on mobile, tablet and desktop

## 🚀 Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## 📄 How it works

The site is 100% static. In the browser, `js/app.js` fetches each feed's RSS/Atom XML through a public CORS proxy, parses it with `DOMParser`, dedupes, sorts by recency, and renders cards. If all feeds fail (e.g. offline), it falls back to direct links to every source.

## 📌 Note on content

All headlines and descriptions are © their respective publishers — this site only aggregates public RSS feeds and links out to the original articles.
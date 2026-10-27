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

The site is 100% static. `js/app.js` loads the pre-generated `news.json` (see above), dedupes, sorts by recency, and renders cards. Category tabs and search filter the loaded stories instantly. If no data is available at all, it falls back to direct links to every source.

## 🔄 How updates work

- `news.json` holds the latest 120 stories, fetched from all feeds by `tools/fetch_news.py`
- A GitHub Actions workflow (`.github/workflows/refresh-news.yml`) **re-fetches and commits `news.json` every 30 minutes** — no server, no API keys
- The page loads `news.json` directly (same origin, so it always works). If the file is missing or older than 3 hours, it falls back to fetching feeds live in the browser through CORS proxies
- You can trigger a manual refresh from the Actions tab, or run `python tools/fetch_news.py` locally and push

## 📌 Note on content

All headlines and descriptions are © their respective publishers — this site only aggregates public RSS feeds and links out to the original articles.
/* ============ NewsPulse — app.js ============ */

// ---------- Feed configuration ----------
const FEEDS = [
  { name: "BBC News",        cat: "world",    url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC Business",    cat: "business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "Times of India",  cat: "india",    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" },
  { name: "NDTV",            cat: "india",    url: "https://feeds.feedburner.com/ndtvnews-top-stories" },
  { name: "TechCrunch",      cat: "tech",     url: "https://techcrunch.com/feed/" },
  { name: "The Verge",       cat: "tech",     url: "https://www.theverge.com/rss/index.xml" },
  { name: "AI News",         cat: "ai",       url: "https://www.artificialintelligence-news.com/feed/" },
  { name: "MIT Tech Review", cat: "ai",       url: "https://www.technologyreview.com/feed/" },
  { name: "ScienceDaily",    cat: "science",  url: "https://www.sciencedaily.com/rss/all.xml" },
  { name: "CNBC",            cat: "business", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
];

const CAT_LABELS = {
  world: "World", india: "India", tech: "Tech",
  ai: "AI", science: "Science", business: "Business",
};

// CORS-friendly proxies (tried in order)
const PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
];

// ---------- State ----------
let allItems = [];
let activeCat = "all";
let searchQuery = "";
let fetched = 0;

// ---------- Elements ----------
const grid = document.getElementById("newsGrid");
const statusLine = document.getElementById("statusLine");
const tickerTrack = document.getElementById("tickerTrack");
const tabsEl = document.getElementById("tabs");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");
const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");
const lastUpdated = document.getElementById("lastUpdated");
const sourcesSection = document.getElementById("sourcesSection");
const sourceChips = document.getElementById("sourceChips");

document.getElementById("year").textContent = new Date().getFullYear();

// ---------- Theme ----------
const savedTheme = localStorage.getItem("np-theme");
if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
syncThemeIcon();

themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  if (cur === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  localStorage.setItem("np-theme", cur);
  syncThemeIcon();
});

function syncThemeIcon() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  themeIcon.textContent = dark ? "🌙" : "☀️";
}

// ---------- Helpers ----------
function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ---------- Fetch & parse ----------
async function fetchWithProxy(url) {
  let lastErr;
  for (const makeProxy of PROXIES) {
    try {
      const res = await fetch(makeProxy(url), { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.length > 200) return text;
      throw new Error("Empty response");
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All proxies failed");
}

function parseFeed(xmlText, feedMeta) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) return [];

  const items = [];
  const nodes = doc.querySelectorAll("item"); // RSS
  if (nodes.length) {
    nodes.forEach((n) => {
      const title = stripHtml(n.querySelector("title")?.textContent || "");
      const link = n.querySelector("link")?.textContent?.trim() || "";
      const desc = stripHtml(n.querySelector("description")?.textContent || "")
        .replace(/^.*?<a[^>]*>/, "").slice(0, 220);
      const pub = n.querySelector("pubDate")?.textContent || "";
      if (title && link) items.push({ title, link, desc, date: new Date(pub), source: feedMeta.name, cat: feedMeta.cat });
    });
  } else {
    // Atom (The Verge etc.)
    doc.querySelectorAll("entry").forEach((n) => {
      const title = stripHtml(n.querySelector("title")?.textContent || "");
      const link = n.querySelector('link[rel="alternate"]')?.getAttribute("href")
        || n.querySelector("link")?.getAttribute("href") || "";
      const desc = stripHtml(n.querySelector("summary")?.textContent || n.querySelector("content")?.textContent || "").slice(0, 220);
      const pub = n.querySelector("updated")?.textContent || n.querySelector("published")?.textContent || "";
      if (title && link) items.push({ title, link, desc, date: new Date(pub), source: feedMeta.name, cat: feedMeta.cat });
    });
  }
  return items;
}

async function loadAll() {
  allItems = [];
  fetched = 0;
  statusLine.className = "status-line";
  statusLine.innerHTML = '<span class="spinner" aria-hidden="true"></span> Loading stories from feeds…';
  grid.innerHTML = "";
  sourcesSection.hidden = true;

  await Promise.all(FEEDS.map(async (f) => {
    try {
      const xml = await fetchWithProxy(f.url);
      const items = parseFeed(xml, f);
      if (items.length) allItems.push(...items);
      fetched++;
    } catch { /* feed failed — continue with others */ }
  }));

  // Dedupe by link, sort newest first, cap
  const seen = new Set();
  allItems = allItems
    .filter((it) => {
      if (!it.date || isNaN(it.date.getTime())) it.date = new Date(0);
      if (seen.has(it.link)) return false;
      seen.add(it.link);
      return true;
    })
    .sort((a, b) => b.date - a.date)
    .slice(0, 120);

  if (allItems.length === 0) {
    statusLine.className = "status-line error";
    statusLine.textContent = "⚠️ Couldn't reach any news feed right now. Try refreshing, or jump straight to the sources below.";
    showFallbackSources();
    return;
  }

  statusLine.style.display = "none";
  lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${allItems.length} stories from ${fetched}/${FEEDS.length} sources`;
  buildTicker();
  render();
}

// ---------- Rendering ----------
function visibleItems() {
  return allItems.filter((it) => {
    const okCat = activeCat === "all" || it.cat === activeCat;
    const okSearch = !searchQuery ||
      it.title.toLowerCase().includes(searchQuery) ||
      (it.desc || "").toLowerCase().includes(searchQuery) ||
      it.source.toLowerCase().includes(searchQuery);
    return okCat && okSearch;
  });
}

function render() {
  const items = visibleItems();
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state"><span class="big">🔍</span>No stories match your search in this category.</div>';
    return;
  }
  grid.innerHTML = items.map((it, i) => `
    <article class="card" style="animation-delay:${Math.min(i * 30, 300)}ms">
      <div class="card-top">
        <span class="cat-chip">${CAT_LABELS[it.cat] || it.cat}</span>
        <span class="source-name">${esc(it.source)}</span>
        <span class="card-time">${timeAgo(it.date)}</span>
      </div>
      <h3 class="card-title"><a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a></h3>
      ${it.desc ? `<p class="card-desc">${esc(it.desc)}</p>` : ""}
      <div class="card-foot">
        <a class="read-btn" href="${esc(it.link)}" target="_blank" rel="noopener">Read story →</a>
      </div>
    </article>
  `).join("");
}

function buildTicker() {
  const top = allItems.slice(0, 10);
  const html = top.map((it) =>
    `<span class="ticker-item">⚡ <a href="${esc(it.link)}" target="_blank" rel="noopener">${esc(it.title)}</a></span>`
  ).join("");
  // Duplicate for seamless loop
  tickerTrack.innerHTML = html + html;
}

function showFallbackSources() {
  sourcesSection.hidden = false;
  sourceChips.innerHTML = FEEDS.map((f) =>
    `<a href="${f.url}" target="_blank" rel="noopener">${esc(f.name)} (${CAT_LABELS[f.cat]})</a>`
  ).join("");
}

// ---------- Events ----------
tabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  activeCat = btn.dataset.cat;
  render();
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    render();
  }, 200);
});

refreshBtn.addEventListener("click", () => {
  refreshBtn.classList.add("spinning");
  loadAll().finally(() => setTimeout(() => refreshBtn.classList.remove("spinning"), 300));
});

// ---------- Init ----------
loadAll();
// Auto-refresh every 10 minutes
setInterval(() => { if (document.visibilityState === "visible") loadAll(); }, 10 * 60 * 1000);
#!/usr/bin/env python3
"""Fetch NewsPulse RSS feeds and write news.json for GitHub Pages.

Run locally or in GitHub Actions. Output shape:
{
  "generated_at": "<iso8601 utc>",
  "feeds_ok": <int>,
  "feeds_total": <int>,
  "items": [{"title","link","desc","date","source","cat"}, ...]
}
"""
import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import feedparser

FEEDS = [
    ("BBC News", "world", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("BBC Business", "business", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("Times of India", "india", "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"),
    ("NDTV", "india", "https://feeds.feedburner.com/ndtvnews-top-stories"),
    ("TechCrunch", "tech", "https://techcrunch.com/feed/"),
    ("The Verge", "tech", "https://www.theverge.com/rss/index.xml"),
    ("AI News", "ai", "https://www.artificialintelligence-news.com/feed/"),
    ("MIT Tech Review", "ai", "https://www.technologyreview.com/feed/"),
    ("ScienceDaily", "science", "https://www.sciencedaily.com/rss/all.xml"),
    ("CNBC", "business", "https://www.cnbc.com/id/100003114/device/rss/rss.html"),
]

TAG_RE = re.compile(r"<[^>]+>")
USER_AGENT = "Mozilla/5.0 (compatible; NewsPulse/1.0; static news aggregator)"


def clean(text, limit=220):
    text = html.unescape(TAG_RE.sub(" ", text or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def entry_date(entry):
    for key in ("published_parsed", "updated_parsed"):
        t = entry.get(key)
        if t:
            return datetime(*t[:6], tzinfo=timezone.utc)
    return None


def main():
    items, ok = [], 0
    for name, cat, url in FEEDS:
        try:
            d = feedparser.parse(url, agent=USER_AGENT)
            if d.bozo and not d.entries:
                raise RuntimeError(str(d.bozo_exception))
            for e in d.entries[:15]:
                link = (e.get("link") or "").strip()
                title = clean(e.get("title", ""), 300)
                if not link or not title:
                    continue
                desc = clean(e.get("summary") or e.get("description") or "")
                dt = entry_date(e)
                items.append(
                    {
                        "title": title,
                        "link": link,
                        "desc": desc,
                        "date": dt.isoformat() if dt else "",
                        "source": name,
                        "cat": cat,
                    }
                )
            ok += 1
        except Exception as ex:  # noqa: BLE001 - keep going on any feed failure
            print(f"warn: {name}: {ex}", file=sys.stderr)

    seen, unique = set(), []
    for it in items:
        if it["link"] in seen:
            continue
        seen.add(it["link"])
        unique.append(it)

    unique.sort(key=lambda it: it["date"] or "", reverse=True)
    unique = unique[:120]

    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "feeds_ok": ok,
        "feeds_total": len(FEEDS),
        "items": unique,
    }
    Path("news.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"news.json: {len(unique)} items from {ok}/{len(FEEDS)} feeds")
    if ok == 0:
        print("error: all feeds failed", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
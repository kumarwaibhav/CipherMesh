"""Live AI-security headlines from the AI Incident Database RSS feed.

The feed covers every kind of AI incident, so only security-relevant items are kept (breaches, leaks,
prompt injection, exploits, credential theft, deepfake fraud, supply-chain compromise). Results are
cached in-process for 30 minutes; if the upstream is slow or down, the last good copy is served, and
with no copy at all the endpoint reports ``available: false`` so the console falls back to its
verified snapshot. The payload is size-capped and DTD/entity declarations are refused before parsing.
"""
from __future__ import annotations

import html
import re
import threading
import time
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import Callable

FEED_URL = "https://incidentdatabase.ai/rss.xml"
SOURCE_URL = "https://incidentdatabase.ai/"
TTL_S = 1800
MAX_BYTES = 3_000_000
TIMEOUT_S = 4.0
MAX_ITEMS = 20

SECURITY = re.compile(
    r"\b(breach\w*|leak\w*|expos\w+|exfiltrat\w*|prompt[- ]injection|jailbreak\w*|exploit\w*|vulnerab\w*|CVE-\d{4}"
    r"|hack\w*|malware|ransom\w*|phish\w*|credential\w*|api keys?|password\w*|scam\w*|fraud\w*|botnet\w*"
    r"|supply[- ]chain|backdoor\w*|espionage|intrusion|compromis\w*|stolen|steal\w*|attackers?|cyber\w*|threat actors?"
    r"|unauthori[sz]ed access|rogue (?:ai )?agents?)\b",
    re.IGNORECASE,
)
# Personal tragedies and election content are real AI incidents but not security telemetry; keep them out.
# Each item links to the original report (any https URL), as the database records it.
EXCLUDE = re.compile(r"\b(suicide|self-harm|died|death|wrongful death|election\w*|elecciones|politic\w*|midterm\w*|republican\w*|democrat\w*|attack ad|PAC|senator|candidate\w*)\b", re.IGNORECASE)
TAG = re.compile(r"<[^>]+>")

_lock = threading.Lock()
_cache: dict = {"at": 0.0, "items": None, "fetched_at": None}


def _download(url: str = FEED_URL) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "CipherMesh/2 (+https://ciphermesh-console.vercel.app)"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:  # noqa: S310 - fixed https URL
        data = resp.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("feed too large")
    return data


def _clean(text: str | None, limit: int) -> str:
    value = html.unescape(TAG.sub(" ", text or ""))
    value = re.sub(r"\s+", " ", value).strip()
    return value if len(value) <= limit else value[: limit - 1].rstrip() + "…"


def parse(xml_bytes: bytes) -> list[dict]:
    head = xml_bytes[:4096].upper()
    if b"<!DOCTYPE" in head or b"<!ENTITY" in xml_bytes.upper():
        raise ValueError("DTDs are not accepted")
    root = ET.fromstring(xml_bytes)
    items: list[dict] = []
    for node in root.iter("item"):
        title = _clean(node.findtext("title"), 180)
        summary = _clean(node.findtext("description"), 260)
        link = (node.findtext("link") or "").strip()
        if not title or not link.startswith("https://") or len(link) > 600:
            continue
        blob = f"{title} {summary}"
        if not SECURITY.search(blob) or EXCLUDE.search(blob):
            continue
        published = None
        raw = node.findtext("pubDate")
        if raw:
            try:
                published = parsedate_to_datetime(raw).date().isoformat()
            except (TypeError, ValueError):
                published = None
        items.append({"title": title, "link": link, "published": published, "summary": summary})
        if len(items) >= MAX_ITEMS:
            break
    return items


def get_live(download: Callable[[], bytes] = _download, now: Callable[[], float] = time.time) -> dict:
    with _lock:
        fresh = _cache["items"] is not None and now() - _cache["at"] < TTL_S
        if fresh:
            return _payload(True, _cache["items"], _cache["fetched_at"], cached=True)
    try:
        items = parse(download())
    except Exception:  # upstream down, slow, or malformed: serve the last good copy if there is one
        with _lock:
            if _cache["items"] is not None:
                return _payload(True, _cache["items"], _cache["fetched_at"], cached=True, stale=True)
        return _payload(False, [], None)
    stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now()))
    with _lock:
        _cache.update(at=now(), items=items, fetched_at=stamp)
    return _payload(True, items, stamp)


def reset_cache() -> None:
    with _lock:
        _cache.update(at=0.0, items=None, fetched_at=None)


def _payload(available: bool, items: list[dict], fetched_at: str | None, cached: bool = False, stale: bool = False) -> dict:
    return {"available": available, "source": "AI Incident Database", "source_url": SOURCE_URL, "fetched_at": fetched_at,
            "cached": cached, "stale": stale, "items": items}

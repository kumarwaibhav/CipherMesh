import pytest

from app.api import threat_feed

RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>AIID</title>
<item><title>Chatbot vendor leaks 2M chat logs and API keys</title>
<description>&lt;p&gt;An exposed database held prompts &amp;amp; keys.&lt;/p&gt;</description>
<link>https://incidentdatabase.ai/cite/9001/</link><pubDate>Sat, 24 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>Image model draws extra fingers</title><description>Quality issue.</description>
<link>https://incidentdatabase.ai/cite/9002/</link><pubDate>Sat, 24 Oct 2026 09:00:00 GMT</pubDate></item>
<item><title>Family sues over chatbot after death of teenager</title><description>Lawsuit and attack on safety.</description>
<link>https://incidentdatabase.ai/cite/9003/</link></item>
<item><title>Prompt injection hijacks email agent</title><description>Researchers exfiltrate data.</description>
<link>javascript:alert(1)</link></item>
<item><title>Prompt injection hijacks coding agent</title><description>Researchers exfiltrate secrets.</description>
<link>https://incidentdatabase.ai/cite/9004/</link><pubDate>not a date</pubDate></item>
</channel></rss>"""


@pytest.fixture(autouse=True)
def _fresh_cache():
    threat_feed.reset_cache()
    yield
    threat_feed.reset_cache()


def test_parse_keeps_only_security_items_from_the_source_domain():
    items = threat_feed.parse(RSS)
    assert [i["link"] for i in items] == ["https://incidentdatabase.ai/cite/9001/", "https://incidentdatabase.ai/cite/9004/"]
    assert items[0]["published"] == "2026-10-24"
    assert items[0]["summary"] == "An exposed database held prompts & keys."
    assert items[1]["published"] is None


def test_parse_refuses_entity_declarations():
    evil = b'<?xml version="1.0"?><!DOCTYPE r [<!ENTITY a "aaaa">]><rss><channel></channel></rss>'
    with pytest.raises(ValueError):
        threat_feed.parse(evil)


def test_live_feed_caches_and_serves_stale_copy_when_upstream_fails():
    clock = [1000.0]
    calls = []

    def ok():
        calls.append(1)
        return RSS

    first = threat_feed.get_live(download=ok, now=lambda: clock[0])
    assert first["available"] and len(first["items"]) == 2 and not first["cached"]
    second = threat_feed.get_live(download=ok, now=lambda: clock[0] + 60)
    assert second["cached"] and len(calls) == 1

    def down():
        raise TimeoutError("upstream slow")

    clock[0] += threat_feed.TTL_S + 1
    stale = threat_feed.get_live(download=down, now=lambda: clock[0])
    assert stale["available"] and stale["stale"] and len(stale["items"]) == 2


def test_live_feed_reports_unavailable_without_any_copy():
    def down():
        raise OSError("no network")

    payload = threat_feed.get_live(download=down)
    assert payload == {"available": False, "source": "AI Incident Database", "source_url": threat_feed.SOURCE_URL,
                       "fetched_at": None, "cached": False, "stale": False, "items": []}


def test_threats_endpoint_shape(client, monkeypatch):
    monkeypatch.setattr(threat_feed, "_download", lambda url=threat_feed.FEED_URL: RSS)
    monkeypatch.setattr(threat_feed.get_live, "__defaults__", (lambda: RSS, threat_feed.time.time))
    body = client.get("/api/v1/threats/live").json()
    assert body["available"] is True
    assert body["items"][0]["title"].startswith("Chatbot vendor leaks")


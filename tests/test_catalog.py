import json
import threading
from contextlib import contextmanager
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from podcast_words.cli import main


@contextmanager
def feed_server(routes):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            status, headers, body = routes[self.path]
            self.send_response(status)
            for name, value in headers.items():
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def rss(*items):
    return (f'<rss version="2.0"><channel>{"".join(items)}</channel></rss>').encode()


def item(guid, title, audio="https://audio.example/episode.mp3", extra=""):
    return (
        f"<item><guid>{guid}</guid><title>{title}</title>"
        "<pubDate>Fri, 16 Oct 2026 12:00:00 GMT</pubDate>"
        f'<enclosure url="{audio}" type="audio/mpeg" length="12345"/>'
        f"{extra}</item>"
    )


def command(capsys, *arguments):
    status = main(["catalog", *map(str, arguments)])
    return status, json.loads(capsys.readouterr().out)


def test_import_follows_redirect_and_preserves_all_titles_and_source_snapshot(tmp_path, capsys):
    feed = rss(
        item("guid-81", "UGO081 Freestyle Karate"),
        item("guid-special", "UFO Experiment (KI-generiert)"),
        item("guid-1", "UFO001 Prolog"),
    )
    catalog = tmp_path / "catalog.json"
    with feed_server(
        {
            "/redirect": (302, {"Location": "/feed"}, b""),
            "/feed": (200, {"Content-Type": "application/rss+xml"}, feed),
        }
    ) as host:
        status, imported = command(
            capsys, "import", "--feed", host + "/redirect", "--catalog", catalog
        )
        assert status == 0
        assert imported["added"] == 3
        status, data = command(capsys, "show", "--catalog", catalog)
        assert status == 0
        assert data["podcast_id"] == "podcast-ufo"
        assert [entry["title"] for entry in data["episodes"]] == [
            "UGO081 Freestyle Karate",
            "UFO Experiment (KI-generiert)",
            "UFO001 Prolog",
        ]
        assert [entry["episode_number"] for entry in data["episodes"]] == [81, None, 1]
        assert [entry["source"]["guid"] for entry in data["episodes"]] == [
            "guid-81",
            "guid-special",
            "guid-1",
        ]
        assert len({entry["episode_id"] for entry in data["episodes"]}) == 3
        assert all(entry["source_status"] == "feed-listed" for entry in data["episodes"])
        assert all(entry["processing_status"] == "not-processed" for entry in data["episodes"])
        snapshot = data["snapshots"][0]
        assert snapshot["requested_url"] == host + "/redirect"
        assert snapshot["resolved_url"] == host + "/feed"
        assert snapshot["item_count"] == 3
        assert datetime.fromisoformat(snapshot["fetched_at"].replace("Z", "+00:00")).tzinfo
        assert (tmp_path / snapshot["path"]).read_bytes() == feed


def test_reimport_preserves_identity_and_completed_transcript_without_metadata_merges(
    tmp_path, capsys
):
    catalog = tmp_path / "catalog.json"
    routes = {
        "/feed": (200, {}, rss(item("first", "UFO001 Original"), item("second", "UFO002 Shared")))
    }
    with feed_server(routes) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
        _, original = command(capsys, "show", "--catalog", catalog)
        first_id, second_id = [entry["episode_id"] for entry in original["episodes"]]
        original["episodes"][0]["processing_status"] = "completed"
        catalog.write_text(json.dumps(original), encoding="utf-8")
        transcript = tmp_path / "episodes" / f"{first_id}.json"
        transcript.parent.mkdir()
        recognized = b'{"segments":[{"text":"Original recognition", "start_seconds":12}]}'
        transcript.write_bytes(recognized)
        routes["/feed"] = (
            200,
            {},
            rss(
                item("first", "UFO999 Renamed", "https://audio.example/new.mp3"),
                item("third", "UFO002 Shared"),
            ),
        )
        status, imported = command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)
        assert status == 0
        assert (imported["added"], imported["updated"], imported["retained"]) == (1, 1, 1)
        _, saved = command(capsys, "show", "--catalog", catalog)
        by_guid = {entry["source"]["guid"]: entry for entry in saved["episodes"]}
        assert by_guid["first"]["episode_id"] == first_id
        assert by_guid["first"]["title"] == "UFO999 Renamed"
        assert by_guid["first"]["processing_status"] == "completed"
        assert by_guid["second"]["episode_id"] == second_id
        assert by_guid["second"]["source_status"] == "feed-omitted"
        assert by_guid["second"]["audio_availability"] == "unknown"
        assert by_guid["third"]["episode_id"] not in {first_id, second_id}
        assert transcript.read_bytes() == recognized
        assert len(saved["snapshots"]) == 2


@pytest.mark.parametrize(
    ("bad_items", "code", "indices"),
    [
        ([item("same", "First"), item("same", "Second")], "duplicate-guid", [1, 2]),
        ([item("bad", "Bad", "not-an-http-url")], "malformed-enclosure", [1]),
        (
            [item("bad", "Bad").replace('type="audio/mpeg"', 'type="text/html"')],
            "malformed-enclosure",
            [1],
        ),
        ([item("bad", "Bad").replace('length="12345"', 'length="-1"')], "malformed-enclosure", [1]),
        (["<item><guid>bad</guid><title>No enclosure</title></item>"], "malformed-enclosure", [1]),
    ],
)
def test_bad_feed_is_actionable_and_preserved_without_replacing_catalog(
    tmp_path, capsys, bad_items, code, indices
):
    catalog = tmp_path / "catalog.json"
    routes = {"/feed": (200, {}, rss(item("valid", "Original")))}
    with feed_server(routes) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
        before = catalog.read_bytes()
        rejected = rss(*bad_items)
        routes["/feed"] = (200, {}, rejected)
        status, result = command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)
        assert status == 1
        assert result["ok"] is False
        matching = [finding for finding in result["findings"] if finding["code"] == code]
        assert [finding["item_index"] for finding in matching] == indices
        assert all(finding["message"] for finding in matching)
        assert result["snapshot"]["item_count"] == len(bad_items)
        assert (tmp_path / result["snapshot"]["path"]).read_bytes() == rejected
        assert (
            json.loads((tmp_path / result["report_path"]).read_text())["findings"]
            == result["findings"]
        )
        assert catalog.read_bytes() == before


def test_known_source_gap_is_distinct_from_unprocessed_available_audio(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    with feed_server({"/feed": (200, {}, rss(item("available", "Available")))}) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
    source = tmp_path / "gap.json"
    source.write_text(
        json.dumps(
            {
                "source_key": "historical-episode-37",
                "title": "UFO037 (Quelle ungeklärt)",
                "episode_number": 37,
                "reference_url": "https://archive.example/historical-reference",
                "evidence": "Historical page returns HTML; downloadable episode audio not verified.",
            }
        ),
        encoding="utf-8",
    )
    status, added = command(capsys, "add-source", "--catalog", catalog, "--source", source)
    assert status == 0
    assert added["episode_id"]
    _, saved = command(capsys, "show", "--catalog", catalog)
    available, gap = saved["episodes"]
    assert available["source_status"] == "feed-listed"
    assert available["enclosures"]
    assert gap["source_status"] == "source-gap"
    assert gap["audio_availability"] == "unavailable"
    assert available["audio_availability"] == "unverified"
    assert gap["enclosures"] == []
    assert gap["source"]["key"] == "historical-episode-37"
    assert gap["source"]["guid"] is None
    assert gap["processing_status"] == available["processing_status"] == "not-processed"
    assert gap["source_evidence"][0]["note"].startswith("Historical page returns HTML")


@pytest.mark.parametrize(
    ("media_type", "body", "expected_status"),
    [
        ("audio/mpeg", b"ID3\x04\x00\x00" + b"x" * 100, 0),
        ("text/html", b"<html>Playback wrapper</html>", 1),
        ("audio/mpeg", b"<html>Mislabeled wrapper</html>", 1),
    ],
)
def test_supplement_requires_retrievable_audio_bytes(
    tmp_path, capsys, media_type, body, expected_status
):
    catalog = tmp_path / "catalog.json"
    with feed_server(
        {
            "/feed": (200, {}, rss(item("existing", "Existing"))),
            "/audio": (200, {"Content-Type": media_type}, body),
        }
    ) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
        before = catalog.read_bytes()
        source = tmp_path / "supplement.json"
        source.write_text(
            json.dumps(
                {
                    "source_key": "verified-historical",
                    "title": "Historische Folge",
                    "reference_url": host + "/reference",
                    "audio_url": host + "/audio",
                    "published_at": "2015-11-01T12:00:00Z",
                    "evidence": "Publisher recording and episode identity manually checked.",
                }
            ),
            encoding="utf-8",
        )
        status, result = command(capsys, "add-source", "--catalog", catalog, "--source", source)
        assert status == expected_status
        if expected_status:
            assert "audio" in result["error"].lower()
            assert catalog.read_bytes() == before
        else:
            _, saved = command(capsys, "show", "--catalog", catalog)
            entry = saved["episodes"][-1]
            assert entry["source_status"] == "verified-supplemental"
            assert entry["audio_availability"] == "retrievable"
            assert entry["processing_status"] == "not-processed"
            assert entry["enclosures"][0]["url"] == host + "/audio"
            assert entry["audio_probe"]["bytes_checked"] == len(body)
            assert entry["audio_probe"]["resolved_url"] == host + "/audio"


def test_later_guid_requires_explicit_identity_evidence_and_preserves_supplement_id(
    tmp_path, capsys
):
    catalog = tmp_path / "catalog.json"
    routes = {"/feed": (200, {}, rss(item("existing", "Existing")))}
    with feed_server(routes) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
        source = tmp_path / "gap.json"
        source.write_text(
            json.dumps(
                {
                    "source_key": "historical-37",
                    "title": "UFO037",
                    "reference_url": "https://publisher.example/historical-37",
                    "evidence": "Download not yet verified",
                }
            )
        )
        _, added = command(capsys, "add-source", "--catalog", catalog, "--source", source)
        original_id = added["episode_id"]
        status, result = command(
            capsys,
            "alias",
            "--catalog",
            catalog,
            "--episode-id",
            original_id,
            "--guid",
            "later-guid",
            "--evidence",
            "Publisher identity verified against recording.",
        )
        assert status == 1
        assert "verified-identity" in result["error"]
        status, result = command(
            capsys,
            "alias",
            "--catalog",
            catalog,
            "--episode-id",
            original_id,
            "--guid",
            "later-guid",
            "--evidence",
            "Publisher identity verified against recording.",
            "--verified-identity",
        )
        assert status == 0
        routes["/feed"] = (200, {}, rss(item("later-guid", "UFO037 Updated publisher title")))
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
        _, saved = command(capsys, "show", "--catalog", catalog)
        assert len(saved["episodes"]) == 2
        recovered = saved["episodes"][1]
        assert recovered["episode_id"] == original_id
        assert recovered["source"]["kind"] == "supplemental"
        assert recovered["source"]["key"] == "historical-37"
        assert recovered["source"]["guid_aliases"] == ["later-guid"]
        assert recovered["source_status"] == "feed-listed"
        assert recovered["title"] == "UFO037 Updated publisher title"
        assert recovered["identity_verifications"][0]["guid"] == "later-guid"
        assert recovered["identity_verifications"][0]["note"].startswith(
            "Publisher identity verified"
        )


def test_repeated_supplement_updates_existing_source_and_alias_conflicts_are_rejected(
    tmp_path, capsys
):
    catalog = tmp_path / "catalog.json"
    with feed_server({"/feed": (200, {}, rss(item("taken-guid", "Existing")))}) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
    source = tmp_path / "gap.json"
    source.write_text(
        json.dumps(
            {
                "source_key": "historic-37",
                "title": "UFO037",
                "reference_url": "https://publisher.example/37",
                "evidence": "Unverified audio",
            }
        )
    )
    _, first = command(capsys, "add-source", "--catalog", catalog, "--source", source)
    _, second = command(capsys, "add-source", "--catalog", catalog, "--source", source)
    assert first["episode_id"] == second["episode_id"]
    _, saved = command(capsys, "show", "--catalog", catalog)
    assert len(saved["episodes"]) == 2
    before = catalog.read_bytes()
    status, result = command(
        capsys,
        "alias",
        "--catalog",
        catalog,
        "--episode-id",
        first["episode_id"],
        "--guid",
        "taken-guid",
        "--verified-identity",
        "--evidence",
        "Conflict must be explicit",
    )
    assert status == 1
    assert "already belongs" in result["error"]
    assert catalog.read_bytes() == before


@pytest.mark.parametrize("defect", ["duplicate-id", "duplicate-guid", "unverified-alias"])
def test_catalog_show_rejects_ambiguous_or_unverified_saved_identity(tmp_path, capsys, defect):
    catalog = tmp_path / "catalog.json"
    with feed_server(
        {"/feed": (200, {}, rss(item("first", "First"), item("second", "Second")))}
    ) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
    _, data = command(capsys, "show", "--catalog", catalog)
    if defect == "duplicate-id":
        data["episodes"][1]["episode_id"] = data["episodes"][0]["episode_id"]
    elif defect == "duplicate-guid":
        data["episodes"][1]["source"]["guid"] = "first"
    else:
        data["episodes"][0]["source"]["guid_aliases"] = ["unverified-later"]
    catalog.write_text(json.dumps(data), encoding="utf-8")
    status, result = command(capsys, "show", "--catalog", catalog)
    assert status == 1
    assert "identity" in result["error"].lower()


def test_public_catalog_schema_matches_versioned_export(tmp_path, capsys):
    output = tmp_path / "catalog.schema.json"
    status, result = command(capsys, "schema", "--output", output)
    assert status == 0
    assert result["ok"] is True
    published = Path(__file__).parents[1] / "schemas" / "catalog-v1.schema.json"
    assert json.loads(output.read_text(encoding="utf-8")) == json.loads(
        published.read_text(encoding="utf-8")
    )


@pytest.mark.parametrize(
    "bad_feed",
    [
        b"<html><body>Temporarily unavailable</body></html>",
        b"<rss><channel><item>",
        rss(item("guid", "No GUID").replace("<guid>guid</guid>", "")),
        rss(
            item("guid", "No date").replace("<pubDate>Fri, 16 Oct 2026 12:00:00 GMT</pubDate>", "")
        ),
    ],
)
def test_unusable_feed_never_turns_known_catalog_into_an_empty_inventory(
    tmp_path, capsys, bad_feed
):
    catalog = tmp_path / "catalog.json"
    routes = {"/feed": (200, {}, rss(item("original", "Original")))}
    with feed_server(routes) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
        before = catalog.read_bytes()
        routes["/feed"] = (200, {}, bad_feed)
        status, result = command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)
        assert status == 1
        assert result["findings"]
        assert (tmp_path / result["snapshot"]["path"]).read_bytes() == bad_feed
        assert catalog.read_bytes() == before


def test_feed_cannot_silently_overwrite_one_episode_through_two_verified_guids(tmp_path, capsys):
    catalog = tmp_path / "catalog.json"
    routes = {"/feed": (200, {}, rss(item("original", "Original")))}
    with feed_server(routes) as host:
        assert command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)[0] == 0
        _, saved = command(capsys, "show", "--catalog", catalog)
        identity = saved["episodes"][0]["episode_id"]
        assert (
            command(
                capsys,
                "alias",
                "--catalog",
                catalog,
                "--episode-id",
                identity,
                "--guid",
                "later",
                "--verified-identity",
                "--evidence",
                "Verified migration",
            )[0]
            == 0
        )
        before = catalog.read_bytes()
        routes["/feed"] = (200, {}, rss(item("original", "Original"), item("later", "Later")))
        status, result = command(capsys, "import", "--feed", host + "/feed", "--catalog", catalog)
        assert status == 1
        assert result["findings"][0]["code"] == "duplicate-episode-identity"
        assert catalog.read_bytes() == before

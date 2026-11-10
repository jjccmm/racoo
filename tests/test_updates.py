"""Configured updates cross the real RSS/audio/filesystem CLI boundaries."""

import json

import onnxruntime
import pytest
from asr_fixtures import audio_server, install_external_recognizer, wave_bytes
from test_catalog import feed_server, item, rss
from test_processing import make_catalog

from podcast_words import transcribe
from podcast_words.catalog import Catalog
from podcast_words.cli import main
from podcast_words.podcasts import read_configuration


def configuration(path, feed="https://example.org/feed"):
    data = {
        "schema_version": 1,
        "podcasts": [
            {
                "id": "fixture-podcast",
                "name": "Fixture Podcast",
                "speakers": ["Test speaker"],
                "cover": "images/podcast-ufo.jpg",
                "feed_url": feed,
                "directory": "data/fixture-podcast",
            }
        ],
    }
    path.write_text(json.dumps(data), encoding="utf-8")
    return data


@pytest.fixture
def model_boundary(monkeypatch, tmp_path):
    monkeypatch.setattr(transcribe, "prepare_runtime", lambda _: None)
    monkeypatch.setattr(
        onnxruntime,
        "get_available_providers",
        lambda: ["CUDAExecutionProvider", "CPUExecutionProvider"],
    )
    install_external_recognizer(monkeypatch, tmp_path)


@pytest.mark.parametrize("defect", ["duplicate", "traversal", "absolute", "nested"])
def test_configuration_rejects_ambiguous_or_escaping_paths(tmp_path, defect):
    path = tmp_path / "podcasts.json"
    data = configuration(path)
    second = {**data["podcasts"][0], "id": "second", "directory": "data/second"}
    if defect == "duplicate":
        second["id"] = "fixture-podcast"
    elif defect == "traversal":
        second["directory"] = "../outside"
    elif defect == "absolute":
        second["directory"] = "C:/outside"
    else:
        second["directory"] = "data/fixture-podcast/nested"
    data["podcasts"].append(second)
    path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(ValueError):
        read_configuration(path)


def test_pending_limit_resume_order_and_unprocessable_entries(tmp_path, capsys, model_boundary):
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    with audio_server(wave_bytes()) as (url, response):
        make_catalog(catalog_path, url)
        catalog = Catalog.model_validate_json(catalog_path.read_bytes())
        blocked = catalog.episodes[0].model_copy(deep=True)
        blocked.episode_id = "undated"
        blocked.source.key = blocked.source.guid = "undated-guid"
        blocked.published_at = None
        catalog.episodes.append(blocked)
        catalog_path.write_text(catalog.model_dump_json(), encoding="utf-8")
        args = [
            "process",
            "--catalog",
            str(catalog_path),
            "--output-dir",
            str(output),
            "--cache-dir",
            str(tmp_path / "cache"),
            "--pending",
            "--limit",
            "1",
        ]
        assert main([*args, "--order", "newest"]) == 0
        first = json.loads(capsys.readouterr().out)
        assert first["selected"] == ["episode-two"]
        assert first["unprocessable"][0]["episode_id"] == "undated"
        original = (output / "episode-two.json").read_bytes()
        assert main(args) == 0
        assert json.loads(capsys.readouterr().out)["selected"] == ["episode-one"]
        catalog = Catalog.model_validate_json(catalog_path.read_bytes())
        catalog.episodes[0].processing_status = "processing"
        catalog_path.write_text(catalog.model_dump_json(), encoding="utf-8")
        assert main(args) == 0
        resumed = json.loads(capsys.readouterr().out)
        assert resumed["selected"] == []
        assert resumed["reconciled"] == ["episode-one"]
        assert response["requests"] == 2
        assert (output / "episode-two.json").read_bytes() == original
        before = catalog_path.read_bytes()
        assert main([*args[:-1], "0"]) == 1
        assert json.loads(capsys.readouterr().out)["ok"] is False
        assert catalog_path.read_bytes() == before


def test_update_imports_processes_and_resumes_without_nlp(
    tmp_path, capsys, model_boundary, monkeypatch
):
    import sys

    monkeypatch.setitem(sys.modules, "spacy", None)
    config = tmp_path / "podcasts.json"
    with audio_server(wave_bytes()) as (url, response):
        body = rss(item("first", "First", url), item("second", "Second", url))
        with feed_server({"/feed": (200, {"Content-Type": "application/rss+xml"}, body)}) as host:
            configuration(config, host + "/feed")
            args = [
                "update",
                "--config",
                str(config),
                "--podcast",
                "fixture-podcast",
                "--limit",
                "1",
                "--cache-dir",
                str(tmp_path / "cache"),
            ]
            assert main(args) == 0
            first = json.loads(capsys.readouterr().out)
            assert first["feed"]["added"] == 2
            assert len(first["processing"]["selected"]) == 1
            assert first["searchable_episode_count"] == 1
            assert "analysis" not in first
            assert main(args) == 0
            assert json.loads(capsys.readouterr().out)["searchable_episode_count"] == 2
            directory = tmp_path / "data/fixture-podcast"
            before = {p.name: p.read_bytes() for p in (directory / "episodes").glob("*.json")}
            assert main(args) == 0
            resumed = json.loads(capsys.readouterr().out)
            assert resumed["processing"]["selected"] == []
            assert response["requests"] == 2
            assert not (directory / "analyses").exists()
            assert (
                main(["prepare-site", "--config", str(config), "--output", str(tmp_path / "site")])
                == 0
            )
            site = json.loads(capsys.readouterr().out)
            assert site["podcasts"][0]["episodeCount"] == 2
            assert site["podcasts"][0]["knownEpisodeCount"] == 2
            assert site["podcasts"][0]["lastCheckedAt"]
            assert before == {
                p.name: p.read_bytes() for p in (directory / "episodes").glob("*.json")
            }
            assert not list((tmp_path / "cache").rglob("*.wav"))
            assert not list((tmp_path / "cache").rglob("*.mp3"))


def test_update_feed_failure_stops_before_processing(tmp_path, capsys, model_boundary):
    config = tmp_path / "podcasts.json"
    with feed_server({"/bad": (200, {}, b"<html>failure</html>")}) as host:
        configuration(config, host + "/bad")
        assert main(["update", "--config", str(config), "--podcast", "fixture-podcast"]) == 1
        report = json.loads(capsys.readouterr().out)
        assert report["feed"]["ok"] is False
        assert "processing" not in report
        assert not (tmp_path / "data/fixture-podcast/catalog.json").exists()


def test_pending_download_failure_limits_attempted_episodes_and_retries(
    tmp_path, capsys, model_boundary
):
    catalog_path = tmp_path / "catalog.json"
    output = tmp_path / "episodes"
    with audio_server(wave_bytes(), status=500) as (url, response):
        make_catalog(catalog_path, url)
        args = [
            "process",
            "--catalog",
            str(catalog_path),
            "--output-dir",
            str(output),
            "--pending",
            "--limit",
            "1",
            "--cache-dir",
            str(tmp_path / "cache"),
        ]
        assert main(args) == 1
        failed = json.loads(capsys.readouterr().out)
        assert failed["selected"] == ["episode-one"]
        assert failed["results"][0]["status"] == "failed"
        assert not (output / "episode-two.json").exists()
        response["status"] = 200
        assert main(args) == 0
        assert json.loads(capsys.readouterr().out)["selected"] == ["episode-one"]
        assert not (output / "episode-two.json").exists()

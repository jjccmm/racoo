"""The public analysis command with controlled output from the external NLP model."""

import hashlib
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from podcast_words.cli import main

FIXTURE = Path(__file__).parent / "fixtures" / "synthetic-episode.json"


def test_analysis_schema_export_stays_synchronized(capsys):
    assert main(["schema", "--kind", "analysis"]) == 0
    saved = Path(__file__).parents[1] / "schemas" / "analysis-v1.schema.json"
    assert json.loads(capsys.readouterr().out) == json.loads(saved.read_text(encoding="utf-8"))


def prepare(tmp_path):
    first = json.loads(FIXTURE.read_text(encoding="utf-8"))
    first["segments"] = [first["segments"][0]]
    first["segments"][0]["text"] = "Die Hunde laufen. Ein Hund läuft! " + "Hund " * 256
    second = json.loads(json.dumps(first))
    second["episode_id"] = "synthetic-empty"
    second["title"] = "Nur Satzzeichen"
    second["segments"][0]["text"] = "123 !!!"
    for name, data in [("first.json", first), ("second.json", second)]:
        (tmp_path / name).write_text(json.dumps(data), encoding="utf-8")
    corpus = tmp_path / "episodes.json"
    corpus.write_text('["first.json", "second.json"]', encoding="utf-8")
    return corpus


def external_model(monkeypatch):
    def token(lemma, stop=False, alpha=True):
        return SimpleNamespace(lemma_=lemma, is_stop=stop, is_alpha=alpha)

    def nlp(text):
        if text == "123 !!!":
            return [token("123", alpha=False), token("!", alpha=False)]
        return [
            token("der", True),
            token("Hund"),
            token("laufen"),
            token(".", alpha=False),
            token("ein", True),
            token("Hund"),
            token("laufen"),
            token("!", alpha=False),
            *[token("Hund") for _ in range(256)],
        ]

    nlp.meta = {"version": "3.8.0"}
    monkeypatch.setitem(
        sys.modules, "spacy", SimpleNamespace(__version__="3.8.16", load=lambda _: nlp)
    )


def test_command_counts_lowercase_lemmas_stopwords_and_large_values(tmp_path, monkeypatch, capsys):
    corpus = prepare(tmp_path)
    external_model(monkeypatch)
    output, publication = tmp_path / "analyses", tmp_path / "public"
    original = (tmp_path / "first.json").read_bytes()
    assert (
        main(
            [
                "analyze",
                "--episodes",
                str(corpus),
                "--output",
                str(output),
                "--publish",
                str(publication),
            ]
        )
        == 0
    )
    report = json.loads(capsys.readouterr().out)
    assert report["computed"] == ["synthetic-episode-001", "synthetic-empty"]
    saved = json.loads((output / "synthetic-episode-001.json").read_text(encoding="utf-8"))
    assert saved["total_words"] == 262
    assert saved["lemmas"] == {
        "der": {"count": 1, "stopword": True},
        "hund": {"count": 258, "stopword": False},
        "laufen": {"count": 2, "stopword": False},
        "ein": {"count": 1, "stopword": True},
    }
    assert (tmp_path / "first.json").read_bytes() == original
    assert len(list((publication / "counts").glob("*.json"))) == 64
    vocabulary = json.loads((publication / "vocabulary.json").read_text(encoding="utf-8"))
    assert [item["lemma"] for item in vocabulary["words"]] == ["hund", "laufen"]
    assert all(
        not {"der", "ein"}.intersection(json.loads(path.read_bytes())["counts"])
        for path in (publication / "counts").glob("*.json")
    )
    word = next(item for item in vocabulary["words"] if item["lemma"] == "hund")
    shard = json.loads((publication / word["shard"]).read_text(encoding="utf-8"))
    assert shard["schemaVersion"] == vocabulary["schemaVersion"] == 2
    assert shard["counts"]["hund"] == [[1, 258]]
    catalog = json.loads((publication / "catalog.json").read_text(encoding="utf-8"))
    assert [episode["totalWords"] for episode in catalog["episodes"]] == [0, 262]
    for episode in catalog["episodes"]:
        assert episode["durationSeconds"] == 90
        assert episode["timings"] == {
            "downloadSeconds": 0.25,
            "transcriptionSeconds": 1.5,
            "totalSeconds": 2.0,
        }


def test_publication_reports_chronological_vocabulary_and_is_input_order_independent(
    tmp_path, capsys
):
    source = json.loads(FIXTURE.read_text(encoding="utf-8"))
    text = "Bekannter Prüftext."
    lemmas = {
        "a-frueh": {
            "der": {"count": 1, "stopword": False},
            "hund": {"count": 2, "stopword": False},
        },
        "b-gleich": {
            "der": {"count": 1, "stopword": True},
            "hund": {"count": 1, "stopword": False},
            "katze": {"count": 1, "stopword": False},
        },
        "c-spaeter": {
            "hund": {"count": 1, "stopword": False},
            "katze": {"count": 2, "stopword": False},
        },
        "d-null": {},
    }
    corpus_paths = []
    digest = hashlib.sha256(
        json.dumps([text], sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    for episode_id, counts in lemmas.items():
        episode = json.loads(json.dumps(source))
        episode.update(
            episode_id=episode_id,
            title=episode_id,
            published_at=(
                "2024-01-01T12:00:00Z" if episode_id != "c-spaeter" else "2024-01-02T12:00:00Z"
            ),
            segments=[{**episode["segments"][0], "text": text}],
        )
        (tmp_path / f"{episode_id}.json").write_text(json.dumps(episode), encoding="utf-8")
        (tmp_path / "analyses" / f"{episode_id}.json").parent.mkdir(parents=True, exist_ok=True)
        analysis = {
            "schema_version": 1,
            "podcast_id": episode["podcast_id"],
            "episode_id": episode_id,
            "input_sha256": digest,
            "settings": {
                "analysis_version": "1",
                "spacy_version": "3.8.16",
                "model_name": "de_core_news_lg",
                "model_version": "3.8.0",
            },
            "total_words": sum(item["count"] for item in counts.values()),
            "lemmas": counts,
        }
        (tmp_path / "analyses" / f"{episode_id}.json").write_text(
            json.dumps(analysis), encoding="utf-8"
        )
        corpus_paths.append(f'"{episode_id}.json"')

    def publish_in(order, name):
        corpus = tmp_path / f"{name}.json"
        corpus.write_text("[" + ",".join(order) + "]", encoding="utf-8")
        publication = tmp_path / name
        assert (
            main(
                [
                    "analyze",
                    "--episodes",
                    str(corpus),
                    "--output",
                    str(tmp_path / "analyses"),
                    "--cache-only",
                    "--publish",
                    str(publication),
                ]
            )
            == 0
        )
        capsys.readouterr()
        return publication

    first = publish_in(corpus_paths, "first")
    second = publish_in(list(reversed(corpus_paths)), "second")
    catalog = json.loads((first / "catalog.json").read_text(encoding="utf-8"))
    assert catalog["summary"] == {
        "episodeCount": 4,
        "totalWords": 9,
        "distinctWords": 3,
        "newWords": 3,
    }
    assert [
        (item["episodeId"], item["totalWords"], item["distinctWords"], item["newWords"])
        for item in catalog["episodes"]
    ] == [
        ("a-frueh", 3, 2, 2),
        ("b-gleich", 3, 3, 1),
        ("d-null", 0, 0, 0),
        ("c-spaeter", 3, 2, 0),
    ]
    assert (first / "catalog.json").read_bytes() == (second / "catalog.json").read_bytes()
    vocabulary = json.loads((first / "vocabulary.json").read_bytes())
    assert [word["lemma"] for word in vocabulary["words"]] == ["hund", "katze"]
    assert all(
        "der" not in json.loads(path.read_bytes())["counts"]
        for path in (first / "counts").glob("*.json")
    )
    dog = next(word for word in vocabulary["words"] if word["lemma"] == "hund")
    assert json.loads((first / dog["shard"]).read_bytes())["counts"]["hund"] == [
        [0, 2],
        [1, 1],
        [3, 1],
    ]
    assert (first / dog["shard"]).read_bytes() == (second / dog["shard"]).read_bytes()
    assert (
        json.loads((first / "manifest.json").read_text(encoding="utf-8"))["publicationId"]
        == (json.loads((second / "manifest.json").read_text(encoding="utf-8"))["publicationId"])
    )


def test_command_reuses_consumed_inputs_and_invalidates_settings_without_touching_transcripts(
    tmp_path, monkeypatch, capsys
):
    corpus = prepare(tmp_path)
    external_model(monkeypatch)
    output, publication = tmp_path / "analyses", tmp_path / "public"
    command = [
        "analyze",
        "--episodes",
        str(corpus),
        "--output",
        str(output),
        "--publish",
        str(publication),
    ]
    assert main(command) == 0
    capsys.readouterr()
    saved = (output / "synthetic-episode-001.json").read_bytes()
    source = tmp_path / "first.json"
    episode = json.loads(source.read_text(encoding="utf-8"))
    episode["title"] = "Geänderter Titel"
    source.write_text(json.dumps(episode), encoding="utf-8")
    # No external NLP package is available: neither cached builds nor metadata edits need it.
    monkeypatch.setitem(sys.modules, "spacy", None)
    assert main([*command, "--cache-only"]) == 0
    assert json.loads(capsys.readouterr().out)["computed"] == []
    assert (output / "synthetic-episode-001.json").read_bytes() == saved
    assert "Geänderter Titel" in (publication / "catalog.json").read_text(encoding="utf-8")
    assert main([*command, "--cache-only", "--analysis-version", "2"]) == 1
    assert "stale analysis" in json.loads(capsys.readouterr().out)["error"]
    external_model(monkeypatch)
    original = source.read_bytes()
    assert main([*command, "--analysis-version", "2"]) == 0
    assert json.loads(capsys.readouterr().out)["computed"] == [
        "synthetic-episode-001",
        "synthetic-empty",
    ]
    assert source.read_bytes() == original
    episode["segments"][0]["text"] = "123 !!!"
    source.write_text(json.dumps(episode), encoding="utf-8")
    assert main([*command, "--analysis-version", "2"]) == 0
    assert json.loads(capsys.readouterr().out) == {
        "ok": True,
        "computed": ["synthetic-episode-001"],
        "reused": ["synthetic-empty"],
    }
    assert json.loads((output / "synthetic-episode-001.json").read_text())["total_words"] == 0


def test_publishing_rejects_counts_that_cannot_be_represented_exactly_in_the_browser(
    tmp_path, monkeypatch, capsys
):
    corpus = prepare(tmp_path)
    external_model(monkeypatch)
    output = tmp_path / "analyses"
    command = ["analyze", "--episodes", str(corpus), "--output", str(output)]
    assert main(command) == 0
    capsys.readouterr()
    saved = output / "synthetic-episode-001.json"
    analysis = json.loads(saved.read_bytes())
    analysis["lemmas"] = {"hund": {"count": 9007199254740992, "stopword": False}}
    analysis["total_words"] = 9007199254740992
    saved.write_text(json.dumps(analysis), encoding="utf-8")
    monkeypatch.setitem(sys.modules, "spacy", None)
    publication = tmp_path / "public"
    assert main([*command, "--cache-only", "--publish", str(publication)]) == 1
    assert "safe integer" in json.loads(capsys.readouterr().out)["error"]
    assert not publication.exists()


def test_manual_exclusions_republish_saved_analyses_with_normalized_policy_identity(
    tmp_path, monkeypatch, capsys
):
    corpus = prepare(tmp_path)
    external_model(monkeypatch)
    output, publication = tmp_path / "analyses", tmp_path / "public"
    command = [
        "analyze",
        "--episodes",
        str(corpus),
        "--output",
        str(output),
        "--publish",
        str(publication),
    ]
    assert main(command) == 0
    capsys.readouterr()
    original_analysis = (output / "synthetic-episode-001.json").read_bytes()
    original_episode = (tmp_path / "first.json").read_bytes()
    original_catalog = json.loads((publication / "catalog.json").read_bytes())
    monkeypatch.setitem(sys.modules, "spacy", None)
    ignored = tmp_path / "ignored.txt"
    ignored.write_text("# Operator additions\n HUND \nhund\nMu\u0308nze\n", encoding="utf-8-sig")
    cached = [*command, "--cache-only", "--ignored-lemmas", str(ignored)]
    assert main(cached) == 0
    assert json.loads(capsys.readouterr().out)["computed"] == []
    vocabulary = json.loads((publication / "vocabulary.json").read_bytes())
    assert [word["lemma"] for word in vocabulary["words"]] == ["laufen"]
    first_id = vocabulary["publicationId"]
    assert all(
        "hund" not in json.loads(path.read_bytes())["counts"]
        for path in (publication / "counts").glob("*.json")
    )
    catalog = json.loads((publication / "catalog.json").read_bytes())
    assert catalog["summary"] == original_catalog["summary"]
    assert catalog["episodes"] == original_catalog["episodes"]
    ignored.write_text("m\u00fcnze\nhund\n# Same effective list\n", encoding="utf-8")
    assert main(cached) == 0
    capsys.readouterr()
    assert json.loads((publication / "manifest.json").read_bytes())["publicationId"] == first_id
    ignored.write_text("m\u00fcnze\nhund\nkatze\n", encoding="utf-8")
    assert main(cached) == 0
    capsys.readouterr()
    changed = json.loads((publication / "vocabulary.json").read_bytes())
    assert changed["publicationId"] != first_id
    assert changed["words"] == vocabulary["words"]
    assert (output / "synthetic-episode-001.json").read_bytes() == original_analysis
    assert (tmp_path / "first.json").read_bytes() == original_episode


def test_default_published_exclusions_remove_fillers_but_keep_complete_analysis(
    tmp_path, monkeypatch, capsys
):
    corpus = prepare(tmp_path)

    def nlp(text):
        if text == "123 !!!":
            return []
        return [
            SimpleNamespace(lemma_=lemma, is_stop=stop, is_alpha=True)
            for lemma, stop in [("ÄH", False), ("ähm", False), ("Hund", False), ("der", True)]
        ]

    nlp.meta = {"version": "3.8.0"}
    monkeypatch.setitem(
        sys.modules, "spacy", SimpleNamespace(__version__="3.8.16", load=lambda _: nlp)
    )
    output, publication = tmp_path / "analyses", tmp_path / "public"
    assert (
        main(
            [
                "analyze",
                "--episodes",
                str(corpus),
                "--output",
                str(output),
                "--publish",
                str(publication),
            ]
        )
        == 0
    )
    capsys.readouterr()
    saved = json.loads((output / "synthetic-episode-001.json").read_bytes())
    assert saved["total_words"] == 4
    assert saved["lemmas"]["äh"] == {"count": 1, "stopword": False}
    assert saved["lemmas"]["ähm"] == {"count": 1, "stopword": False}
    assert json.loads((publication / "catalog.json").read_bytes())["summary"] == {
        "episodeCount": 2,
        "totalWords": 4,
        "distinctWords": 4,
        "newWords": 4,
    }
    assert [
        word["lemma"]
        for word in json.loads((publication / "vocabulary.json").read_bytes())["words"]
    ] == ["hund"]
    assert json.loads((publication / "manifest.json").read_bytes())["frequencyExclusions"] == {
        "automaticStopwords": "union-of-selected-analysis-flags",
        "ignoredLemmas": ["äh", "ähm"],
    }


@pytest.mark.parametrize("entry", ["two words", "123", "word # comment", "bad-word"])
def test_analyze_rejects_nonlemma_entries_with_path_and_line(tmp_path, capsys, entry):
    ignored = tmp_path / "ignored.txt"
    ignored.write_text(f"# Additions\n{entry}\n", encoding="utf-8")
    assert (
        main(
            [
                "analyze",
                "--episodes",
                str(Path(__file__).parent / "fixtures/search-corpus.json"),
                "--output",
                str(Path(__file__).parent / "fixtures/analysis"),
                "--cache-only",
                "--publish",
                str(tmp_path / "public"),
                "--ignored-lemmas",
                str(ignored),
            ]
        )
        == 1
    )
    assert f"{ignored}:2:" in json.loads(capsys.readouterr().out)["error"]
    assert not (tmp_path / "public").exists()

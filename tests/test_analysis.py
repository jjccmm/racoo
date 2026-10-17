"""The public analysis command with controlled output from the external NLP model."""

import json
import sys
from pathlib import Path
from types import SimpleNamespace

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
    word = next(item for item in vocabulary["words"] if item["lemma"] == "hund")
    shard = json.loads((publication / word["shard"]).read_text(encoding="utf-8"))
    assert shard["counts"]["hund"] == [["synthetic-episode-001", 258]]
    catalog = json.loads((publication / "catalog.json").read_text(encoding="utf-8"))
    assert [episode["totalWords"] for episode in catalog["episodes"]] == [0, 262]


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

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from podcast_words.cli import main
from podcast_words.contracts import Episode

FIXTURE = Path(__file__).parent / "fixtures" / "synthetic-episode.json"


def fixture_data() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def validate(data: dict) -> Episode:
    return Episode.model_validate_json(json.dumps(data))


def test_valid_episode_retains_absolute_times_across_pause():
    episode = validate(fixture_data())
    assert episode.segments[1].start_seconds == 60
    assert episode.audio.duration_seconds == 90


@pytest.mark.parametrize("defect", ["overlap", "outside_audio", "duplicate_id", "reversed"])
def test_invalid_segment_boundaries_are_rejected(defect):
    data = fixture_data()
    first, second = data["segments"]
    if defect == "overlap":
        second["start_seconds"] = 14
    elif defect == "outside_audio":
        second["end_seconds"] = 91
    elif defect == "duplicate_id":
        second["id"] = first["id"]
    else:
        second["end_seconds"] = 59
    with pytest.raises(ValidationError):
        validate(data)


@pytest.mark.parametrize("time", [-1, float("inf"), float("nan")])
def test_invalid_processing_timings_are_rejected(time):
    data = fixture_data()
    data["timings"]["transcription_seconds"] = time
    with pytest.raises(ValidationError):
        validate(data)


@pytest.mark.parametrize(
    "defect", ["missing_guid", "duplicate_alias", "missing_revision", "naive_date"]
)
def test_incomplete_or_ambiguous_provenance_is_rejected(defect):
    data = fixture_data()
    if defect == "missing_guid":
        data["source"]["kind"] = "rss"
    elif defect == "duplicate_alias":
        data["source"]["guid_aliases"] = ["same-guid", "same-guid"]
    elif defect == "missing_revision":
        del data["transcription"]["model_revision"]
    else:
        data["published_at"] = "2026-10-16T12:00:00"
    with pytest.raises(ValidationError):
        validate(data)


def test_cli_reports_invalid_files_and_continues(tmp_path, capsys):
    invalid = tmp_path / "invalid.json"
    invalid.write_text('{"schema_version": 99}', encoding="utf-8")
    assert main(["validate", str(invalid), str(FIXTURE)]) == 1
    results = json.loads(capsys.readouterr().out)
    assert [result["ok"] for result in results] == [False, True]


def test_published_structural_schema_matches_python_contract():
    schema = Path(__file__).parents[1] / "schemas" / "episode-v2.schema.json"
    assert json.loads(schema.read_text(encoding="utf-8")) == Episode.model_json_schema()

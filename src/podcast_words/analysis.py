"""Versioned exact lemma analyses and sparse static publication artifacts."""

import argparse
import hashlib
import json
from pathlib import Path
from typing import Annotated, Literal, Self

from pydantic import Field, StringConstraints, model_validator

from podcast_words.contracts import Contract, Episode, Identifier, Text
from podcast_words.json_io import write_json

SPACY_VERSION = "3.8.16"
MODEL_NAME = "de_core_news_lg"
MODEL_VERSION = "3.8.0"
ANALYSIS_VERSION = "1"
SHA256 = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]


class Settings(Contract):
    analysis_version: Text = ANALYSIS_VERSION
    spacy_version: Literal["3.8.16"] = SPACY_VERSION
    model_name: Literal["de_core_news_lg"] = MODEL_NAME
    model_version: Literal["3.8.0"] = MODEL_VERSION


class LemmaCount(Contract):
    count: Annotated[int, Field(gt=0)]
    stopword: bool


class Analysis(Contract):
    schema_version: Literal[1] = 1
    podcast_id: Identifier
    episode_id: Identifier
    input_sha256: SHA256
    settings: Settings
    total_words: Annotated[int, Field(ge=0)]
    lemmas: dict[Text, LemmaCount]

    @model_validator(mode="after")
    def check_counts(self) -> Self:
        if sum(item.count for item in self.lemmas.values()) != self.total_words:
            raise ValueError("Lemma counts must sum to total_words")
        if any(lemma != lemma.lower() for lemma in self.lemmas):
            raise ValueError("Lemmas must be lowercase")
        return self


def encoded(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()


def consumed_input(episode: Episode) -> str:
    # Metadata, times and ASR provenance are not consumed by lemma counting.
    return hashlib.sha256(encoded([segment.text for segment in episode.segments])).hexdigest()


def load_model():
    try:
        import spacy
    except ImportError as error:
        raise ValueError(
            "Install the pinned analysis extra and German model; see docs/analysis.md"
        ) from error
    if spacy.__version__ != SPACY_VERSION:
        raise ValueError(f"Expected spaCy {SPACY_VERSION}, found {spacy.__version__}")
    model = spacy.load(MODEL_NAME)
    if model.meta.get("version") != MODEL_VERSION:
        raise ValueError(f"Expected {MODEL_NAME} {MODEL_VERSION}")
    return model


def publish(directory: Path, episodes: list[Episode], analyses: dict[str, Analysis]) -> None:
    ordered = sorted(episodes, key=lambda episode: (episode.published_at, episode.episode_id))
    words: dict[str, dict] = {}
    shards: list[dict[str, list]] = [{} for _ in range(64)]
    catalog = []
    seen_lemmas: set[str] = set()
    for episode_index, episode in enumerate(ordered):
        analysis = analyses[episode.episode_id]
        new_words = set(analysis.lemmas) - seen_lemmas
        seen_lemmas.update(analysis.lemmas)
        catalog.append(
            {
                "episodeId": episode.episode_id,
                "title": episode.title,
                "publishedAt": episode.published_at.isoformat(),
                "durationSeconds": episode.audio.duration_seconds,
                "timings": {
                    "downloadSeconds": episode.timings.download_seconds,
                    "transcriptionSeconds": episode.timings.transcription_seconds,
                    "totalSeconds": episode.timings.total_seconds,
                },
                "totalWords": analysis.total_words,
                "distinctWords": len(analysis.lemmas),
                "newWords": len(new_words),
            }
        )
        for lemma, item in sorted(analysis.lemmas.items()):
            if item.count > 9_007_199_254_740_991:
                raise ValueError(
                    f"Count for {lemma} in {episode.episode_id} exceeds a safe integer"
                )
            shard = int(hashlib.sha256(lemma.encode()).hexdigest(), 16) % 64
            entry = words.setdefault(
                lemma,
                {
                    "lemma": lemma,
                    "stopword": False,
                    "totalCount": 0,
                    "shard": f"counts/{shard:02d}.json",
                },
            )
            entry["stopword"] = entry["stopword"] or item.stopword
            entry["totalCount"] += item.count
            shards[shard].setdefault(lemma, []).append([episode_index, item.count])
    vocabulary = sorted(words.values(), key=lambda item: item["lemma"])
    publication_id = hashlib.sha256(
        encoded(
            {
                "schemaVersion": 2,
                "catalog": catalog,
                "vocabulary": vocabulary,
                "shards": shards,
                "analyses": [
                    analyses[episode.episode_id].model_dump(mode="json") for episode in ordered
                ],
            }
        )
    ).hexdigest()
    envelope = {"schemaVersion": 2, "publicationId": publication_id}
    write_json(
        directory / "catalog.json",
        {
            **envelope,
            "summary": {
                "episodeCount": len(ordered),
                "totalWords": sum(analysis.total_words for analysis in analyses.values()),
                "distinctWords": len(words),
                "newWords": sum(episode["newWords"] for episode in catalog),
            },
            "episodes": catalog,
        },
        indent=None,
        sort_keys=True,
    )
    write_json(
        directory / "vocabulary.json",
        {**envelope, "words": vocabulary},
        indent=None,
        sort_keys=True,
    )
    for index, counts in enumerate(shards):
        write_json(
            directory / f"counts/{index:02d}.json",
            {**envelope, "counts": counts},
            indent=None,
            sort_keys=True,
        )
    write_json(
        directory / "manifest.json",
        {**envelope, "podcastId": ordered[0].podcast_id},
        indent=None,
        sort_keys=True,
    )


def analyze(arguments: argparse.Namespace) -> dict:
    corpus = json.loads(arguments.episodes.read_text(encoding="utf-8"))
    if (
        not isinstance(corpus, list)
        or not corpus
        or not all(isinstance(path, str) for path in corpus)
    ):
        raise ValueError("Episode corpus must be a nonempty list of relative JSON paths")
    episodes = [
        Episode.model_validate_json((arguments.episodes.parent / path).read_bytes())
        for path in corpus
    ]
    if len({episode.podcast_id for episode in episodes}) != 1:
        raise ValueError("Analyze one podcast at a time")
    if len({episode.episode_id for episode in episodes}) != len(episodes):
        raise ValueError("Duplicate episode identity in analysis corpus")
    settings = Settings(analysis_version=arguments.analysis_version)
    analyses = {}
    reused, computed = [], []
    model = None
    for episode in episodes:
        path = arguments.output / f"{episode.episode_id}.json"
        digest = consumed_input(episode)
        try:
            saved = Analysis.model_validate_json(path.read_bytes())
        except (OSError, ValueError):
            saved = None
        if (
            saved
            and saved.input_sha256 == digest
            and saved.settings == settings
            and saved.episode_id == episode.episode_id
            and saved.podcast_id == episode.podcast_id
        ):
            analyses[episode.episode_id] = saved
            reused.append(episode.episode_id)
            continue
        if arguments.cache_only:
            raise ValueError(
                f"Missing or stale analysis for {episode.episode_id}; run analyze with the pinned model"
            )
        if model is None:
            model = load_model()
        lemmas: dict[str, LemmaCount] = {}
        total = 0
        for segment in episode.segments:
            for token in model(segment.text):
                if not token.is_alpha:
                    continue
                lemma = token.lemma_.lower()
                if not lemma.strip():
                    raise ValueError("Model returned an empty lemma for an alphabetic token")
                total += 1
                if lemma not in lemmas:
                    lemmas[lemma] = LemmaCount(count=1, stopword=bool(token.is_stop))
                else:
                    lemmas[lemma].count += 1
                    lemmas[lemma].stopword |= bool(token.is_stop)
        analysis = Analysis(
            podcast_id=episode.podcast_id,
            episode_id=episode.episode_id,
            input_sha256=digest,
            settings=settings,
            total_words=total,
            lemmas=lemmas,
        )
        write_json(path, analysis.model_dump(mode="json"), indent=None, sort_keys=True)
        analyses[episode.episode_id] = analysis
        computed.append(episode.episode_id)
    if arguments.publish:
        publish(arguments.publish, episodes, analyses)
    return {"ok": True, "computed": computed, "reused": reused}


def add_parser(commands: argparse._SubParsersAction) -> None:
    parser = commands.add_parser(
        "analyze", help="Cache exact German lemma counts and publish static statistics"
    )
    parser.add_argument("--episodes", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--publish", type=Path)
    parser.add_argument("--analysis-version", default=ANALYSIS_VERSION)
    parser.add_argument(
        "--cache-only",
        action="store_true",
        help="Validate/reuse saved analyses without loading NLP",
    )


def run(arguments: argparse.Namespace) -> int:
    try:
        result = analyze(arguments)
    except (OSError, ValueError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1
    print(json.dumps(result, ensure_ascii=True))
    return 0

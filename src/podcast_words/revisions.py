"""Validation and derivation of processing provenance revisions."""

import hashlib
import json

from podcast_words.contracts import Episode

REVISION_FIELDS = ("input_revision", "configuration_revision", "transcript_revision")
RECOGNITION_FIELDS = (
    "model_id",
    "model_revision",
    "export_id",
    "export_revision",
    "configuration",
    "execution_providers",
    "runtime_versions",
)


def digest(value: object) -> str:
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def configuration_fingerprint(episode: Episode) -> str:
    transcription = episode.transcription
    return digest({field: getattr(transcription, field) for field in RECOGNITION_FIELDS})


def validate_completed_episode(episode: Episode) -> tuple[dict[str, str], str | None]:
    """Validate a saved result and return its revisions plus legacy diagnostic, if any."""
    if not episode.segments:
        raise ValueError("completed result must contain at least one recognized segment")

    transcription = episode.transcription
    revisions = [getattr(transcription, name) for name in REVISION_FIELDS]
    if any(revisions) and not all(revisions):
        raise ValueError(
            "processing revision provenance is partial; expected all three revision fields"
        )

    configuration_revision = transcription.configuration_revision or configuration_fingerprint(
        episode
    )
    transcript_revision = digest(
        {
            "segments": [segment.model_dump(mode="json") for segment in episode.segments],
            "audio_sha256": episode.audio.sha256,
            "configuration_revision": configuration_revision,
        }
    )
    if transcription.input_revision and transcription.input_revision != episode.audio.sha256:
        raise ValueError("input_revision does not match the saved audio SHA-256")
    if (
        transcription.transcript_revision
        and transcription.transcript_revision != transcript_revision
    ):
        raise ValueError("transcript_revision does not match the saved transcript and provenance")

    legacy = None if all(revisions) else "complete-without-revision-fields"
    return (
        {
            "input_revision": episode.audio.sha256,
            "configuration_revision": configuration_revision,
            "transcript_revision": transcript_revision,
        },
        legacy,
    )


def processing_configuration(episode: Episode) -> dict:
    transcription = episode.transcription
    return {
        "model_id": transcription.model_id,
        "model_revision": transcription.model_revision,
        "export_id": transcription.export_id,
        "export_revision": transcription.export_revision,
        "configuration": transcription.configuration,
    }


def validate_compatible_processing(episodes: list[Episode]) -> str:
    """Reject one selected corpus that combines different recognition settings."""
    if not episodes:
        raise ValueError("Processing compatibility requires at least one episode")
    configurations = {digest(processing_configuration(episode)) for episode in episodes}
    if len(configurations) != 1:
        raise ValueError("Selected episodes have incompatible transcription configurations")
    return next(iter(configurations))

"""Initial episode contract. All stored times are absolute episode seconds."""

from typing import Annotated, Literal, Self

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    HttpUrl,
    StringConstraints,
    model_validator,
)

Text = Annotated[str, StringConstraints(min_length=1, pattern=r"\S")]
Identifier = Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9_-]{0,127}$")]
Seconds = Annotated[float, Field(ge=0)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Source(Contract):
    kind: Literal["rss", "supplemental", "synthetic"]
    key: Text
    reference_url: HttpUrl
    guid: Text | None = None
    guid_aliases: list[Text] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_identity(self) -> Self:
        if self.kind == "rss" and not self.guid:
            raise ValueError("RSS provenance requires a GUID")
        identities = self.guid_aliases + ([self.guid] if self.guid else [])
        if len(set(identities)) != len(identities):
            raise ValueError("GUIDs and aliases must be unique")
        return self


class Audio(Contract):
    url: HttpUrl
    sha256: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]
    duration_seconds: Annotated[float, Field(gt=0)]


class Transcription(Contract):
    model_id: Text
    model_revision: Text
    export_revision: Text
    processed_at: AwareDatetime
    runtime_versions: Annotated[dict[Text, Text], Field(min_length=1)]
    export_id: Text | None = None
    execution_providers: dict[Text, list[Text]] = Field(default_factory=dict)
    configuration: dict[Text, Text] = Field(default_factory=dict)
    input_revision: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")] | None = None
    configuration_revision: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")] | None = (
        None
    )
    transcript_revision: Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")] | None = None


class TokenPoint(Contract):
    # Native SentencePiece output includes standalone whitespace tokens. Retain
    # them verbatim; token points describe model tokens rather than word spans.
    text: Annotated[str, StringConstraints(min_length=1)]
    at_seconds: Seconds


class Segment(Contract):
    id: Identifier
    text: Text
    start_seconds: Seconds
    end_seconds: Seconds
    token_points: list[TokenPoint] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_times(self) -> Self:
        if self.end_seconds <= self.start_seconds:
            raise ValueError("segment end must be after start")
        previous = self.start_seconds
        for point in self.token_points:
            if not previous <= point.at_seconds <= self.end_seconds:
                raise ValueError("token points must be ordered absolute times within the segment")
            previous = point.at_seconds
        return self


class Episode(Contract):
    schema_version: Literal[1]
    podcast_id: Identifier
    episode_id: Identifier
    source: Source
    title: Text
    published_at: AwareDatetime
    episode_number: Annotated[int, Field(gt=0)] | None = None
    webpage_url: HttpUrl | None = None
    audio: Audio
    transcription: Transcription
    segments: list[Segment]

    @model_validator(mode="after")
    def check_segments(self) -> Self:
        seen: set[str] = set()
        previous_end = 0.0
        for segment in self.segments:
            if segment.id in seen:
                raise ValueError("segment IDs must be unique within an episode")
            if segment.start_seconds < previous_end:
                raise ValueError("segments must be ordered without overlap")
            if segment.end_seconds > self.audio.duration_seconds:
                raise ValueError("segment exceeds the original audio duration")
            seen.add(segment.id)
            previous_end = segment.end_seconds
        return self

"""Versioned podcast settings shared by local updates and static publication."""

import re
from pathlib import Path, PurePosixPath, PureWindowsPath

from pydantic import Field, HttpUrl, field_validator, model_validator

from podcast_words.contracts import Contract, Identifier, Text


class Podcast(Contract):
    id: Identifier
    name: Text
    speakers: list[Text] = Field(min_length=1)
    cover: Text
    feed_url: HttpUrl
    website_url: HttpUrl | None = None
    directory: Text

    @field_validator("cover", "directory")
    @classmethod
    def relative_path(cls, value: str) -> str:
        if (
            "\\" in value
            or ":" in value
            or "?" in value
            or "#" in value
            or PureWindowsPath(value).is_absolute()
            or PurePosixPath(value).is_absolute()
            or any(part in {"..", "."} for part in value.split("/"))
        ):
            raise ValueError("use a relative path without traversal, query or drive")
        return value

    @field_validator("cover")
    @classmethod
    def cover_path(cls, value: str) -> str:
        if not re.fullmatch(r"[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+", value):
            raise ValueError("cover must be a relative image filename with simple path characters")
        return value

    def data_directory(self, configuration: Path) -> Path:
        base = configuration.resolve().parent
        target = (base / self.directory).resolve()
        if not target.is_relative_to(base) or target == base:
            raise ValueError("podcast data directory must remain inside the configuration folder")
        return target


class Podcasts(Contract):
    schema_version: int = 1
    synthetic_fixture: bool = False
    podcasts: list[Podcast] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_podcasts(self):
        if self.schema_version != 1:
            raise ValueError("unsupported podcast configuration version")
        if len({podcast.id for podcast in self.podcasts}) != len(self.podcasts):
            raise ValueError("duplicate podcast ID")
        if len({podcast.directory for podcast in self.podcasts}) != len(self.podcasts):
            raise ValueError("podcasts must use separate data directories")
        return self


def read_configuration(path: Path) -> Podcasts:
    configuration = Podcasts.model_validate_json(path.read_bytes())
    resolved = [podcast.data_directory(path) for podcast in configuration.podcasts]
    if len(set(resolved)) != len(resolved):
        raise ValueError("podcasts must use separate resolved data directories")
    if any(a in b.parents for a in resolved for b in resolved if a != b):
        raise ValueError("podcast data directories must not contain one another")
    return configuration


def configured_podcast(path: Path, identity: str) -> Podcast:
    for podcast in read_configuration(path).podcasts:
        if podcast.id == identity:
            return podcast
    raise ValueError(f"unknown configured podcast: {identity}")

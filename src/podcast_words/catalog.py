"""Dated publisher inventory; catalog updates never write transcript files."""

import argparse
import hashlib
import json
import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Annotated, Literal
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from pydantic import AwareDatetime, Field, HttpUrl, ValidationError, model_validator

from podcast_words.contracts import Contract, Identifier, Source, Text
from podcast_words.json_io import write_json

DEFAULT_FEED = "https://feeds.acast.com/public/shows/podcast-ufo"


class Enclosure(Contract):
    url: HttpUrl
    media_type: Text
    length_bytes: Annotated[int, Field(ge=0)] | None = None

    @model_validator(mode="after")
    def audio_media_type(self):
        if not self.media_type.startswith("audio/") and self.media_type != "application/ogg":
            raise ValueError("enclosure must declare an audio media type")
        return self


class Snapshot(Contract):
    fetched_at: AwareDatetime
    requested_url: HttpUrl
    resolved_url: HttpUrl
    sha256: Text
    path: Text
    item_count: Annotated[int, Field(ge=0)]


class Evidence(Contract):
    checked_at: AwareDatetime
    note: Text


class IdentityVerification(Evidence):
    guid: Text


class SupplementalSource(Contract):
    source_key: Text
    title: Text
    published_at: AwareDatetime | None = None
    episode_number: Annotated[int, Field(gt=0)] | None = None
    reference_url: HttpUrl
    evidence: Text
    audio_url: HttpUrl | None = None


class AudioProbe(Contract):
    checked_at: AwareDatetime
    requested_url: HttpUrl
    resolved_url: HttpUrl
    status_code: int
    media_type: Text
    bytes_checked: Annotated[int, Field(gt=0)]
    prefix_sha256: Text


class CatalogEpisode(Contract):
    episode_id: Identifier
    source: Source
    title: Text
    published_at: AwareDatetime | None = None
    episode_number: Annotated[int, Field(gt=0)] | None = None
    webpage_url: HttpUrl | None = None
    enclosures: list[Enclosure]
    source_status: Literal["feed-listed", "feed-omitted", "verified-supplemental", "source-gap"]
    audio_availability: Literal["unverified", "retrievable", "unknown", "unavailable"] = (
        "unverified"
    )
    processing_status: Literal["not-processed", "processing", "failed", "completed"] = (
        "not-processed"
    )
    source_evidence: list[Evidence] = Field(default_factory=list)
    audio_probe: AudioProbe | None = None
    identity_verifications: list[IdentityVerification] = Field(default_factory=list)


class Catalog(Contract):
    schema_version: Literal[1] = 1
    podcast_id: Identifier
    feed_url: HttpUrl
    snapshots: list[Snapshot] = Field(default_factory=list)
    episodes: list[CatalogEpisode] = Field(default_factory=list)

    @model_validator(mode="after")
    def unambiguous_identity(self):
        episode_ids = set()
        guids = set()
        source_keys = set()
        for entry in self.episodes:
            source_key = (entry.source.kind, entry.source.key)
            if entry.episode_id in episode_ids or source_key in source_keys:
                raise ValueError("catalog identity must have unique episode IDs and source keys")
            episode_ids.add(entry.episode_id)
            source_keys.add(source_key)
            for guid in [entry.source.guid, *entry.source.guid_aliases]:
                if guid is not None:
                    if guid in guids:
                        raise ValueError(
                            "catalog identity cannot assign a GUID to multiple episodes"
                        )
                    guids.add(guid)
            verified = {evidence.guid for evidence in entry.identity_verifications}
            if not set(entry.source.guid_aliases) <= verified:
                raise ValueError("every GUID alias requires recorded identity verification")
        return self


def episode_id(podcast_id: str, kind: str, key: str) -> str:
    digest = hashlib.sha256(f"{podcast_id}\0{kind}\0{key}".encode()).hexdigest()
    return f"ep-{digest[:32]}"


def read_catalog(path: Path) -> Catalog:
    return Catalog.model_validate_json(path.read_bytes())


def probe_audio(url: str) -> AudioProbe:
    request = Request(url, headers={"Range": "bytes=0-65535", "User-Agent": "podcast-words/0.1"})
    with urlopen(request, timeout=30) as response:
        prefix = response.read(65536)
        media_type = response.headers.get_content_type()
        signature = (
            prefix.startswith((b"ID3", b"OggS", b"fLaC"))
            or (prefix.startswith(b"RIFF") and prefix[8:12] == b"WAVE")
            or (len(prefix) > 1 and prefix[0] == 255 and prefix[1] & 224 == 224)
            or (len(prefix) > 8 and prefix[4:8] == b"ftyp")
        )
        if not media_type.startswith("audio/") or not signature:
            raise ValueError(
                f"audio verification failed: {media_type}, no supported audio signature"
            )
        return AudioProbe(
            checked_at=datetime.now(UTC),
            requested_url=url,
            resolved_url=response.url,
            status_code=response.status,
            media_type=media_type,
            bytes_checked=len(prefix),
            prefix_sha256=hashlib.sha256(prefix).hexdigest(),
        )


def add_source(path: Path, source_path: Path) -> dict:
    catalog = read_catalog(path)
    source = SupplementalSource.model_validate_json(source_path.read_bytes())
    audio_probe = probe_audio(str(source.audio_url)) if source.audio_url else None
    entry = CatalogEpisode(
        episode_id=episode_id(catalog.podcast_id, "supplemental", source.source_key),
        source=Source(
            kind="supplemental", key=source.source_key, reference_url=source.reference_url
        ),
        title=source.title,
        published_at=source.published_at,
        episode_number=source.episode_number,
        webpage_url=source.reference_url,
        enclosures=[Enclosure(url=source.audio_url, media_type=audio_probe.media_type)]
        if audio_probe
        else [],
        source_status="verified-supplemental" if audio_probe else "source-gap",
        audio_availability="retrievable" if audio_probe else "unavailable",
        source_evidence=[Evidence(checked_at=datetime.now(UTC), note=source.evidence)],
        audio_probe=audio_probe,
    )
    previous = next(
        (value for value in catalog.episodes if value.episode_id == entry.episode_id), None
    )
    if previous is None:
        catalog.episodes.append(entry)
    else:
        if previous.source.guid_aliases:
            raise ValueError(
                "source has verified GUID aliases; reconcile its metadata through the feed"
            )
        entry.processing_status = previous.processing_status
        entry.source_evidence = [*previous.source_evidence, *entry.source_evidence]
        catalog.episodes[catalog.episodes.index(previous)] = entry
    write_json(path, catalog.model_dump(mode="json"))
    return {"ok": True, "episode_id": entry.episode_id, "source_status": entry.source_status}


def add_alias(path: Path, identity: str, guid: str, evidence: str | None, verified: bool) -> dict:
    if not verified:
        raise ValueError("alias requires --verified-identity after checking the episode identity")
    verification = IdentityVerification(guid=guid, note=evidence, checked_at=datetime.now(UTC))
    catalog = read_catalog(path)
    entry = next((episode for episode in catalog.episodes if episode.episode_id == identity), None)
    if entry is None:
        raise ValueError(f"unknown episode ID: {identity}")
    for episode in catalog.episodes:
        if guid in [episode.source.guid, *episode.source.guid_aliases]:
            if episode.episode_id != identity:
                raise ValueError(
                    f"GUID already belongs to {episode.episode_id}; catalog not changed"
                )
            return {"ok": True, "episode_id": identity, "unchanged": True}
    entry.source.guid_aliases.append(guid)
    entry.identity_verifications.append(verification)
    write_json(path, catalog.model_dump(mode="json"))
    return {"ok": True, "episode_id": identity, "guid_alias": guid}


def parse_items(content: bytes, podcast_id: str, feed_url: str) -> tuple[list, list, int]:
    root = ElementTree.fromstring(content)
    if root.tag != "rss" or root.find("channel") is None:
        raise ValueError("expected an RSS document with a channel; response is not a feed")
    result = []
    findings = []
    elements = root.findall("./channel/item")
    guids = [element.findtext("guid", "").strip() for element in elements]
    for index, element in enumerate(elements, start=1):
        guid = element.findtext("guid", "").strip()
        title = element.findtext("title", "").strip()
        context = {"item_index": index, "guid": guid, "title": title}
        if guid and guids.count(guid) > 1:
            findings.append(
                {
                    **context,
                    "code": "duplicate-guid",
                    "message": "GUID occurs more than once; verify source identity before importing",
                }
            )
        try:
            enclosures = [
                Enclosure(
                    url=enclosure.attrib.get("url", ""),
                    media_type=enclosure.attrib.get("type", ""),
                    length_bytes=int(enclosure.attrib["length"])
                    if enclosure.attrib.get("length")
                    else None,
                )
                for enclosure in element.findall("enclosure")
            ]
            if not enclosures:
                raise ValueError("item has no audio enclosure")
        except (ValueError, ValidationError) as error:
            findings.append({**context, "code": "malformed-enclosure", "message": str(error)})
            continue
        number = re.match(r"^U[FG]O\s*0*(\d+)\b", title, re.IGNORECASE)
        date = element.findtext("pubDate", "")
        try:
            entry = CatalogEpisode(
                episode_id=episode_id(podcast_id, "rss", guid),
                source=Source(kind="rss", key=guid, reference_url=feed_url, guid=guid),
                title=title,
                published_at=parsedate_to_datetime(date),
                episode_number=int(number.group(1)) if number else None,
                webpage_url=element.findtext("link") or None,
                enclosures=enclosures,
                source_status="feed-listed",
            )
        except (ValueError, TypeError) as error:
            findings.append({**context, "code": "malformed-item", "message": str(error)})
        else:
            result.append(entry)
    return result, findings, len(elements)


def import_feed(path: Path, feed_url: str, podcast_id: str) -> dict:
    catalog = (
        read_catalog(path) if path.exists() else Catalog(podcast_id=podcast_id, feed_url=feed_url)
    )
    if catalog.podcast_id != podcast_id:
        raise ValueError("podcast ID does not match the existing catalog")
    request = Request(feed_url, headers={"User-Agent": "podcast-words/0.1"})
    with urlopen(request, timeout=30) as response:
        content = response.read(20 * 1024 * 1024 + 1)
        resolved_url = response.url
    if len(content) > 20 * 1024 * 1024:
        raise ValueError("feed exceeds the 20 MiB input limit")
    fetched_at = datetime.now(UTC)
    digest = hashlib.sha256(content).hexdigest()
    snapshot_path = Path("snapshots") / f"{fetched_at:%Y%m%dT%H%M%S%fZ}-{digest[:12]}.xml"
    destination = path.parent / snapshot_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    try:
        entries, findings, item_count = parse_items(content, podcast_id, resolved_url)
    except (ElementTree.ParseError, ValueError) as error:
        entries, findings, item_count = [], [{"code": "invalid-xml", "message": str(error)}], 0
    snapshot = Snapshot(
        fetched_at=fetched_at,
        requested_url=feed_url,
        resolved_url=resolved_url,
        sha256=digest,
        path=snapshot_path.as_posix(),
        item_count=item_count,
    )
    known = {
        guid: episode
        for episode in catalog.episodes
        for guid in [episode.source.guid, *episode.source.guid_aliases]
        if guid
    }
    assigned = set()
    for index, entry in enumerate(entries, start=1):
        previous = known.get(entry.source.guid)
        identity = previous.episode_id if previous else entry.episode_id
        if identity in assigned and not findings:
            findings.append(
                {
                    "code": "duplicate-episode-identity",
                    "item_index": index,
                    "guid": entry.source.guid,
                    "title": entry.title,
                    "message": f"multiple feed GUIDs resolve to {identity}; verify the publisher migration",
                }
            )
        assigned.add(identity)
    report_path = snapshot_path.with_suffix(".json")
    report = {
        "ok": not findings,
        "snapshot": snapshot.model_dump(mode="json"),
        "findings": findings,
        "report_path": report_path.as_posix(),
    }
    write_json(path.parent / report_path, report)
    if findings:
        return report
    catalog.snapshots.append(snapshot)
    added = updated = 0
    seen = set()
    for entry in entries:
        previous = known.get(entry.source.guid)
        if previous is None:
            catalog.episodes.append(entry)
            added += 1
            seen.add(entry.episode_id)
        else:
            previous.title = entry.title
            previous.published_at = entry.published_at
            previous.episode_number = entry.episode_number
            previous.webpage_url = entry.webpage_url
            previous.enclosures = entry.enclosures
            previous.source_status = "feed-listed"
            if previous.audio_probe and str(previous.audio_probe.requested_url) in {
                str(enclosure.url) for enclosure in entry.enclosures
            }:
                previous.audio_availability = "retrievable"
            else:
                previous.audio_probe = None
                previous.audio_availability = "unverified"
            updated += 1
            seen.add(previous.episode_id)
    retained = 0
    for episode in catalog.episodes:
        if episode.episode_id not in seen and episode.source_status in {
            "feed-listed",
            "feed-omitted",
        }:
            episode.source_status = "feed-omitted"
            episode.audio_availability = "unknown"
            retained += 1
    write_json(path, catalog.model_dump(mode="json"))
    return {
        "ok": True,
        "added": added,
        "updated": updated,
        "retained": retained,
        "snapshot": snapshot.model_dump(mode="json"),
        "findings": [],
        "report_path": report_path.as_posix(),
    }


def add_parser(commands: argparse._SubParsersAction) -> None:
    parser = commands.add_parser("catalog", help="Import and inspect the episode source inventory")
    actions = parser.add_subparsers(dest="catalog_action", required=True)
    importer = actions.add_parser("import", help="Snapshot and reconcile an RSS feed")
    importer.add_argument("--feed", default=DEFAULT_FEED)
    importer.add_argument("--podcast-id", default="podcast-ufo")
    importer.add_argument("--catalog", type=Path, required=True)
    show = actions.add_parser("show", help="Validate and print the complete saved inventory")
    show.add_argument("--catalog", type=Path, required=True)
    supplemental = actions.add_parser(
        "add-source", help="Record a checked supplement or a source gap"
    )
    supplemental.add_argument("--catalog", type=Path, required=True)
    supplemental.add_argument("--source", type=Path, required=True)
    alias = actions.add_parser(
        "alias", help="Add a GUID after explicit source identity verification"
    )
    alias.add_argument("--catalog", type=Path, required=True)
    alias.add_argument("--episode-id", required=True)
    alias.add_argument("--guid", required=True)
    alias.add_argument("--evidence")
    alias.add_argument("--verified-identity", action="store_true")
    schema = actions.add_parser("schema", help="Export the structural catalog JSON Schema")
    schema.add_argument("--output", type=Path, required=True)


def run(arguments: argparse.Namespace) -> int:
    try:
        if arguments.catalog_action == "show":
            result = read_catalog(arguments.catalog).model_dump(mode="json")
        elif arguments.catalog_action == "add-source":
            result = add_source(arguments.catalog, arguments.source)
        elif arguments.catalog_action == "alias":
            result = add_alias(
                arguments.catalog,
                arguments.episode_id,
                arguments.guid,
                arguments.evidence,
                arguments.verified_identity,
            )
        elif arguments.catalog_action == "schema":
            write_json(arguments.output, Catalog.model_json_schema())
            result = {"ok": True, "path": str(arguments.output)}
        else:
            result = import_feed(arguments.catalog, arguments.feed, arguments.podcast_id)
    except (OSError, ValueError, ElementTree.ParseError) as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=True))
        return 1
    print(json.dumps(result, indent=2, ensure_ascii=True))
    return 0 if result.get("ok", True) else 1

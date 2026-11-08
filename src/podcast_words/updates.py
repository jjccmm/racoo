"""The local RSS → bounded FP32 batch → saved word analysis operation."""

import argparse
import json

from podcast_words import analysis
from podcast_words.catalog import Catalog, import_feed
from podcast_words.json_io import require_distinct_output, write_json
from podcast_words.podcasts import configured_podcast
from podcast_words.processing import run_processing
from podcast_words.site import completed_paths


def update(arguments) -> int:
    report = {"ok": False, "podcast_id": arguments.podcast}
    try:
        if arguments.limit <= 0:
            raise ValueError("limit must be positive")
        podcast = configured_podcast(arguments.config, arguments.podcast)
        directory = podcast.data_directory(arguments.config)
        catalog_path = directory / "catalog.json"
        if arguments.run_report:
            require_distinct_output(
                arguments.run_report,
                [arguments.config, catalog_path, *directory.rglob("*.json")],
                label="run report",
            )
        report["feed"] = import_feed(catalog_path, str(podcast.feed_url), podcast.id)
        if not report["feed"]["ok"]:
            print(json.dumps(report, ensure_ascii=True))
            return 1
        status, processing = run_processing(
            argparse.Namespace(
                catalog=catalog_path,
                pending=True,
                episode_id=None,
                output_dir=directory / "episodes",
                cache_dir=arguments.cache_dir,
                limit=arguments.limit,
                order=arguments.order,
                retranscribe=False,
                run_report=arguments.run_report,
            )
        )
        report["processing"] = processing
        if status == 130:
            print(json.dumps(report, ensure_ascii=True))
            return 130
        catalog = Catalog.model_validate_json(catalog_path.read_bytes())
        paths = completed_paths(catalog, directory)
        if paths:
            # The generated selection is not another manually maintained source.
            corpus = arguments.cache_dir / "updates" / podcast.id / "episodes.json"
            write_json(corpus, [str(path) for path in paths])
            report["analysis"] = analysis.analyze(
                argparse.Namespace(
                    episodes=corpus,
                    output=directory / "analyses",
                    publish=None,
                    cache_only=False,
                    analysis_version=analysis.ANALYSIS_VERSION,
                )
            )
        else:
            report["analysis"] = {"ok": True, "computed": [], "reused": []}
        report["ok"] = status == 0
        print(json.dumps(report, indent=2, ensure_ascii=True))
        return status
    except (OSError, ValueError, ImportError, RuntimeError) as error:
        report["error"] = str(error)
        print(json.dumps(report, indent=2, ensure_ascii=True))
        return 1

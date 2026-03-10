"""Load Bronze records into Silver tables with parallel local transform + bulk writes."""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor
from typing import Any, Dict, Iterable, List, Tuple

from .bronze_reader import iter_instagram_jsonl
from .utils import parse_iso_utc

try:
    from tqdm import tqdm
except ImportError:  # pragma: no cover
    tqdm = None


def _canonical_user_id(platform: str, native_user_id: str) -> str:
    return f"{platform}:{native_user_id}"


def _canonical_post_id(platform: str, native_post_id: str) -> str:
    return f"{platform}:{native_post_id}"


def _chunked(items: List[Any], n: int) -> Iterable[List[Any]]:
    if n <= 0:
        yield items
        return
    for i in range(0, len(items), n):
        yield items[i : i + n]


def _transform_post_for_silver(args: Tuple[Dict[str, Any], str]) -> Dict[str, Any]:
    post, platform = args

    native_post_id = post["post_id"]
    user = post.get("user", {})
    native_user_id = user.get("user_id")
    canonical_user_id = _canonical_user_id(platform, native_user_id)
    canonical_post_id = _canonical_post_id(platform, native_post_id)

    published_at = parse_iso_utc(post["timestamp_utc"])
    ingest = post.get("ingestion", {})
    ingest_date = ingest.get("ingest_date_utc")
    ingest_date_ts = parse_iso_utc(ingest_date) if ingest_date else None

    media_type = (post.get("media") or {}).get("media_type") or "image"
    content_type = "video" if media_type == "reel" else "post"

    mentions: List[str] = []
    for m in post.get("mentions", []) or []:
        handle = str(m).strip().lstrip("@")
        if handle:
            mentions.append(handle)

    hashtags: List[Dict[str, Any]] = []
    for pos, raw_tag in enumerate(post.get("hashtags", []) or []):
        raw_clean = str(raw_tag).strip()
        norm = raw_clean.lower()
        if not norm:
            continue
        hashtags.append({"raw": raw_clean, "norm": norm, "position": pos})

    metrics: List[Dict[str, Any]] = []
    snapshots = ((post.get("engagement_observed") or {}).get("snapshots") or [])
    for snap in snapshots:
        t_day = snap.get("t_day")
        if t_day is None:
            continue
        metrics.append(
            {
                "t_day": int(t_day),
                "likes_total": snap.get("likes_total"),
                "comments_total": snap.get("comments_total"),
                "shares_total": snap.get("shares_total"),
                "saves_total": snap.get("saves_total"),
                "views_total": snap.get("views_total"),
            }
        )

    return {
        "canonical_user_id": canonical_user_id,
        "platform": platform,
        "native_user_id": native_user_id,
        "handle": user.get("username"),
        "display_name": user.get("username"),
        "account_type": user.get("account_type"),
        "verified": user.get("verified"),
        "snapshot_date": published_at.date(),
        "followers_count": user.get("follower_count"),
        "canonical_post_id": canonical_post_id,
        "native_post_id": native_post_id,
        "published_at": published_at,
        "content_type": content_type,
        "text": post.get("caption_text"),
        "ingest_batch_id": ingest.get("ingest_batch_id"),
        "ingest_date": ingest_date_ts,
        "mentions": mentions,
        "hashtags": hashtags,
        "metrics": metrics,
    }


def _bulk_executemany(db, sql: str, rows: List[Tuple[Any, ...]], batch_size: int) -> None:
    if not rows:
        return
    for chunk in _chunked(rows, batch_size):
        db.executemany(sql, chunk)


def load_instagram_jsonl(
    db,
    jsonl_path: str,
    platform: str = "instagram",
    start_offset: int = 0,
    limit: int | None = None,
    batch_size: int = 500,
    show_progress: bool = True,
    workers: int = 1,
) -> int:
    selected_posts: List[Dict[str, Any]] = []
    for idx, post in enumerate(iter_instagram_jsonl(jsonl_path)):
        if idx < start_offset:
            continue
        if limit is not None and len(selected_posts) >= limit:
            break
        selected_posts.append(post)

    if not selected_posts:
        return 0

    transformed: List[Dict[str, Any]] = []
    payload = [(p, platform) for p in selected_posts]

    if workers > 1:
        with ProcessPoolExecutor(max_workers=workers) as ex:
            iterator = ex.map(_transform_post_for_silver, payload, chunksize=50)
            if show_progress and tqdm is not None:
                iterator = tqdm(iterator, total=len(payload), desc="transform", unit="post")
            transformed = list(iterator)
    else:
        iterator = (_transform_post_for_silver(x) for x in payload)
        if show_progress and tqdm is not None:
            iterator = tqdm(iterator, total=len(payload), desc="transform", unit="post")
        transformed = list(iterator)

    users: Dict[str, Tuple[Any, ...]] = {}
    snapshots: Dict[Tuple[str, Any], Tuple[Any, ...]] = {}
    posts: Dict[str, Tuple[Any, ...]] = {}
    mentions_set: set[Tuple[str, str]] = set()
    tags_by_norm: Dict[str, str] = {}
    post_tag_refs: List[Tuple[str, str, int]] = []
    metrics: Dict[Tuple[str, int], Tuple[Any, ...]] = {}

    for row in transformed:
        users[row["canonical_user_id"]] = (
            row["canonical_user_id"],
            row["platform"],
            row["native_user_id"],
            row["handle"],
            row["display_name"],
            row["account_type"],
            row["verified"],
        )

        snapshots[(row["canonical_user_id"], row["snapshot_date"])] = (
            row["canonical_user_id"],
            row["snapshot_date"],
            row["followers_count"],
            None,
            None,
            "bronze_instagram",
        )

        posts[row["canonical_post_id"]] = (
            row["canonical_post_id"],
            row["platform"],
            row["native_post_id"],
            row["canonical_user_id"],
            row["published_at"],
            row["content_type"],
            row["text"],
            row["ingest_batch_id"],
            row["ingest_date"],
        )

        for m in row["mentions"]:
            mentions_set.add((row["canonical_post_id"], m))

        for h in row["hashtags"]:
            tags_by_norm[h["norm"]] = h["raw"]
            post_tag_refs.append((row["canonical_post_id"], h["norm"], h["position"]))

        for snap in row["metrics"]:
            metrics[(row["canonical_post_id"], snap["t_day"])] = (
                row["canonical_post_id"],
                snap["t_day"],
                snap.get("likes_total"),
                snap.get("comments_total"),
                snap.get("shares_total"),
                snap.get("saves_total"),
                snap.get("views_total"),
            )

    _bulk_executemany(
        db,
        """
        INSERT INTO sl_users (
          canonical_user_id, platform, native_user_id, handle, display_name,
          account_type, verified, first_seen_at, last_seen_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, now(), now())
        ON CONFLICT (canonical_user_id) DO UPDATE
        SET handle = EXCLUDED.handle,
            display_name = COALESCE(EXCLUDED.display_name, sl_users.display_name),
            account_type = COALESCE(EXCLUDED.account_type, sl_users.account_type),
            verified = COALESCE(EXCLUDED.verified, sl_users.verified),
            last_seen_at = now()
        """,
        list(users.values()),
        batch_size,
    )

    _bulk_executemany(
        db,
        """
        INSERT INTO sl_user_snapshots (
          canonical_user_id, snapshot_date, followers_count, following_count, posts_count, snapshot_source
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (canonical_user_id, snapshot_date) DO UPDATE
        SET followers_count = EXCLUDED.followers_count,
            following_count = COALESCE(EXCLUDED.following_count, sl_user_snapshots.following_count),
            posts_count = COALESCE(EXCLUDED.posts_count, sl_user_snapshots.posts_count),
            snapshot_source = EXCLUDED.snapshot_source
        """,
        list(snapshots.values()),
        batch_size,
    )

    _bulk_executemany(
        db,
        """
        INSERT INTO sl_posts (
          canonical_post_id, platform, native_post_id, canonical_user_id,
          published_at, content_type, text, ingest_batch_id, ingest_date
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (canonical_post_id) DO UPDATE
        SET canonical_user_id = EXCLUDED.canonical_user_id,
            published_at = EXCLUDED.published_at,
            content_type = EXCLUDED.content_type,
            text = EXCLUDED.text,
            ingest_batch_id = EXCLUDED.ingest_batch_id,
            ingest_date = COALESCE(EXCLUDED.ingest_date, sl_posts.ingest_date)
        """,
        list(posts.values()),
        batch_size,
    )

    _bulk_executemany(
        db,
        """
        INSERT INTO sl_post_mentions (canonical_post_id, mentioned_handle)
        VALUES (%s, %s)
        ON CONFLICT (canonical_post_id, mentioned_handle) DO NOTHING
        """,
        list(mentions_set),
        batch_size,
    )

    tag_rows = [(raw, raw) for _, raw in tags_by_norm.items()]
    _bulk_executemany(
        db,
        """
        INSERT INTO sl_tags (tag_type, tag, tag_norm, script)
        VALUES ('hashtag', %s, normalize_tag(%s), NULL)
        ON CONFLICT (tag_type, tag_norm)
        DO UPDATE SET tag = EXCLUDED.tag
        """,
        tag_rows,
        batch_size,
    )

    tag_id_by_norm: Dict[str, int] = {}
    norms = list(tags_by_norm.keys())
    for norm_chunk in _chunked(norms, batch_size):
        rows = db.fetchall(
            """
            SELECT tag_id, tag_norm
            FROM sl_tags
            WHERE tag_type = 'hashtag'
              AND tag_norm = ANY(%s)
            """,
            (norm_chunk,),
        )
        for r in rows:
            tag_id_by_norm[r["tag_norm"]] = r["tag_id"]

    post_tag_rows: List[Tuple[Any, ...]] = []
    for canonical_post_id, norm, pos in post_tag_refs:
        tag_id = tag_id_by_norm.get(norm)
        if tag_id is None:
            continue
        post_tag_rows.append((canonical_post_id, tag_id, pos))

    _bulk_executemany(
        db,
        """
        INSERT INTO sl_post_tags (canonical_post_id, tag_id, position)
        VALUES (%s, %s, %s)
        ON CONFLICT (canonical_post_id, tag_id)
        DO UPDATE SET position = EXCLUDED.position
        """,
        post_tag_rows,
        batch_size,
    )

    _bulk_executemany(
        db,
        """
        INSERT INTO sl_post_metrics_ts (
          canonical_post_id, metric_time_type, t_day, asof_date,
          likes_total, comments_total, shares_total, saves_total,
          views_total, reposts_total
        )
        VALUES (%s, 'age_day', %s, NULL, %s, %s, %s, %s, %s, NULL)
        ON CONFLICT (canonical_post_id, metric_time_type, metric_time_key)
        DO UPDATE SET likes_total = EXCLUDED.likes_total,
                      comments_total = EXCLUDED.comments_total,
                      shares_total = EXCLUDED.shares_total,
                      saves_total = EXCLUDED.saves_total,
                      views_total = EXCLUDED.views_total,
                      collected_at = now()
        """,
        list(metrics.values()),
        batch_size,
    )

    db.commit()
    return len(transformed)

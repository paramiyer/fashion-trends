"""Gold trend aggregation and user ranking."""

from __future__ import annotations


def _horizon_to_day(horizon: str) -> int:
    if horizon == "d30":
        return 30
    return 7


def compute_horizon_metrics(db, run_id: str, horizon: str = "d7") -> None:
    t_day = _horizon_to_day(horizon)
    db.execute(
        """
        INSERT INTO gl_post_metrics_horizon (
          canonical_post_id, run_id, horizon_type,
          likes, comments, shares, saves, views,
          followers_at_post, engagement_score
        )
        SELECT
          p.canonical_post_id,
          %s AS run_id,
          %s AS horizon_type,
          m.likes_total,
          m.comments_total,
          m.shares_total,
          m.saves_total,
          m.views_total,
          fs.followers_count AS followers_at_post,
          CASE
            WHEN fs.followers_count IS NULL OR fs.followers_count <= 0 THEN NULL
            ELSE (
              (COALESCE(m.likes_total, 0)::double precision)
              + (2.0 * COALESCE(m.shares_total, 0)::double precision)
              + (1.5 * COALESCE(m.comments_total, 0)::double precision)
            ) / fs.followers_count::double precision
          END AS engagement_score
        FROM gl_post_predictions gp
        JOIN sl_posts p ON p.canonical_post_id = gp.canonical_post_id
        LEFT JOIN sl_post_metrics_ts m
               ON m.canonical_post_id = p.canonical_post_id
              AND m.metric_time_type = 'age_day'
              AND m.t_day = %s
        LEFT JOIN LATERAL (
          SELECT s.followers_count
          FROM sl_user_snapshots s
          WHERE s.canonical_user_id = p.canonical_user_id
            AND s.snapshot_date <= DATE(p.published_at)
          ORDER BY s.snapshot_date DESC
          LIMIT 1
        ) fs ON TRUE
        WHERE gp.run_id = %s
        ON CONFLICT (canonical_post_id, run_id, horizon_type)
        DO UPDATE SET likes = EXCLUDED.likes,
                      comments = EXCLUDED.comments,
                      shares = EXCLUDED.shares,
                      saves = EXCLUDED.saves,
                      views = EXCLUDED.views,
                      followers_at_post = EXCLUDED.followers_at_post,
                      engagement_score = EXCLUDED.engagement_score,
                      created_at = now()
        """,
        (run_id, horizon, t_day, run_id),
    )


def build_trends_by_category(db, run_id: str, method: str = "category_group") -> None:
    db.execute(
        """
        INSERT INTO gl_trend_clusters (run_id, cluster_method, label_hint)
        SELECT DISTINCT %s, %s, gp.category
        FROM gl_post_predictions gp
        WHERE gp.run_id = %s
          AND gp.pred_is_fashion = TRUE
          AND gp.category IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM gl_trend_clusters tc
            WHERE tc.run_id = %s
              AND tc.cluster_method = %s
              AND tc.label_hint = gp.category
          )
        """,
        (run_id, method, run_id, run_id, method),
    )

    db.execute(
        """
        WITH cluster_map AS (
          SELECT DISTINCT ON (label_hint)
                 label_hint AS category,
                 cluster_id
          FROM gl_trend_clusters
          WHERE run_id = %s
            AND cluster_method = %s
          ORDER BY label_hint, created_at, cluster_id
        )
        INSERT INTO gl_post_cluster_membership (run_id, cluster_id, canonical_post_id, score)
        SELECT
          %s,
          cm.cluster_id,
          gp.canonical_post_id,
          1.0
        FROM gl_post_predictions gp
        JOIN cluster_map cm ON cm.category = gp.category
        WHERE gp.run_id = %s
          AND gp.pred_is_fashion = TRUE
          AND gp.category IS NOT NULL
        ON CONFLICT (run_id, cluster_id, canonical_post_id)
        DO UPDATE SET score = EXCLUDED.score
        """,
        (run_id, method, run_id, run_id),
    )


def aggregate_daily_trends(db, run_id: str, share_threshold: float = 1000.0, breakout_z: float = 2.5) -> None:
    db.execute(
        """
        WITH daily AS (
          SELECT
            %s::text AS run_id,
            DATE(p.published_at) AS date_utc,
            m.cluster_id,
            p.platform,
            NULL::text AS region,
            COUNT(*)::int AS post_count,
            COUNT(DISTINCT p.canonical_user_id)::int AS unique_authors,
            COALESCE(SUM(h.engagement_score), 0)::double precision AS engagement_score_sum,
            COALESCE(AVG(h.engagement_score), 0)::double precision AS engagement_score_avg,
            COALESCE(SUM(h.shares), 0)::bigint AS shares_sum
          FROM gl_post_cluster_membership m
          JOIN sl_posts p ON p.canonical_post_id = m.canonical_post_id
          LEFT JOIN gl_post_metrics_horizon h
                 ON h.canonical_post_id = m.canonical_post_id
                AND h.run_id = m.run_id
                AND h.horizon_type = 'd7'
          WHERE m.run_id = %s
          GROUP BY DATE(p.published_at), m.cluster_id, p.platform
        ),
        scored AS (
          SELECT
            d.*,
            COALESCE(
              d.shares_sum - LAG(d.shares_sum) OVER (
                PARTITION BY d.cluster_id, d.platform
                ORDER BY d.date_utc
              ),
              0
            )::double precision AS velocity_7d,
            AVG(d.shares_sum::double precision) OVER (
              PARTITION BY d.cluster_id, d.platform
              ORDER BY d.date_utc
              ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING
            ) AS mean_prev14,
            STDDEV_POP(d.shares_sum::double precision) OVER (
              PARTITION BY d.cluster_id, d.platform
              ORDER BY d.date_utc
              ROWS BETWEEN 14 PRECEDING AND 1 PRECEDING
            ) AS std_prev14
          FROM daily d
        ),
        with_breakout AS (
          SELECT
            s.*,
            COALESCE(
              s.velocity_7d - LAG(s.velocity_7d) OVER (
                PARTITION BY s.cluster_id, s.platform
                ORDER BY s.date_utc
              ),
              0
            )::double precision AS acceleration_7d,
            CASE
              WHEN s.std_prev14 IS NULL OR s.std_prev14 = 0 THEN 0::double precision
              ELSE (s.shares_sum::double precision - s.mean_prev14) / s.std_prev14
            END AS breakout_score
          FROM scored s
        ),
        flagged AS (
          SELECT
            wb.*,
            (wb.shares_sum >= %s OR wb.breakout_score >= %s) AS threshold_hit
          FROM with_breakout wb
        ),
        streaked AS (
          SELECT
            f.*,
            SUM(CASE WHEN f.threshold_hit THEN 0 ELSE 1 END) OVER (
              PARTITION BY f.cluster_id, f.platform
              ORDER BY f.date_utc
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS streak_group
          FROM flagged f
        ),
        with_streak AS (
          SELECT
            s.*,
            CASE
              WHEN s.threshold_hit THEN
                ROW_NUMBER() OVER (
                  PARTITION BY s.cluster_id, s.platform, s.streak_group
                  ORDER BY s.date_utc
                )
              ELSE 0
            END AS breakout_streak
          FROM streaked s
        ),
        final_scored AS (
          SELECT
            ws.*,
            MAX(ws.breakout_streak) OVER (
              PARTITION BY ws.cluster_id, ws.platform
              ORDER BY ws.date_utc
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS longest_breakout_streak
          FROM with_streak ws
        )
        INSERT INTO gl_trend_daily_metrics (
          run_id, date_utc, cluster_id, platform, region,
          post_count, unique_authors,
          engagement_score_sum, engagement_score_avg,
          shares_sum, velocity_7d, acceleration_7d,
          breakout_score, threshold_hit, breakout_streak, longest_breakout_streak
        )
        SELECT
          fs.run_id,
          fs.date_utc,
          fs.cluster_id,
          fs.platform,
          fs.region,
          fs.post_count,
          fs.unique_authors,
          fs.engagement_score_sum,
          fs.engagement_score_avg,
          fs.shares_sum,
          fs.velocity_7d,
          fs.acceleration_7d,
          fs.breakout_score,
          fs.threshold_hit,
          fs.breakout_streak,
          fs.longest_breakout_streak
        FROM final_scored fs
        ON CONFLICT (run_id, date_utc, cluster_id, platform_key, region_key)
        DO UPDATE SET post_count = EXCLUDED.post_count,
                      unique_authors = EXCLUDED.unique_authors,
                      engagement_score_sum = EXCLUDED.engagement_score_sum,
                      engagement_score_avg = EXCLUDED.engagement_score_avg,
                      shares_sum = EXCLUDED.shares_sum,
                      velocity_7d = EXCLUDED.velocity_7d,
                      acceleration_7d = EXCLUDED.acceleration_7d,
                      breakout_score = EXCLUDED.breakout_score,
                      threshold_hit = EXCLUDED.threshold_hit,
                      breakout_streak = EXCLUDED.breakout_streak,
                      longest_breakout_streak = EXCLUDED.longest_breakout_streak,
                      created_at = now()
        """,
        (run_id, run_id, share_threshold, breakout_z),
    )


def rank_users_daily(db, run_id: str) -> None:
    db.execute(
        """
        WITH daily AS (
          SELECT
            %s::text AS run_id,
            DATE(p.published_at) AS date_utc,
            p.canonical_user_id,
            COUNT(*)::int AS posts_count,
            COALESCE(SUM(h.engagement_score), 0)::double precision AS engagement_score_sum,
            COALESCE(AVG(h.engagement_score), 0)::double precision AS avg_engagement_score,
            COALESCE(MAX(fs.followers_count), 0)::int AS followers_est
          FROM gl_post_predictions gp
          JOIN sl_posts p ON p.canonical_post_id = gp.canonical_post_id
          LEFT JOIN gl_post_metrics_horizon h
                 ON h.canonical_post_id = gp.canonical_post_id
                AND h.run_id = gp.run_id
                AND h.horizon_type = 'd7'
          LEFT JOIN LATERAL (
            SELECT s.followers_count
            FROM sl_user_snapshots s
            WHERE s.canonical_user_id = p.canonical_user_id
              AND s.snapshot_date <= DATE(p.published_at)
            ORDER BY s.snapshot_date DESC
            LIMIT 1
          ) fs ON TRUE
          WHERE gp.run_id = %s
          GROUP BY DATE(p.published_at), p.canonical_user_id
        )
        INSERT INTO gl_user_influence_daily (
          run_id, date_utc, canonical_user_id,
          posts_count, engagement_score_sum, avg_engagement_score,
          followers_est, influence_score
        )
        SELECT
          d.run_id,
          d.date_utc,
          d.canonical_user_id,
          d.posts_count,
          d.engagement_score_sum,
          d.avg_engagement_score,
          d.followers_est,
          d.engagement_score_sum * LN(1 + GREATEST(d.followers_est, 0)) AS influence_score
        FROM daily d
        ON CONFLICT (run_id, date_utc, canonical_user_id)
        DO UPDATE SET posts_count = EXCLUDED.posts_count,
                      engagement_score_sum = EXCLUDED.engagement_score_sum,
                      avg_engagement_score = EXCLUDED.avg_engagement_score,
                      followers_est = EXCLUDED.followers_est,
                      influence_score = EXCLUDED.influence_score,
                      created_at = now()
        """,
        (run_id, run_id),
    )

"""Gold KPI aggregation for trend/content/user windows."""

from __future__ import annotations


def compute_trend_kpis(db, run_id: str) -> None:
    db.execute(
        """
        WITH run_meta AS (
          SELECT run_id, analysis_type
          FROM gl_runs
          WHERE run_id = %s
        ),
        base AS (
          SELECT
            t.run_id,
            rm.analysis_type,
            t.date_utc,
            t.cluster_id,
            tc.label_hint AS category,
            t.post_count,
            t.unique_authors,
            t.engagement_score_sum,
            t.engagement_score_avg,
            t.shares_sum,
            t.breakout_score,
            t.threshold_hit,
            t.breakout_streak,
            t.longest_breakout_streak,
            COALESCE(SUM(CASE WHEN t.threshold_hit THEN 1 ELSE 0 END) OVER (
              PARTITION BY t.cluster_id
              ORDER BY t.date_utc
              ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
            ), 0)::int AS breakout_days_30d,
            LAG(t.post_count, 7) OVER (PARTITION BY t.cluster_id ORDER BY t.date_utc) AS post_count_lag7,
            LAG(t.engagement_score_sum, 7) OVER (PARTITION BY t.cluster_id ORDER BY t.date_utc) AS eng_sum_lag7,
            MIN(CASE WHEN t.threshold_hit THEN t.date_utc END) OVER (PARTITION BY t.cluster_id) AS first_breakout_date,
            STDDEV_POP(t.shares_sum::double precision) OVER (
              PARTITION BY t.cluster_id
              ORDER BY t.date_utc
              ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
            ) AS share_std_14d
          FROM gl_trend_daily_metrics t
          JOIN gl_trend_clusters tc ON tc.cluster_id=t.cluster_id AND tc.run_id=t.run_id
          JOIN run_meta rm ON rm.run_id=t.run_id
          WHERE t.run_id=%s
        ),
        author_day AS (
          SELECT
            m.run_id,
            DATE(p.published_at) AS date_utc,
            m.cluster_id,
            p.canonical_user_id,
            COALESCE(SUM(h.engagement_score),0)::double precision AS user_engagement
          FROM gl_post_cluster_membership m
          JOIN sl_posts p ON p.canonical_post_id=m.canonical_post_id
          LEFT JOIN gl_post_metrics_horizon h
            ON h.canonical_post_id=m.canonical_post_id AND h.run_id=m.run_id AND h.horizon_type='d7'
          WHERE m.run_id=%s
          GROUP BY m.run_id, DATE(p.published_at), m.cluster_id, p.canonical_user_id
        ),
        author_ranked AS (
          SELECT
            ad.*,
            ROW_NUMBER() OVER (
              PARTITION BY ad.cluster_id, ad.date_utc
              ORDER BY ad.user_engagement DESC, ad.canonical_user_id
            ) AS rn,
            CASE
              WHEN EXISTS (
                SELECT 1
                FROM author_day p7
                WHERE p7.run_id=ad.run_id
                  AND p7.cluster_id=ad.cluster_id
                  AND p7.canonical_user_id=ad.canonical_user_id
                  AND p7.date_utc >= (ad.date_utc - INTERVAL '7 day')
                  AND p7.date_utc < ad.date_utc
              ) THEN 0 ELSE 1
            END AS is_novel_7d
          FROM author_day ad
        ),
        author_metrics AS (
          SELECT
            ar.run_id,
            ar.date_utc,
            ar.cluster_id,
            CASE
              WHEN SUM(ar.user_engagement)=0 THEN 0
              ELSE SUM(CASE WHEN ar.rn<=10 THEN ar.user_engagement ELSE 0 END) / NULLIF(SUM(ar.user_engagement),0)
            END AS author_concentration_top10,
            CASE
              WHEN COUNT(*)=0 THEN 0
              ELSE SUM(ar.is_novel_7d)::double precision / COUNT(*)::double precision
            END AS novelty_score_7d
          FROM author_ranked ar
          GROUP BY ar.run_id, ar.date_utc, ar.cluster_id
        )
        INSERT INTO gl_trend_kpis_daily (
          run_id, analysis_type, date_utc, cluster_id, category,
          post_count, unique_authors,
          engagement_score_sum, engagement_score_avg,
          shares_sum, breakout_score, threshold_hit,
          breakout_days_30d, breakout_streak, longest_breakout_streak,
          time_to_breakout_days,
          post_growth_7d, engagement_growth_7d,
          author_concentration_top10, novelty_score_7d,
          stability_score_14d, trend_health_index
        )
        SELECT
          b.run_id,
          b.analysis_type,
          b.date_utc,
          b.cluster_id,
          b.category,
          b.post_count,
          b.unique_authors,
          b.engagement_score_sum,
          b.engagement_score_avg,
          b.shares_sum,
          b.breakout_score,
          b.threshold_hit,
          b.breakout_days_30d,
          b.breakout_streak,
          b.longest_breakout_streak,
          CASE
            WHEN b.first_breakout_date IS NULL THEN NULL
            ELSE (b.date_utc - b.first_breakout_date)
          END::int AS time_to_breakout_days,
          CASE
            WHEN b.post_count_lag7 IS NULL OR b.post_count_lag7 = 0 THEN NULL
            ELSE ((b.post_count - b.post_count_lag7)::double precision / b.post_count_lag7::double precision)
          END AS post_growth_7d,
          CASE
            WHEN b.eng_sum_lag7 IS NULL OR b.eng_sum_lag7 = 0 THEN NULL
            ELSE ((b.engagement_score_sum - b.eng_sum_lag7) / b.eng_sum_lag7)
          END AS engagement_growth_7d,
          COALESCE(am.author_concentration_top10, 0),
          COALESCE(am.novelty_score_7d, 0),
          (1.0 / (1.0 + COALESCE(b.share_std_14d, 0)))::real AS stability_score_14d,
          (
            0.40 * GREATEST(COALESCE(b.breakout_score,0),0)
            + 0.25 * COALESCE(
                CASE
                  WHEN b.post_count_lag7 IS NULL OR b.post_count_lag7=0 THEN 0
                  ELSE ((b.post_count - b.post_count_lag7)::double precision / b.post_count_lag7::double precision)
                END,
              0)
            + 0.25 * COALESCE(
                CASE
                  WHEN b.eng_sum_lag7 IS NULL OR b.eng_sum_lag7=0 THEN 0
                  ELSE ((b.engagement_score_sum - b.eng_sum_lag7) / b.eng_sum_lag7)
                END,
              0)
            + 0.10 * COALESCE(am.novelty_score_7d,0)
          )::real AS trend_health_index
        FROM base b
        LEFT JOIN author_metrics am
          ON am.run_id=b.run_id AND am.date_utc=b.date_utc AND am.cluster_id=b.cluster_id
        ON CONFLICT (run_id, date_utc, cluster_id)
        DO UPDATE SET
          analysis_type = EXCLUDED.analysis_type,
          category = EXCLUDED.category,
          post_count = EXCLUDED.post_count,
          unique_authors = EXCLUDED.unique_authors,
          engagement_score_sum = EXCLUDED.engagement_score_sum,
          engagement_score_avg = EXCLUDED.engagement_score_avg,
          shares_sum = EXCLUDED.shares_sum,
          breakout_score = EXCLUDED.breakout_score,
          threshold_hit = EXCLUDED.threshold_hit,
          breakout_days_30d = EXCLUDED.breakout_days_30d,
          breakout_streak = EXCLUDED.breakout_streak,
          longest_breakout_streak = EXCLUDED.longest_breakout_streak,
          time_to_breakout_days = EXCLUDED.time_to_breakout_days,
          post_growth_7d = EXCLUDED.post_growth_7d,
          engagement_growth_7d = EXCLUDED.engagement_growth_7d,
          author_concentration_top10 = EXCLUDED.author_concentration_top10,
          novelty_score_7d = EXCLUDED.novelty_score_7d,
          stability_score_14d = EXCLUDED.stability_score_14d,
          trend_health_index = EXCLUDED.trend_health_index,
          created_at = now()
        """,
        (run_id, run_id, run_id),
    )


def compute_content_kpis(db, run_id: str) -> None:
    db.execute(
        """
        WITH run_meta AS (
          SELECT run_id, analysis_type
          FROM gl_runs
          WHERE run_id=%s
        ),
        post_base AS (
          SELECT
            gp.run_id,
            rm.analysis_type,
            DATE(p.published_at) AS date_utc,
            COALESCE(gp.category, 'general_fashion') AS category,
            gp.canonical_post_id,
            COALESCE(h.likes,0)::bigint AS likes,
            COALESCE(h.comments,0)::bigint AS comments,
            COALESCE(h.shares,0)::bigint AS shares,
            COALESCE(h.saves,0)::bigint AS saves,
            COALESCE(h.views,0)::bigint AS views,
            COALESCE(h.engagement_score,0)::double precision AS engagement_score,
            COALESCE(h.followers_at_post,0)::bigint AS followers
          FROM gl_post_predictions gp
          JOIN sl_posts p ON p.canonical_post_id=gp.canonical_post_id
          LEFT JOIN gl_post_metrics_horizon h
            ON h.canonical_post_id=gp.canonical_post_id AND h.run_id=gp.run_id AND h.horizon_type='d7'
          JOIN run_meta rm ON rm.run_id=gp.run_id
          WHERE gp.run_id=%s
        ),
        p95 AS (
          SELECT COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY engagement_score),0) AS p95_eng
          FROM post_base
        ),
        agg AS (
          SELECT
            pb.run_id,
            pb.analysis_type,
            pb.date_utc,
            pb.category,
            COUNT(*)::int AS posts_count,
            SUM(pb.likes)::bigint AS likes_sum,
            SUM(pb.comments)::bigint AS comments_sum,
            SUM(pb.shares)::bigint AS shares_sum,
            SUM(pb.saves)::bigint AS saves_sum,
            SUM(pb.views)::bigint AS views_sum,
            SUM(pb.followers)::bigint AS followers_sum,
            SUM(pb.engagement_score)::double precision AS engagement_sum,
            AVG(CASE WHEN pb.engagement_score >= p95.p95_eng THEN 1.0 ELSE 0.0 END)::double precision AS viral_ratio
          FROM post_base pb
          CROSS JOIN p95
          GROUP BY pb.run_id, pb.analysis_type, pb.date_utc, pb.category
        )
        INSERT INTO gl_content_kpis_daily (
          run_id, analysis_type, date_utc, category,
          posts_count, likes_sum, comments_sum, shares_sum, saves_sum, views_sum,
          followers_sum, engagement_sum,
          like_rate_per_1k, comment_rate_per_1k, share_rate_per_1k, save_rate_per_1k,
          engagement_quality_score, viral_ratio
        )
        SELECT
          a.run_id,
          a.analysis_type,
          a.date_utc,
          a.category,
          a.posts_count,
          a.likes_sum,
          a.comments_sum,
          a.shares_sum,
          a.saves_sum,
          a.views_sum,
          a.followers_sum,
          a.engagement_sum,
          CASE WHEN a.followers_sum=0 THEN NULL ELSE (a.likes_sum::double precision * 1000.0 / a.followers_sum::double precision) END,
          CASE WHEN a.followers_sum=0 THEN NULL ELSE (a.comments_sum::double precision * 1000.0 / a.followers_sum::double precision) END,
          CASE WHEN a.followers_sum=0 THEN NULL ELSE (a.shares_sum::double precision * 1000.0 / a.followers_sum::double precision) END,
          CASE WHEN a.followers_sum=0 THEN NULL ELSE (a.saves_sum::double precision * 1000.0 / a.followers_sum::double precision) END,
          CASE WHEN a.followers_sum=0 THEN NULL ELSE ((a.likes_sum + 1.5*a.comments_sum + 2*a.shares_sum + 2*a.saves_sum)::double precision / a.followers_sum::double precision) END,
          a.viral_ratio
        FROM agg a
        ON CONFLICT (run_id, date_utc, category)
        DO UPDATE SET
          analysis_type = EXCLUDED.analysis_type,
          posts_count = EXCLUDED.posts_count,
          likes_sum = EXCLUDED.likes_sum,
          comments_sum = EXCLUDED.comments_sum,
          shares_sum = EXCLUDED.shares_sum,
          saves_sum = EXCLUDED.saves_sum,
          views_sum = EXCLUDED.views_sum,
          followers_sum = EXCLUDED.followers_sum,
          engagement_sum = EXCLUDED.engagement_sum,
          like_rate_per_1k = EXCLUDED.like_rate_per_1k,
          comment_rate_per_1k = EXCLUDED.comment_rate_per_1k,
          share_rate_per_1k = EXCLUDED.share_rate_per_1k,
          save_rate_per_1k = EXCLUDED.save_rate_per_1k,
          engagement_quality_score = EXCLUDED.engagement_quality_score,
          viral_ratio = EXCLUDED.viral_ratio,
          created_at = now()
        """,
        (run_id, run_id),
    )


def compute_user_influence_7d(db, run_id: str) -> None:
    db.execute(
        """
        WITH run_meta AS (
          SELECT run_id, analysis_type
          FROM gl_runs
          WHERE run_id=%s
        ),
        base_overall AS (
          SELECT
            gp.run_id,
            rm.analysis_type,
            DATE(p.published_at) AS date_utc,
            p.canonical_user_id,
            COUNT(*)::int AS posts_count,
            COALESCE(SUM(h.engagement_score),0)::double precision AS engagement_sum,
            COALESCE(AVG(h.engagement_score),0)::double precision AS avg_engagement,
            COALESCE(MAX(h.followers_at_post),0)::int AS followers_est
          FROM gl_post_predictions gp
          JOIN sl_posts p ON p.canonical_post_id=gp.canonical_post_id
          LEFT JOIN gl_post_metrics_horizon h
            ON h.canonical_post_id=gp.canonical_post_id AND h.run_id=gp.run_id AND h.horizon_type='d7'
          JOIN run_meta rm ON rm.run_id=gp.run_id
          WHERE gp.run_id=%s
          GROUP BY gp.run_id, rm.analysis_type, DATE(p.published_at), p.canonical_user_id
        ),
        dates AS (
          SELECT DISTINCT date_utc
          FROM base_overall
        ),
        rolling_overall AS (
          SELECT
            bo.run_id,
            bo.analysis_type,
            d.date_utc AS window_end_date,
            bo.canonical_user_id,
            SUM(bo.posts_count)::int AS posts_7d,
            SUM(bo.engagement_sum)::double precision AS engagement_sum_7d,
            AVG(bo.avg_engagement)::double precision AS avg_engagement_7d,
            MAX(bo.followers_est)::int AS followers_est
          FROM dates d
          JOIN base_overall bo
            ON bo.date_utc BETWEEN (d.date_utc - INTERVAL '6 day') AND d.date_utc
          GROUP BY bo.run_id, bo.analysis_type, d.date_utc, bo.canonical_user_id
        ),
        ranked_overall AS (
          SELECT
            ro.*,
            (ro.engagement_sum_7d * LN(1 + GREATEST(ro.followers_est,0)))::double precision AS influence_score_7d,
            RANK() OVER (
              PARTITION BY ro.window_end_date
              ORDER BY (ro.engagement_sum_7d * LN(1 + GREATEST(ro.followers_est,0))) DESC, ro.canonical_user_id
            ) AS rank_overall
          FROM rolling_overall ro
        )
        INSERT INTO gl_user_influence_7d_overall (
          run_id, analysis_type, window_end_date, canonical_user_id,
          posts_7d, engagement_sum_7d, avg_engagement_7d,
          followers_est, influence_score_7d, rank_overall
        )
        SELECT
          run_id, analysis_type, window_end_date, canonical_user_id,
          posts_7d, engagement_sum_7d, avg_engagement_7d,
          followers_est, influence_score_7d, rank_overall
        FROM ranked_overall
        ON CONFLICT (run_id, window_end_date, canonical_user_id)
        DO UPDATE SET
          analysis_type = EXCLUDED.analysis_type,
          posts_7d = EXCLUDED.posts_7d,
          engagement_sum_7d = EXCLUDED.engagement_sum_7d,
          avg_engagement_7d = EXCLUDED.avg_engagement_7d,
          followers_est = EXCLUDED.followers_est,
          influence_score_7d = EXCLUDED.influence_score_7d,
          rank_overall = EXCLUDED.rank_overall,
          created_at = now()
        """,
        (run_id, run_id),
    )

    db.execute(
        """
        WITH run_meta AS (
          SELECT run_id, analysis_type
          FROM gl_runs
          WHERE run_id=%s
        ),
        base_by_category AS (
          SELECT
            gp.run_id,
            rm.analysis_type,
            DATE(p.published_at) AS date_utc,
            COALESCE(gp.category, 'general_fashion') AS category,
            p.canonical_user_id,
            COUNT(*)::int AS posts_count,
            COALESCE(SUM(h.engagement_score),0)::double precision AS engagement_sum,
            COALESCE(AVG(h.engagement_score),0)::double precision AS avg_engagement,
            COALESCE(MAX(h.followers_at_post),0)::int AS followers_est
          FROM gl_post_predictions gp
          JOIN sl_posts p ON p.canonical_post_id=gp.canonical_post_id
          LEFT JOIN gl_post_metrics_horizon h
            ON h.canonical_post_id=gp.canonical_post_id AND h.run_id=gp.run_id AND h.horizon_type='d7'
          JOIN run_meta rm ON rm.run_id=gp.run_id
          WHERE gp.run_id=%s
          GROUP BY gp.run_id, rm.analysis_type, DATE(p.published_at), COALESCE(gp.category, 'general_fashion'), p.canonical_user_id
        ),
        dates AS (
          SELECT DISTINCT date_utc
          FROM base_by_category
        ),
        rolling_cat AS (
          SELECT
            bc.run_id,
            bc.analysis_type,
            d.date_utc AS window_end_date,
            bc.category,
            bc.canonical_user_id,
            SUM(bc.posts_count)::int AS posts_7d,
            SUM(bc.engagement_sum)::double precision AS engagement_sum_7d,
            AVG(bc.avg_engagement)::double precision AS avg_engagement_7d,
            MAX(bc.followers_est)::int AS followers_est
          FROM dates d
          JOIN base_by_category bc
            ON bc.date_utc BETWEEN (d.date_utc - INTERVAL '6 day') AND d.date_utc
          GROUP BY bc.run_id, bc.analysis_type, d.date_utc, bc.category, bc.canonical_user_id
        ),
        ranked_cat AS (
          SELECT
            rc.*,
            (rc.engagement_sum_7d * LN(1 + GREATEST(rc.followers_est,0)))::double precision AS influence_score_7d,
            RANK() OVER (
              PARTITION BY rc.window_end_date, rc.category
              ORDER BY (rc.engagement_sum_7d * LN(1 + GREATEST(rc.followers_est,0))) DESC, rc.canonical_user_id
            ) AS rank_in_category
          FROM rolling_cat rc
        )
        INSERT INTO gl_user_influence_7d_by_category (
          run_id, analysis_type, window_end_date, category, canonical_user_id,
          posts_7d, engagement_sum_7d, avg_engagement_7d,
          followers_est, influence_score_7d, rank_in_category
        )
        SELECT
          run_id, analysis_type, window_end_date, category, canonical_user_id,
          posts_7d, engagement_sum_7d, avg_engagement_7d,
          followers_est, influence_score_7d, rank_in_category
        FROM ranked_cat
        ON CONFLICT (run_id, window_end_date, category, canonical_user_id)
        DO UPDATE SET
          analysis_type = EXCLUDED.analysis_type,
          posts_7d = EXCLUDED.posts_7d,
          engagement_sum_7d = EXCLUDED.engagement_sum_7d,
          avg_engagement_7d = EXCLUDED.avg_engagement_7d,
          followers_est = EXCLUDED.followers_est,
          influence_score_7d = EXCLUDED.influence_score_7d,
          rank_in_category = EXCLUDED.rank_in_category,
          created_at = now()
        """,
        (run_id, run_id),
    )

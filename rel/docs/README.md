# REL synthetic Instagram data (mixed)

Place generated Instagram raw JSON files under:

- `rel/data/ig/raw/`

This bundle includes:

- `rel/data/ig/raw/ig_posts_6mo_5000_mix.jsonl` (5,000 posts)
- `rel/data/ig/raw/ig_meta_6mo_5000_mix.json`

Each line in the JSONL file is one post object.
No structured location fields are present; infer region from hashtags/caption cues.
Ground truth is provided for evaluation: `labels.is_fashion` and `labels.noise_topic`.

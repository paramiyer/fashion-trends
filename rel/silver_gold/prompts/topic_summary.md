Task: Produce short neutral topic summary for analytics.

Input:
- original_text: {{original_text}}
- hashtags: {{hashtags_json}}
- translation_en: {{translation_en}}

Rules:
- 1 short sentence max.
- Include key topic cues only.
- Output JSON only.

{
  "topic_summary": "...",
  "confidence": 0.0,
  "keywords": ["..."]
}

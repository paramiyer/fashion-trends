Task: Classify whether post is fashion-related.

Input:
- original_text: {{original_text}}
- hashtags: {{hashtags_json}}
- translation_en: {{translation_en}}

Rules:
- Use explicit style/apparel/accessory signals.
- Return boolean + confidence.
- Output JSON only.

{
  "is_fashion": true,
  "confidence": 0.0,
  "evidence": {"hashtags": ["..."], "phrases": ["..."]}
}

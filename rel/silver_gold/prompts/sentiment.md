Task: Sentiment classification for social text.

Input:
- original_text: {{original_text}}
- translation_en: {{translation_en}}

Labels allowed: Positive, Neutral, Negative

Rules:
- Pick one label only.
- Confidence is 0..1.
- Output JSON only.

{
  "sentiment": "Positive|Neutral|Negative",
  "confidence": 0.0,
  "evidence": {"phrases": ["..."]}
}

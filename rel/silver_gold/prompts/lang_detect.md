Task: Detect dominant language for social text.

Input:
- caption_text: {{caption_text}}
- hashtags: {{hashtags_json}}

Labels allowed: ar, ar-en, mixed, other

Rules:
- Use caption + hashtags.
- Return one label only.
- Confidence is 0..1.
- Output JSON only.

{
  "language": "ar|ar-en|mixed|other",
  "confidence": 0.0,
  "evidence": {"signals": ["..."]}
}

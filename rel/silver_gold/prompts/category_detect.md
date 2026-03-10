Task: Fashion category classification with fixed taxonomy.

Input:
- original_text: {{original_text}}
- hashtags: {{hashtags_json}}
- translation_en: {{translation_en}}

Allowed top-level categories:
- modestwear
- streetwear
- accessories
- sportswear
- luxury
- capsule
- sustainable
- beauty_fragrance
- general_fashion

Allowed second-level categories:
- modestwear: abaya, hijab_styling, kaftan, modest_occasionwear
- streetwear: sneakers, oversized_fits, denim, graphic_tees
- accessories: bags, watches, jewelry, eyewear
- sportswear: athleisure_sets, gymwear, performance_shoes
- luxury: designer_bags, luxury_watches, couture_ready_to_wear
- capsule: neutral_tones, wardrobe_basics, minimalist_looks
- sustainable: thrift_flips, upcycled, eco_brands
- beauty_fragrance: oud_styling, fragrance_layering, beauty_fashion_pairing
- general_fashion: general

Rules:
- Run only when is_fashion=true.
- Return exactly one top-level category and one second-level category.
- If uncertain or no strong match, ALWAYS default to:
  - category = general_fashion
  - subcategory = general
- Apply similarity rules in this order:
  1) exact taxonomy match
  2) alias dictionary match
  3) weighted lexical scoring (hashtags > caption keywords > translation phrases)
  4) embedding similarity to canonical label descriptions
  5) parent-category consistency check
  6) confidence gating + deterministic tie-break
- Suggested thresholds:
  - alias/exact match confidence >= 0.85
  - lexical match confidence in [0.65, 0.85]
  - embedding-only acceptance requires cosine >= 0.78
  - ambiguity margin vs second-best must be >= 0.10
- If thresholds are not met, return default:
  - category = general_fashion
  - subcategory = general
- Confidence fields are 0..1.
- Output strict JSON only.

{
  "category": "modestwear|streetwear|accessories|sportswear|luxury|capsule|sustainable|beauty_fragrance|general_fashion",
  "category_confidence": 0.0,
  "subcategory": "...",
  "subcategory_confidence": 0.0,
  "evidence": {"hashtags": ["..."], "phrases": ["..."]}
}

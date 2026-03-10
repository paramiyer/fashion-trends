"""Agent stage orchestration.

Supports prompt-driven OpenAI execution (JSON-only outputs), with heuristic fallback.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from .utils import safe_json_loads


ARABIC_RE = re.compile(r"[\u0600-\u06FF]")
FASHION_TERMS = {
    "fashion", "style", "ootd", "abaya", "look", "fit", "wardrobe",
    "sneaker", "bag", "dress", "modest", "streetwear", "luxury",
}
POS_TERMS = {"love", "stunning", "great", "amazing", "best", "obsessed", "nice"}
NEG_TERMS = {"bad", "worst", "hate", "awful", "poor", "disappointed"}

ALLOWED_CATEGORY_MAP = {
    "modestwear": {"abaya", "hijab_styling", "kaftan", "modest_occasionwear"},
    "streetwear": {"sneakers", "oversized_fits", "denim", "graphic_tees"},
    "accessories": {"bags", "watches", "jewelry", "eyewear"},
    "sportswear": {"athleisure_sets", "gymwear", "performance_shoes", "athleisure"},
    "luxury": {"designer_bags", "luxury_watches", "couture_ready_to_wear"},
    "capsule": {"neutral_tones", "wardrobe_basics", "minimalist_looks"},
    "sustainable": {"thrift_flips", "upcycled", "eco_brands"},
    "beauty_fragrance": {"oud_styling", "fragrance_layering", "beauty_fashion_pairing"},
    "general_fashion": {"general"},
}


class AgentRunner:
    def __init__(self, config: Dict[str, Any], prompts_dir: Path):
        self.config = config or {}
        self.prompts_dir = prompts_dir
        self.precomputed = self._load_precomputed()
        self.model_cfg = self.config.get("model", {}) or {}
        self.provider = (self.model_cfg.get("provider") or "heuristic").lower()
        self.model_name = self.model_cfg.get("model_name") or "gpt-5-nano"
        self._prompt_cache: Dict[str, str] = {}
        self._client = None

        if self.provider == "openai":
            try:
                from openai import OpenAI

                api_key = os.getenv("OPENAI_API_KEY")
                if api_key:
                    self._client = OpenAI(api_key=api_key)
            except Exception:
                self._client = None

    def _load_precomputed(self) -> Dict[str, Dict[str, Any]]:
        path = ((self.config.get("run") or {}).get("precomputed_predictions_path") or "").strip()
        if not path:
            return {}
        p = Path(path)
        if not p.exists():
            return {}

        raw = p.read_text(encoding="utf-8")
        parsed = safe_json_loads(raw, default=[])
        if isinstance(parsed, dict):
            parsed = [parsed]
        out: Dict[str, Dict[str, Any]] = {}
        for row in parsed:
            pid = row.get("canonical_post_id")
            if pid:
                out[pid] = row
        return out

    def run_for_post(self, canonical_post_id: str, text: str, hashtags: List[str]) -> Dict[str, Any]:
        if canonical_post_id in self.precomputed:
            return self.precomputed[canonical_post_id]

        lang = self._detect_language(text, hashtags)
        trans = self._translate(text, lang["language"])
        fashion = self._fashion_detect(text, hashtags, trans["translation_en"])
        sent = self._sentiment(text, trans["translation_en"])
        category = self._category_detect(text, hashtags, trans["translation_en"]) if fashion["is_fashion"] else {
            "category": None,
            "category_confidence": None,
            "subcategory": None,
            "subcategory_confidence": None,
            "evidence": {"hashtags": [], "phrases": []},
        }
        topic = self._topic_summary(text, hashtags, trans["translation_en"])

        evidence = {
            "language": lang.get("evidence", {}),
            "fashion": fashion.get("evidence", {}),
            "sentiment": sent.get("evidence", {}),
            "category": category.get("evidence", {}),
            "topic": {"keywords": topic.get("keywords", [])},
        }

        return {
            "pred_is_fashion": bool(fashion["is_fashion"]),
            "pred_is_fashion_conf": float(fashion["confidence"]),
            "pred_language": str(lang["language"]),
            "pred_language_conf": float(lang["confidence"]),
            "translation_en": str(trans["translation_en"]),
            "translation_model": str(trans.get("model") or self.model_name),
            "sentiment": str(sent["sentiment"]),
            "sentiment_conf": float(sent["confidence"]),
            "topic_summary": str(topic["topic_summary"]),
            "category": category.get("category"),
            "category_conf": category.get("category_confidence"),
            "subcategory": category.get("subcategory"),
            "subcategory_conf": category.get("subcategory_confidence"),
            "evidence": evidence,
        }

    def _load_prompt(self, filename: str) -> str:
        if filename in self._prompt_cache:
            return self._prompt_cache[filename]
        path = self.prompts_dir / filename
        text = path.read_text(encoding="utf-8")
        self._prompt_cache[filename] = text
        return text

    def _render_prompt(self, filename: str, values: Dict[str, Any]) -> str:
        template = self._load_prompt(filename)
        out = template
        for k, v in values.items():
            out = out.replace("{{" + k + "}}", str(v))
        return out

    def _extract_json_text(self, raw_text: str) -> str:
        text = raw_text.strip()
        fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, flags=re.S)
        if fenced:
            return fenced.group(1)
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return text[start : end + 1]
        return text

    def _response_to_text(self, resp: Any) -> str:
        text = (getattr(resp, "output_text", "") or "").strip()
        if text:
            return text

        output = getattr(resp, "output", None) or []
        parts: List[str] = []
        for item in output:
            content = getattr(item, "content", None) or []
            for c in content:
                ctype = getattr(c, "type", "")
                if ctype in {"output_text", "text"}:
                    t = getattr(c, "text", "") or ""
                    if t:
                        parts.append(t)
        return "\\n".join(parts).strip()

    def _call_prompt_json(self, filename: str, values: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self._client:
            return None

        prompt = self._render_prompt(filename, values)
        try:
            resp = self._client.responses.create(
                model=self.model_name,
                input=prompt,
                max_output_tokens=300,
            )
            raw = self._response_to_text(resp)
            if not raw:
                return None
            parsed = safe_json_loads(self._extract_json_text(raw), default=None)
            if isinstance(parsed, dict):
                return parsed
            return None
        except Exception:
            return None

    def _detect_language(self, text: str, hashtags: List[str]) -> Dict[str, Any]:
        llm = self._call_prompt_json(
            "lang_detect.md",
            {
                "caption_text": text,
                "hashtags_json": json.dumps(hashtags, ensure_ascii=False),
            },
        )
        if llm:
            label = str(llm.get("language") or "other")
            if label not in {"ar", "ar-en", "mixed", "other"}:
                label = "other"
            return {
                "language": label,
                "confidence": float(llm.get("confidence") or 0.0),
                "evidence": llm.get("evidence") or {"signals": []},
            }

        joined = f"{text} {' '.join(hashtags)}"
        has_ar = bool(ARABIC_RE.search(joined))
        has_latin = bool(re.search(r"[A-Za-z]", joined))
        if has_ar and has_latin:
            label = "ar-en"
        elif has_ar:
            label = "ar"
        elif has_latin:
            label = "mixed"
        else:
            label = "other"
        return {
            "language": label,
            "confidence": 0.75,
            "evidence": {"signals": ["arabic_script" if has_ar else "", "latin_script" if has_latin else ""]},
        }

    def _translate(self, text: str, language: str) -> Dict[str, Any]:
        llm = self._call_prompt_json(
            "translate_en.md",
            {
                "original_text": text,
                "detected_language": language,
            },
        )
        if llm:
            return {
                "translation_en": str(llm.get("translation_en") or text or ""),
                "model": str(llm.get("model") or self.model_name),
                "confidence": float(llm.get("confidence") or 0.0),
            }

        translated = text.strip() or ""
        return {
            "translation_en": translated,
            "model": "heuristic",
            "confidence": 0.60,
        }

    def _fashion_detect(self, text: str, hashtags: List[str], translation_en: str) -> Dict[str, Any]:
        llm = self._call_prompt_json(
            "fashion_detect.md",
            {
                "original_text": text,
                "hashtags_json": json.dumps(hashtags, ensure_ascii=False),
                "translation_en": translation_en,
            },
        )
        if llm:
            return {
                "is_fashion": bool(llm.get("is_fashion")),
                "confidence": float(llm.get("confidence") or 0.0),
                "evidence": llm.get("evidence") or {"hashtags": [], "phrases": []},
            }

        words = set(re.findall(r"[a-zA-Z]+", f"{text} {translation_en}".lower()))
        tags = [h.lower().lstrip("#") for h in hashtags]
        matched_terms = sorted(w for w in FASHION_TERMS if w in words or w in tags)
        return {
            "is_fashion": len(matched_terms) > 0,
            "confidence": 0.85 if matched_terms else 0.40,
            "evidence": {
                "hashtags": [h for h in hashtags if h.lower().lstrip("#") in FASHION_TERMS],
                "phrases": matched_terms,
            },
        }

    def _sentiment(self, text: str, translation_en: str) -> Dict[str, Any]:
        llm = self._call_prompt_json(
            "sentiment.md",
            {
                "original_text": text,
                "translation_en": translation_en,
            },
        )
        if llm:
            sentiment = str(llm.get("sentiment") or "Neutral")
            if sentiment not in {"Positive", "Neutral", "Negative"}:
                sentiment = "Neutral"
            return {
                "sentiment": sentiment,
                "confidence": float(llm.get("confidence") or 0.0),
                "evidence": llm.get("evidence") or {"phrases": []},
            }

        words = set(re.findall(r"[a-zA-Z]+", f"{text} {translation_en}".lower()))
        pos = len(words.intersection(POS_TERMS))
        neg = len(words.intersection(NEG_TERMS))
        if pos > neg:
            s = "Positive"
        elif neg > pos:
            s = "Negative"
        else:
            s = "Neutral"
        return {
            "sentiment": s,
            "confidence": 0.70,
            "evidence": {"phrases": sorted(words.intersection(POS_TERMS | NEG_TERMS))},
        }

    def _category_detect(self, text: str, hashtags: List[str], translation_en: str) -> Dict[str, Any]:
        llm = self._call_prompt_json(
            "category_detect.md",
            {
                "original_text": text,
                "hashtags_json": json.dumps(hashtags, ensure_ascii=False),
                "translation_en": translation_en,
            },
        )
        if llm:
            category = str(llm.get("category") or "general_fashion")
            subcategory = str(llm.get("subcategory") or "general")
            if category not in ALLOWED_CATEGORY_MAP:
                category = "general_fashion"
                subcategory = "general"
            allowed_sub = ALLOWED_CATEGORY_MAP.get(category, {"general"})
            if subcategory not in allowed_sub:
                subcategory = "general" if category == "general_fashion" else sorted(allowed_sub)[0]
            return {
                "category": category,
                "category_confidence": float(llm.get("category_confidence") or 0.0),
                "subcategory": subcategory,
                "subcategory_confidence": float(llm.get("subcategory_confidence") or 0.0),
                "evidence": llm.get("evidence") or {"hashtags": [], "phrases": []},
            }

        source = f"{text} {translation_en} {' '.join(hashtags)}".lower()
        mapping = [
            ("abaya", "modestwear", "abaya"),
            ("sneaker", "streetwear", "sneakers"),
            ("bag", "accessories", "bags"),
            ("watch", "accessories", "watches"),
            ("athleisure", "sportswear", "athleisure_sets"),
        ]
        for token, cat, sub in mapping:
            if token in source:
                return {
                    "category": cat,
                    "category_confidence": 0.80,
                    "subcategory": sub,
                    "subcategory_confidence": 0.75,
                    "evidence": {"hashtags": hashtags, "phrases": [token]},
                }

        return {
            "category": "general_fashion",
            "category_confidence": 0.55,
            "subcategory": "general",
            "subcategory_confidence": 0.50,
            "evidence": {"hashtags": hashtags[:5], "phrases": ["fallback"]},
        }

    def _topic_summary(self, text: str, hashtags: List[str], translation_en: str) -> Dict[str, Any]:
        llm = self._call_prompt_json(
            "topic_summary.md",
            {
                "original_text": text,
                "hashtags_json": json.dumps(hashtags, ensure_ascii=False),
                "translation_en": translation_en,
            },
        )
        if llm:
            return {
                "topic_summary": str(llm.get("topic_summary") or ""),
                "confidence": float(llm.get("confidence") or 0.0),
                "keywords": llm.get("keywords") or [],
            }

        clean_tags = [h.lstrip("#") for h in hashtags[:5]]
        summary = translation_en[:160] if translation_en else (text[:160] if text else "fashion-related post")
        return {
            "topic_summary": summary,
            "confidence": 0.60,
            "keywords": clean_tags,
        }

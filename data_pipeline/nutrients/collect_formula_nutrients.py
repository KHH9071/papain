#!/usr/bin/env python3
"""
collect_formula_nutrients.py — 분유 영양소 데이터 수집·검증 파이프라인

공식 영양 패널 기반 per-100ml(조유 기준) 영양소 프로파일 수집.
Codex Alimentarius / EU Regulation 2016/127 허용 범위 검증.

출력: src/lib/formula_nutrient_db.json
  → canonical_to_product.ts에서 import하여 앱에 반영.

데이터 소스 우선순위:
  1. 공식 브랜드 영양 패널 (제품 포장/공식 웹사이트)
  2. 수입식품 신고 영양정보 (식약처 수입식품정보마루)
  3. 국가 식품 DB (USDA FoodData Central, BLS DE)

사용법:
  python data_pipeline/nutrients/collect_formula_nutrients.py
"""

import json
import os
import sys
from datetime import datetime, timezone
from typing import Any

# ── Codex / EU 허용 범위 (per 100 kcal → per 100ml 환산, ~67kcal/100ml 기준) ──
# 검증용. 이 범위를 벗어나면 경고 출력.
CODEX_RANGES_PER_100ML = {
    "칼슘||mg":       (30, 140),
    "철||mg":         (0.2, 1.8),
    "아연||mg":       (0.3, 1.0),
    "비타민D||μg":    (0.6, 2.5),
    "비타민C||mg":    (4.0, 18.0),
    "비타민A||μg RE": (40, 100),
    "단백질||g":      (1.0, 2.5),
    "DHA||mg":        (0, 30),
}

# ── 영양소 프로파일 정의 ─────────────────────────────────────────────────────
# 모든 값은 per 100ml (조유 기준, 표준 희석 비율).
# source: 데이터 출처 (검증 추적용)

NUTRIENT_PROFILES: dict[str, dict[str, Any]] = {
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Aptamil Profutura (UK) — Danone/Nutricia
    # Source: Official Aptamil UK nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_aptamil_profutura_uk_s1_powder_800g": {
        "source": "official_brand_aptamil_uk",
        "nutrients": {
            "칼슘||mg": 56, "철||mg": 0.53, "아연||mg": 0.50,
            "비타민D||μg": 1.2, "비타민C||mg": 9.2, "비타민A||μg RE": 54,
            "단백질||g": 1.3, "DHA||mg": 17,
        },
    },
    "formula_group_aptamil_profutura_uk_s2_powder_800g": {
        "source": "official_brand_aptamil_uk",
        "nutrients": {
            "칼슘||mg": 68, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.5, "비타민C||mg": 9.0, "비타민A||μg RE": 60,
            "단백질||g": 1.6, "DHA||mg": 8.6,
        },
    },
    "formula_group_aptamil_profutura_uk_s3_powder_800g": {
        "source": "official_brand_aptamil_uk",
        "nutrients": {
            "칼슘||mg": 82, "철||mg": 1.2, "아연||mg": 0.60,
            "비타민D||μg": 1.7, "비타민C||mg": 8.5, "비타민A||μg RE": 65,
            "단백질||g": 1.8, "DHA||mg": 6.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Aptamil Standard (UK) — Danone/Nutricia
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_aptamil_aptamil_uk_s1_powder_800g": {
        "source": "official_brand_aptamil_uk",
        "nutrients": {
            "칼슘||mg": 52, "철||mg": 0.50, "아연||mg": 0.50,
            "비타민D||μg": 1.0, "비타민C||mg": 8.1, "비타민A||μg RE": 54,
            "단백질||g": 1.3, "DHA||mg": 7.7,
        },
    },
    "formula_group_aptamil_aptamil_uk_s2_powder_800g": {
        "source": "official_brand_aptamil_uk",
        "nutrients": {
            "칼슘||mg": 64, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.4, "비타민C||mg": 8.0, "비타민A||μg RE": 58,
            "단백질||g": 1.5, "DHA||mg": 6.9,
        },
    },
    "formula_group_aptamil_aptamil_uk_s3_powder_800g": {
        "source": "official_brand_aptamil_uk",
        "nutrients": {
            "칼슘||mg": 78, "철||mg": 1.2, "아연||mg": 0.56,
            "비타민D||μg": 1.6, "비타민C||mg": 8.0, "비타민A||μg RE": 62,
            "단백질||g": 1.7, "DHA||mg": 5.5,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Kendamil Classic (UK)
    # Source: Official Kendamil UK nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_kendamil_classic_uk_s1_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 47, "철||mg": 0.53, "아연||mg": 0.50,
            "비타민D||μg": 1.0, "비타민C||mg": 8.1, "비타민A||μg RE": 60,
            "단백질||g": 1.3, "DHA||mg": 7.7,
        },
    },
    "formula_group_kendamil_classic_uk_s2_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 68, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.4, "비타민C||mg": 9.0, "비타민A||μg RE": 60,
            "단백질||g": 1.7, "DHA||mg": 6.8,
        },
    },
    "formula_group_kendamil_classic_uk_s3_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 80, "철||mg": 1.2, "아연||mg": 0.58,
            "비타민D||μg": 1.6, "비타민C||mg": 8.0, "비타민A||μg RE": 65,
            "단백질||g": 1.6, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Kendamil Organic (UK)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_kendamil_organic_uk_s1_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 47, "철||mg": 0.53, "아연||mg": 0.50,
            "비타민D||μg": 1.0, "비타민C||mg": 8.1, "비타민A||μg RE": 60,
            "단백질||g": 1.3, "DHA||mg": 7.7,
        },
    },
    "formula_group_kendamil_organic_uk_s2_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 68, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.4, "비타민C||mg": 9.0, "비타민A||μg RE": 60,
            "단백질||g": 1.7, "DHA||mg": 6.8,
        },
    },
    "formula_group_kendamil_organic_uk_s3_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 80, "철||mg": 1.2, "아연||mg": 0.58,
            "비타민D||μg": 1.6, "비타민C||mg": 8.0, "비타민A||μg RE": 65,
            "단백질||g": 1.6, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Kendamil Goat (UK)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_kendamil_goat_uk_s1_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 48, "철||mg": 0.53, "아연||mg": 0.50,
            "비타민D||μg": 1.0, "비타민C||mg": 8.0, "비타민A||μg RE": 59,
            "단백질||g": 1.3, "DHA||mg": 7.5,
        },
    },
    "formula_group_kendamil_goat_uk_s2_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 66, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.4, "비타민C||mg": 8.5, "비타민A||μg RE": 60,
            "단백질||g": 1.6, "DHA||mg": 6.5,
        },
    },
    "formula_group_kendamil_goat_uk_s3_powder_800g": {
        "source": "official_brand_kendamil_uk",
        "nutrients": {
            "칼슘||mg": 78, "철||mg": 1.2, "아연||mg": 0.56,
            "비타민D||μg": 1.6, "비타민C||mg": 8.0, "비타민A||μg RE": 65,
            "단백질||g": 1.6, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Holle Bio (DE) — cow
    # Source: Official Holle nutrition panel / EU organic certification
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_holle_bio_de_sPRE_powder_400g": {
        "source": "official_brand_holle_de",
        "nutrients": {
            "칼슘||mg": 42, "철||mg": 0.53, "아연||mg": 0.42,
            "비타민D||μg": 1.2, "비타민C||mg": 9.0, "비타민A||μg RE": 54,
            "단백질||g": 1.2, "DHA||mg": 8.0,
        },
    },
    "formula_group_holle_bio_de_s1_powder_400g": {
        "source": "official_brand_holle_de",
        "nutrients": {
            "칼슘||mg": 50, "철||mg": 0.70, "아연||mg": 0.50,
            "비타민D||μg": 1.2, "비타민C||mg": 9.0, "비타민A||μg RE": 54,
            "단백질||g": 1.3, "DHA||mg": 8.2,
        },
    },
    "formula_group_holle_bio_de_s2_powder_600g": {
        "source": "official_brand_holle_de",
        "nutrients": {
            "칼슘||mg": 63, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.5, "비타민C||mg": 8.0, "비타민A||μg RE": 60,
            "단백질||g": 1.5, "DHA||mg": 6.5,
        },
    },
    "formula_group_holle_bio_de_s3_powder_600g": {
        "source": "official_brand_holle_de",
        "nutrients": {
            "칼슘||mg": 75, "철||mg": 1.1, "아연||mg": 0.55,
            "비타민D||μg": 1.6, "비타민C||mg": 8.0, "비타민A||μg RE": 65,
            "단백질||g": 1.7, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Holle Bio Goat (DE)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_holle_bio_goat_de_s1_powder_400g": {
        "source": "official_brand_holle_de",
        "nutrients": {
            "칼슘||mg": 49, "철||mg": 0.68, "아연||mg": 0.48,
            "비타민D||μg": 1.2, "비타민C||mg": 8.5, "비타민A||μg RE": 55,
            "단백질||g": 1.3, "DHA||mg": 8.0,
        },
    },
    "formula_group_holle_bio_goat_de_s2_powder_600g": {
        "source": "official_brand_holle_de",
        "nutrients": {
            "칼슘||mg": 61, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.4, "비타민C||mg": 8.0, "비타민A||μg RE": 58,
            "단백질||g": 1.5, "DHA||mg": 6.5,
        },
    },
    "formula_group_holle_bio_goat_de_s3_powder_600g": {
        "source": "official_brand_holle_de",
        "nutrients": {
            "칼슘||mg": 73, "철||mg": 1.1, "아연||mg": 0.54,
            "비타민D||μg": 1.6, "비타민C||mg": 8.0, "비타민A||μg RE": 63,
            "단백질||g": 1.6, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # HiPP BIO COMBIOTIK (DE)
    # Source: Official HiPP nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_hipp_bio_combiotik_de_sPRE_powder_600g": {
        "source": "official_brand_hipp_de",
        "nutrients": {
            "칼슘||mg": 43, "철||mg": 0.44, "아연||mg": 0.45,
            "비타민D||μg": 1.0, "비타민C||mg": 6.8, "비타민A||μg RE": 54,
            "단백질||g": 1.25, "DHA||mg": 10.0,
        },
    },
    "formula_group_hipp_bio_combiotik_de_s1_powder_600g": {
        "source": "official_brand_hipp_de",
        "nutrients": {
            "칼슘||mg": 49, "철||mg": 0.56, "아연||mg": 0.50,
            "비타민D||μg": 1.1, "비타민C||mg": 6.9, "비타민A||μg RE": 54,
            "단백질||g": 1.3, "DHA||mg": 10.0,
        },
    },
    "formula_group_hipp_bio_combiotik_de_s2_powder_600g": {
        "source": "official_brand_hipp_de",
        "nutrients": {
            "칼슘||mg": 62, "철||mg": 0.90, "아연||mg": 0.46,
            "비타민D||μg": 1.3, "비타민C||mg": 7.5, "비타민A||μg RE": 58,
            "단백질||g": 1.5, "DHA||mg": 7.5,
        },
    },
    "formula_group_hipp_bio_combiotik_de_s3_powder_600g": {
        "source": "official_brand_hipp_de",
        "nutrients": {
            "칼슘||mg": 76, "철||mg": 1.1, "아연||mg": 0.55,
            "비타민D||μg": 1.5, "비타민C||mg": 7.0, "비타민A||μg RE": 62,
            "단백질||g": 1.6, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Lebenswert Bio (DE) — Holle 계열
    # Source: Official Lebenswert nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_lebenswert_bio_de_sPRE_powder_500g": {
        "source": "official_brand_lebenswert_de",
        "nutrients": {
            "칼슘||mg": 41, "철||mg": 0.50, "아연||mg": 0.40,
            "비타민D||μg": 1.1, "비타민C||mg": 8.5, "비타민A||μg RE": 52,
            "단백질||g": 1.2, "DHA||mg": 7.5,
        },
    },
    "formula_group_lebenswert_bio_de_s1_powder_500g": {
        "source": "official_brand_lebenswert_de",
        "nutrients": {
            "칼슘||mg": 48, "철||mg": 0.65, "아연||mg": 0.48,
            "비타민D||μg": 1.2, "비타민C||mg": 8.5, "비타민A||μg RE": 54,
            "단백질||g": 1.3, "DHA||mg": 7.5,
        },
    },
    "formula_group_lebenswert_bio_de_s2_powder_500g": {
        "source": "official_brand_lebenswert_de",
        "nutrients": {
            "칼슘||mg": 61, "철||mg": 0.95, "아연||mg": 0.50,
            "비타민D||μg": 1.4, "비타민C||mg": 8.0, "비타민A||μg RE": 58,
            "단백질||g": 1.5, "DHA||mg": 6.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Kabrita Gold (EU — Netherlands, goat)
    # Source: Official Kabrita nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_kabrita_gold_eu_s1_powder_800g": {
        "source": "official_brand_kabrita_eu",
        "nutrients": {
            "칼슘||mg": 52, "철||mg": 0.53, "아연||mg": 0.44,
            "비타민D||μg": 1.1, "비타민C||mg": 8.0, "비타민A||μg RE": 54,
            "단백질||g": 1.4, "DHA||mg": 10.0,
        },
    },
    "formula_group_kabrita_gold_eu_s2_powder_800g": {
        "source": "official_brand_kabrita_eu",
        "nutrients": {
            "칼슘||mg": 65, "철||mg": 0.90, "아연||mg": 0.48,
            "비타민D||μg": 1.3, "비타민C||mg": 8.0, "비타민A||μg RE": 58,
            "단백질||g": 1.5, "DHA||mg": 7.5,
        },
    },
    "formula_group_kabrita_gold_eu_s3_powder_800g": {
        "source": "official_brand_kabrita_eu",
        "nutrients": {
            "칼슘||mg": 78, "철||mg": 1.1, "아연||mg": 0.55,
            "비타민D||μg": 1.5, "비타민C||mg": 7.5, "비타민A||μg RE": 62,
            "단백질||g": 1.6, "DHA||mg": 5.5,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Bubs Organic Grass Fed (AU) — cow
    # Source: Official Bubs Australia nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_bubs_organic_grass_fed_au_s1_powder_800g": {
        "source": "official_brand_bubs_au",
        "nutrients": {
            "칼슘||mg": 46, "철||mg": 0.75, "아연||mg": 0.45,
            "비타민D||μg": 1.0, "비타민C||mg": 7.0, "비타민A||μg RE": 55,
            "단백질||g": 1.3, "DHA||mg": 8.5,
        },
    },
    "formula_group_bubs_organic_grass_fed_au_s2_powder_800g": {
        "source": "official_brand_bubs_au",
        "nutrients": {
            "칼슘||mg": 60, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.3, "비타민C||mg": 7.0, "비타민A||μg RE": 58,
            "단백질||g": 1.6, "DHA||mg": 6.5,
        },
    },
    "formula_group_bubs_organic_grass_fed_au_s3_powder_800g": {
        "source": "official_brand_bubs_au",
        "nutrients": {
            "칼슘||mg": 74, "철||mg": 1.2, "아연||mg": 0.55,
            "비타민D||μg": 1.5, "비타민C||mg": 7.0, "비타민A||μg RE": 63,
            "단백질||g": 1.7, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Bubs Goat (AU)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_bubs_goat_au_s1_powder_800g": {
        "source": "official_brand_bubs_au",
        "nutrients": {
            "칼슘||mg": 47, "철||mg": 0.70, "아연||mg": 0.44,
            "비타민D||μg": 1.0, "비타민C||mg": 7.0, "비타민A||μg RE": 55,
            "단백질||g": 1.3, "DHA||mg": 8.0,
        },
    },
    "formula_group_bubs_goat_au_s2_powder_800g": {
        "source": "official_brand_bubs_au",
        "nutrients": {
            "칼슘||mg": 58, "철||mg": 0.95, "아연||mg": 0.48,
            "비타민D||μg": 1.3, "비타민C||mg": 7.0, "비타민A||μg RE": 57,
            "단백질||g": 1.5, "DHA||mg": 6.5,
        },
    },
    "formula_group_bubs_goat_au_s3_powder_800g": {
        "source": "official_brand_bubs_au",
        "nutrients": {
            "칼슘||mg": 72, "철||mg": 1.1, "아연||mg": 0.54,
            "비타민D||μg": 1.5, "비타민C||mg": 7.0, "비타민A||μg RE": 62,
            "단백질||g": 1.6, "DHA||mg": 5.0,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Similac 360 Total Care (US) — Abbott
    # Source: USDA FoodData Central + Official Abbott nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_similac_360_total_care_us_s1_powder_658g": {
        "source": "official_brand_similac_us + usda_fooddata_central",
        "nutrients": {
            "칼슘||mg": 53, "철||mg": 1.22, "아연||mg": 0.51,
            "비타민D||μg": 1.0, "비타민C||mg": 6.1, "비타민A||μg RE": 60,
            "단백질||g": 1.41, "DHA||mg": 17,
        },
    },
    "formula_group_similac_360_total_care_us_s3_powder_658g": {
        "source": "official_brand_similac_us + usda_fooddata_central",
        "nutrients": {
            "칼슘||mg": 82, "철||mg": 1.2, "아연||mg": 0.60,
            "비타민D||μg": 1.5, "비타민C||mg": 6.0, "비타민A||μg RE": 65,
            "단백질||g": 1.7, "DHA||mg": 12,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Enfamil NeuroPro (US) — Mead Johnson / Reckitt
    # Source: USDA FoodData Central + Official Enfamil nutrition panel
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "formula_group_enfamil_neuropro_us_s1_powder_587g": {
        "source": "official_brand_enfamil_us + usda_fooddata_central",
        "nutrients": {
            "칼슘||mg": 53, "철||mg": 1.22, "아연||mg": 0.68,
            "비타민D||μg": 1.0, "비타민C||mg": 8.1, "비타민A||μg RE": 60,
            "단백질||g": 1.42, "DHA||mg": 17,
        },
    },

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 한국 제품 — 기존 ROUTINE_PRODUCTS 검증·교정용
    # Source: 식약처 수입식품정보마루 + 제조사 공식 영양정보
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    "kr_aptamil_1": {
        "source": "official_brand_aptamil_kr_import + kr_food_regulatory",
        "nutrients": {
            "칼슘||mg": 56, "철||mg": 0.53, "아연||mg": 0.50,
            "비타민D||μg": 1.2, "비타민C||mg": 9.2, "비타민A||μg RE": 54,
            "단백질||g": 1.3, "DHA||mg": 17,
        },
        "_correction_note": "철 1.2→0.53mg/100ml (기존값은 per-scoop과 per-100ml 혼동 추정)",
    },
    "kr_imperial_xo_3": {
        "source": "official_brand_namyang + kr_food_regulatory",
        "nutrients": {
            "칼슘||mg": 100, "철||mg": 1.3, "아연||mg": 0.75,
            "비타민D||μg": 1.5, "비타민C||mg": 7.0, "비타민A||μg RE": 55,
            "단백질||g": 1.8, "DHA||mg": 8.0,
        },
        "_correction_note": "철 1.5→1.3mg/100ml, 비타민C 6→7mg/100ml (남양유업 공식 영양성분표 기준 보정)",
    },
    "kr_absolute_2": {
        "source": "official_brand_maeil + kr_food_regulatory",
        "nutrients": {
            "칼슘||mg": 78, "철||mg": 1.0, "아연||mg": 0.50,
            "비타민D||μg": 1.1, "비타민C||mg": 5.6, "비타민A||μg RE": 50,
            "단백질||g": 1.5, "DHA||mg": 9.0,
        },
        "_correction_note": "칼슘 75→78mg/100ml, 비타민C 5→5.6mg/100ml (매일유업 공식 영양성분표 기준 보정)",
    },
}


def validate_profile(product_id: str, nutrients: dict[str, float]) -> list[str]:
    """Codex/EU 범위 검증. 범위 밖이면 경고 목록 반환."""
    warnings = []
    for key, value in nutrients.items():
        if key in CODEX_RANGES_PER_100ML:
            lo, hi = CODEX_RANGES_PER_100ML[key]
            if value < lo or value > hi:
                warnings.append(
                    f"  ⚠ {product_id}: {key} = {value} (허용 범위 {lo}~{hi})"
                )
    return warnings


def build_output() -> dict[str, Any]:
    """검증 후 JSON 출력 구조 생성."""
    all_warnings: list[str] = []
    records: dict[str, dict[str, Any]] = {}

    for product_id, profile in NUTRIENT_PROFILES.items():
        warnings = validate_profile(product_id, profile["nutrients"])
        all_warnings.extend(warnings)
        records[product_id] = {
            "source": profile["source"],
            "nutrients": profile["nutrients"],
        }

    if all_warnings:
        print(f"\n{'='*60}")
        print(f"  검증 경고 {len(all_warnings)}건")
        print(f"{'='*60}")
        for w in all_warnings:
            print(w)
        print()
    else:
        print("✓ 모든 영양소 값이 Codex/EU 허용 범위 이내")

    return {
        "_generated_by": "collect_formula_nutrients.py",
        "_generated_at": datetime.now(timezone.utc).isoformat(),
        "_summary": {
            "total_profiles": len(records),
            "canonical_profiles": len([k for k in records if k.startswith("formula_group_")]),
            "kr_profiles": len([k for k in records if k.startswith("kr_")]),
            "validation_warnings": len(all_warnings),
        },
        "profiles": records,
    }


def main():
    output = build_output()

    # JSON 출력 — src/lib/에 직접 쓰기
    out_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "src", "lib", "formula_nutrient_db.json"
    )
    out_path = os.path.normpath(out_path)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    summary = output["_summary"]
    print(f"\n✓ 영양소 DB 생성 완료")
    print(f"  출력: {out_path}")
    print(f"  canonical 프로파일: {summary['canonical_profiles']}개")
    print(f"  한국 제품 프로파일: {summary['kr_profiles']}개")
    print(f"  검증 경고: {summary['validation_warnings']}건")


if __name__ == "__main__":
    main()

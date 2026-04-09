# 분유 Canonical Taxonomy v1

## 1. 목적
이 문서는 파파인에서 분유 데이터를 정규화할 때 사용할 1차 taxonomy 기준이다.
목표는 브랜드 이름 수집이 아니라 **검색·비교 가능한 canonical 구조**를 만드는 것이다.

> **참조본 (Reference Only)**
> 이 마크다운 문서는 인간 가독용 참조 문서다.
> 기계 판독 권위 원본은 `data_pipeline/taxonomy/formula_taxonomy_rules.yaml` 이다.
> 두 파일의 내용이 다를 경우 YAML 파일이 우선한다.

## 2. 적용 범위
- infant formula
- follow-on formula
- toddler/growing-up milk
- goat milk formula
- ready-to-feed/liquid formula
- stick formula
- specialty formula는 포함하되 별도 review 처리

## 3. Category 구조

### category_l1
- formula

### category_l2
- standard_formula
- goat_formula
- specialty_formula
- toddler_formula
- liquid_formula

### category_l3
- infant_stage_pre
- infant_stage_1
- follow_on_stage_2
- growing_up_stage_3
- growing_up_stage_4_plus
- ready_to_feed
- stick_pack
- sensitive
- HA_partial_hydrolyzed
- lactose_free
- soy_based
- amino_acid_based
- extensively_hydrolyzed

## 4. Core Canonical Fields
- canonical_product_id
- brand
- line
- normalized_name
- country_version
- stage
- age_range_text
- milk_base
- protein_type
- formula_type
- form
- package_size_value
- package_size_unit
- flavor_or_variant
- organic_flag
- source_count
- confidence_score
- review_status

## 5. Field Definitions

### brand
예: Aptamil, HiPP, Kendamil, Bubs, Similac

### line
예: Profutura, Organic, Goat, Gold+, Bio Combiotik

### country_version
예:
- KR
- DE
- UK
- EU
- AU
- US
- Unknown

규칙:
- 국가가 명시되면 그대로 저장
- 명시되지 않으면 Unknown
- 판매자가 만든 추정 문구는 공식 근거 없으면 확정하지 않음

### stage
허용값:
- PRE
- 1
- 2
- 3
- 4+
- toddler
- unknown

규칙:
- 제품명이나 공식 카탈로그에 명시된 단계만 기록
- 단계가 안 보이면 unknown

### age_range_text
예:
- 0-6 months
- 6-12 months
- 12+ months
- 1 year+

### milk_base
허용값:
- cow
- goat
- soy
- a2_cow
- mixed
- unknown

### protein_type
허용값:
- standard
- partial_hydrolyzed
- extensively_hydrolyzed
- amino_acid
- lactose_free_variant
- unknown

### formula_type
허용값:
- infant_formula
- follow_on_formula
- growing_up_formula
- specialty_formula
- unknown

### form
허용값:
- powder
- liquid
- ready_to_feed
- stick
- unknown

### organic_flag
허용값:
- true
- false
- unknown

### review_status
허용값:
- draft
- needs_human_review
- approved
- rejected

## 6. Deduplication Unit
아래 조합이 같으면 같은 canonical product 후보로 본다.
- brand
- line
- country_version
- stage
- form
- package_size_value
- package_size_unit

단, 세트상품/묶음상품은 canonical product가 아니라 offer/listing 레벨에서 처리한다.

## 7. Confidence 규칙 초안
### high
- 공식 브랜드 카탈로그 + 판매채널 1개 이상 일치
- stage / form / package size 명확

### medium
- 판매채널 2개 이상 일치
- 국가 버전 또는 line 일부 불확실

### low
- source 1개뿐임
- country_version 불명확
- stage 불명확
- 특수분유 여부 불명확

low는 자동 승인 금지

## 8. Human Review Trigger
아래 조건이면 무조건 `needs_human_review`
- specialty formula 의심
- HA / hypoallergenic / hydrolyzed 관련 표현 존재
- lactose free / soy / amino acid 기반 표현 존재
- country_version 불명확
- 제품명 중 stage 추정이 어려움
- 공식몰과 판매채널 정보 충돌

## 9. Naming Normalization Rule
정규화 이름은 아래 순서를 권장한다.
`{brand} {line} {country_version} Stage{stage} {form} {package_size}`

예시:
- Aptamil Profutura UK Stage1 Powder 800g
- HiPP Bio Combiotik DE PRE Powder 600g
- Kendamil Goat UK Stage2 Powder 800g

## 10. 제외/보류 규칙
아래는 일단 보류한다.
- 단순 사은품/증정품
- 묶음 판매만 존재하고 단품 식별 불가
- 번역이 심하게 왜곡된 구매대행 페이지
- 제품 사진만 있고 상세 정보가 전혀 없는 경우

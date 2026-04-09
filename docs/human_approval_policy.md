# Human Approval Policy

> 작성일: 2026-03-11 (Phase 5H)
> 목적: Verified-C 등 사람 명시 승인이 필요한 레코드의 승인 흐름, 큐 산출 방식, 검토 목록 정의.

---

## 배경

Phase 5F/5G 에서 도입된 evidence_grade 시스템에 따라, Verified-C 등급 레코드는
자동 승인이 불가능하며 사람이 명시적으로 승인해야 한다.

이 문서는 다음을 정의한다:
1. 사람 승인이 필요한 케이스 분류
2. 승인 큐(queue) 산출 방식
3. 승인 행위의 기술적 표현
4. 승인 후 policy 필드 상태 변화

---

## 승인 필요 케이스

| 케이스 | evidence_grade | recall_status | requires_human_approval | 승인 경로 |
|---|---|---|---|---|
| Verified-C (단일 출처) | Verified-C | unknown/none | **True** | approve_single_source_override |
| Restricted (리콜 진행 중) | Any | active/batch_specific | **True** | 리콜 검토 후 별도 결정 |
| Verified-A/B (자동 승인) | Verified-A or B | none/unknown | False | 자동 (현재 미구현) |
| Unverified | Unverified | Any | 파이프라인 진입 불가 | source_1 확보 후 재투입 |
| v1.0 기존 레코드 | null | null | null | 별도 정책 필요 (현재 null 유지) |

---

## 승인 큐 산출 방식

### 큐 입력 조건

`apply_reconciliation_decisions.py` 실행 후 `review_queue.next.json` 에 다음 항목이 포함된다:

```json
{
  "candidate_group_id": "group_hipp_bio_combiotik_de_sPRE_powder_600g",
  "classification": "new_review_candidates",
  "status": "pending_second_source",
  "evidence_grade": "Verified-C",
  "recall_status": "unknown",
  "evidence_note": "evidence_grade=Verified-C (single manufacturer source). Auto-approval blocked. Human must use approve_single_source_override."
}
```

### 현재 큐 아이템 (2026-03-11 기준)

`review_queue.next.json` 기준 현재 승인 대기 중인 레코드:

| candidate_group_id | status | evidence_grade | 이유 |
|---|---|---|---|
| group_hipp_bio_combiotik_de_sPRE_powder_600g | pending_second_source | Verified-C | PRE specialty_formula 확인 보류 |
| group_aptamil_unknown_uk_s1_powder_800g | pending_decision | Verified-C | line=null, partial_match 분류 |
| group_aptamil_unknown_uk_s2_powder_800g | pending_second_source | Verified-C | S1 처리 선행 필요 |

### 승인 완료된 레코드 (`approved_canonical.next.json` 기준)

| canonical_product_id | review_status | requires_human_approval |
|---|---|---|
| formula_group_kendamil_goat_uk_s1_powder_800g | approved_single_source_override | **False** (승인 완료) |
| formula_group_hipp_bio_combiotik_de_s1_powder_600g | approved_single_source_override | **False** (승인 완료) |

---

## 승인 행위의 기술적 표현

### `approve_single_source_override` 결정

`reconciliation_decisions.json` 에서 사람이 아래와 같이 기입:

```json
{
  "candidate_group_id": "group_kendamil_goat_uk_s1_powder_800g",
  "reconciliation_classification": "new_review_candidates",
  "normalized_name": "Kendamil Goat UK Stage1 Powder 800g",
  "matched_canonical_id": null,
  "decision": "approve_single_source_override",
  "reviewer_note": "evidence_grade=Verified-C. source_1=official_brand_kendamil(consumer). recall=unknown(UK/FSA 미확인). 사람 명시 승인."
}
```

### 승인 후 policy 필드 변화

`apply_reconciliation_decisions.py` 의 `finalize_policy_after_approval()` 함수에 의해:

| 필드 | 승인 전 (Verified-C) | 승인 후 (approve_single_source_override) |
|---|---|---|
| requires_human_approval | True | **False** |
| is_recommendable | True | True (유지) |
| is_searchable | True | True (유지) |
| is_comparable | True | True (유지) |
| review_status | needs_human_review | approved_single_source_override |

> `approve_single_source_override` 는 "사람이 증거를 확인하고 명시적으로 승인한 행위"를 의미한다.
> 이후 `requires_human_approval=False` 로 전환되며 DB seed 가 가능해진다.

---

## 승인 전 필수 확인 사항

### Verified-C 레코드 승인 전 체크리스트

```
[ ] source_1.source_url 이 실제 접근 가능한 URL 인가? (404 확인)
[ ] 제품명, 브랜드, 라인, 스테이지, 용량이 URL 내용과 일치하는가?
[ ] recall.status 가 unknown 이면 — FSA/RAPEX 에서 검색하여 리콜 여부를 직접 확인했는가?
[ ] specialty_formula trigger 가 없는가? (PRE 단계, HA, 가수분해 등)
[ ] reviewer_note 에 evidence_grade 와 recall 확인 결과가 명시되어 있는가?
```

### Restricted 레코드 (recall=active/batch_specific) 승인 금지

recall_status=active 또는 batch_specific 인 레코드는 어떤 결정도 `approve_*` 계열로 처리하지 않는다.
리콜이 해제될 때까지 `pending` 상태를 유지하거나 `reject` 처리한다.

---

## 승인 큐 Export 형식

현재 파이프라인에서 사람이 직접 참조하는 큐 파일은 `review_queue.next.json` 이다.

### 최소 Export 형식 (CLI)

```bash
PYTHON="/c/Users/khh90/AppData/Roaming/uv/python/cpython-3.14-windows-x86_64-none/python.exe"

$PYTHON -c "
import json
q = json.load(open('data_pipeline/candidates/review_queue.next.json'))
items = q.get('queue_items', [])
print(f'=== Approval Queue ({len(items)} items) ===')
for i, item in enumerate(items, 1):
    print(f'[{i}] {item[\"candidate_group_id\"]}')
    print(f'    status         : {item.get(\"status\")}')
    print(f'    evidence_grade : {item.get(\"evidence_grade\")}')
    print(f'    recall_status  : {item.get(\"recall_status\")}')
    print(f'    evidence_note  : {item.get(\"evidence_note\")}')
    print()
"
```

### 향후 개선 대상 (미구현)

| 기능 | 현재 상태 | 향후 방향 |
|---|---|---|
| 웹 기반 review UI | ❌ 없음 | 관리자 대시보드 검토 페이지 |
| 이메일 알림 | ❌ 없음 | 큐에 아이템 추가 시 알림 |
| 승인 이력 로그 | ⚠️ reviewer_note 에 텍스트만 | 별도 audit_log 테이블 검토 |
| 자동 Verified-A/B 승인 | ❌ 미구현 | 파이프라인에서 자동 처리 검토 |

---

## 정책 요약

| 원칙 | 내용 |
|---|---|
| Verified-C → 반드시 사람이 approve | requires_human_approval=True, 결정 전 DB seed 불가 |
| approve_single_source_override → requires_human_approval=False | 사람이 명시 행위를 완료한 것으로 기록 |
| Restricted (recall active/batch_specific) → 승인 금지 | 리콜 해제 확인 후에만 재투입 |
| Unverified → 큐 진입 자체 금지 | source_1 확보 후 파이프라인 재투입 |
| reviewer_note 필수 | 승인 이유 명시 없이 approve_single_source_override 금지 |

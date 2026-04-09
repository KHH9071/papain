# Production Seed Runbook

> 작성일: 2026-03-11 (Phase 5H)
> 개정: Phase 5I — 자동화 스크립트 추가
> 목적: Phase 5H example 파일(recall_status="unknown")을 바탕으로
>       운영용 approved_canonical.next.json을 생성하고 Supabase에 적재하는 전체 절차.

---

## ⚠️ 필독 주의사항

| 항목 | 내용 |
|---|---|
| **staging 파일 운영 사용 금지** | `data_pipeline/candidates/test_5g_out/approved_canonical.next.json` 은 staging 전용. recall_status="none" (pre-5H). 운영 seed 입력으로 사용하지 말 것. |
| **운영 seed 입력 파일** | 반드시 이 Runbook의 STEP 5 산출물인 `data_pipeline/candidates/approved_canonical.next.json` 만 사용. |
| **실행 순서** | STEP 1 → 2 → 3 → 4(사람) → 5 → 6 체크 → 7(사람 확인) → 8(사람 확인) |
| **사람 승인 자동화 금지** | `approve_single_source_override` 결정은 사람이 직접 기입. 스크립트가 자동 입력하지 않음. |

---

## 자동화 실행 (권장)

`scripts/run_production_seed.ps1` 이 STEP 1~8을 순서대로 실행한다.
사람 개입이 필요한 단계(STEP4 decisions 확인, STEP7 seed 확인, STEP8 baseline 승격)에서 자동으로 중단한다.

### 전체 실행 (새 사이클 시작)

```powershell
cd C:\Users\khh90\Desktop\CODE\papain
.\scripts\run_production_seed.ps1
```

스크립트는 STEP3(reconcile) 완료 후 **자동 중단**한다.
출력된 decisions 상태를 확인하고, `reconciliation_decisions.json`을 수정한 뒤:

```powershell
# decisions.json 상태 확인 및 orphan/누락 자동 보정
$PYTHON = "C:\Users\khh90\Desktop\CODE\papain\.venv\Scripts\python.exe"
& $PYTHON scripts/sync_decisions.py `
  --report data_pipeline/candidates/reconciliation_report.json `
  --decisions data_pipeline/candidates/reconciliation_decisions.json

# orphan 제거 + skeleton 추가만 하고 싶을 때 (decision=null 항목은 직접 기입 필요):
& $PYTHON scripts/sync_decisions.py `
  --report data_pipeline/candidates/reconciliation_report.json `
  --decisions data_pipeline/candidates/reconciliation_decisions.json `
  --fix
```

`decisions.json` 수정 완료 후 STEP5부터 재시작:

```powershell
.\scripts\run_production_seed.ps1 -StartFromApply
```

### dry-run 확인만 (seed 없음)

```powershell
.\scripts\run_production_seed.ps1 -StartFromApply -DryRunOnly
```

---

## 수동 실행 (단계별 상세 절차)

---

## 사전 설정 (매 세션 시작 시 1회)

```powershell
cd C:\Users\khh90\Desktop\CODE\papain
$PYTHON = "C:\Users\khh90\Desktop\CODE\papain\.venv\Scripts\python.exe"
```

---

## STEP 1: map_to_canonical.py — 3개 example 파일 → canonical_candidates.json

**입력:** `data_pipeline/input_sources/second_source_*.json` (3개 파일)
**출력:** `data_pipeline/candidates/canonical_candidates.json`

```powershell
# Kendamil (첫 번째 — 기존 파일 덮어쓰기)
& $PYTHON data_pipeline/map_to_canonical.py `
  --input data_pipeline/input_sources/second_source_kendamil_example.json `
  --output data_pipeline/candidates/canonical_candidates.json

# HiPP (두 번째 — 기존 파일에 추가)
& $PYTHON data_pipeline/map_to_canonical.py `
  --input data_pipeline/input_sources/second_source_hipp_example.json `
  --output data_pipeline/candidates/canonical_candidates.json `
  --append

# Aptamil (세 번째 — 기존 파일에 추가)
& $PYTHON data_pipeline/map_to_canonical.py `
  --input data_pipeline/input_sources/second_source_aptamil_example.json `
  --output data_pipeline/candidates/canonical_candidates.json `
  --append
```

**출력 확인:**

```powershell
& $PYTHON -c "
import json
d = json.load(open('data_pipeline/candidates/canonical_candidates.json', encoding='utf-8'))
candidates = d.get('records', [])
print('총 ' + str(len(candidates)) + '건')
for i, c in enumerate(candidates):
    pid = c.get('canonical_product_id', '?')
    recall = c.get('recall_status')
    print('  [' + str(i+1) + '] ' + pid + ' | recall_status=' + str(recall))
"
```

**기대:** 5건 이상, 모든 항목 `recall_status=unknown`

---

## STEP 2: dedupe_candidates.py — canonical_candidates.json → deduped_candidates.json

**입력:** `data_pipeline/candidates/canonical_candidates.json`
**출력:** `data_pipeline/candidates/deduped_candidates.json`

```powershell
& $PYTHON data_pipeline/dedupe_candidates.py `
  --input data_pipeline/candidates/canonical_candidates.json `
  --output data_pipeline/candidates/deduped_candidates.json
```

---

## STEP 3: reconcile_with_existing_canonical.py — 기존 approved 대조 → reconciliation_report.json

**입력:**
- `data_pipeline/candidates/deduped_candidates.json` (신규 후보)
- `data_pipeline/candidates/approved_canonical.json` (현재 운영 베이스라인 — 읽기 전용)

**출력:** `data_pipeline/candidates/reconciliation_report.json`

```powershell
& $PYTHON data_pipeline/reconcile_with_existing_canonical.py `
  --new-candidates data_pipeline/candidates/deduped_candidates.json `
  --existing data_pipeline/candidates/approved_canonical.json `
  --output data_pipeline/candidates/reconciliation_report.json
```

---

## STEP 4: reconciliation_decisions.json 확인 및 필요 시 수정

`reconciliation_report.json` 결과와 현재 `reconciliation_decisions.json`의 결정 항목이
일치하는지 확인한다.

**현재 report에서 candidate 분류 확인:**

```powershell
& $PYTHON -c "
import json
r = json.load(open('data_pipeline/candidates/reconciliation_report.json', encoding='utf-8'))
for c in r.get('candidates', r.get('results', [])):
    gid = c.get('candidate_group_id', '?')
    cls = c.get('reconciliation_classification', '?')
    print('  ' + gid + ' | ' + cls)
"
```

**현재 decisions.json에서 결정 항목 확인:**

```powershell
& $PYTHON -c "
import json
d = json.load(open('data_pipeline/candidates/reconciliation_decisions.json', encoding='utf-8'))
for item in d['decisions']:
    gid = item.get('candidate_group_id', '?')
    dec = str(item.get('decision'))
    print('  ' + gid + ' | decision=' + dec)
"
```

**체크:**

```
[ ] 이번 cycle 신규 승인 대상 → decision = "approve_single_source_override"
[ ] 두 번째 출처 대기 항목    → decision = "pending_second_source"
[ ] 거절 대상                 → decision = "reject"
[ ] report의 candidate_group_id 와 decisions의 candidate_group_id 가 일치하는가
[ ] decisions 에 orphan(report에 없는 항목)이 있으면 sync_decisions.py --fix 로 제거
```

report에 새 항목이 생겼거나 decisions에 누락된 항목이 있으면
`data_pipeline/candidates/reconciliation_decisions.json`을 편집기에서 직접 수정한다.

---

## STEP 5: apply_reconciliation_decisions.py → approved_canonical.next.json 생성

**입력:**
- `data_pipeline/candidates/reconciliation_decisions.json`
- `data_pipeline/candidates/reconciliation_report.json`
- `data_pipeline/candidates/approved_canonical.json` (기존 베이스라인)
- `data_pipeline/candidates/deduped_candidates.json`

**출력 (모두 `data_pipeline/candidates/` 에 생성):**
- `approved_canonical.next.json` ← **운영 seed 입력 파일**
- `review_queue.next.json`
- `rejected_duplicates.next.json`

```powershell
& $PYTHON data_pipeline/apply_reconciliation_decisions.py `
  --decisions data_pipeline/candidates/reconciliation_decisions.json `
  --report data_pipeline/candidates/reconciliation_report.json `
  --approved data_pipeline/candidates/approved_canonical.json `
  --deduped data_pipeline/candidates/deduped_candidates.json `
  --output-dir data_pipeline/candidates
```

---

## STEP 6: 운영 seed 직전 체크포인트

**이번 cycle 신규 approved 레코드를 최우선으로 확인한다.**
evidence 데이터가 실제로 채워져야 하는 레코드이므로
아래 필드가 모두 정상값인지 반드시 점검한다.

```powershell
& $PYTHON -c "
import json
d = json.load(open('data_pipeline/candidates/approved_canonical.next.json', encoding='utf-8'))
records = d.get('records', [])
print('=== approved_canonical.next.json - ' + str(len(records)) + '건 ===')
for r in records:
    pid   = str(r.get('canonical_product_id', '?'))
    grade = str(r.get('evidence_grade'))
    recall= str(r.get('recall_status'))
    approv= str(r.get('requires_human_approval'))
    url   = str(r.get('evidence_source_1_url'))
    print('  ' + pid)
    print('    evidence_grade          = ' + grade)
    print('    recall_status           = ' + recall)
    print('    requires_human_approval = ' + approv)
    print('    evidence_source_1_url   = ' + url)
    print('')
"
```

**통과 기준:**

```
신규 approved 레코드 (이번 cycle):
  [ ] evidence_grade = "Verified-B" 또는 "Verified-C" (Unverified/null 이면 실패)
  [ ] requires_human_approval = False  ← True 이면 decisions.json 결정 확인
  [ ] evidence_source_1_url 값 있음    ← None 이면 input 파일 evidence 블록 확인
  [ ] recall_status 확인:
        none   → recall_source_url 과 recall_checked_at 이 채워져 있어야 함
        unknown → recall 미확인 상태 (허용, 단 Supabase 에는 unknown 으로 기록됨)

기존 레코드 (Aptamil Profutura, Kendamil Goat S2 등):
  [ ] evidence_grade = None (기존 레코드, evidence 없음 — 정상)
  [ ] 기존 필드 (brand, stage 등) 값 유지
```

위 체크포인트를 모두 통과한 경우에만 STEP 7을 진행한다.

---

## STEP 7: 운영 seed 실행

**dry-run 결과가 STEP 6 체크포인트를 통과한 경우에만 실제 seed를 실행한다.**

```powershell
# dry-run 먼저 — DB 변경 없음
& $PYTHON data_pipeline/seed_canonical_to_supabase.py `
  --input data_pipeline/candidates/approved_canonical.next.json `
  --dry-run
```

dry-run 출력을 확인하고 이상이 없으면:

```powershell
# 실제 적재
& $PYTHON data_pipeline/seed_canonical_to_supabase.py `
  --input data_pipeline/candidates/approved_canonical.next.json
```

**적재 후 Supabase에서 이번 cycle 신규 3건 확인:**

```sql
SELECT
  canonical_product_id,
  evidence_grade,
  recall_status,
  requires_human_approval,
  is_recommendable,
  review_status
FROM canonical_product
WHERE canonical_product_id IN (
  'formula_group_hipp_bio_combiotik_de_sPRE_powder_600g',
  'formula_group_aptamil_aptamil_uk_s1_powder_800g',
  'formula_group_aptamil_aptamil_uk_s2_powder_800g'
);
```

기대 결과:

| canonical_product_id | evidence_grade | recall_status | requires_human_approval | is_recommendable | review_status |
|---|---|---|---|---|---|
| formula_group_hipp_bio_combiotik_de_sPRE_powder_600g | Verified-B | none | false | true | approved_single_source_override |
| formula_group_aptamil_aptamil_uk_s1_powder_800g | Verified-B | unknown | false | true | approved_single_source_override |
| formula_group_aptamil_aptamil_uk_s2_powder_800g | Verified-B | unknown | false | true | approved_single_source_override |

---

## approved_canonical.json 베이스라인 업데이트 (seed 완료 후)

**이 절차는 Supabase seed 성공 및 이번 cycle 신규 반영 확인이 끝난 후에만 실행한다.**

### Step A: 기존 baseline 백업 (타임스탬프 포함)

```powershell
$TS = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP = "data_pipeline/candidates/approved_canonical.backup.$TS.json"
Copy-Item data_pipeline/candidates/approved_canonical.json $BACKUP
Write-Host "백업 완료: $BACKUP"
```

백업 파일 예시: `approved_canonical.backup.20260311_143022.json`

### Step B: next.json → baseline 승격

```powershell
Copy-Item `
  data_pipeline/candidates/approved_canonical.next.json `
  data_pipeline/candidates/approved_canonical.json
Write-Host "승격 완료: approved_canonical.json 업데이트됨"
```

### Step C: 승격 후 무결성 확인

```powershell
& $PYTHON -c "
import json
d = json.load(open('data_pipeline/candidates/approved_canonical.json', encoding='utf-8'))
records = d.get('records', [])
print('총 레코드 수: ' + str(len(records)))
target = {
    'formula_group_hipp_bio_combiotik_de_sPRE_powder_600g',
    'formula_group_aptamil_aptamil_uk_s1_powder_800g',
    'formula_group_aptamil_aptamil_uk_s2_powder_800g'
}
found = [r.get('canonical_product_id') for r in records if r.get('canonical_product_id') in target]
print('신규 3건 포함 여부: ' + str(found))
for r in records:
    pid = str(r.get('canonical_product_id', '?'))
    grade = str(r.get('evidence_grade'))
    recall = str(r.get('recall_status'))
    print('  ' + pid + ' | grade=' + grade + ' | recall=' + recall)
"
```

**통과 기준:**

```
[ ] 총 레코드 수가 이전 baseline보다 3건 증가했는가 (7건)
[ ] 신규 3건 포함 여부 출력에 세 ID가 모두 있는가
    - formula_group_hipp_bio_combiotik_de_sPRE_powder_600g
    - formula_group_aptamil_aptamil_uk_s1_powder_800g
    - formula_group_aptamil_aptamil_uk_s2_powder_800g
[ ] 신규 3건의 evidence_grade = Verified-B
[ ] HiPP PRE recall_status = none / Aptamil S1, S2 recall_status = unknown
[ ] 백업 파일이 candidates/ 디렉터리에 존재하는가
```

이상이 없으면 베이스라인 업데이트 완료. 백업 파일은 다음 사이클 전까지 보존한다.

---

## 파일 흐름 요약

```
[STEP 1] input_sources/second_source_kendamil_example.json  ┐
[STEP 1] input_sources/second_source_hipp_example.json      ├→ candidates/canonical_candidates.json
[STEP 1] input_sources/second_source_aptamil_example.json   ┘

[STEP 2] canonical_candidates.json → candidates/deduped_candidates.json

[STEP 3] deduped_candidates.json
         + candidates/approved_canonical.json (기존 베이스라인)
         → candidates/reconciliation_report.json

[STEP 4] reconciliation_decisions.json 확인 / 필요 시 수정

[STEP 5] reconciliation_decisions.json
         + reconciliation_report.json
         + approved_canonical.json
         + deduped_candidates.json
         → candidates/approved_canonical.next.json  ← 운영 seed 입력
         → candidates/review_queue.next.json
         → candidates/rejected_duplicates.next.json

[STEP 6] 체크포인트 확인 (recall_status, evidence_grade, url 등)

[STEP 7] seed_canonical_to_supabase.py
         --input candidates/approved_canonical.next.json
         → Supabase canonical_product 테이블 upsert
```

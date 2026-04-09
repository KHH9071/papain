# Staging Seed 검증 절차

> 작성일: 2026-03-11 (Phase 5H)
> 목적: Supabase canonical_product 테이블에 증거 기반 레코드를 처음 적재하기 전에
>       4건 전체 mixed upsert로 동작을 검증하는 절차.
> 전제: schema/canonical_product_evidence_columns.sql 을 먼저 Supabase 에서 실행했어야 함.

---

## 검증 목표

이 절차는 단순 "신규 삽입"이 아닌 **mixed upsert**를 수행한다.

| 검증 항목 | 대상 레코드 | 기대 결과 |
|---|---|---|
| 신규 INSERT (evidence 컬럼 포함) | Kendamil Goat S1, HiPP S1 | evidence_grade, recall_status 등 13개 컬럼에 값이 들어감 |
| 기존 UPDATE (evidence 컬럼 null → null 유지) | Aptamil Profutura S1, Kendamil Goat S2 | 기존 컬럼 유지, 새 컬럼은 null (backward compat 확인) |
| upsert 충돌 없음 | 4건 전체 | canonical_product_id 중복 시 INSERT 아닌 UPDATE 처리 확인 |
| 기존 조회 API 에러 없음 | /search | null 컬럼이 있어도 기존 SearchClient.tsx 정상 동작 |

---

## ⚠️ 주의사항: recall_status="none" (pre-Phase 5H 산출물)

현재 사용하는 입력 파일(`test_5g_out/approved_canonical.next.json`)은
**Phase 5G 테스트 파이프라인이 생성한 파일**이다.

Phase 5H 이전에 생성되었으므로 recall_status 값이 `"none"` 으로 하드코딩되어 있다.
이는 정책 위반이 아닌 **테스트 환경의 사전 조건**이다.

- Staging 목적: upsert/backward compat 동작 검증 → `"none"` 값으로도 수행 가능, 문제 없음
- 실제 운영 seed 전에는 아래 TODO 참고

> **[TODO — 운영 seed 전 필수]**
> Phase 5H 기준 example 파일(`second_source_*.json`)로 파이프라인을 전체 재실행하여
> `recall_status="unknown"` 값이 담긴 새 `approved_canonical.json`을 생성한 후 seed할 것.
> (`map_to_canonical.py` → `reconcile_with_existing_canonical.py` → `apply_reconciliation_decisions.py` → `seed_canonical_to_supabase.py` 순서)

---

## 사전 준비 체크리스트

```
[ ] schema/canonical_product_evidence_columns.sql 을 Supabase SQL Editor 에서 실행했는가?
    → Results 탭에 "Success. No rows returned" 가 나오면 정상 (Explain 탭 에러는 무시)
[ ] 아래 확인 쿼리로 13개 컬럼이 존재하는지 확인했는가?
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'canonical_product'
      AND column_name IN (
        'evidence_grade', 'evidence_source_1_type', 'evidence_source_1_url',
        'evidence_source_2_type', 'evidence_source_2_url', 'recall_status',
        'recall_jurisdiction', 'recall_source_url', 'recall_checked_at',
        'requires_human_approval', 'is_recommendable', 'is_searchable', 'is_comparable'
      )
    ORDER BY column_name;
    -- 13행이 나와야 함
[ ] .env.local 에 SUPABASE_SERVICE_ROLE_KEY 가 설정되어 있는가?
[ ] test_5g_out/approved_canonical.next.json 이 존재하는가?
    경로: data_pipeline/candidates/test_5g_out/approved_canonical.next.json
[ ] Supabase canonical_product 테이블에 Aptamil Profutura, Kendamil Goat S2 기존 레코드가 있는가?
    (없으면 mixed upsert 검증 불가 — 기존 레코드가 있어야 UPDATE 경로 확인 가능)
```

---

## Step 1: Dry-Run — 4건 변환 결과 확인

**PowerShell에서 실행:**

```powershell
cd C:\Users\khh90\Desktop\CODE\papain

$PYTHON = "C:\Users\khh90\Desktop\CODE\papain\.venv\Scripts\python.exe"

& $PYTHON data_pipeline/seed_canonical_to_supabase.py `
  --input data_pipeline/candidates/test_5g_out/approved_canonical.next.json `
  --dry-run
```

> `--limit` 없음: 4건 전체를 dry-run함.

**기대 출력 (확인 포인트):**

```
[DRY-RUN] 실제 DB에 적재하지 않습니다.

[1] formula_group_aptamil_profutura_uk_s1_powder_800g    ← 기존 레코드 (UPDATE 경로)
     evidence_grade              : None
     evidence_source_1_type      : None
     evidence_source_1_url       : None
     recall_status               : None
     requires_human_approval     : None
     is_recommendable            : None

[2] formula_group_kendamil_goat_uk_s2_powder_800g        ← 기존 레코드 (UPDATE 경로)
     evidence_grade              : None
     ...

[3] formula_group_kendamil_goat_uk_s1_powder_800g        ← 신규 레코드 (INSERT 경로)
     evidence_grade              : Verified-C
     evidence_source_1_type      : manufacturer_consumer
     evidence_source_1_url       : https://kendamil.com/products/goat-first-infant-milk
     recall_status               : none       ← ⚠️ pre-5H 파일이므로 "none" (운영에서는 "unknown" 이어야 함)
     requires_human_approval     : False
     is_recommendable            : True
     is_searchable               : True
     is_comparable               : True

[4] formula_group_hipp_bio_combiotik_de_s1_powder_600g   ← 신규 레코드 (INSERT 경로)
     evidence_grade              : Verified-C
     recall_status               : none       ← ⚠️ 동일
     requires_human_approval     : False
     is_recommendable            : True
```

**확인 체크리스트:**

```
[ ] [1][2] 는 evidence 필드가 모두 None (기존 레코드, evidence 없음 — 정상)
[ ] [3][4] 는 evidence_grade=Verified-C, recall_status 값 있음
[ ] [3][4] 의 recall_status="none" 은 pre-5H 산출물이므로 허용 (Staging 한정)
[ ] requires_human_approval=False (approve_single_source_override 완료 상태)
[ ] DRY-RUN 메시지 확인 — 실제 DB 변경 없음
```

---

## Step 2: 실제 Seed (4건 전체)

**PowerShell에서 실행:**

```powershell
# $PYTHON 이 아직 설정되지 않았다면:
# $PYTHON = "C:\Users\khh90\Desktop\CODE\papain\.venv\Scripts\python.exe"

& $PYTHON data_pipeline/seed_canonical_to_supabase.py `
  --input data_pipeline/candidates/test_5g_out/approved_canonical.next.json
```

**기대 출력:**

```
[Step 1] canonical_product 테이블에 upsert 중...
  배치 [  1/1]  [####################] 100.0%  (4/4건)

[Step 2] 적재 검증 중...
         -> 테이블 실제 행 수: N건
```

---

## Step 3: Supabase 에서 신규 2건 확인

Supabase Dashboard → SQL Editor:

```sql
-- 신규 적재된 2건 (evidence 값 있어야 함)
SELECT
  canonical_product_id,
  evidence_grade,
  recall_status,
  requires_human_approval,
  is_recommendable,
  is_searchable,
  is_comparable,
  review_status
FROM canonical_product
WHERE canonical_product_id IN (
  'formula_group_kendamil_goat_uk_s1_powder_800g',
  'formula_group_hipp_bio_combiotik_de_s1_powder_600g'
);
```

**기대 결과:**

| canonical_product_id | evidence_grade | recall_status | requires_human_approval | is_recommendable | review_status |
|---|---|---|---|---|---|
| formula_group_kendamil_goat_uk_s1_powder_800g | Verified-C | none | false | true | approved_single_source_override |
| formula_group_hipp_bio_combiotik_de_s1_powder_600g | Verified-C | none | false | true | approved_single_source_override |

> `recall_status="none"` 은 pre-5H 파일 산출물이므로 이 단계에서 허용.
> 운영 seed 전에는 Phase 5H 파이프라인 재실행 후 `"unknown"` 확인 필요.

---

## Step 4: 기존 2건 Backward Compatibility 확인

```sql
-- 기존 2건 — 새 evidence 컬럼이 모두 null 이어야 함 (기존 데이터 변경 없음)
SELECT
  canonical_product_id,
  evidence_grade,
  recall_status,
  requires_human_approval,
  is_recommendable
FROM canonical_product
WHERE canonical_product_id IN (
  'formula_group_aptamil_profutura_uk_s1_powder_800g',
  'formula_group_kendamil_goat_uk_s2_powder_800g'
);
```

**기대 결과:** 새 컬럼이 모두 `NULL` — 기존 데이터 변경 없음.

```
[ ] evidence_grade = null
[ ] recall_status = null
[ ] requires_human_approval = null
[ ] is_recommendable = null
[ ] 기존 컬럼 (name, brand, stage 등) 값 유지 확인
```

---

## Step 5: 기존 API 정상 동작 확인

### SearchClient null 안전성 확인 (코드 참조 검색)

```powershell
# evidence 관련 필드를 src/ 에서 직접 참조하는지 확인
Get-ChildItem -Path src -Recurse -Include "*.tsx","*.ts" | Select-String -Pattern "evidence_grade|recall_status|is_recommendable|requires_human_approval"
```

**기대 결과:** 결과 없음 (해당 필드를 UI 코드에서 직접 참조하지 않음).

### /search 정상 동작 확인

```powershell
npm run dev
# 브라우저에서 http://localhost:3000/search 접속
# 기존 검색 기능 정상 동작 확인
```

---

## Staging vs 운영 분리 정책

| 항목 | Staging (현재 절차) | 운영 (향후) |
|---|---|---|
| 입력 파일 | `test_5g_out/approved_canonical.next.json` (Phase 5G 산출물) | 신규 파이프라인 실행 산출물 |
| recall_status | `"none"` (pre-5H 하드코딩값) | `"unknown"` (Phase 5H 정책값) |
| 목적 | upsert/backward compat 동작 검증 | 실제 운영 데이터 적재 |
| 검증 후 조치 | 필요 시 롤백 (아래 참조) | 롤백 절차 동일 |

### 운영 seed 전 필수 절차

```
1. Phase 5H example 파일로 파이프라인 재실행:
   map_to_canonical.py → reconcile_with_existing_canonical.py
   → apply_reconciliation_decisions.py → (review/approve)
   → seed_canonical_to_supabase.py

2. 재실행 전 example 파일 상태 확인:
   - second_source_kendamil_example.json: recall.status="unknown" ✅
   - second_source_hipp_example.json: recall.status="unknown" ✅
   - second_source_aptamil_example.json: recall.status="unknown" ✅

3. 신규 산출 approved_canonical.json에서 recall_status="unknown" 확인 후 seed
```

---

## 롤백 절차

seed 후 문제가 발생하면:

```sql
-- 신규 추가된 2건만 삭제 (기존 2건은 upsert되었으므로 원상복구 불가 — 사전 백업 권장)
DELETE FROM canonical_product
WHERE canonical_product_id IN (
  'formula_group_kendamil_goat_uk_s1_powder_800g',
  'formula_group_hipp_bio_combiotik_de_s1_powder_600g'
);

-- 컬럼 자체 삭제는 권장하지 않음 (기존 row에도 영향)
-- 필요 시에만:
-- ALTER TABLE canonical_product DROP COLUMN IF EXISTS evidence_grade;
-- (나머지 12개도 동일)
-- ⚠️ 컬럼 삭제는 되돌릴 수 없음. 신중하게 실행.
```

> **기존 2건(Aptamil, Kendamil S2)의 upsert 결과:** 새 컬럼이 null로 upsert됨.
> null → null 업데이트이므로 실질적 변경 없음. 별도 롤백 불필요.

---

## 완료 체크리스트

```
[ ] SQL 마이그레이션 실행 완료 (13개 컬럼 확인)
[ ] Dry-run 출력에서 4건 모두 확인
    [ ] [1][2] evidence 필드 None (기존 레코드)
    [ ] [3][4] evidence_grade=Verified-C, recall_status 값 있음
[ ] 4건 실제 seed 완료
[ ] Supabase에서 신규 2건 evidence 컬럼 값 확인
[ ] 기존 2건 새 컬럼 null 유지 확인
[ ] /search 페이지 정상 동작 확인
[ ] (운영 전) Phase 5H 파이프라인 재실행 → recall_status="unknown" 확인
```

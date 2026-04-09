-- canonical_product_evidence_columns.sql
-- Phase 5H: evidence / recall / policy 컬럼 추가 마이그레이션
--
-- 실행 대상: Supabase SQL Editor (canonical_product 테이블이 존재해야 함)
-- 실행 조건: canonical_product 테이블이 이미 존재해야 함 (schema/canonical_product.sql 먼저 실행)
-- 전제: 이 SQL 은 idempotent (IF NOT EXISTS) → 안전하게 재실행 가능
--
-- Phase 5H 변경사항:
--   recall_status enum 변경: {none, active, historical} → {unknown, none, active, resolved, batch_specific}
--   - unknown    : 확인 미완료 (기본값)
--   - none       : 실제 리콜 없음 (출처 URL 확인 완료)
--   - active     : 현재 리콜 진행 중
--   - resolved   : 과거 리콜이 있었으나 해결됨
--   - batch_specific : 특정 배치(lot)에만 해당하는 부분 리콜 (active 와 동일하게 Restricted 처리)
--
-- Backward compatibility:
--   기존 row 에 이 컬럼들이 없으면 NULL 로 채워짐. NULL = "정보 없음". 파이프라인이 null 을 안전하게 처리함.
--   기존 row 를 수정하지 않음. 신규 컬럼은 DEFAULT NULL.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Evidence 컬럼
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS evidence_grade           TEXT
    CHECK (
      evidence_grade IS NULL OR
      evidence_grade IN ('Verified-A', 'Verified-B', 'Verified-C', 'Restricted', 'Unverified')
    );

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS evidence_source_1_type   TEXT
    CHECK (
      evidence_source_1_type IS NULL OR
      evidence_source_1_type IN (
        'manufacturer_consumer', 'manufacturer_hcp', 'retailer', 'regulator'
      )
    );

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS evidence_source_1_url    TEXT;

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS evidence_source_2_type   TEXT
    CHECK (
      evidence_source_2_type IS NULL OR
      evidence_source_2_type IN (
        'manufacturer_consumer', 'manufacturer_hcp', 'retailer', 'regulator'
      )
    );

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS evidence_source_2_url    TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Recall 컬럼
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS recall_status            TEXT
    CHECK (
      recall_status IS NULL OR
      recall_status IN ('unknown', 'none', 'active', 'resolved', 'batch_specific')
    );

-- Phase 5H 기본값 정책:
--   NULL  = 컬럼 자체가 없었던 기존 row (아직 파이프라인 미통과)
--   'unknown' = 파이프라인 통과, 리콜 미확인 (파이프라인 기본값)
--   'none'    = 리콜 없음 (출처 URL 확인 완료 시에만 사용)

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS recall_jurisdiction      TEXT;

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS recall_source_url        TEXT;

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS recall_checked_at        DATE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Policy 컬럼 (사용자 노출 제어)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS requires_human_approval  BOOLEAN;

-- NULL 해석:
--   NULL  = 정보 없음 (기존 row, v1.0 파이프라인 미통과)
--   TRUE  = 사람 명시 승인 전까지 노출 금지
--   FALSE = 자동 또는 사람 승인 완료

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS is_recommendable         BOOLEAN;

-- NULL  = 알 수 없음 (기존 row)
-- TRUE  = 추천 목록 노출 가능
-- FALSE = 추천 금지 (recall 등)

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS is_searchable            BOOLEAN;

-- NULL  = 알 수 없음
-- TRUE  = 검색 결과 노출 가능
-- FALSE = 검색 결과에서 제외 (Unverified 등)

ALTER TABLE canonical_product
  ADD COLUMN IF NOT EXISTS is_comparable            BOOLEAN;

-- NULL  = 알 수 없음
-- TRUE  = 비교 분석에 포함 가능
-- FALSE = 비교 제외 (recall active, Unverified 등)

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. 확인 쿼리 (실행 후 컬럼 목록 확인)
-- ─────────────────────────────────────────────────────────────────────────────

-- 아래 쿼리로 컬럼이 추가됐는지 확인:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'canonical_product'
--   AND column_name IN (
--     'evidence_grade', 'evidence_source_1_type', 'evidence_source_1_url',
--     'evidence_source_2_type', 'evidence_source_2_url',
--     'recall_status', 'recall_jurisdiction', 'recall_source_url', 'recall_checked_at',
--     'requires_human_approval', 'is_recommendable', 'is_searchable', 'is_comparable'
--   )
-- ORDER BY column_name;
--
-- 기대 결과: 13개 행, 모두 is_nullable = 'YES'

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS 참고 (canonical_product 기존 RLS 정책 유지)
-- ─────────────────────────────────────────────────────────────────────────────

-- 새 컬럼은 기존 canonical_product RLS 정책을 상속한다.
-- service_role 키로 쓰기, anon 키로 읽기 — 기존과 동일.
-- 새 컬럼에 대한 별도 RLS 정책 추가는 불필요.

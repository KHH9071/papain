# Phase 4A — Canonical Read Layer

> 작성일: 2026-03-10
> 전제: Phase 3C 완료 (canonical_product 테이블 생성 + 2건 적재 완료)

---

## 이번 단계에서 추가한 것

### 수정한 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/types.ts` | `CanonicalProduct` 타입 및 관련 union 타입 6개 추가 |

### 새로 만든 파일

| 파일 | 역할 |
|---|---|
| `src/lib/canonical_products.ts` | canonical_product 테이블 read layer |

---

## 추가한 타입 (`src/lib/types.ts`)

기존 `Product` / `ProductMetadata` 타입과 **완전히 분리**. 섞지 않는다.

| 타입 | 내용 |
|---|---|
| `CanonicalProductConfidence` | `"high" \| "medium" \| "low"` |
| `CanonicalProductStage` | `"PRE" \| "1" \| "2" \| "3" \| "4" \| "unknown"` |
| `CanonicalProductCountryVersion` | `"KR" \| "DE" \| "UK" \| "EU" \| "AU" \| "US" \| "Unknown"` |
| `CanonicalProductMilkBase` | `"cow" \| "goat" \| "plant" \| "unknown"` |
| `CanonicalProductProteinType` | `"standard" \| "partial_hydrolyzed" \| "full_hydrolyzed" \| "amino_acid" \| "unknown"` |
| `CanonicalProductFormulaType` | `"infant_formula" \| "follow_on_formula" \| "growing_up_milk" \| "specialty_formula" \| "unknown"` |
| `CanonicalProductForm` | `"powder" \| "liquid" \| "ready_to_feed" \| "unknown"` |
| `CanonicalProduct` | canonical_product 테이블 행 전체 (22개 필드) |

---

## 추가한 read 함수 (`src/lib/canonical_products.ts`)

모두 **읽기 전용**. write / update / delete 없음.

| 함수 | 시그니처 | 설명 |
|---|---|---|
| `listCanonicalProducts` | `() → Promise<CanonicalProduct[]>` | 전체 목록 (brand 오름차순) |
| `getCanonicalProductById` | `(id: string) → Promise<CanonicalProduct \| null>` | ID로 단일 조회 |
| `listCanonicalProductsByCountry` | `(cv: CanonicalProductCountryVersion) → Promise<CanonicalProduct[]>` | country_version 필터 |
| `listCanonicalProductsByStage` | `(stage: CanonicalProductStage) → Promise<CanonicalProduct[]>` | stage 필터 |
| `listCanonicalProductsByFilter` | `({ countryVersion?, stage?, brand? }) → Promise<CanonicalProduct[]>` | 복합 필터 |

### 클라이언트 선택 이유

`src/lib/supabase/client.ts` (anon 키)를 그대로 사용한다.

- `canonical_product` 테이블에 공개 SELECT RLS 정책이 적용되어 있으므로 anon 키로 읽기 가능
- 별도 서버 컴포넌트 전용 클라이언트 불필요
- Next.js 클라이언트/서버 컴포넌트 모두에서 import 가능
- 기존 `SearchClient.tsx`가 동일한 `supabase` 클라이언트를 쓰는 것과 일관성 유지

---

## 현재 상태: 아직 어떤 화면도 바꾸지 않았다

| 항목 | 상태 |
|---|---|
| `src/app/_components/SearchClient.tsx` | 수정 없음 |
| `/search` 페이지 구조 | 변경 없음 |
| `/record`, `/` 페이지 | 변경 없음 |
| `products` 테이블 쿼리 | 유지 중 |

`canonical_products.ts`는 생성됐지만, **어떤 컴포넌트도 아직 import하지 않는다.**
앱 동작에 영향 없음.

---

## products ↔ canonical_product 공존 상태

두 테이블은 현재 독립적이다.

| | `products` | `canonical_product` |
|---|---|---|
| 용도 | 보충제 + 현행 분유 데이터 | 분유 canonical 레코드 (검증된 것만) |
| 적재 스크립트 | `seed_curated_to_supabase.py` | `seed_canonical_to_supabase.py` |
| 앱 연결 | SearchClient.tsx가 직접 조회 | 아직 미연결 |
| 타입 | `Product` | `CanonicalProduct` |
| 항목 수 | 수천 건 | 현재 2건 (Wave 1 샘플) |

분리 이유: Option B 전략 (PHASE3B_POLICY_LOCK.md Policy 1).
기존 보충제 스키마와 분유 canonical 스키마가 다름. 혼합하면 수천 건에 null 컬럼 발생.

---

## Phase 4B에서 할 수 있는 일

### 우선순위 높음

1. **분유 전용 목록 페이지 또는 섹션**
   - `listCanonicalProducts()`를 사용하는 서버 컴포넌트 / RSC
   - `/formula` 또는 `/search?category=formula` 연결

2. **SearchClient.tsx에 canonical 분유 탭 추가**
   - 기존 products 탭과 분리, canonical_product 조회 결과를 별도 렌더링
   - `listCanonicalProductsByFilter({ countryVersion, stage })` 활용 가능

3. **비교 UI에 country_version 축 추가**
   - `listCanonicalProductsByCountry("UK")` vs `listCanonicalProductsByCountry("DE")`

### 우선순위 낮음 (데이터 더 필요)

4. **`product_repository.ts` 추상화 레이어** (Plan v1.2 Phase 4-A 원안)
   - `products` + `canonical_product` 단일 인터페이스로 추상화
   - 현재 canonical 레코드가 2건뿐이라 ROI 낮음. 데이터 확장 후 검토.

5. **`routine_foods.ts` canonical 쿼리로 교체**
   - 정적 mock을 DB 조회로 전환 — 데이터 품질 충분히 확보 후

---

## 아직 하지 않은 것

| 항목 | 이유 |
|---|---|
| SearchClient.tsx에 canonical 데이터 연결 | Phase 4B |
| `/search` 필터에 country_version / stage 추가 | Phase 4B |
| `product_repository.ts` (추상화 레이어) | 데이터 2건 상태에서 설계 불필요. Phase 4B+ |
| `products` 테이블 제거 또는 대체 | canonical 레코드 충분히 확보 후 결정 |
| 타입스크립트 빌드 검증 자동화 | 현재 파일은 import만 없으면 빌드 무관 |

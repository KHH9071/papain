# Phase 4B — Canonical UI 연결

> 작성일: 2026-03-10
> 전제: Phase 4A 완료 (canonical_products.ts read layer, CanonicalProduct 타입)

---

## 어떤 화면에 어떻게 연결했는가

### 화면: `/search` (SearchClient)

**탭 조건**: "분유·루틴" 탭 (`categoryFilter === "routine"`) 선택 시에만 노출.
**모드 조건**: 텍스트 검색 중, 비교 탐색 모드, 단계 필터 활성 시에는 숨김.
→ 기본 분유 탐색 맥락에서만 보임.

**섹션 위치**: 스크롤 영역 상단 — 기존 products 카드 목록 **위**, 섹션 헤더와 구분선으로 분리.

```
[분유·루틴 탭 선택 시]
─────────────────────────────
  분유 Canonical   [복수 출처 검증]    2건
  ┌─────────────────────────────┐
  │ Aptamil · Profutura         │ [중신뢰]
  │ Aptamil Profutura UK Stage1 Powder 800g │
  │ UK  1단계  소유  분말        │
  │ 2개 출처 검증                │
  └─────────────────────────────┘
  ┌─────────────────────────────┐
  │ Kendamil · Goat             │ [중신뢰]
  │ ...                         │
  └─────────────────────────────┘
  ──── 기존 분유·루틴 제품 ─────
[기존 products 카드들...]
```

---

## 기존 products와 어떻게 분리했는가

| 항목 | 기존 products 목록 | Canonical 섹션 |
|---|---|---|
| 데이터 소스 | `products` 테이블 (SearchClient state) | `canonical_product` 테이블 (page.tsx 서버 페치) |
| 컴포넌트 | `MobileProductCard` | `CanonicalFormulaSection` > `CanonicalProductCard` |
| 선택/추가 기능 | 있음 (Zustand store 연동) | 없음 (표시 전용) |
| 타입 | `Product` | `CanonicalProduct` |
| 검색 반응 | 텍스트 검색어에 따라 필터링 | 검색 중에는 섹션 전체 숨김 |
| 렌더 조건 | 항상 | "분유·루틴" 탭 + 기본 탐색 모드만 |

데이터 배열 혼합 없음. 컴포넌트 계층 분리. 선택 상태 공유 없음.

---

## 데이터 흐름

```
page.tsx (서버 컴포넌트)
  ├── getProducts()            → initialProducts     → SearchClient → MobileProductCard
  └── listCanonicalProducts()  → initialCanonicalProducts → SearchClient → CanonicalFormulaSection
```

`listCanonicalProducts()`는 `src/lib/canonical_products.ts`의 read layer만 사용.
SearchClient에서 직접 Supabase 쿼리 없음.

---

## 현재는 최소 UI (데이터 2건 기준)

- 현재 `canonical_product`에 2건 (Aptamil Profutura UK Stage1, Kendamil Goat UK Stage2)
- 표시 항목: brand · line · normalized_name · country_version · stage · milk_base · form · organic_flag · confidence_score · source_count
- 선택/비교/필터 기능 없음 — 표시 전용
- 데이터가 충분히 쌓인 후 기능 확장 검토

---

## 수정한 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/search/page.tsx` | `listCanonicalProducts()` 추가 페치, `initialCanonicalProducts` prop 전달 |
| `src/app/_components/SearchClient.tsx` | import 2줄 추가, prop 1개 추가, 조건부 렌더 블록 추가 (~12줄) |

## 새로 만든 파일

| 파일 | 역할 |
|---|---|
| `src/app/_components/search/CanonicalFormulaSection.tsx` | canonical 카드 + 섹션 컴포넌트 |

---

## 기존 검색 흐름에 영향이 있는가

**없음.**

- `getProducts()` 로직 변경 없음
- SearchClient 기존 state, 필터, 검색 로직 변경 없음
- `MobileProductCard` 변경 없음
- 새 prop `initialCanonicalProducts`는 optional (`?`) — 누락 시 섹션 미렌더
- TypeScript `tsc --noEmit` 에러 없음

---

## 아직 남겨둔 확장 포인트

| 항목 | 위치 | 설명 |
|---|---|---|
| 선택/추가 기능 | `CanonicalProductCard` | 현재 표시 전용. 향후 루틴 추가 UI 연결 가능 |
| country_version 필터 | `CanonicalFormulaSection` | 데이터 증가 후 UK/DE 탭 분리 가능 |
| stage 필터 연동 | SearchClient stageFilter | canonical 섹션도 stage 필터에 반응하도록 확장 가능 |
| "전체" 탭 노출 | SearchClient | 현재 "routine" 탭만. 전체 탭에도 노출 여부 추후 결정 |
| 텍스트 검색 반응 | CanonicalFormulaSection | 현재 검색 중 숨김. 향후 brand/name으로 필터링 가능 |

---

## Phase 4C에서 할 수 있는 일

### 데이터 확장 후 즉시 가능

1. **canonical 섹션에서 단계 필터 반응**
   - stageFilter state를 `CanonicalFormulaSection`에 prop으로 전달
   - stage가 일치하는 canonical 제품만 표시

2. **country_version 탭 분리**
   - UK / DE / US 탭 칩 추가 (데이터가 각 국가에 최소 2-3건 있을 때)

3. **canonical 제품 선택 기능**
   - `CanonicalProduct`를 Zustand store의 선택 목록에 추가하는 흐름 설계
   - 현재 store는 `Product[]` 기반이므로 타입 정렬 필요

### 데이터 파이프라인 확장 후

4. **Wave 1 브랜드 공식 카탈로그 수집** → 레코드 증가 → 위 기능 실질적 활성화
5. **`product_repository.ts` 추상화 레이어** — canonical + products 단일 인터페이스 (데이터 > 50건 이후 검토)

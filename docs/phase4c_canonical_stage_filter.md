# Phase 4C — Canonical Stage Filter 연동

> 작성일: 2026-03-10
> 전제: Phase 4B 완료 (canonical 섹션 /search 노출)

---

## stageFilter를 canonical 섹션에 어떻게 연결했는가

### 데이터 흐름

```
SearchClient.stageFilter (number | null)
    ↓ prop
CanonicalFormulaSection({ products, stageFilter })
    ↓ 내부 필터
filtered = stageFilter === null
  ? products                                     // 전체
  : products.filter(p => p.stage === String(stageFilter))  // 단계 일치만
```

### SearchClient 변경 (2줄)

```tsx
// Before (Phase 4B)
<CanonicalFormulaSection products={initialCanonicalProducts} />

// After (Phase 4C)
<CanonicalFormulaSection
  products={initialCanonicalProducts}
  stageFilter={stageFilter}
/>
```

`stageFilter === null` 조건을 렌더 조건에서 제거. stageFilter가 활성화된 상태에서도 섹션이 렌더링되어 `CanonicalFormulaSection` 내부 필터가 동작한다.

### 필터링 책임 분리

| 역할 | 위치 |
|---|---|
| stageFilter 상태 관리 | `SearchClient` (기존 그대로) |
| products 배열의 stage 필터링 | `SearchClient.displayedProducts` (기존 그대로) |
| canonical 배열의 stage 필터링 | `CanonicalFormulaSection` 내부 |

두 필터는 독립적으로 동작. 각자 자기 데이터만 처리.

---

## 특정 stage 선택 시 "unknown" 처리

`p.stage === String(stageFilter)` 조건을 쓰므로:

- `stageFilter = 1` → `p.stage === "1"` 인 레코드만 통과
- `p.stage === "unknown"` 레코드는 `"1"` 과 일치하지 않으므로 자동 제외

별도 예외 처리 없이 자연스럽게 숨겨짐. "unknown" stage는 전체 보기(`stageFilter = null`)에서만 노출.

---

## canonical 결과가 0건일 때 처리 방식

**섹션 전체 숨김** (empty state 미표시).

```tsx
// CanonicalFormulaSection.tsx
if (filtered.length === 0) return null
```

### 근거

- 현재 canonical 데이터는 2건 (Stage 1 Aptamil, Stage 2 Kendamil)
- Stage 3 / Stage 4 / PRE 선택 시 항상 0건 → empty state가 매 단계마다 출현
- "이 단계의 canonical 분유 없음" 메시지가 데이터 희소 기간 중 반복 노이즈 발생
- 섹션이 없는 것이 더 깔끔한 UX. 기존 products 목록은 그대로 보임.

데이터가 충분히 쌓이면 empty state 도입 재검토 가능.

---

## 기존 products 흐름과 어떻게 분리 상태를 유지했는가

| 항목 | 상태 |
|---|---|
| `displayedProducts` 계산 로직 | 변경 없음 |
| `stageFilter` 상태 자체 | 변경 없음 |
| `MobileProductCard` | 변경 없음 |
| 두 데이터 배열 혼합 | 없음 |
| 선택 상태 공유 | 없음 |

`stageFilter` 값을 읽어서 prop으로 내려보낼 뿐. SearchClient 내 기존 필터 로직은 한 줄도 건드리지 않았다.

---

## 수정한 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `src/app/_components/search/CanonicalFormulaSection.tsx` | `stageFilter` prop 추가, 내부 필터 로직, `filtered.length === 0` guard |
| `src/app/_components/SearchClient.tsx` | 렌더 조건에서 `stageFilter === null` 제거, `stageFilter={stageFilter}` prop 전달 |

---

## 아직 하지 않은 것

| 항목 | 이유 |
|---|---|
| 텍스트 검색 canonical 반응 | Phase 4C 범위 외 |
| country_version 탭 분리 | 데이터 증가 후 |
| canonical 선택/루틴 추가 기능 | Zustand store 타입 정렬 필요 |
| empty state 문구 | 데이터 희소 기간 중 노이즈. 나중에 재검토 |
| `product_repository.ts` | 데이터 충분 후 |

---

## Phase 4D에서 할 수 있는 일

1. **텍스트 검색 연동** — `debouncedQuery`가 활성화됐을 때 canonical 섹션을 숨기는 대신 brand/normalized_name으로 필터링
2. **country_version 필터 UI** — UK/DE 탭 칩 (canonical 레코드 10건+ 이후)
3. **canonical 선택 기능** — `CanonicalProduct`를 루틴 추가 흐름에 연결 (store 타입 정렬 선행 필요)
4. **Wave 1 브랜드 데이터 확장** — fetch_official_sources.py + 파이프라인 재실행으로 canonical 레코드 증가

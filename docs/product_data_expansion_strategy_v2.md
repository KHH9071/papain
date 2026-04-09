# 파파인 제품 데이터 확장 전략 v2

## 1. 목적
파파인의 목표는 단순히 많은 제품을 모으는 것이 아니라,
**한국 부모가 실제로 탐색·구매 가능한 분유·우유·치즈 제품을 고커버리지로 확보하고,
그 데이터를 지속적으로 업데이트할 수 있는 운영체계**를 만드는 것이다.

## 2. 핵심 원칙
1. 제품 수집보다 **누락 최소화 구조**가 먼저다.
2. 분유는 가장 먼저 정규화해야 하는 품목이다.
3. canonical product와 판매채널 listing은 분리한다.
4. low-confidence 데이터는 자동 반영하지 않는다.
5. AI agent 팀은 보조가 아니라 운영 구조다.

## 3. 수집 구조

### Layer A. 공적/권위 소스
- 식품안전나라 국내식품 검색
- 식품안전나라 수입식품조회
- 수입식품 안전 관련 정보

### Layer B. 국내 판매채널
- 쿠팡
- SSG
- 이후 네이버쇼핑, 컬리, 롯데온, 11번가, G마켓 확장

### Layer C. 해외 브랜드 공식 카탈로그
- HiPP
- Aptamil
- Kendamil
- Bubs
- Kabrita
- Similac
- 이후 Holle, Enfamil, NAN, Bobbie 등 확장

### Layer D. 직구 가능 채널
- Amazon international shipping eligible 중심
- 이후 국가별 구매대행/리셀러 검토

## 4. 품목 우선순위
1. 분유: 깊이 우선
2. 우유: 폭 우선
3. 치즈: 하위 카테고리 우선

## 5. 분유 수집의 핵심
브랜드만 모으면 실패한다.
아래 속성을 최소 단위로 다뤄야 한다.
- brand
- line
- country_version
- stage
- age_range
- milk_base
- protein_type
- form
- package_size
- importer
- manufacturer
- safety_flags
- sales_channels
- availability_last_seen

## 6. canonical schema 원칙
- 실제 제품과 판매 채널 노출을 분리한다.
- source_count와 confidence_score를 둔다.
- review_status를 둬서 사람 승인 큐를 만든다.
- 국가버전 / 단계 / 제형은 1급 속성으로 취급한다.

## 7. AI agent 운영 구조
초기에는 4개 역할로 시작한다.
- Source Scout: 신규 제품 후보 발견
- Taxonomy Mapper: raw → canonical 매핑
- Deduper: 중복 병합
- QA Auditor: 누락/충돌/오분류 검출

## 8. 사람 승인 규칙
아래는 자동 반영 금지
- country_version 불명확
- stage 불명확
- 특수분유/알레르기 대응 성격
- source 1개만 존재
- 안전 플래그 충돌
- 공식 카탈로그와 판매채널 정보 상충

## 9. 실행 로드맵
### Phase 0
- taxonomy 확정
- source registry 확정
- canonical schema 확정
- confidence policy 확정

### Phase 1
- 분유 수집 MVP
- 식품안전나라 + 쿠팡 + SSG + 공식몰 + Amazon 기준
- review queue 생성

### Phase 2
- 우유 / 치즈 확장

### Phase 3
- Claude Code subagent / hooks 운영

### Phase 4
- GitHub Actions / MCP / Agent SDK 확장

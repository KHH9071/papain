/**
 * home_briefs.ts — 홈 성장 체크포인트 브리핑 데이터
 *
 * PERIOD_CONFIG (nutrition_utils.ts)와 별도 관리:
 *  - PERIOD_CONFIG: 탐색 맥락 배너, 브리핑 카드 메시지 (공유)
 *  - GROWTH_BRIEF: 홈 전용 성장 체크포인트 (2~3개 포인트 + 탐색 힌트)
 *
 * 원칙: 압축 — 1줄 설명 + 2~3개 키워드 칩 + CTA 힌트
 * 홈에서 문서처럼 길게 쓰지 말 것.
 */

import type { AgeGroup } from "@/lib/kdri_data"

export type GrowthBrief = {
  /** 한 줄 시기 설명 */
  desc: string
  /** 이 시기 체크포인트 키워드 (2~3개) */
  points: string[]
  /** 탐색 탭 연결 영양소 힌트 — 없으면 일반 탐색 */
  searchHint?: string
}

export const GROWTH_BRIEF: Record<AgeGroup, GrowthBrief> = {
  "0-5": {
    desc: "수유와 분유가 중심이 되는 첫 시기예요. 하루 루틴 잡기가 중요해요.",
    points: ["수유 루틴 확인", "분유 선택 기준", "성장 기록 시작"],
    searchHint: "비타민D",
  },
  "6-11": {
    desc: "이유식이 시작되는 시기예요. 식사 형태와 식재료 다양성이 서서히 늘어나요.",
    points: ["이유식 적응 확인", "수유·분유 조정", "식재료 다양화"],
    searchHint: "철",
  },
  "12-35": {
    desc: "자기주장이 강해지며 식습관 편차가 커질 수 있어요.",
    points: ["식습관 편차 증가", "편식 시작 여부", "유제품 전환 점검"],
    searchHint: "칼슘",
  },
  "36-71": {
    desc: "활동량이 빠르게 늘어나는 시기예요. 식사 패턴을 점검할 때예요.",
    points: ["편식 패턴 체크", "식사 규칙성 확인", "활동량 변화 기록"],
    searchHint: "칼슘",
  },
  "72-88": {
    desc: "학교생활 준비가 시작되는 시기예요. 생활 리듬 안정이 중요해요.",
    points: ["생활 리듬 안정", "편식 패턴 확인", "성장 속도 기록"],
    searchHint: "칼슘",
  },
}

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
    desc: "모유나 분유가 주 영양원인 시기예요. 비타민D를 별도로 살펴보는 경우가 많아요.",
    points: ["비타민D 보충 검토", "분유 선택 기준", "성장 기록 시작"],
    searchHint: "비타민D",
  },
  "6-11": {
    desc: "이유식 시작과 함께 철분·아연이 중요해지는 시기예요.",
    points: ["철분 보충 검토", "아연 함께 확인", "분유 지속 여부 점검"],
    searchHint: "철",
  },
  "12-35": {
    desc: "자기주장이 강해지며 식습관 편차가 커질 수 있어요.",
    points: ["식습관 편차 증가", "철·아연 체크", "유제품 전환 점검"],
    searchHint: "칼슘",
  },
  "36-71": {
    desc: "활동량이 늘며 칼슘과 철 소모가 커지는 시기예요.",
    points: ["칼슘·철 균형 확인", "편식 패턴 체크", "비타민D 꾸준히"],
    searchHint: "칼슘",
  },
  "72-88": {
    desc: "학교생활 준비와 함께 뼈 성장 영양소가 중요해져요.",
    points: ["칼슘 집중 확인", "비타민D 꾸준히", "성장 속도 기록"],
    searchHint: "칼슘",
  },
}

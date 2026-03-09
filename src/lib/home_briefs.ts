/**
 * home_briefs.ts — 홈 성장 마일스톤 데이터
 *
 * 역할: Hero 카드(영양 탐색)와 분리된 발달/생활/행동 맥락 카드
 * 원칙: 영양소 직접 언급 없이 발달 맥락 중심으로 작성
 * 확장: 향후 월령별 리치 콘텐츠(리포트, 영상, 아티클) 연결 허브로 사용 가능
 */

import type { AgeGroup } from "@/lib/kdri_data"

export type GrowthMilestone = {
  /** 카드 섹션 헤더 아래 공감형 서브카피 */
  subtitle: string
  /** 카드 내부 핵심 헤드라인 1개 */
  headline: string
  /** 부모에게 던지는 관찰/질문 프롬프트 1개 */
  prompt: string
  /** 발달 도메인 라벨 4개 — DOMAIN_EMOJI 키와 일치해야 함 */
  domains: [string, string, string, string]
}

export const GROWTH_MILESTONE: Record<AgeGroup, GrowthMilestone> = {
  "0-5": {
    subtitle: "모든 반응 하나하나가 소중한 시기예요.",
    headline: "눈맞춤과 소리 반응이 발달하는 시기예요",
    prompt: "오늘 아이가 소리나 얼굴에 반응한 순간이 있었나요?",
    domains: ["인지·언어", "신체·운동", "정서·사회성", "수유 리듬"],
  },
  "6-11": {
    subtitle: "세상이 궁금해지기 시작하는 시기예요.",
    headline: "이유식 적응과 함께 탐색 본능이 깨어나요",
    prompt: "새 식재료를 처음 맛봤을 때 반응이 어땠나요?",
    domains: ["인지·언어", "신체·운동", "정서·사회성", "식습관"],
  },
  "12-35": {
    subtitle: "조금 느려도 괜찮아요. 아이만의 속도를 응원해주세요.",
    headline: "걷기와 자기 표현이 빠르게 발달해요",
    prompt: "오늘 아이가 처음으로 해본 것이 있었나요?",
    domains: ["인지·언어", "신체·운동", "정서·사회성", "식습관"],
  },
  "36-71": {
    subtitle: "스스로 하고 싶은 게 많아지는 시기예요.",
    headline: "또래와의 놀이와 규칙 인식이 생겨요",
    prompt: "오늘 아이가 친구와 어떻게 놀았나요?",
    domains: ["인지·언어", "신체·운동", "정서·사회성", "식습관"],
  },
  "72-88": {
    subtitle: "새로운 환경에 적응하는 힘이 자라는 시기예요.",
    headline: "학교 준비와 함께 자립심이 쑥 자라요",
    prompt: "오늘 아이가 스스로 해결한 일이 있었나요?",
    domains: ["인지·언어", "신체·운동", "정서·사회성", "생활 리듬"],
  },
}

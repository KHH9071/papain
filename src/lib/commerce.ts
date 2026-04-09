/**
 * commerce.ts — 커머스 API 통합 레이어
 *
 * 쿠팡 파트너스, 네이버 검색 API 연동 구조.
 * API 키가 없으면 빈 배열을 반환하므로 키 없이도 앱이 정상 동작한다.
 *
 * 사용법:
 * 1. .env.local에 API 키 설정
 * 2. searchProductOffers(productName) 호출
 *
 * 환경변수:
 *   NAVER_CLIENT_ID        — 네이버 검색 API Client ID
 *   NAVER_CLIENT_SECRET    — 네이버 검색 API Client Secret
 *   COUPANG_ACCESS_KEY     — 쿠팡 파트너스 Access Key
 *   COUPANG_SECRET_KEY     — 쿠팡 파트너스 Secret Key
 */

// ── 공통 타입 ────────────────────────────────────────────────────────────────

export type ProductOffer = {
  /** 상품명 */
  title: string
  /** 가격 (원) */
  price: number
  /** 상품 URL */
  url: string
  /** 상품 이미지 URL */
  imageUrl: string | null
  /** 판매처 이름 */
  mall: string
  /** 원본 소스 */
  source: "naver" | "coupang"
}

// ── 네이버 검색 API ──────────────────────────────────────────────────────────

type NaverShopItem = {
  title: string
  link: string
  image: string
  lprice: string
  mallName: string
}

async function searchNaver(query: string): Promise<ProductOffer[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) return []

  try {
    const params = new URLSearchParams({
      query,
      display: "5",
      sort: "sim",
    })

    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?${params}`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        next: { revalidate: 3600 }, // 1시간 캐시
      },
    )

    if (!res.ok) return []

    const data = await res.json()
    const items: NaverShopItem[] = data.items ?? []

    return items.map((item) => ({
      title: item.title.replace(/<\/?b>/g, ""),
      price: parseInt(item.lprice, 10) || 0,
      url: item.link,
      imageUrl: item.image || null,
      mall: item.mallName || "네이버쇼핑",
      source: "naver" as const,
    }))
  } catch {
    return []
  }
}

// ── 쿠팡 파트너스 API ───────────────────────────────────────────────────────
// 쿠팡 파트너스 API는 HMAC 서명이 필요. 키 발급 후 아래 구조에 서명 로직 추가.

async function searchCoupang(query: string): Promise<ProductOffer[]> {
  const accessKey = process.env.COUPANG_ACCESS_KEY
  const secretKey = process.env.COUPANG_SECRET_KEY

  if (!accessKey || !secretKey) return []

  // TODO: 쿠팡 파트너스 API 키 발급 후 구현
  // 1. HMAC-SHA256 서명 생성
  // 2. GET /v2/providers/affiliate_open_api/apis/openapi/products/search
  // 3. 응답 파싱 → ProductOffer[]
  //
  // 참고: https://developers.coupangcorp.com/hc/ko/categories/360002015872
  //
  // const method = "GET"
  // const path = "/v2/providers/affiliate_open_api/apis/openapi/products/search"
  // const params = { keyword: query, limit: 5 }
  // const signature = generateHmac(method, path, accessKey, secretKey)
  // const res = await fetch(`https://api-gateway.coupang.com${path}?...`, { headers: { Authorization: signature } })

  return []
}

// ── 통합 검색 ────────────────────────────────────────────────────────────────

/**
 * 제품명으로 네이버 + 쿠팡에서 구매 링크를 검색합니다.
 * API 키가 설정되지 않은 소스는 자동으로 건너뜁니다.
 */
export async function searchProductOffers(productName: string): Promise<ProductOffer[]> {
  const [naverResults, coupangResults] = await Promise.all([
    searchNaver(productName),
    searchCoupang(productName),
  ])

  // 가격 낮은 순 정렬
  return [...naverResults, ...coupangResults].sort((a, b) => a.price - b.price)
}

/**
 * 커머스 API가 하나라도 활성화되어 있는지 확인합니다.
 * 클라이언트에서 구매 링크 섹션 표시 여부를 결정할 때 사용.
 */
export function isCommerceEnabled(): boolean {
  return !!(
    (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) ||
    (process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY)
  )
}

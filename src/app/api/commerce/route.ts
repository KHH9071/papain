import { NextRequest, NextResponse } from "next/server"
import { searchProductOffers, isCommerceEnabled } from "@/lib/commerce"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")

  if (!query) {
    return NextResponse.json({ offers: [], enabled: false }, { status: 400 })
  }

  if (!isCommerceEnabled()) {
    return NextResponse.json({ offers: [], enabled: false })
  }

  const offers = await searchProductOffers(query)
  return NextResponse.json({ offers, enabled: true })
}

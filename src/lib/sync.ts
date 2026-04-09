import { createClient } from "@/lib/supabase/client"
import { useAppStore } from "@/lib/store"
import type { Product } from "@/lib/types"
import type { GrowthRecord } from "@/lib/store"

// ── Push: 로컬 → 클라우드 ─────────────────────────────────────────────────────

export async function pushToCloud(userId: string) {
  const supabase = createClient()
  const { selectedProducts, monthsOld, gender, growthRecords } = useAppStore.getState()

  // 프로필
  await supabase.from("user_profiles").upsert({
    id: userId,
    gender,
    months_old: monthsOld,
  }, { onConflict: "id" })

  // 성장 기록
  if (growthRecords.length > 0) {
    await supabase.from("user_growth_records").upsert(
      growthRecords.map((r) => ({
        user_id: userId,
        date: r.date,
        height: r.height,
        weight: r.weight,
        months_old: r.monthsOld,
      })),
      { onConflict: "user_id,months_old" }
    )
  }

  // 제품 선택
  if (selectedProducts.length > 0) {
    await supabase.from("user_product_selections").upsert(
      selectedProducts.map((p) => ({
        user_id: userId,
        product_id: p.id,
        product_snapshot: p,
        daily_serving_count: p.daily_serving_count,
      })),
      { onConflict: "user_id,product_id" }
    )
  }

  // 클라우드에 있지만 로컬에 없는 제품은 삭제
  const localIds = selectedProducts.map((p) => p.id)
  if (localIds.length > 0) {
    await supabase
      .from("user_product_selections")
      .delete()
      .eq("user_id", userId)
      .not("product_id", "in", `(${localIds.join(",")})`)
  } else {
    // 로컬이 비어있으면 클라우드도 비움
    await supabase
      .from("user_product_selections")
      .delete()
      .eq("user_id", userId)
  }
}

// ── Pull: 클라우드 → 로컬 ─────────────────────────────────────────────────────

export async function pullFromCloud(userId: string): Promise<{
  growthRecords: GrowthRecord[]
  selectedProducts: Product[]
  gender: "M" | "F"
  monthsOld: number
} | null> {
  const supabase = createClient()

  const [profileRes, growthRes, productsRes] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).single(),
    supabase.from("user_growth_records").select("*").eq("user_id", userId).order("months_old"),
    supabase.from("user_product_selections").select("*").eq("user_id", userId),
  ])

  if (profileRes.error && profileRes.error.code !== "PGRST116") return null

  const profile = profileRes.data
  const cloudRecords: GrowthRecord[] = (growthRes.data ?? []).map((r: { date: string; height: number; weight: number; months_old: number }) => ({
    date: r.date,
    height: r.height,
    weight: r.weight,
    monthsOld: r.months_old,
  }))
  const cloudProducts: Product[] = (productsRes.data ?? []).map((r: { product_snapshot: Product; daily_serving_count: number | null }) => ({
    ...r.product_snapshot,
    daily_serving_count: r.daily_serving_count ?? r.product_snapshot.daily_serving_count,
  }))

  return {
    growthRecords: cloudRecords,
    selectedProducts: cloudProducts,
    gender: (profile?.gender as "M" | "F") ?? "M",
    monthsOld: profile?.months_old ?? 12,
  }
}

// ── Merge: 로그인 시 로컬 + 클라우드 병합 ─────────────────────────────────────

export async function mergeOnLogin(userId: string) {
  const local = useAppStore.getState()
  const cloud = await pullFromCloud(userId)

  // 클라우드 데이터 없으면 로컬을 그대로 push
  if (!cloud) {
    await pushToCloud(userId)
    return
  }

  // 성장 기록 병합: monthsOld 기준, 최신 date 우선
  const recordMap = new Map<number, GrowthRecord>()
  for (const r of cloud.growthRecords) recordMap.set(r.monthsOld, r)
  for (const r of local.growthRecords) {
    const existing = recordMap.get(r.monthsOld)
    if (!existing || r.date >= existing.date) {
      recordMap.set(r.monthsOld, r)
    }
  }
  const mergedRecords = [...recordMap.values()].sort((a, b) => a.monthsOld - b.monthsOld)

  // 제품 병합: product_id 기준, 로컬 우선
  const productMap = new Map<number, Product>()
  for (const p of cloud.selectedProducts) productMap.set(p.id, p)
  for (const p of local.selectedProducts) productMap.set(p.id, p) // 로컬이 덮어씀
  const mergedProducts = [...productMap.values()]

  // 로컬 스토어 업데이트
  useAppStore.setState({
    growthRecords: mergedRecords,
    selectedProducts: mergedProducts,
  })

  // 클라우드에 병합 결과 push
  await pushToCloud(userId)
}

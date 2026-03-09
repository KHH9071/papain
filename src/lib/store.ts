import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product } from "./types"

export type GrowthRecord = {
  date: string
  height: number
  weight: number
  monthsOld: number
}

type AppStore = {
  selectedProducts: Product[]
  monthsOld: number
  gender: "M" | "F"
  growthRecords: GrowthRecord[]
  toggleProduct: (product: Product) => void
  /** formula/milk/cheese: 하루 섭취량(ml 또는 장 수)을 지정해서 upsert */
  setProductVolume: (product: Product, dailyAmount: number) => void
  setMonthsOld: (months: number) => void
  setGender: (gender: "M" | "F") => void
  addGrowthRecord: (record: GrowthRecord) => void
  removeGrowthRecord: (monthsOld: number) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      selectedProducts: [],
      monthsOld: 12,
      gender: "M",
      growthRecords: [],

      toggleProduct: (product) =>
        set((state) => ({
          selectedProducts: state.selectedProducts.some((p) => p.id === product.id)
            ? state.selectedProducts.filter((p) => p.id !== product.id)
            : [...state.selectedProducts, product],
        })),

      setProductVolume: (product, dailyAmount) =>
        set((state) => {
          const updated = { ...product, daily_serving_count: dailyAmount }
          const exists = state.selectedProducts.some((p) => p.id === product.id)
          return {
            selectedProducts: exists
              ? state.selectedProducts.map((p) => (p.id === product.id ? updated : p))
              : [...state.selectedProducts, updated],
          }
        }),

      setMonthsOld: (months) => set({ monthsOld: months }),
      setGender: (gender) => set({ gender }),
      addGrowthRecord: (record) =>
        set((state) => {
          // 동일 monthsOld 기록이 있으면 덮어씀 (upsert), 없으면 추가
          const exists = state.growthRecords.some((r) => r.monthsOld === record.monthsOld)
          const updated = exists
            ? state.growthRecords.map((r) => (r.monthsOld === record.monthsOld ? record : r))
            : [...state.growthRecords, record]
          return { growthRecords: updated.sort((a, b) => a.monthsOld - b.monthsOld) }
        }),
      removeGrowthRecord: (monthsOld) =>
        set((state) => ({
          growthRecords: state.growthRecords.filter((r) => r.monthsOld !== monthsOld),
        })),
    }),
    {
      name: "papain-store",
      // 앱 시작 시 1회: 구버전 localStorage에 남아 있을 수 있는 중복 monthsOld 기록 정리
      // (현재 addGrowthRecord는 upsert이므로 신규 중복은 발생하지 않음)
      onRehydrateStorage: () => (state) => {
        if (!state?.growthRecords?.length) return
        const seen = new Map<number, GrowthRecord>()
        for (const r of state.growthRecords) seen.set(r.monthsOld, r)
        if (seen.size < state.growthRecords.length) {
          // 중복 발견 → monthsOld별 마지막 항목만 유지
          useAppStore.setState({
            growthRecords: [...seen.values()].sort((a, b) => a.monthsOld - b.monthsOld),
          })
        }
      },
    }
  )
)

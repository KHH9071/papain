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
    { name: "papain-store" }
  )
)

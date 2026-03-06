import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product } from "./types"
import type { RoutineFood, SelectedRoutineFood } from "./routine_foods"

export type { SelectedRoutineFood }

export type GrowthRecord = {
  date: string
  height: number
  weight: number
  monthsOld: number
}

type AppStore = {
  selectedProducts: Product[]
  selectedRoutineFoods: SelectedRoutineFood[]
  monthsOld: number
  gender: "M" | "F"
  growthRecords: GrowthRecord[]
  toggleProduct: (product: Product) => void
  setRoutineFood: (food: RoutineFood, amountPerDay: number) => void
  removeRoutineFood: (foodId: string) => void
  setMonthsOld: (months: number) => void
  setGender: (gender: "M" | "F") => void
  addGrowthRecord: (record: GrowthRecord) => void
  removeGrowthRecord: (index: number) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      selectedProducts: [],
      selectedRoutineFoods: [],
      monthsOld: 12,
      gender: "M",
      growthRecords: [],

      toggleProduct: (product) =>
        set((state) => ({
          selectedProducts: state.selectedProducts.some((p) => p.id === product.id)
            ? state.selectedProducts.filter((p) => p.id !== product.id)
            : [...state.selectedProducts, product],
        })),

      setRoutineFood: (food, amountPerDay) =>
        set((state) => {
          const existing = state.selectedRoutineFoods.find((f) => f.food.id === food.id)
          if (existing) {
            return {
              selectedRoutineFoods: state.selectedRoutineFoods.map((f) =>
                f.food.id === food.id ? { food, amountPerDay } : f
              ),
            }
          }
          return {
            selectedRoutineFoods: [...state.selectedRoutineFoods, { food, amountPerDay }],
          }
        }),

      removeRoutineFood: (foodId) =>
        set((state) => ({
          selectedRoutineFoods: state.selectedRoutineFoods.filter((f) => f.food.id !== foodId),
        })),

      setMonthsOld: (months) => set({ monthsOld: months }),
      setGender: (gender) => set({ gender }),
      addGrowthRecord: (record) =>
        set((state) => ({
          growthRecords: [...state.growthRecords, record].sort((a, b) => a.monthsOld - b.monthsOld),
        })),
      removeGrowthRecord: (index) =>
        set((state) => ({
          growthRecords: state.growthRecords.filter((_, i) => i !== index),
        })),
    }),
    { name: "papain-store" }
  )
)

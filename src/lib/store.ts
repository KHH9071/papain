import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Product } from "./types"

type AppStore = {
  selectedProducts: Product[]
  monthsOld: number
  toggleProduct: (product: Product) => void
  setMonthsOld: (months: number) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      selectedProducts: [],
      monthsOld: 12,

      toggleProduct: (product) =>
        set((state) => ({
          selectedProducts: state.selectedProducts.some((p) => p.id === product.id)
            ? state.selectedProducts.filter((p) => p.id !== product.id)
            : [...state.selectedProducts, product],
        })),

      setMonthsOld: (months) => set({ monthsOld: months }),
    }),
    { name: "papain-store" }
  )
)

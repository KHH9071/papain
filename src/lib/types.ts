export type ProductCategory = "supplement" | "formula" | "milk" | "cheese"

export type Nutrient = {
  name: string
  amount: number
  unit: string
}

export type Product = {
  id: number
  product_name: string
  manufacturer: string | null
  functionality: string | null
  precautions: string | null
  daily_serving_count: number | null
  amount_per_serving: number | null
  serving_unit: string | null
  nutrients: Nutrient[]
  /** 제품 분류: supplement(건기식) | formula(분유) | milk(우유) | cheese(치즈) */
  category?: ProductCategory
  /** 영양소 기준 단위: serving=1회 제공량 기준, ml=per 100ml, 장=per slice */
  base_unit?: "serving" | "ml" | "장"
}

export type AggregatedNutrient = {
  name: string
  amount: number
  unit: string
}

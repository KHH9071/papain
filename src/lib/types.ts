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
}

export type AggregatedNutrient = {
  name: string
  amount: number
  unit: string
}

import { createClient } from "@/lib/supabase/server"
import { listCanonicalProducts } from "@/lib/canonical_products"
import { canonicalProductsToProducts } from "@/lib/canonical_to_product"
import SearchClient from "../_components/SearchClient"
import type { Product } from "@/lib/types"

async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true })

  if (error) {
    console.error("Supabase fetch error:", error.message)
    return []
  }
  return (data ?? []) as Product[]
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ nutrient?: string; category?: string }>
}) {
  const [products, canonicalProducts, { nutrient, category }] = await Promise.all([
    getProducts(),
    listCanonicalProducts(),
    searchParams,
  ])

  // canonical_product → Product 변환 후 병합
  const canonicalAsProducts = canonicalProductsToProducts(canonicalProducts)

  return (
    <SearchClient
      initialProducts={products}
      canonicalFormulaProducts={canonicalAsProducts}
      initialNutrient={nutrient}
      initialCategory={category}
    />
  )
}

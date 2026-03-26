import { supabase } from "@/lib/supabase/client"
import { listCanonicalProducts } from "@/lib/canonical_products"
import SearchClient from "../_components/SearchClient"
import type { Product } from "@/lib/types"

async function getProducts(): Promise<Product[]> {
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
  return (
    <SearchClient
      initialProducts={products}
      initialCanonicalProducts={canonicalProducts}
      initialNutrient={nutrient}
      initialCategory={category}
    />
  )
}

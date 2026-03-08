import { supabase } from "@/lib/supabase/client"
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
  searchParams: Promise<{ nutrient?: string }>
}) {
  const [products, { nutrient }] = await Promise.all([getProducts(), searchParams])
  return <SearchClient initialProducts={products} initialNutrient={nutrient} />
}

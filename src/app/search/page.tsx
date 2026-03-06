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

export default async function SearchPage() {
  const products = await getProducts()
  return <SearchClient initialProducts={products} />
}

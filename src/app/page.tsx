import { supabase } from '@/lib/supabase/client'
import DashboardClient from './_components/DashboardClient'

type Nutrient = {
  name: string
  amount: number
  unit: string
}

type Product = {
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

async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    console.error('Supabase fetch error:', error.message)
    return []
  }
  return data ?? []
}

export default async function Home() {
  const products = await getProducts()
  return <DashboardClient initialProducts={products} />
}

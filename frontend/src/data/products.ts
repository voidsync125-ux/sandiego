export type ProductCategory = 'Clothes' | 'Jewelries' | 'Organic Soap' | 'Cream'

export type Product = {
  id: string
  name: string
  category: ProductCategory
  price: number
  rating: number
  reviewCount: number
  image: string
  images?: string[]
  label?: string
  description?: string
  benefits?: string[]
}

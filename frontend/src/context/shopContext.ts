import { createContext } from 'react'
import type { Product } from '../data/products'

export type CartItem = {
  product: Product
  quantity: number
}

export type DeliveryDetails = {
  fullName: string
  phone: string
  city: string
  address: string
  notes?: string
}

export type ShopOrder = {
  id: string
  items: CartItem[]
  delivery: DeliveryDetails
  subtotal: number
  shipping: number
  tax: number
  total: number
  paymentMethod: string
  createdAt: string
}

export type ShopContextValue = {
  cartItems: CartItem[]
  wishlistItems: Product[]
  totalPrice: number
  orders: ShopOrder[]
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  setCartQuantity: (productId: string, quantity: number) => void
  toggleWishlist: (product: Product) => void
  clearCart: () => void
  placeOrder: (order: ShopOrder) => void
}

export const ShopContext = createContext<ShopContextValue | null>(null)

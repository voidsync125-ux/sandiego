import { useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../data/products'
import { ShopContext, type CartItem, type ShopContextValue, type ShopOrder } from './shopContext'

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<Product[]>([])
  const [orders, setOrders] = useState<ShopOrder[]>([])

  const value = useMemo<ShopContextValue>(() => ({
    cartItems,
    wishlistItems,
    totalPrice: cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0),
    orders,
    addToCart: (product, quantity = 1) => {
      const safeQuantity = Math.max(1, Math.floor(quantity))
      setCartItems((current) => {
        const existing = current.find((item) => item.product.id === product.id)
        return existing
          ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + safeQuantity } : item)
          : [...current, { product, quantity: safeQuantity }]
      })
    },
    removeFromCart: (productId) => setCartItems((current) => current.filter((item) => item.product.id !== productId)),
    setCartQuantity: (productId, quantity) => setCartItems((current) => quantity <= 0
      ? current.filter((item) => item.product.id !== productId)
      : current.map((item) => item.product.id === productId ? { ...item, quantity: Math.floor(quantity) } : item)),
    toggleWishlist: (product) => setWishlistItems((current) => current.some((item) => item.id === product.id)
      ? current.filter((item) => item.id !== product.id)
      : [...current, product]),
    clearCart: () => setCartItems([]),
    placeOrder: (order) => setOrders((current) => [order, ...current]),
  }), [cartItems, orders, wishlistItems])

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

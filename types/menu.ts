export type BusinessType = 'restaurant' | 'retail' | 'booking'

export type PaymentMethod =
  | { type: 'duitnow'; recipient_name: string; id: string; qr_url?: string }
  | { type: 'paynow';  recipient_name: string; id: string; qr_url?: string }
  | { type: 'bank';    bank_name: string; account_number: string; account_name: string; qr_url?: string }

export type Vendor = {
  id: string
  name: string
  slug: string
  phone_number: string
  logo_url: string | null
  user_id: string | null
  is_active: boolean
  business_type: BusinessType | null
  blocked_dates: string[]
  payment_methods: PaymentMethod[]
  description: string | null
  promo_text: string | null
  gallery_urls: string[]
  location_address: string | null
}

export type Category = {
  id: string
  name: string
  sort_order: number
  vendor_id: string
}

export type Item = {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  image_urls: string[]
  is_available: boolean
  sort_order: number
}

export type CategoryWithItems = Category & { items: Item[] }

export type CartItem = {
  item: Item
  quantity: number
}

export type OrderStatus = 'pending' | 'pending_whatsapp' | 'accepted' | 'cancelled' | 'completed'

export type OrderLineItem = {
  name: string
  price: number
  quantity: number
}

export type Order = {
  id: string
  vendor_id: string
  short_order_id: string
  customer_name: string
  customer_phone: string
  items: OrderLineItem[]
  cart_items: OrderLineItem[]
  total_price: number
  delivery_type: 'pickup' | 'delivery'
  delivery_address: string | null
  status: OrderStatus
  notes: string | null
  created_at: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

export type Booking = {
  id: string
  vendor_id: string
  customer_name: string
  customer_phone: string
  service_name: string
  start_date: string
  end_date: string
  notes: string | null
  status: BookingStatus
  created_at: string
}

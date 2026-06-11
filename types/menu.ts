export type BusinessType = 'restaurant' | 'retail' | 'booking'

// duitnow_payload: the raw EMVCo string decoded from the uploaded QR. When present,
// checkout can inject the order amount so the customer's banking app pre-fills it.
export type PaymentMethod =
  | { type: 'duitnow'; recipient_name: string; id: string; qr_url?: string; duitnow_payload?: string }
  | { type: 'paynow';  recipient_name: string; id: string; qr_url?: string; duitnow_payload?: string }
  | { type: 'bank';    bank_name: string; account_number: string; account_name: string; qr_url?: string; duitnow_payload?: string }

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
  location_lat: number | null
  location_lng: number | null
  makanjom_restaurant_id: string | null
  subscription_status?: 'trial' | 'active' | 'expired' | null
  trial_ends_at?: string | null
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
  blocked_dates: string[]   // per-room blocked dates (distinct from vendor-level)
}

export type CategoryWithItems = Category & { items: Item[] }

export type CartItem = {
  item: Item
  quantity: number
}

export type OrderStatus = 'pending' | 'pending_whatsapp' | 'accepted' | 'cancelled' | 'completed'

// Payment lifecycle, tracked separately from fulfilment status:
//   awaiting  → order placed, customer hasn't paid yet
//   submitted → customer uploaded a receipt, vendor to review
//   confirmed → vendor verified the payment
//   rejected  → vendor rejected it (wrong amount, unreadable, etc.)
export type PaymentStatus = 'awaiting' | 'submitted' | 'confirmed' | 'rejected'

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
  payment_status: PaymentStatus
  order_token: string
  payment_proof_url: string | null
  payment_submitted_at: string | null
  notes: string | null
  created_at: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'holding' | 'cleared' | 'completed' | 'cancelled'

export type LogEntry = { text: string; ts: string }

export type Booking = {
  id: string
  vendor_id: string
  short_booking_id: string | null
  customer_name: string
  customer_phone: string
  service_name: string
  start_date: string
  end_date: string
  notes: string | null
  status: BookingStatus
  payment_status: PaymentStatus
  booking_token: string
  payment_proof_url: string | null
  payment_submitted_at: string | null
  total_price?: number
  created_at: string
  staff_log?: LogEntry[]
}

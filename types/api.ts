// Shapes of the M1 API responses (SRS §7). Kept hand-written and small.
export interface Media { id: number; url: string; alt_text: string; width: number; height: number }

export interface PublicSettings {
  company_name: string; tagline: string; logo: Media | null; favicon: Media | null
  address_line1: string; address_line2: string; city: string; country: string
  support_phones: string[]; whatsapp_number: string; support_email: string; working_hours: string
  facebook_url: string; instagram_url: string; youtube_url: string; tiktok_url: string
  messenger_link: string; footer_about: string; copyright_text: string
  bkash_number: string; bkash_account_type: string; nagad_number: string; nagad_account_type: string
  payment_instructions: string; cod_enabled: boolean
  delivery_fee_inside_dhaka: string; delivery_fee_outside_dhaka: string
  delivery_time_inside_dhaka: string; delivery_time_outside_dhaka: string
  seo_title: string; seo_description: string; seo_share_image: Media | null; gtm_id: string
}

export interface Slide {
  id: number; media: Media; mobile_media: Media | null; eyebrow: string; heading: string
  subtext: string; button_label: string; link_type: string; link_value: string; sort: number
  is_active: boolean
}
export interface Banner {
  id: number; placement: 'home_promo' | 'home_offer'; media: Media | null; heading: string
  text: string; link: string; is_active: boolean
}
export interface Video { id: number; title: string; url: string; thumbnail: Media | null; sort: number; is_active: boolean }
export interface Announcement { id: number; text: string; link: string; sort: number; is_active: boolean }
export interface TrustItem { id: number; icon: string; title: string; text: string; sort: number; is_active: boolean }
export interface StaticPage { id: number; slug: string; title: string; body: string; is_active: boolean }

export interface Home {
  sections?: Record<string, boolean>
  announcements: Announcement[]; carousel: Slide[]; banners: Banner[]
  categories: { name: string; slug: string; tile: { url: string; alt_text: string } | null }[]
  new_arrivals: CardProduct[]; signature: CardProduct[]; offers: CardProduct[]
  trust: TrustItem[]; videos: Video[]
}

export interface Palette { id: number; name: string; primary_hex: string; accent_hex: string; is_builtin: boolean }
export interface ThemeState {
  palette: number | null; primary_hex: string; accent_hex: string | null
  tokens: Record<string, string>; updated_by: string | null; updated_at: string
  low_contrast_warning: boolean
}
export interface PermissionDef { code: string; group: string; description: string; default: boolean; sensitive: boolean }
export interface StaffUser { id: number; full_name: string; email: string; role: 'owner' | 'staff'; is_active: boolean; permissions: string[] }
export interface Paged<T> { count: number; results: T[] }
export interface AuditRow { id: number; created_at: string; user: string | null; action: string; model: string; object_id: string }

// Loosely-typed form rows for generic admin editors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dict = Record<string, any>

// ---- Catalogue (M2)
export interface CardProduct {
  id: number; name: string; slug: string; price: string; compare_at_price: string | null
  discount_pct: number; tag: string | null; sold_out: boolean
  image: { url: string; alt_text: string; width: number; height: number; color: string } | null
  category: { name: string; slug: string }; subcategory: { name: string; slug: string } | null
  colors: { name: string; hex: string }[]; sizes: string[]
  variants: { id: number; size_label: string; color_name: string; in_stock: boolean }[]
}
export interface ProductVariant {
  id: number; sku: string; size_label: string; color_name: string; color_hex: string
  price: string; in_stock: boolean; low_stock_left: number | null
}
export interface ProductDetail extends CardProduct {
  short_desc: string; description: string; care_notes: string; collection: string; uom: string
  images: NonNullable<CardProduct['image']>[]; variants: ProductVariant[]
  breadcrumb: { name: string; slug: string }[]; related: CardProduct[]
  seo_title: string; seo_description: string
}
export interface PublicCategory {
  name: string; slug: string; description: string; count: number
  subcategories: { name: string; slug: string; count: number }[]
  tile: { url: string; alt_text: string } | null
}
export interface Facets {
  subcategories: { name: string; slug: string; count: number }[]
  categories: { name: string; slug: string; count: number }[]
  sizes: string[]; colours: { name: string; hex: string }[]; collections: string[]
  price: { min: string; max: string }
}
export interface ProductPage { count: number; next: string | null; results: CardProduct[]; facets: Facets }
export interface SizeChartData { name: string; type: string; rows: Record<string, any> } // eslint-disable-line @typescript-eslint/no-explicit-any

// ---- Cart, checkout, orders (M3)
export interface CartLineCheck {
  variant: number; quantity: number; active: boolean; price: string | null; available_quantity: number
  issues: ('unavailable' | 'sold_out' | 'quantity_above_stock' | 'quantity_invalid')[]
  product_name?: string; product_slug?: string; variant_label?: string; sku?: string; image?: string | null
}
export interface CouponResult { code: string; valid: boolean; discount?: string; description?: string; error?: { code: string; message: string } }
export interface CartValidation {
  lines: CartLineCheck[]; subtotal: string; coupon: CouponResult | null
  delivery: { inside_dhaka: string; outside_dhaka: string; selected: string | null }; total: string | null
}
export interface CustomerOrder {
  number: string; status: string; status_label: string; placed_at: string; name: string; phone: string; email: string
  area: string; district: string; thana: string; address_line: string; note: string; subtotal: string
  coupon_code: string; coupon_discount: string; delivery_fee: string; total: string; payment_method: string
  payment_status: string; courier: string; tracking_ref: string; can_cancel: boolean
  items: { id: number; variant: number; product_name: string; variant_label: string; sku: string; unit_price: string; quantity: number; line_total: string }[]
  timeline: { status: string; label: string; at: string; detail: string }[]
}
export interface AdminOrderRow {
  id: number; number: string; status: string; placed_at: string; name: string; phone: string; area: string
  payment_method: string; payment_status: string; trx_id: string | null; total: string; item_count: number; is_stale: boolean
}
export interface AdminOrder extends Omit<CustomerOrder, 'timeline' | 'payment_status' | 'can_cancel'> {
  id: number; is_stale: boolean; user_name: string | null; confirmed_at: string | null; shipped_at: string | null
  cancel_reason: string; return_reason: string
  payment: { id: number; method: string; amount: string; sender_number: string; trx_id: string | null; status: string; verified_by_name: string | null; verified_at: string | null; reject_reason: string; note: string }
  logs: { id: number; from_status: string; to_status: string; user: string | null; note: string; created_at: string; internal: boolean }[]
}
export interface StockRow { id: number; sku: string; product: string; category: string; label: string; on_hand: number; level: 'in_stock' | 'low' | 'out'; is_active: boolean }
export interface Movement { id: number; created_at: string; sku: string; delta_on_hand: number; on_hand_after: number; reason: string; order_ref: string; lot_reference: string; remarks: string; user: string | null }

// ---- Accounts (M4)
export interface CustomerMe { id: number; full_name: string; phone: string; email: string | null; birthday: string | null; phone_verified: boolean }
export interface Address { id: number; label: string; recipient_name: string; phone: string; area: 'inside_dhaka' | 'outside_dhaka'; district: string; thana: string; address_line: string; is_default: boolean }
export interface ContactMessage { id: number; created_at: string; name: string; phone: string; email: string; subject: string; message: string; is_handled: boolean; handled_by_name: string | null }

// ---- Reports, dashboard, insights (M5)
export interface DayPoint { day: string; revenue: string; orders: number }
export interface Dashboard {
  today?: { orders: number; revenue: string }; awaiting_confirmation?: number; stale_drafts?: number
  sales_7d?: DayPoint[]; top_products?: { name: string; units: number; revenue: string }[]
  orders_by_stage?: Record<string, number>
  recent_orders?: { id: number; number: string; name: string; payment_method: string; total: string; status: string }[]
  payments_to_verify?: { id: number; number: string; name: string; method: string; trx_id: string | null; total: string; placed_at: string }[]
  stock?: { threshold: number; low: number; out: number; low_items: { sku: string; name: string; on_hand: number }[] }
}
export interface Period { range: string; from: string; to: string }
export interface SalesReport {
  period: Period
  summary: { orders: number; revenue: string; average_order_value: string; returns: number; coupon_discounts: string }
  by_day: DayPoint[]; by_category: { name: string; revenue: string; units: number }[]
  top_products: { name: string; category: string; units: number; revenue: string }[]
  by_payment_method: { key: string; orders: number; revenue: string }[]; by_area: { key: string; orders: number; revenue: string }[]
}
export interface FunnelRow { stage: string; count: number; rate: number }
export interface InventoryReport {
  period: Period; threshold: number
  stock: { sku: string; product: string; category: string; label: string; on_hand: number; level: string }[]
  low: InventoryReport['stock']; out: InventoryReport['stock']; movements: { reason: string; movements: number; units: number }[]
}
export interface CouponRow { code: string; uses: number; discount: string; revenue: string }
export interface WishlistInsight {
  kpis: { saves: number; customers: number; products: number }
  products: { product: number; name: string; category: string; saved_by: number; bought_by_savers: number; units_sold: number; conversion: number }[]
}

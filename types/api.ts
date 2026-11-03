// Shapes of the M1 API responses (SRS §7). Kept hand-written and small.
export interface Media { id: number; url: string; alt_text: string; width: number; height: number }

export interface PublicSettings {
  company_name: string; tagline: string; logo: Media | null; favicon: Media | null
  address_line1: string; address_line2: string; city: string; country: string
  support_phones: string[]; whatsapp_number: string; support_email: string; working_hours: string
  facebook_url: string; instagram_url: string; youtube_url: string; tiktok_url: string
  messenger_link: string; footer_about: string; copyright_text: string
  bkash_number: string; nagad_number: string; cod_enabled: boolean
  delivery_fee_inside_dhaka: string; delivery_fee_outside_dhaka: string
  delivery_time_inside_dhaka: string; delivery_time_outside_dhaka: string
  seo_title: string; seo_description: string; gtm_id: string
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

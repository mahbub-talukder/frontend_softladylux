# Analytics tracking (SRS INS-05)

Events are pushed to `window.dataLayer` by `composables/useTrack.ts`. Nothing is sent to Google until
the visitor accepts the cookie notice and GTM loads (`stores/consent.ts`). No name, phone, address or
email is ever pushed (`sanitizeEvent` in `utils/consent.ts`).

## Events
`page_view`, `view_item_list`, `view_item`, `search`, `add_to_cart`, `remove_from_cart`,
`add_to_wishlist`, `begin_checkout`, `add_payment_info`, `purchase`, `ui_click`.

## `data-track` names (each raises `ui_click` with `button_name`, `button_location`, `page_path`)
Keep this list in step with the code: `tests/tracking.test.ts` fails when a name is missing here.

| Name | Where |
|---|---|
| add_to_bag | product page, Add to bag |
| quick_add | product card, Quick Add |
| header_bag, header_wishlist, header_account, header_track_order, header_find_size | header |
| bottom_nav_home, bottom_nav_shop, bottom_nav_wishlist, bottom_nav_bag, bottom_nav_account | mobile bottom navigation |
| hero_cta, home_banner, home_category_tile, home_size_finder, video_open | home page |
| load_more | listing |
| wishlist_toggle, reorder | wishlist heart, account orders |
| proceed_to_checkout, checkout_submit | cart, checkout |
| login_submit, register_submit, otp_verify, track_submit, contact_submit, newsletter_subscribe | account and engagement forms |
| footer_whatsapp, footer_messenger | footer contact links |
| cookie_accept, cookie_decline | cookie notice |
| dashboard_stale_drafts, open_ga4 | admin dashboard and insights |
| admin_login, settings_save, theme_publish, permissions_save, category_save, product_save_draft, product_publish, size_chart_save, coupon_save, stock_adjust, payment_verify, order_advance | admin actions |

## GA4 views (set up in GA4/GTM by the developer with the owner's Google account, INS-07)
Pages and screens; Events filtered by `ui_click` and `button_name`; Ecommerce purchases; funnel
exploration `view_item` → `add_to_cart` → `begin_checkout` → `purchase`.

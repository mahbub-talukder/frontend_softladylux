# Analytics tracking (SRS INS-05)

Events are pushed to `window.dataLayer` by `composables/useTrack.ts`. Nothing is sent to Google until
the visitor accepts the cookie notice and GTM loads (`stores/consent.ts`). No name, phone, address or
email is ever pushed (`sanitizeEvent` in `utils/consent.ts`).

## Events
`page_view`, `view_item_list`, `view_item`, `search`, `add_to_cart`, `remove_from_cart`,
`add_to_wishlist`, `begin_checkout`, `add_payment_info`, `purchase`, `ui_click`, `login`, `sign_up`.

- **Plain events:** `page_view` (`page_path`, `page_location` without the query string, `page_title`;
  once per page), `ui_click`, `search` (`search_term`, `results`), `login` / `sign_up` (`method: "phone"`).
- **Ecommerce events (GA4 shape, v1.6):** `{ecommerce: null}` is pushed first, then
  `{event, ecommerce: {currency: "BDT", value, items: [...]}}`. Items carry `item_id` (product slug),
  `item_name`, `item_variant` (colour / size), `price`, `quantity` and `item_category` where known.
  `view_item_list` adds `item_list_name` (no value); `add_payment_info` adds `payment_type`;
  `purchase` adds `transaction_id` (order number), `shipping` and `coupon`, and is pushed once per order.

## `data-track` names (each raises `ui_click` with `button_name`, `button_location`, `page_path`)
Keep this list in step with the code: `tests/tracking.test.ts` fails when a name is missing here.

| Name | Where |
|---|---|
| add_to_bag | product page, Add to bag |
| quick_add | product card, Quick Add |
| header_whatsapp, header_call, header_bag, header_wishlist, header_account, header_track_order, header_find_size | header |
| menu_whatsapp, menu_call | phone slide-in menu |
| floating_cart, floating_cart_hide | floating cart widget; floating_cart_show is the re-enable button on the cart page |
| size_chart_open | product page size chart dialog |
| bottom_nav_home, bottom_nav_shop, bottom_nav_wishlist, bottom_nav_bag, bottom_nav_account | mobile bottom navigation |
| hero_cta, hero_find_size, home_signature, home_banner, home_category_tile, home_category_prev, home_category_next, home_size_finder, video_open | home page |
| promo_cta, promo_close | home promotional popup |
| load_more | listing |
| wishlist_toggle, reorder | wishlist heart, account orders |
| proceed_to_checkout, checkout_submit | cart, checkout |
| login_submit, register_submit, otp_verify, track_submit, track_courier_link (v1.7), contact_submit, newsletter_subscribe | account and engagement forms |
| footer_whatsapp, footer_messenger, footer_credit | footer contact links |
| cookie_accept, cookie_decline | cookie notice |
| dashboard_stale_drafts, open_ga4 | admin dashboard and insights |
| admin_login, settings_save, settings_sms_test, theme_publish, permissions_save, category_save, product_save_draft, product_publish, size_chart_save, coupon_save, stock_adjust, payment_verify, order_advance, settings_courier_test, courier_bulk_book, courier_pickup | admin actions (courier ones: SRS v1.7) |

## Setting up GA4 and GTM (owner's Google account, INS-07)
1. **GA4** (analytics.google.com): create the property (time zone Asia/Dhaka, currency **BDT**) and a **Web** data
   stream for the shop domain. Copy the **Measurement ID** (`G-…`). In the stream's *Enhanced measurement*, turn
   **off** "Page changes based on browser history events" and "Site search": the site pushes `page_view` and
   `search` itself, so leaving them on would count twice.
2. **GA4 → Admin → Custom definitions:** add event-scoped dimensions `button_name` and `button_location`.
3. **GTM** (tagmanager.google.com): create a **Web** container and copy its ID (`GTM-…`).
4. **Import** `docs/gtm-container.json`: Admin → Import container → choose the file → existing workspace →
   **Merge** (rename conflicting). Open the variable **GA4 Measurement ID** and paste the `G-…` ID.
5. Click **Preview**, open the shop, **accept the cookie notice** (GTM loads only after Accept), and check the
   tags fire in Tag Assistant and in GA4 → Admin → DebugView. Then **Submit → Publish**.
6. Enter the `GTM-…` ID in **Admin → Settings → Analytics**.

The container has: a Google tag (`send_page_view` off, Initialization trigger); GA4 event tags for `page_view`
(page_location, page_title, page_path), all ecommerce events (event name `{{Event}}`, *Send ecommerce data* from
the data layer, on a custom-event regex trigger), `ui_click` (button_name, button_location, page_path) and
`search` / `login` / `sign_up` (search_term, results, method); one Data Layer Variable per parameter.

**Manual fallback** (if the import is refused): build the same items by hand. Variables: Constant
`GA4 Measurement ID`; Data Layer Variables (version 2) `page_path`, `page_location`, `page_title`, `button_name`,
`button_location`, `search_term`, `results`, `method`. Triggers (Custom Event): `page_view`; `ui_click`;
regex `^(view_item_list|view_item|add_to_cart|remove_from_cart|add_to_wishlist|begin_checkout|add_payment_info|purchase)$`;
regex `^(search|login|sign_up)$`. Tags: Google tag (ID = the constant, configuration parameter
`send_page_view` = `false`, trigger *Initialization - All Pages*) and one GA4 Event tag per trigger as listed above.

## GA4 views
Pages and screens; Events filtered by `ui_click` and `button_name`; Ecommerce purchases; funnel
exploration `view_item` → `add_to_cart` → `begin_checkout` → `purchase`.

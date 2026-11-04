<script setup lang="ts">
// Design: AdminSidebar board. SRS ADM-01 / PRM-04: an item shows only when the signed-in user
// holds its permission; Users and Audit log are Owner-only. Later milestones add their items here.
const auth = useAuthStore()
const route = useRoute()

interface Item { label: string; to: string; d: string; permission?: string; ownerOnly?: boolean }
const ITEMS: Item[] = [
  { label: 'Dashboard', to: '/admin', d: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z', permission: 'dashboard.view' },
  { label: 'Orders', to: '/admin/orders', d: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', permission: 'orders.view' },
  { label: 'Products', to: '/admin/products', d: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8', permission: 'products.view' },
  { label: 'Categories', to: '/admin/categories', d: 'M4 6h16M4 12h16M4 18h10', permission: 'products.view' },
  { label: 'Size charts', to: '/admin/size-charts', d: 'M3 17l4-4 3 3 5-6 6 7M3 21h18', permission: 'products.view' },
  { label: 'Inventory', to: '/admin/inventory', d: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', permission: 'inventory.view' },
  { label: 'Coupons', to: '/admin/coupons', d: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM14 7v10', permission: 'coupons.manage' },
  { label: 'Messages', to: '/admin/messages', d: 'M3 5h18v14H3zM3 7l9 6 9-6', permission: 'contact.manage' },
  { label: 'Reports', to: '/admin/reports', d: 'M4 20V10M10 20V4M16 20v-7M22 20H2', permission: 'reports.view' },
  { label: 'Wishlist insights', to: '/admin/insights', d: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', permission: 'insights.view' },
  { label: 'Website content', to: '/admin/website', d: 'M3 5h18v14H3zM3 9h18', permission: 'website.manage' },
  { label: 'Theme colours', to: '/admin/theme', d: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a4 4 0 0 0 4-4c0-5-4-10-9-10z', permission: 'theme.manage' },
  { label: 'Settings', to: '/admin/settings', d: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z', permission: 'settings.manage' },
  { label: 'Staff & permissions', to: '/admin/users', d: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 4-6 8-6s8 2 8 6', ownerOnly: true },
  { label: 'Audit log', to: '/admin/audit-log', d: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4', ownerOnly: true }
]
const visible = computed(() => ITEMS.filter((i) => allowed(i, { isOwner: auth.isOwner, can: auth.can })))
const active = (to: string) => (to === '/admin' ? route.path === '/admin' : route.path.startsWith(to))
const initials = computed(() => (auth.me?.full_name || 'ST').slice(0, 2).toUpperCase())

async function signOut() {
  await auth.logout()
  await navigateTo('/admin/login')
}
</script>

<template>
  <nav aria-label="Admin" class="flex min-h-full w-[264px] shrink-0 flex-col gap-1.5 bg-dark px-[18px] py-7 text-text-dark">
    <NuxtLink to="/admin" class="flex flex-col gap-1.5 px-3 pb-6">
      <span class="font-display text-[30px] leading-none tracking-[0.06em] text-on-dark">SoftLady<em class="text-rose-soft">Lux</em></span>
      <span class="text-[10px] uppercase tracking-[0.34em] text-champagne">Admin panel</span>
    </NuxtLink>
    <NuxtLink
      v-for="i in visible" :key="i.to" :to="i.to"
      class="flex min-h-[46px] items-center gap-3.5 border-l-2 px-3 text-[14.5px] tracking-[0.02em] transition-colors"
      :class="active(i.to) ? 'border-champagne bg-line-dark text-on-dark' : 'border-transparent text-text-dark-2 hover:bg-line-dark/50 hover:text-on-dark'" :aria-current="active(i.to) ? 'page' : undefined"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="i.d" /></svg>
      <span>{{ i.label }}</span>
    </NuxtLink>
    <div class="min-h-10 flex-1" />
    <NuxtLink to="/" class="flex min-h-11 items-center gap-3 border border-line-dark px-3 text-[13px] uppercase tracking-[0.1em] text-champagne transition-colors hover:border-champagne">View storefront <span aria-hidden="true">↗</span></NuxtLink>
    <div class="mt-3 flex items-center gap-3 border-t border-line-dark px-3 pt-4">
      <span class="flex h-[38px] w-[38px] items-center justify-center bg-line-dark font-display text-[19px] text-on-dark">{{ initials }}</span>
      <span class="flex flex-1 flex-col leading-tight">
        <span class="text-sm text-on-dark">{{ auth.me?.full_name || 'Staff' }}</span>
        <span class="text-xs text-text-dark-3">{{ auth.isOwner ? 'Owner · all permissions' : 'Staff' }}</span>
      </span>
    </div>
    <button type="button" class="min-h-11 px-3 text-left text-xs uppercase tracking-[0.14em] text-text-dark-3 transition-colors hover:text-on-dark" @click="signOut">Sign out</button>
  </nav>
</template>

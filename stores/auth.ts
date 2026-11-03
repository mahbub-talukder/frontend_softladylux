import { defineStore } from 'pinia'

export interface AdminMe {
  id: number
  full_name: string
  role: 'owner' | 'staff'
  permissions: string[]
}

// SRS PRM-04: the UI shows only what GET admin/me/ says the user may do (server stays authoritative).
export const useAuthStore = defineStore('auth', {
  state: () => ({ me: null as AdminMe | null, loaded: false }),
  getters: {
    isStaff: (s) => !!s.me,
    can: (s) => (code: string) => s.me?.role === 'owner' || !!s.me?.permissions.includes(code)
  },
  actions: {
    // GET admin/me/ (PRM-04). The endpoint arrives in M1; until then no one is signed in.
    async fetchMe() {
      const { api } = useApi()
      try {
        this.me = await api<AdminMe>('/admin/me/')
      } catch {
        this.me = null
      }
      this.loaded = true
    }
  }
})

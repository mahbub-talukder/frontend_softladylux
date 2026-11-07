import { defineStore } from 'pinia'

export interface AdminMe {
  id: number
  full_name: string
  email: string
  role: 'owner' | 'staff'
  permissions: string[]
}

// SRS PRM-04: the UI shows only what GET admin/me/ says the user may do (server stays authoritative).
export const useAuthStore = defineStore('auth', {
  state: () => ({ me: null as AdminMe | null, loaded: false }),
  getters: {
    isStaff: (s) => !!s.me,
    isOwner: (s) => s.me?.role === 'owner',
    can: (s) => (code: string) => s.me?.role === 'owner' || !!s.me?.permissions.includes(code)
  },
  actions: {
    // GET admin/me/ (PRM-03/04): re-read on every admin navigation so Owner edits apply without re-login.
    async fetchMe() {
      const { api } = useApi()
      try {
        this.me = await api<AdminMe>('/admin/me/', { silent: true })
      } catch {
        this.me = null
      }
      this.loaded = true
    },
    // ACC-10: staff sign in with email + password (separate from the customer form).
    async login(email: string, password: string, remember = true) {
      const { api } = useApi()
      this.me = await api<AdminMe>('/admin/auth/login/', { method: 'POST', body: { email, password, remember } })
      this.loaded = true
    },
    async logout() {
      const { api } = useApi()
      await api('/admin/auth/logout/', { method: 'POST' })
      this.me = null
    }
  }
})

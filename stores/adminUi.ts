import { defineStore } from 'pinia'

export type ToastKind = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  kind: ToastKind
  title: string
  lines: string[]
  /** Bumped when an identical toast is raised again so its timer restarts. */
  stamp: number
}

const MAX_TOASTS = 4

// Admin feedback state (loading counter + toast queue). Lives in a store, not in a layout, so the print layout,
// login and error pages share it. Client-only use: useApi only touches it when import.meta.client (nothing here
// is meant to be serialised into SSR payloads).
export const useAdminUi = defineStore('adminUi', {
  state: () => ({ pending: 0, toasts: [] as Toast[], seq: 0 }),
  actions: {
    begin() { this.pending++ },
    end() { this.pending = Math.max(0, this.pending - 1) },
    push(kind: ToastKind, title: string, lines: string[] = []) {
      const clean = lines.filter((l) => l && l !== title)
      const dupe = this.toasts.find((t) => t.kind === kind && t.title === title && t.lines.join('|') === clean.join('|'))
      if (dupe) { dupe.stamp = ++this.seq; return dupe.id }
      const toast: Toast = { id: ++this.seq, kind, title, lines: clean, stamp: this.seq }
      this.toasts.push(toast)
      while (this.toasts.length > MAX_TOASTS) this.toasts.shift()
      return toast.id
    },
    success(title: string, lines: string[] = []) { return this.push('success', title, lines) },
    info(title: string, lines: string[] = []) { return this.push('info', title, lines) },
    error(title: string, lines: string[] = []) { return this.push('error', title, lines) },
    dismiss(id: number) { this.toasts = this.toasts.filter((t) => t.id !== id) },
    clear() { this.toasts = [] }
  }
})

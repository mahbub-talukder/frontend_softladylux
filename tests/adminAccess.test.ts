// Covers SRS PRM-04, ADM-01, scenarios 11, 19, 28 (UI side).
import { describe, expect, it } from 'vitest'
import { allowed, guardTarget } from '../utils/adminAccess'

const staff = (...codes: string[]) => ({ isOwner: false, can: (c: string) => codes.includes(c) })
const owner = { isOwner: true, can: () => true }

describe('allowed', () => {
  it('shows permission-gated items only when granted', () => {
    expect(allowed({ permission: 'theme.manage' }, staff())).toBe(false)
    expect(allowed({ permission: 'theme.manage' }, staff('theme.manage'))).toBe(true)
  })
  it('hides Owner-only items from staff even with every code', () => {
    expect(allowed({ ownerOnly: true }, staff('settings.manage', 'theme.manage'))).toBe(false)
    expect(allowed({ ownerOnly: true }, owner)).toBe(true)
  })
  it('lets items without a rule through', () => {
    expect(allowed({}, staff())).toBe(true)
  })
})

describe('guardTarget', () => {
  it('sends signed-out users to login', () => {
    expect(guardTarget(false, {}, staff())).toBe('/admin/login')
  })
  it('sends forbidden pages to no-access (scenario 19)', () => {
    expect(guardTarget(true, { permission: 'theme.manage' }, staff('orders.view'))).toBe('/admin/no-access')
    expect(guardTarget(true, { ownerOnly: true }, staff())).toBe('/admin/no-access')
  })
  it('lets permitted pages through', () => {
    expect(guardTarget(true, { permission: 'theme.manage' }, staff('theme.manage'))).toBeNull()
    expect(guardTarget(true, { ownerOnly: true }, owner)).toBeNull()
  })
})

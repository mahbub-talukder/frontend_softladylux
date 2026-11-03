// SRS PRM-04 / ADM-01: pure access rules shared by the sidebar and the route guard, so they are
// unit-testable. The server stays authoritative (PRM-03).
export interface Access { isOwner: boolean; can: (code: string) => boolean }
export interface NavRule { permission?: string; ownerOnly?: boolean }

export function allowed(rule: NavRule, a: Access): boolean {
  if (rule.ownerOnly) return a.isOwner
  return !rule.permission || a.can(rule.permission)
}

/** Where the guard should send a signed-in/out user for a page's meta (null = let through). */
export function guardTarget(signedIn: boolean, rule: NavRule, a: Access): string | null {
  if (!signedIn) return '/admin/login'
  return allowed(rule, a) ? null : '/admin/no-access'
}

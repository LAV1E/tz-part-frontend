export type RoleSummary = {
  id: string
  name: string
  slug: string
}

export type CurrentUser = {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  status: 'active' | 'disabled'
  roles: RoleSummary[]
  permissions: string[]
  lastLoginAt: string | null
}

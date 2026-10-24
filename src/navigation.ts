export type NavChild = {
  label: string
  to: string
}

export type NavItem = {
  label: string
  to?: string
  children?: NavChild[]
}

export const navigation: NavItem[] = [
  { label: 'Dashboard', to: '/' },
  {
    label: 'Sales',
    children: [
      { label: 'Companies', to: '/sales/companies' },
      { label: 'Quotes', to: '/sales/quotes' },
      { label: 'Orders', to: '/sales/orders' },
    ],
  },
  {
    label: 'Warehouse',
    children: [
      { label: 'Stock', to: '/warehouse/stock' },
      { label: 'Transfers', to: '/warehouse/transfers' },
    ],
  },
  {
    label: 'Catalog',
    children: [
      { label: 'Products', to: '/catalog/products' },
      { label: 'Categories', to: '/catalog/categories' },
    ],
  },
  {
    label: 'Settings',
    children: [
      { label: 'Profile', to: '/settings/profile' },
      { label: 'Staff', to: '/settings/staff' },
      { label: 'Roles', to: '/settings/roles' },
    ],
  },
]

export function placeholderPaths(): string[] {
  return navigation
    .flatMap((item) => item.children?.map((child) => child.to) ?? [])
    .filter(
      (path) =>
        path !== '/settings/profile' &&
        path !== '/settings/staff' &&
        path !== '/settings/roles' &&
        path !== '/sales/companies'
    )
}

export function titleForPath(pathname: string): string {
  for (const item of navigation) {
    if (item.to === pathname) return item.label
    const child = item.children?.find(
      (entry) => entry.to === pathname || pathname.startsWith(`${entry.to}/`),
    )
    if (child) return child.label
  }
  return 'Not found'
}

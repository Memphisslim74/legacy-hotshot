type IconName =
  | 'dashboard' | 'loads' | 'plus' | 'customers' | 'drivers' | 'vehicles'
  | 'documents' | 'messages' | 'expenses' | 'invoices' | 'reports' | 'settings'
  | 'search' | 'bell' | 'menu' | 'arrow' | 'clock' | 'route' | 'check'
  | 'alert' | 'logout' | 'truck'

type IconProps = {
  name: IconName
  size?: number
}

const paths: Record<IconName, string[]> = {
  dashboard: ['M3 3h7v7H3z', 'M14 3h7v4h-7z', 'M14 11h7v10h-7z', 'M3 14h7v7H3z'],
  loads: ['M4 7h16', 'M6 3h12l2 4H4z', 'M5 7v13h14V7', 'M8 11h8', 'M8 15h5'],
  plus: ['M12 5v14', 'M5 12h14'],
  customers: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  drivers: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M5 8h14', 'M7 5h10'],
  vehicles: ['M3 16V6a2 2 0 0 1 2-2h9l4 5h2a2 2 0 0 1 2 2v5', 'M5 16h14', 'M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4', 'M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4', 'M14 4v5h4'],
  documents: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6'],
  messages: ['M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z', 'M8 9h8', 'M8 13h5'],
  expenses: ['M12 2v20', 'M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6'],
  invoices: ['M6 2h12v20l-3-2-3 2-3-2-3 2z', 'M9 7h6', 'M9 11h6', 'M9 15h3'],
  reports: ['M4 19V9', 'M10 19V5', 'M16 19v-7', 'M22 19H2'],
  settings: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7', 'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20.3h-3v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7.08 15a1.7 1.7 0 0 0-1.55-1H5.4v-3h.13a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06L8.8 5.94l.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V4.7h3v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.55 1h.13v3h-.13a1.7 1.7 0 0 0-1.55 1z'],
  search: ['M21 21l-4.35-4.35', 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', 'M12 6v6l4 2'],
  route: ['M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6', 'M18 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6', 'M6 16V8a4 4 0 0 1 4-4h5', 'M18 10v6a4 4 0 0 1-4 4H9'],
  check: ['M20 6 9 17l-5-5'],
  alert: ['M12 9v4', 'M12 17h.01', 'M10.3 2.9 1.7-.9 9 17H3z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  truck: ['M3 6h11v11H3z', 'M14 10h4l3 3v4h-7z', 'M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4', 'M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4'],
}

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name].map((path, index) => <path key={`${name}-${index}`} d={path} />)}
    </svg>
  )
}

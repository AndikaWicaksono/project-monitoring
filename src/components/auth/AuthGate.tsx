import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { LoginPage } from '../../pages/LoginPage'

const MONITORING_ONLY_ROLES = new Set(['admin_osm', 'doccon_osm', 'engineer_os', 'kadep'])

interface Props {
  children: ReactNode
}

export function AuthGate({ children }: Props) {
  const session = useAuthStore((s) => s.session)
  const users = useAuthStore((s) => s.users)
  const view = useUIStore((s) => s.view)
  const setView = useUIStore((s) => s.setView)

  const user = session ? users.find((u) => u.id === session.userId) : undefined
  const valid = !!user && user.active

  useEffect(() => {
    if (!valid || !user) return
    if (MONITORING_ONLY_ROLES.has(user.role) && !view.startsWith('monitoring-')) {
      setView('monitoring-dashboard')
    }
  }, [valid, user?.id, user?.role])

  if (!valid) return <LoginPage />
  return <>{children}</>
}

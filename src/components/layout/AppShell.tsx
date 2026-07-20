import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-base text-ink-primary print:h-auto print:w-auto print:overflow-visible print:block">
      <Sidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden print:h-auto print:block print:overflow-visible">
        <Header />
        <main className="relative flex-1 min-h-0 overflow-hidden print:overflow-visible print:h-auto print:static">{children}</main>
      </div>
    </div>
  )
}

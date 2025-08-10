import React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Users, TrendingUp, Calendar, Settings, Inbox, MessageCircle, Building2, Megaphone, UserCheck, Globe, FileText } from 'lucide-react'
import { clsx } from 'clsx'

// Navigation configuration for Pleasant Cove Design dashboard
interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<any>
}

const navigation: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/proposals', label: 'Proposals', icon: FileText },
  { path: '/outreach', label: 'Outreach', icon: Megaphone },
  { path: '/schedule', label: 'Appointments', icon: Calendar },
  { path: '/clients', label: 'Clients', icon: Building2 },
  { path: '/workspace', label: 'Project Workspace', icon: TrendingUp },
  { path: '/interactions', label: 'Interactions', icon: MessageCircle },
  { path: '/business/1/inbox', label: 'Biz Pro Inbox', icon: Inbox },
  { path: '/demos', label: 'Demo Gallery', icon: Globe },
  { path: '/team', label: 'Team', icon: UserCheck },
  { path: '/settings', label: 'Settings', icon: Settings },
]

const Layout: React.FC = () => {
  const location = useLocation()
  const isInboxPage = location.pathname.includes('/inbox')
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header with logo and tabs */}
      <div className="bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary-600">Pleasant Cove Design</h1>
            </div>
            <div className="text-sm text-muted">Biz Pro Dashboard</div>
          </div>
          
          {/* Tab Navigation - Full Dashboard */}
          <div className="flex flex-wrap gap-4 items-center -mb-px">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap mb-2',
                      isActive
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-muted hover:text-foreground hover:border-gray-300'
                    )
                  }
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main content - Full width for inbox, regular padding for other pages */}
      <main className={isInboxPage ? '' : 'px-6 py-8'}>
        <Outlet />
      </main>
    </div>
  )
}

export default Layout 
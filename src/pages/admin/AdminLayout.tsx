import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, CalendarDays, Settings,
  ChevronLeft, Bell, Search, Images, LogOut, Tags, Users, Link2, RefreshCcw,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ModeToggle } from '@/components/mode-toggle'
import { Separator } from '@/components/ui/separator'
import { HavenMark } from '@/components/layout/HavenMark'
import { clearAdminToken, getAdminRole } from '@/lib/admin-auth'
import { useSettings } from '@/lib/settings'
import { useAdminNotifications, type AdminNotification } from '@/hooks/use-admin-notifications'
import { toast } from 'sonner'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/listings', label: 'Listings', icon: Building2 },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/hero', label: 'Hero Section', icon: Images },
  { to: '/admin/navigation', label: 'Navigation', icon: Link2 },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const settings = useSettings()
  const { siteName, brandTagline, contactEmail } = settings
  const role = getAdminRole()
  const visibleNav = navItems.filter(item => !item.adminOnly || role === 'admin')
  const {
    loading: notificationsLoading,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    resetReadState,
    refresh,
    isRead,
  } = useAdminNotifications(settings)

  function formatAge(value: string): string {
    const delta = Date.now() - Date.parse(value)
    if (!Number.isFinite(delta) || delta < 60_000) return 'just now'
    const mins = Math.floor(delta / 60_000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  function handleNotificationSelect(item: AdminNotification) {
    markAsRead(item.id)
    if (item.href) navigate(item.href)
  }

  function severityClass(level: AdminNotification['severity']): string {
    if (level === 'critical') return 'bg-red-500'
    if (level === 'warning') return 'bg-amber-500'
    return 'bg-primary'
  }

  function handleLogout() {
    clearAdminToken()
    toast.success('Signed out')
    navigate('/admin/login', { replace: true })
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <span className="logo-3d flex size-8 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
                    <HavenMark className="logo-mark size-4" />
                  </span>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="wordmark-premium truncate text-[0.95rem] leading-none" data-text={siteName}>{siteName}</span>
                    <span className="wordmark-sub mt-1">{brandTagline}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNav.map(item => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} end={item.end}>
                      {({ isActive }) => (
                        <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/" className="flex items-center gap-2">
                  <ChevronLeft className="size-4" />
                  <span>Back to Site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <Avatar className="size-8">
                  <AvatarFallback className="admin-medallion text-xs font-semibold">AD</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Admin User</span>
                  <span className="truncate text-xs text-muted-foreground">{contactEmail}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Sign out">
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top bar */}
        <header className="admin-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" disabled>
              <Search className="size-4" />
              <span className="hidden md:inline text-sm">Search...</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-88 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : 'Everything is up to date'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </Button>
                </div>

                <div className="max-h-80 overflow-y-auto p-1">
                  {notificationsLoading && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">Loading notifications...</p>
                  )}

                  {!notificationsLoading && notifications.length === 0 && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">No notifications yet.</p>
                  )}

                  {!notificationsLoading && notifications.map(item => {
                    const read = isRead(item.id)
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        className="items-start gap-3 rounded-md p-2"
                        onSelect={() => handleNotificationSelect(item)}
                      >
                        <span className={`mt-1.5 size-2 rounded-full ${severityClass(item.severity)}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            {!read && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.message}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatAge(item.createdAt)}</p>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t px-2 py-1.5">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={refresh}>
                    <RefreshCcw className="size-3.5" /> Refresh
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={resetReadState}>
                    Reset read state
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle />
          </div>
        </header>

        {/* Page content */}
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

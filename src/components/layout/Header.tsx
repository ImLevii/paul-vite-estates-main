import { Link } from 'react-router-dom'
import { User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { useSettings } from '@/lib/settings'
import { HavenMark } from '@/components/layout/HavenMark'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function Header() {
  const { siteName, brandTagline } = useSettings()

  return (
    <header className="navbar-premium sticky top-0 z-50 w-full">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-3.5">
          <div className="logo-3d relative flex size-10 items-center justify-center rounded-[0.9rem] text-primary-foreground">
            <HavenMark className="logo-mark size-5" />
          </div>
          <span className="flex flex-col">
            <span className="wordmark-premium text-[1.35rem] leading-none" data-text={siteName}>{siteName}</span>
            <span className="wordmark-sub">{brandTagline}</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            variant="outline"
            size="sm"
            asChild
            className="nav-action hidden transition-all hover:-translate-y-px md:flex"
          >
            <Link to="/admin">
              <User className="size-4" />
              Dashboard
            </Link>
          </Button>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="nav-action md:hidden">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="glass-strong">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <span className="logo-3d flex size-9 items-center justify-center rounded-[0.8rem] text-primary-foreground">
                    <HavenMark className="logo-mark size-[1.15rem]" />
                  </span>
                  <span className="wordmark-premium" data-text={siteName}>{siteName}</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-2 px-4">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link to="/admin">Admin Dashboard</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

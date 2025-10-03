import { Outlet, NavLink } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setThemeMode, ThemeMode } from '@/store/slices/uiSlice'
import { Toaster } from '@/components/ui/toaster'
import { Bot, User } from 'lucide-react'
import { ThemeToggle } from '@/ui/components/ThemeToggle'
import { WelcomeBackModal } from '@/features/interviewee/WelcomeBackModal'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function RootLayout() {
  const themeMode = useAppSelector(s => s.ui.themeMode)
  const dispatch = useAppDispatch()

  useEffect(() => {
    const root = document.documentElement
    if (
      themeMode === 'dark' ||
      (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [themeMode])

  // theme is controlled via ThemeToggle

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <NavLink to="/" className="text-xl font-semibold">
            interview-mind
          </NavLink>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-16">
          <Tabs value={location.pathname} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="/interviewee" asChild>
                <NavLink to="/interviewee" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Interviewee
                </NavLink>
              </TabsTrigger>
              <TabsTrigger value="/interviewer" asChild>
                <NavLink to="/interviewer" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" /> Interviewer
                </NavLink>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </aside>
        <section>
          <Outlet />
        </section>
      </main>
      <Toaster />
      <WelcomeBackModal />
    </div>
  )
}

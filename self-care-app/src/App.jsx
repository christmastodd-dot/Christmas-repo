import { useState, useEffect, useRef } from 'react'
import BottomNav from './components/BottomNav'
import Onboarding from './components/Onboarding'
import HomePage from './pages/HomePage'
import LearnPage from './pages/LearnPage'
import ConnectPage from './pages/ConnectPage'
import NutritionPage from './pages/NutritionPage'
import BodyPage from './pages/BodyPage'
import CheckInPage from './pages/CheckInPage'
import WeeklyReviewPage from './pages/WeeklyReviewPage'
import SettingsPage from './pages/SettingsPage'

const pages = {
  home: HomePage,
  learn: LearnPage,
  connect: ConnectPage,
  nutrition: NutritionPage,
  body: BodyPage,
  checkin: CheckInPage,
  review: WeeklyReviewPage,
  settings: SettingsPage,
}

function getInitialTheme() {
  const saved = localStorage.getItem('selfcare_theme')
  if (saved) return saved
  return 'dark'
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [theme, setTheme] = useState(getInitialTheme)
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('selfcare_onboarded') === 'true')
  const mainRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('selfcare_theme', theme)
    // Update meta theme-color for mobile browser chrome
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'dark' ? '#0f172a' : '#f8fafc'
  }, [theme])

  function handleNavigate(tab) {
    setActiveTab(tab)
    mainRef.current?.scrollTo(0, 0)
  }

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />
  }

  const Page = pages[activeTab]
  const pageProps = activeTab === 'settings'
    ? { theme, onThemeChange: setTheme }
    : { onNavigate: handleNavigate }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main ref={mainRef} className="flex-1 pb-20 overflow-y-auto">
        <Page {...pageProps} />
      </main>
      <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
    </div>
  )
}

import { useState } from 'react'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import LearnPage from './pages/LearnPage'
import ConnectPage from './pages/ConnectPage'
import NutritionPage from './pages/NutritionPage'
import BodyPage from './pages/BodyPage'

const pages = {
  home: HomePage,
  learn: LearnPage,
  connect: ConnectPage,
  nutrition: NutritionPage,
  body: BodyPage,
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home')

  const Page = pages[activeTab]

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Page onNavigate={setActiveTab} />
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

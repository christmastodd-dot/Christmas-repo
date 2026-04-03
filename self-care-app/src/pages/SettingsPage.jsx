import { useState } from 'react'
import { loadData, saveData, getDefaultData } from '../utils/storage'

export default function SettingsPage({ theme, onThemeChange }) {
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [exportDone, setExportDone] = useState(false)

  function handleExport() {
    const data = loadData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selfcare-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2000)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (imported.habits || imported.checkins || imported.logs) {
          saveData(imported)
          alert('Data imported successfully! Refresh to see changes.')
        } else {
          alert('Invalid data format.')
        }
      } catch {
        alert('Failed to parse file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleReset() {
    saveData(getDefaultData())
    localStorage.removeItem('selfcare_onboarded')
    setShowConfirmReset(false)
    window.location.reload()
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-xl font-bold text-[var(--color-text)] mb-6 m-0">Settings</h1>

      {/* Theme toggle */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text)] m-0">Appearance</p>
            <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </p>
          </div>
          <div className="flex bg-[var(--color-surface-hover)] rounded-xl p-0.5">
            <button
              onClick={() => onThemeChange('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer transition-all ${
                theme === 'light'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-transparent text-[var(--color-text-muted)]'
              }`}
            >
              {'\u2600\uFE0F'} Light
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer transition-all ${
                theme === 'dark'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-transparent text-[var(--color-text-muted)]'
              }`}
            >
              {'\u{1F319}'} Dark
            </button>
          </div>
        </div>
      </div>

      {/* Data export */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <p className="text-sm font-medium text-[var(--color-text)] m-0 mb-1">Data</p>
        <p className="text-xs text-[var(--color-text-muted)] m-0 mb-3">
          Export or import your data as JSON
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 py-2.5 rounded-xl border-none font-medium text-sm text-white cursor-pointer bg-[var(--color-primary)]"
          >
            {exportDone ? '\u2713 Exported!' : '\u{1F4E5} Export'}
          </button>
          <label className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-sm font-medium text-center cursor-pointer">
            {'\u{1F4E4}'} Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Reset */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <p className="text-sm font-medium text-[var(--color-text)] m-0 mb-1">Reset</p>
        <p className="text-xs text-[var(--color-text-muted)] m-0 mb-3">
          Clear all data and start fresh
        </p>
        {!showConfirmReset ? (
          <button
            onClick={() => setShowConfirmReset(true)}
            className="w-full py-2.5 rounded-xl border border-red-400/30 bg-transparent text-red-400 text-sm font-medium cursor-pointer"
          >
            Reset All Data
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 rounded-xl border-none bg-red-500 text-white text-sm font-medium cursor-pointer"
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setShowConfirmReset(false)}
              className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* About */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <p className="text-sm font-medium text-[var(--color-text)] m-0">Self-Care Tracker</p>
        <p className="text-xs text-[var(--color-text-muted)] m-0 mt-0.5">
          A personal accountability app for learning, connections, nutrition, and body care.
        </p>
        <p className="text-xs text-[var(--color-text-muted)] opacity-50 m-0 mt-2">
          All data stored locally on your device.
        </p>
      </div>
    </div>
  )
}

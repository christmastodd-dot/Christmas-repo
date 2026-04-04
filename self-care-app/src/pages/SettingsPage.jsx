import { useState, useEffect } from 'react'
import { loadData, saveData, getDefaultData } from '../utils/storage'
import {
  loadReminders,
  saveReminders,
  requestNotificationPermission,
  getNotificationStatus,
} from '../utils/notifications'

export default function SettingsPage({ theme, onThemeChange }) {
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [reminders, setReminders] = useState(loadReminders)
  const [notifStatus, setNotifStatus] = useState(getNotificationStatus)

  function updateReminders(updates) {
    const next = { ...reminders, ...updates }
    setReminders(next)
    saveReminders(next)
  }

  async function handleEnableReminders() {
    const status = await requestNotificationPermission()
    setNotifStatus(status)
    if (status === 'granted') {
      updateReminders({ enabled: true })
    }
  }

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

      {/* Reminders */}
      <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-[var(--color-text)] m-0">Reminders</p>
          {notifStatus === 'unsupported' && (
            <span className="text-[10px] text-[var(--color-text-muted)]">Not supported</span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] m-0 mb-3">
          Get nudged to check in and reflect
        </p>

        {notifStatus === 'unsupported' ? (
          <p className="text-xs text-[var(--color-text-muted)] opacity-60 m-0">
            Your browser doesn't support notifications.
          </p>
        ) : notifStatus === 'denied' ? (
          <p className="text-xs text-red-400 m-0">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        ) : !reminders.enabled ? (
          <button
            onClick={handleEnableReminders}
            className="w-full py-2.5 rounded-xl border-none font-medium text-sm text-white cursor-pointer bg-[var(--color-primary)]"
          >
            {'\u{1F514}'} Enable Reminders
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Morning */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateReminders({ morningEnabled: !reminders.morningEnabled })}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer bg-transparent"
                  style={{
                    borderColor: reminders.morningEnabled ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: reminders.morningEnabled ? 'var(--color-primary)' : 'transparent',
                  }}
                >
                  {reminders.morningEnabled && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-[var(--color-text)]">{'\u2600\uFE0F'} Morning intention</span>
              </div>
              <input
                type="time"
                value={reminders.morningTime}
                onChange={(e) => updateReminders({ morningTime: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] outline-none"
              />
            </div>

            {/* Evening */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateReminders({ eveningEnabled: !reminders.eveningEnabled })}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer bg-transparent"
                  style={{
                    borderColor: reminders.eveningEnabled ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: reminders.eveningEnabled ? 'var(--color-primary)' : 'transparent',
                  }}
                >
                  {reminders.eveningEnabled && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-[var(--color-text)]">{'\u{1F319}'} Evening reflection</span>
              </div>
              <input
                type="time"
                value={reminders.eveningTime}
                onChange={(e) => updateReminders({ eveningTime: e.target.value })}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-text)] outline-none"
              />
            </div>

            {/* Disable */}
            <button
              onClick={() => updateReminders({ enabled: false })}
              className="text-xs text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer p-0 text-left"
            >
              Disable reminders
            </button>
          </div>
        )}
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

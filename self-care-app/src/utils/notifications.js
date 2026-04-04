const REMINDERS_KEY = 'selfcare_reminders'

const defaults = {
  enabled: false,
  morningTime: '08:00',
  eveningTime: '21:00',
  morningEnabled: true,
  eveningEnabled: true,
}

export function loadReminders() {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

export function saveReminders(settings) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(settings))
  scheduleReminders(settings)
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// Timer-based scheduling (works while app tab is open)
let morningTimer = null
let eveningTimer = null

export function scheduleReminders(settings) {
  clearTimers()
  if (!settings.enabled) return
  if (getNotificationStatus() !== 'granted') return

  if (settings.morningEnabled) {
    morningTimer = scheduleDaily(settings.morningTime, () => {
      showNotification('Good morning!', 'Set your intentions for today. What will you focus on?')
    })
  }

  if (settings.eveningEnabled) {
    eveningTimer = scheduleDaily(settings.eveningTime, () => {
      showNotification('Time to reflect', 'How did today go? Do your daily check-in.')
    })
  }
}

function scheduleDaily(timeStr, callback) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(hours, minutes, 0, 0)

  // If time already passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1)
  }

  const ms = target - now
  return setTimeout(() => {
    callback()
    // Reschedule for next day
    scheduleDaily(timeStr, callback)
  }, ms)
}

function clearTimers() {
  if (morningTimer) clearTimeout(morningTimer)
  if (eveningTimer) clearTimeout(eveningTimer)
  morningTimer = null
  eveningTimer = null
}

function showNotification(title, body) {
  if (getNotificationStatus() !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/Christmas-repo/favicon.svg',
      badge: '/Christmas-repo/favicon.svg',
      tag: title,
    })
  } catch {
    // Notification constructor may fail on some mobile browsers
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/Christmas-repo/favicon.svg',
          tag: title,
        })
      })
    }
  }
}

// Initialize reminders on load
export function initReminders() {
  const settings = loadReminders()
  if (settings.enabled) {
    scheduleReminders(settings)
  }
}

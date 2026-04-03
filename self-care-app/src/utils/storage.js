const STORAGE_KEY = 'selfcare_data'

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : getDefaultData()
  } catch {
    return getDefaultData()
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getDefaultData() {
  return {
    habits: [],
    logs: [],
    people: [],
    checkins: [],
  }
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

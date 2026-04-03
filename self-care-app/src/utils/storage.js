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
    completions: {},
  }
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function getHabitsForPillar(pillar) {
  return loadData().habits.filter((h) => h.pillar === pillar)
}

export function getCompletionsForDate(date) {
  const data = loadData()
  return data.completions?.[date] || {}
}

export function toggleCompletion(habitId, date) {
  const data = loadData()
  if (!data.completions) data.completions = {}
  if (!data.completions[date]) data.completions[date] = {}
  data.completions[date][habitId] = !data.completions[date][habitId]
  saveData(data)
  return data.completions[date][habitId]
}

export function addHabit(habit) {
  const data = loadData()
  data.habits.push(habit)
  saveData(data)
}

export function deleteHabit(habitId) {
  const data = loadData()
  data.habits = data.habits.filter((h) => h.id !== habitId)
  saveData(data)
}

export function getStreak(habitId) {
  const data = loadData()
  const completions = data.completions || {}
  let streak = 0
  const d = new Date()
  // Check today first, then go backwards
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (completions[key]?.[habitId]) {
      streak++
      d.setDate(d.getDate() - 1)
    } else {
      // If today isn't done yet, check if yesterday starts a streak
      if (streak === 0) {
        d.setDate(d.getDate() - 1)
        const yesterdayKey = d.toISOString().slice(0, 10)
        if (completions[yesterdayKey]?.[habitId]) {
          streak++
          d.setDate(d.getDate() - 1)
          while (completions[d.toISOString().slice(0, 10)]?.[habitId]) {
            streak++
            d.setDate(d.getDate() - 1)
          }
        }
      }
      break
    }
  }
  return streak
}

export function getWeekCompletionCount(habitId) {
  const data = loadData()
  const completions = data.completions || {}
  let count = 0
  const d = new Date()
  const dayOfWeek = d.getDay()
  // Go back to most recent Sunday
  d.setDate(d.getDate() - dayOfWeek)
  for (let i = 0; i < 7; i++) {
    const key = d.toISOString().slice(0, 10)
    if (completions[key]?.[habitId]) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

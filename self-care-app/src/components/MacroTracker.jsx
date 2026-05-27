import { useState, useEffect } from 'react'
import {
  getMealsForDate,
  addMeal,
  deleteMeal,
  getMacroGoals,
  saveMacroGoals,
  getDayMacroTotals,
  getTodayKey,
  generateId,
} from '../utils/storage'

const mealSlots = ['Breakfast', 'Snack 1', 'Lunch', 'Snack 2', 'Dinner', 'Snack 3']

export default function MacroTracker() {
  const todayKey = getTodayKey()
  const [meals, setMeals] = useState([])
  const [goals, setGoals] = useState(getMacroGoals)
  const [showAdd, setShowAdd] = useState(false)
  const [showGoals, setShowGoals] = useState(false)
  const [editGoals, setEditGoals] = useState(goals)
  const [mealName, setMealName] = useState('')
  const [mealSlot, setMealSlot] = useState('Breakfast')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  useEffect(() => {
    refresh()
  }, [])

  function refresh() {
    setMeals(getMealsForDate(todayKey))
  }

  function handleAdd() {
    if (!calories && !protein && !carbs && !fat) return
    addMeal({
      id: generateId(),
      date: todayKey,
      slot: mealSlot,
      name: mealName.trim() || mealSlot,
      calories: parseInt(calories, 10) || 0,
      protein: parseInt(protein, 10) || 0,
      carbs: parseInt(carbs, 10) || 0,
      fat: parseInt(fat, 10) || 0,
      createdAt: new Date().toISOString(),
    })
    setMealName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setShowAdd(false)
    refresh()
  }

  function handleDelete(id) {
    deleteMeal(id)
    refresh()
  }

  function handleSaveGoals() {
    saveMacroGoals(editGoals)
    setGoals(editGoals)
    setShowGoals(false)
  }

  const totals = getDayMacroTotals(todayKey)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide m-0">
          Daily Macros
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setShowGoals(!showGoals)}
            className="text-xs font-medium px-2 py-1.5 rounded-lg border-none cursor-pointer bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
          >
            Goals
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border-none cursor-pointer transition-colors"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-nutrition)' }}
          >
            + Meal
          </button>
        </div>
      </div>

      {/* Progress rings */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <MacroRing label="Calories" current={totals.calories} goal={goals.calories} unit="kcal" color="var(--color-nutrition)" />
        <MacroRing label="Protein" current={totals.protein} goal={goals.protein} unit="g" color="#3b82f6" />
        <MacroRing label="Carbs" current={totals.carbs} goal={goals.carbs} unit="g" color="#f59e0b" />
        <MacroRing label="Fat" current={totals.fat} goal={goals.fat} unit="g" color="#ec4899" />
      </div>

      {/* Goals editor */}
      {showGoals && (
        <div className="mb-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-2 m-0">Daily Goals</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <GoalInput label="Cal" value={editGoals.calories} onChange={(v) => setEditGoals({ ...editGoals, calories: v })} />
            <GoalInput label="Protein" value={editGoals.protein} onChange={(v) => setEditGoals({ ...editGoals, protein: v })} />
            <GoalInput label="Carbs" value={editGoals.carbs} onChange={(v) => setEditGoals({ ...editGoals, carbs: v })} />
            <GoalInput label="Fat" value={editGoals.fat} onChange={(v) => setEditGoals({ ...editGoals, fat: v })} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveGoals} className="flex-1 py-2 rounded-xl border-none bg-[var(--color-nutrition)] text-white text-xs font-medium cursor-pointer">
              Save Goals
            </button>
            <button onClick={() => setShowGoals(false)} className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-xs cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add meal form */}
      {showAdd && (
        <div className="mb-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          {/* Meal slot selector */}
          <div className="flex flex-wrap gap-1 mb-3">
            {mealSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setMealSlot(slot)}
                className="px-2.5 py-1 rounded-lg border-none text-[11px] font-medium cursor-pointer transition-all"
                style={{
                  backgroundColor: mealSlot === slot ? 'var(--color-nutrition)' : 'var(--color-surface-hover)',
                  color: mealSlot === slot ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {slot}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="What did you eat? (optional)"
            className="w-full p-2.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-sm outline-none focus:border-[var(--color-primary-light)] mb-2"
          />

          <div className="grid grid-cols-4 gap-2 mb-3">
            <MacroInput label="Calories" value={calories} onChange={setCalories} color="var(--color-nutrition)" />
            <MacroInput label="Protein" value={protein} onChange={setProtein} color="#3b82f6" />
            <MacroInput label="Carbs" value={carbs} onChange={setCarbs} color="#f59e0b" />
            <MacroInput label="Fat" value={fat} onChange={setFat} color="#ec4899" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!calories && !protein && !carbs && !fat}
              className="flex-1 py-2.5 rounded-xl border-none font-medium text-sm text-white cursor-pointer disabled:opacity-40 bg-[var(--color-nutrition)]"
            >
              Add Meal
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Meal list */}
      {meals.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {meals.map((meal) => (
            <MealRow key={meal.id} meal={meal} onDelete={() => handleDelete(meal.id)} />
          ))}
        </div>
      )}

      {meals.length === 0 && !showAdd && (
        <p className="text-xs text-[var(--color-text-muted)] text-center opacity-60 m-0 py-3">
          No meals logged today. Tap + Meal to start.
        </p>
      )}
    </div>
  )
}

function MacroRing({ label, current, goal, unit, color }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0
  const over = current > goal

  return (
    <div className="text-center">
      <div className="relative w-14 h-14 mx-auto mb-1">
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <path
            d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0-31.831"
            fill="none"
            stroke="var(--color-surface-hover)"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0-31.831"
            fill="none"
            stroke={over ? '#ef4444' : color}
            strokeWidth="3"
            strokeDasharray={`${pct}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-[var(--color-text)]">{current}</span>
        </div>
      </div>
      <p className="text-[9px] text-[var(--color-text-muted)] m-0">{label}</p>
      <p className="text-[8px] text-[var(--color-text-muted)] opacity-60 m-0">/{goal}{unit === 'kcal' ? '' : unit}</p>
    </div>
  )
}

function MacroInput({ label, value, onChange, color }) {
  return (
    <div>
      <label className="text-[9px] font-medium block mb-0.5" style={{ color }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        min="0"
        className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-xs text-center outline-none focus:border-[var(--color-primary-light)]"
      />
    </div>
  )
}

function GoalInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-[9px] text-[var(--color-text-muted)] block mb-0.5">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        min="0"
        className="w-full p-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] text-xs text-center outline-none"
      />
    </div>
  )
}

function MealRow({ meal, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer p-0 text-left"
      >
        <div>
          <span className="text-xs font-medium text-[var(--color-text)]">{meal.name}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] ml-2">{meal.slot}</span>
        </div>
        <span className="text-xs font-bold text-[var(--color-nutrition)]">{meal.calories} cal</span>
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="flex gap-3">
            <span className="text-[10px] text-[#3b82f6]">P: {meal.protein}g</span>
            <span className="text-[10px] text-[#f59e0b]">C: {meal.carbs}g</span>
            <span className="text-[10px] text-[#ec4899]">F: {meal.fat}g</span>
          </div>
          <button onClick={onDelete} className="text-[10px] text-red-400 bg-transparent border-none cursor-pointer">
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

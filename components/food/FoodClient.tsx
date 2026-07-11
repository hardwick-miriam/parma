'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { computeDayQuality, type MacroTargets, type MacroTotals } from '@/lib/foodQuality'
import { getLocalDate } from '@/lib/date'
import type { FoodLogItem, MostEatenFood, FoodNote } from '@/lib/db/food'
import type { SavedMeal, SavedMealItem } from '@/lib/db/savedMeals'

function normaliseFoodKey(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, ' ')
}

const MEAL_EMOJI: Record<string, string> = { breakfast: '🍳', lunch: '🥪', dinner: '🍽️', snack: '🍿' }
const SOURCE_LABEL: Record<string, string> = { 'ai-estimate': 'AI est.', off: 'OFF', manual: 'manual', barcode: 'barcode' }

interface FoodDay {
  date: string
  items: FoodLogItem[]
  water_ml: number
  supplements: string[]
}

function dayTotals(items: FoodLogItem[]): MacroTotals {
  return items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein_g: acc.protein_g + Number(i.protein_g),
      carbs_g: acc.carbs_g + Number(i.carbs_g),
      fat_g: acc.fat_g + Number(i.fat_g),
      fibre_g: acc.fibre_g + Number(i.fibre_g),
      sugar_g: acc.sugar_g + Number(i.sugar_g),
      salt_g: acc.salt_g + Number(i.salt_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, salt_g: 0 }
  )
}

function MacroBar({ label, value, target, unit = 'g' }: { label: string; value: number; target: number; unit?: string }) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] text-text-muted">
        <span>{label}</span>
        <span>{Math.round(value)}{unit} / {Math.round(target)}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
      </div>
    </div>
  )
}

type EditableMacro = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fibre_g' | 'sugar_g' | 'salt_g'
const EDITABLE_MACROS: { key: EditableMacro; label: string }[] = [
  { key: 'calories', label: 'kcal' }, { key: 'protein_g', label: 'Protein g' },
  { key: 'carbs_g', label: 'Carbs g' }, { key: 'fat_g', label: 'Fat g' },
  { key: 'fibre_g', label: 'Fibre g' }, { key: 'sugar_g', label: 'Sugar g' }, { key: 'salt_g', label: 'Salt g' },
]

function FoodItemRow({ item, note }: { item: FoodLogItem; note: FoodNote | undefined }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState<Record<EditableMacro, string>>({
    calories: String(item.calories), protein_g: String(item.protein_g), carbs_g: String(item.carbs_g),
    fat_g: String(item.fat_g), fibre_g: String(item.fibre_g), sugar_g: String(item.sugar_g), salt_g: String(item.salt_g),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['food-timeline'] })
    queryClient.invalidateQueries({ queryKey: ['food-today'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, number> = {}
      for (const { key } of EDITABLE_MACROS) updates[key] = Number(draft[key]) || 0
      const res = await fetch(`/api/food-log/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save')
    },
    onSuccess: () => { invalidate(); setEditing(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/food-log/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: invalidate,
  })

  if (editing) {
    return (
      <div className="py-3 flex flex-col gap-2">
        <p className="text-sm font-medium text-text">{item.description}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {EDITABLE_MACROS.map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-0.5 text-[10px] text-text-muted">
              {label}
              <input
                type="number" step={key === 'salt_g' ? '0.1' : '1'} min="0"
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="w-full rounded-md bg-surface-elevated border border-border text-text text-xs px-2 py-1 focus:outline-none focus:border-accent"
              />
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--accent)' }}>
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span>{item.meal ? MEAL_EMOJI[item.meal] : '🍴'}</span>
        <span className="text-sm text-text flex-1">{item.description}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-elevated text-text-faint border border-border">
          {SOURCE_LABEL[item.source] ?? item.source}
        </span>
      </div>
      <div className="flex items-center justify-between pl-6">
        <p className="text-xs text-text-subtle">
          {item.calories} kcal · {Number(item.protein_g).toFixed(0)}g P · {Number(item.carbs_g).toFixed(0)}g C · {Number(item.fat_g).toFixed(0)}g F
        </p>
        {!confirmDelete ? (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditing(true)} className="text-[11px] text-text-subtle hover:text-text-muted">Edit</button>
            <button onClick={() => setConfirmDelete(true)} className="text-[11px] text-red-400 hover:text-red-300">Delete</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="text-[11px] font-semibold text-red-400 hover:text-red-300">
              {deleteMutation.isPending ? 'Deleting…' : 'Confirm'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-text-subtle">Cancel</button>
          </div>
        )}
      </div>
      {note && (
        <span className="ml-6 self-start text-[11px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent">
          📝 {note.note}
        </span>
      )}
    </div>
  )
}

function DayCard({ day, notesByKey, onSaveAsMeal }: { day: FoodDay; notesByKey: Map<string, FoodNote>; onSaveAsMeal: (day: FoodDay) => void }) {
  const [listRef] = useAutoAnimate<HTMLDivElement>()
  const totals = dayTotals(day.items)
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">{day.date === getLocalDate() ? 'Today' : day.date}</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-text-subtle">{Math.round(totals.calories)} kcal · {Math.round(totals.protein_g)}g protein</p>
          <button onClick={() => onSaveAsMeal(day)} className="text-[11px] text-accent hover:opacity-80" title="Save this day's foods as a named meal">
            💾 Save as meal
          </button>
        </div>
      </div>
      <div ref={listRef} className="flex flex-col divide-y divide-border">
        {day.items.map((item) => (
          <FoodItemRow key={item.id} item={item} note={notesByKey.get(normaliseFoodKey(item.description))} />
        ))}
      </div>
      {(day.water_ml > 0 || day.supplements.length > 0) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border text-xs text-text-subtle">
          {day.water_ml > 0 && <span>💧 {day.water_ml}ml</span>}
          {day.supplements.map((s) => <span key={s}>💊 {s}</span>)}
        </div>
      )}
    </div>
  )
}

export function FoodClient({ targets }: { targets: MacroTargets }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteStatus, setNoteStatus] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const todayStats = useQuery({
    queryKey: ['food-today'],
    queryFn: async () => {
      const res = await fetch(`/api/food-log?date=${getLocalDate()}`)
      if (!res.ok) throw new Error('Failed to load today\'s food log')
      const { items } = await res.json() as { items: FoodLogItem[] }
      return dayTotals(items)
    },
  })

  const timeline = useInfiniteQuery({
    queryKey: ['food-timeline'],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const url = pageParam ? `/api/food-log/timeline?before=${pageParam}&limit=7` : '/api/food-log/timeline?limit=7'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load food timeline')
      return res.json() as Promise<{ days: FoodDay[]; hasMore: boolean }>
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || !lastPage.days.length) return undefined
      return lastPage.days[lastPage.days.length - 1].date
    },
  })

  const mostEaten = useQuery({
    queryKey: ['food-most-eaten'],
    queryFn: async () => {
      const res = await fetch('/api/food-log/most-eaten')
      if (!res.ok) throw new Error('Failed to load most-eaten foods')
      return res.json() as Promise<{ foods: MostEatenFood[] }>
    },
  })

  const notes = useQuery({
    queryKey: ['food-notes'],
    queryFn: async () => {
      const res = await fetch('/api/food-notes')
      if (!res.ok) throw new Error('Failed to load food notes')
      return res.json() as Promise<{ notes: FoodNote[] }>
    },
  })
  const notesByKey = useMemo(() => {
    const map = new Map<string, FoodNote>()
    for (const n of notes.data?.notes ?? []) map.set(n.food_key, n)
    return map
  }, [notes.data])

  const relogMutation = useMutation({
    mutationFn: async (food: MostEatenFood) => {
      const res = await fetch('/api/food-log/relog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(food),
      })
      if (!res.ok) throw new Error('Re-log failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-today'] })
      queryClient.invalidateQueries({ queryKey: ['food-timeline'] })
    },
  })

  const savedMeals = useQuery({
    queryKey: ['saved-meals'],
    queryFn: async () => {
      const res = await fetch('/api/saved-meals')
      if (!res.ok) throw new Error('Failed to load saved meals')
      return res.json() as Promise<{ meals: SavedMeal[] }>
    },
  })

  const saveMealMutation = useMutation({
    mutationFn: async (day: FoodDay) => {
      const name = prompt('Name this meal (e.g. "usual breakfast")')
      if (!name) throw new Error('cancelled')
      const items: SavedMealItem[] = day.items.map((i) => ({
        description: i.description, meal: i.meal ?? undefined, calories: i.calories, protein_g: Number(i.protein_g),
        carbs_g: Number(i.carbs_g), fat_g: Number(i.fat_g), fibre_g: Number(i.fibre_g), sugar_g: Number(i.sugar_g), salt_g: Number(i.salt_g),
      }))
      const res = await fetch('/api/saved-meals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, items }),
      })
      if (!res.ok) throw new Error('Failed to save meal')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-meals'] }),
    onError: (e) => { if (e instanceof Error && e.message !== 'cancelled') alert(e.message) },
  })

  const quickAddMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const res = await fetch(`/api/saved-meals/${mealId}/quick-add`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) throw new Error('Quick-add failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-today'] })
      queryClient.invalidateQueries({ queryKey: ['food-timeline'] })
    },
  })

  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const res = await fetch(`/api/saved-meals/${mealId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-meals'] }),
  })

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setNoteStatus(null)
    const res = await fetch('/api/food-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteText }),
    })
    if (res.ok) {
      const { matched } = await res.json()
      setNoteStatus(matched ? `Noted for "${matched.description}"` : 'Note saved')
      setNoteText('')
      queryClient.invalidateQueries({ queryKey: ['food-notes'] })
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Failed to save note' }))
      setNoteStatus(error)
    }
  }

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && timeline.hasNextPage && !timeline.isFetchingNextPage) {
        timeline.fetchNextPage()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [timeline])

  const allDays = timeline.data?.pages.flatMap((p) => p.days) ?? []
  const filteredDays = search
    ? allDays
        .map((d) => ({ ...d, items: d.items.filter((i) => i.description.toLowerCase().includes(search.toLowerCase())) }))
        .filter((d) => d.items.length > 0)
    : allDays

  const totals = todayStats.data ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, salt_g: 0 }
  const quality = computeDayQuality(totals, targets)

  return (
    <div className="flex flex-col gap-6 pb-24">
      <h1 className="text-xl font-bold text-text">Food</h1>

      <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col sm:flex-row gap-5 items-center">
        <CircularProgress value={quality} max={100} size={110} unit="quality" showTargetGlow />
        <div className="flex-1 grid grid-cols-2 gap-3 w-full">
          <MacroBar label="Calories" value={totals.calories} target={targets.calorie_target} unit="kcal" />
          <MacroBar label="Protein" value={totals.protein_g} target={targets.protein_target_g} />
          <MacroBar label="Carbs" value={totals.carbs_g} target={targets.carbs_target_g} />
          <MacroBar label="Fat" value={totals.fat_g} target={targets.fat_target_g} />
          <MacroBar label="Fibre" value={totals.fibre_g} target={targets.fibre_target_g} />
          <MacroBar label="Sugar" value={totals.sugar_g} target={targets.sugar_target_g} />
          <MacroBar label="Salt" value={totals.salt_g} target={targets.salt_target_g} />
        </div>
      </div>

      {mostEaten.data && mostEaten.data.foods.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Quick re-log</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mostEaten.data.foods.map((food) => {
              const note = notesByKey.get(normaliseFoodKey(food.description))
              return (
                <button
                  key={food.description}
                  onClick={() => relogMutation.mutate(food)}
                  disabled={relogMutation.isPending}
                  className="shrink-0 flex flex-col gap-1 rounded-xl bg-surface border border-border px-3 py-2 text-left hover:border-border-strong disabled:opacity-50 min-w-[140px]"
                >
                  <span className="text-sm text-text truncate">{food.description}</span>
                  <span className="text-[11px] text-text-subtle">{food.calories} kcal · logged {food.count}×</span>
                  {note && <span className="text-[10px] text-accent truncate">📝 {note.note}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {savedMeals.data && savedMeals.data.meals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Saved meals</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {savedMeals.data.meals.map((meal) => (
              <div key={meal.id} className="shrink-0 flex flex-col gap-1 rounded-xl bg-surface border border-border px-3 py-2 min-w-[150px]">
                <button
                  onClick={() => quickAddMealMutation.mutate(meal.id)}
                  disabled={quickAddMealMutation.isPending}
                  className="text-left disabled:opacity-50"
                >
                  <span className="text-sm text-text truncate block">{meal.name}</span>
                  <span className="text-[11px] text-text-subtle">
                    {meal.items.length} item{meal.items.length === 1 ? '' : 's'} · {meal.items.reduce((s, i) => s + i.calories, 0)} kcal
                  </span>
                </button>
                <button onClick={() => deleteMealMutation.mutate(meal.id)} className="text-[10px] text-red-400 hover:text-red-300 self-start">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submitNote} className="flex flex-col gap-1">
        <input
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder='Add a food note: "the chicken wrap made me feel sick"'
          className="w-full rounded-xl bg-surface-elevated border border-border text-text text-sm px-4 py-2.5 focus:outline-none focus:border-accent"
        />
        {noteStatus && <p className="text-xs text-text-muted">{noteStatus}</p>}
      </form>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search logged foods…"
        className="w-full rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
      />

      <div className="flex flex-col gap-3">
        {timeline.isLoading && <p className="text-sm text-text-subtle">Loading…</p>}
        {filteredDays.map((day) => <DayCard key={day.date} day={day} notesByKey={notesByKey} onSaveAsMeal={(d) => saveMealMutation.mutate(d)} />)}
        {filteredDays.length === 0 && !timeline.isLoading && (
          <p className="text-sm text-text-subtle py-10 text-center">No food logged yet.</p>
        )}
        <div ref={loadMoreRef} className="h-4">
          {timeline.isFetchingNextPage && <p className="text-xs text-text-faint text-center">Loading more…</p>}
        </div>
      </div>
    </div>
  )
}

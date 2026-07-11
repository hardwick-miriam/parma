'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { computeDayQuality, type MacroTargets, type MacroTotals } from '@/lib/foodQuality'
import { getLocalDate } from '@/lib/date'
import type { FoodLogItem, MostEatenFood, FoodNote } from '@/lib/db/food'
import type { SavedMeal, SavedMealItem } from '@/lib/db/savedMeals'
import { inferMealTime, MEAL_TIMES, MEAL_TIME_LABELS, type MealTime } from '@/lib/foodMealTime'

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

function groupByMealTime(items: FoodLogItem[]): Record<MealTime, FoodLogItem[]> {
  const groups: Record<MealTime, FoodLogItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] }
  for (const item of items) {
    const meal = (item.meal ?? inferMealTime(item.created_at)) as MealTime
    groups[meal].push(item)
  }
  return groups
}

function FoodItemRow({
  item, note, selectMode, selected, onToggleSelect,
}: {
  item: FoodLogItem
  note: FoodNote | undefined
  selectMode: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
}) {
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
    <div
      className={`py-2 flex flex-col gap-1 ${selectMode ? 'cursor-pointer' : ''}`}
      onClick={selectMode ? () => onToggleSelect(item.id) : undefined}
    >
      <div className="flex items-center gap-2">
        {selectMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(item.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 shrink-0 accent-[var(--accent)]"
          />
        )}
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
        {!selectMode && (!confirmDelete ? (
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
        ))}
      </div>
      {note && (
        <span className="ml-6 self-start text-[11px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent">
          📝 {note.note}
        </span>
      )}
    </div>
  )
}

function MealSection({
  meal, items, notesByKey, selectMode, selectedIds, onToggleSelect,
}: {
  meal: MealTime
  items: FoodLogItem[]
  notesByKey: Map<string, FoodNote>
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}) {
  const [listRef] = useAutoAnimate<HTMLDivElement>()
  if (items.length === 0) return null
  const totals = dayTotals(items)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{MEAL_TIME_LABELS[meal]}</p>
        <p className="text-[11px] text-text-faint">{Math.round(totals.calories)} kcal · {Math.round(totals.protein_g)}g protein</p>
      </div>
      <div ref={listRef} className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <FoodItemRow
            key={item.id}
            item={item}
            note={notesByKey.get(normaliseFoodKey(item.description))}
            selectMode={selectMode}
            selected={selectedIds.has(item.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  )
}

function DayCard({
  day, notesByKey, selectMode, selectedIds, onToggleSelect, onSelectAllInDay,
}: {
  day: FoodDay
  notesByKey: Map<string, FoodNote>
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAllInDay: (day: FoodDay) => void
}) {
  const totals = dayTotals(day.items)
  const groups = useMemo(() => groupByMealTime(day.items), [day.items])
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">{day.date === getLocalDate() ? 'Today' : day.date}</p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-text-subtle">{Math.round(totals.calories)} kcal · {Math.round(totals.protein_g)}g protein</p>
          {selectMode && (
            <button onClick={() => onSelectAllInDay(day)} className="text-[11px] text-accent hover:opacity-80">
              Select all
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {MEAL_TIMES.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            items={groups[meal]}
            notesByKey={notesByKey}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
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

function SelectionActionBar({
  count, onSaveAsMeal, onDelete, onSetMeal, saving, deleting,
}: {
  count: number
  onSaveAsMeal: () => void
  onDelete: () => void
  onSetMeal: (meal: MealTime) => void
  saving: boolean
  deleting: boolean
}) {
  const [mealMenuOpen, setMealMenuOpen] = useState(false)
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-surface-elevated border border-accent/40 px-4 py-2.5 shadow-lg">
      <span className="text-sm font-semibold text-text">{count} selected</span>
      <div className="flex-1" />
      <div className="relative">
        <button
          onClick={() => setMealMenuOpen((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text"
        >
          Set meal-time
        </button>
        {mealMenuOpen && (
          <div className="absolute right-0 mt-1 rounded-lg bg-surface border border-border shadow-lg overflow-hidden z-20">
            {MEAL_TIMES.map((m) => (
              <button
                key={m}
                onClick={() => { onSetMeal(m); setMealMenuOpen(false) }}
                className="block w-full text-left px-3 py-2 text-xs text-text hover:bg-surface-hover whitespace-nowrap"
              >
                {MEAL_TIME_LABELS[m]}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={onSaveAsMeal}
        disabled={saving}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
        style={{ background: 'var(--accent)' }}
      >
        {saving ? 'Saving…' : '💾 Save as meal'}
      </button>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-red-400 border border-red-400/40 disabled:opacity-50"
      >
        {deleting ? 'Deleting…' : 'Delete selected'}
      </button>
    </div>
  )
}

export function FoodClient({ targets }: { targets: MacroTargets }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [noteText, setNoteText] = useState('')
  const [noteStatus, setNoteStatus] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function selectAllInDay(day: FoodDay) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const item of day.items) next.add(item.id)
      return next
    })
  }

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

  const saveSelectedAsMealMutation = useMutation({
    mutationFn: async (selectedItems: FoodLogItem[]) => {
      const name = prompt('Name this meal (e.g. "Test Lunch")')
      if (!name) throw new Error('cancelled')
      const items: SavedMealItem[] = selectedItems.map((i) => ({
        description: i.description, meal: i.meal ?? undefined, calories: i.calories, protein_g: Number(i.protein_g),
        carbs_g: Number(i.carbs_g), fat_g: Number(i.fat_g), fibre_g: Number(i.fibre_g), sugar_g: Number(i.sugar_g), salt_g: Number(i.salt_g),
      }))
      const res = await fetch('/api/saved-meals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, items }),
      })
      if (!res.ok) throw new Error('Failed to save meal')
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['saved-meals'] }); exitSelectMode() },
    onError: (e) => { if (e instanceof Error && e.message !== 'cancelled') alert(e.message) },
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/food-log/bulk-delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to delete selected items')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-timeline'] })
      queryClient.invalidateQueries({ queryKey: ['food-today'] })
      exitSelectMode()
    },
    onError: (e) => { if (e instanceof Error) alert(e.message) },
  })

  const bulkSetMealMutation = useMutation({
    mutationFn: async ({ ids, meal }: { ids: string[]; meal: MealTime }) => {
      const res = await fetch('/api/food-log/bulk-meal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, meal }),
      })
      if (!res.ok) throw new Error('Failed to set meal-time')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-timeline'] })
      exitSelectMode()
    },
    onError: (e) => { if (e instanceof Error) alert(e.message) },
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

  const itemsById = useMemo(() => {
    const map = new Map<string, FoodLogItem>()
    for (const day of allDays) for (const item of day.items) map.set(item.id, item)
    return map
  }, [allDays])

  function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} selected item${selectedIds.size === 1 ? '' : 's'}?`)) return
    bulkDeleteMutation.mutate([...selectedIds])
  }

  const totals = todayStats.data ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, salt_g: 0 }
  const quality = computeDayQuality(totals, targets)

  return (
    <div className="flex flex-col gap-6 pb-24">
      <h1 className="text-xl font-bold text-text">Food</h1>

      {todayStats.isLoading ? (
        <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col sm:flex-row gap-5 items-center animate-pulse">
          <div className="w-[110px] h-[110px] rounded-full bg-surface-elevated shrink-0" />
          <div className="flex-1 grid grid-cols-2 gap-3 w-full">
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-6 rounded bg-surface-elevated" />)}
          </div>
        </div>
      ) : (
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
      )}

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

      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logged foods…"
          className="flex-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          className="text-xs px-3 py-2 rounded-lg border border-border text-text-muted hover:text-text whitespace-nowrap"
        >
          {selectMode ? 'Done' : 'Select items'}
        </button>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <SelectionActionBar
          count={selectedIds.size}
          saving={saveSelectedAsMealMutation.isPending}
          deleting={bulkDeleteMutation.isPending}
          onSaveAsMeal={() => {
            const selectedItems = [...selectedIds].map((id) => itemsById.get(id)).filter((i): i is FoodLogItem => !!i)
            saveSelectedAsMealMutation.mutate(selectedItems)
          }}
          onDelete={handleBulkDelete}
          onSetMeal={(meal) => bulkSetMealMutation.mutate({ ids: [...selectedIds], meal })}
        />
      )}

      <div className="flex flex-col gap-3">
        {timeline.isLoading && <p className="text-sm text-text-subtle">Loading…</p>}
        {filteredDays.map((day) => (
          <DayCard
            key={day.date}
            day={day}
            notesByKey={notesByKey}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
            onSelectAllInDay={selectAllInDay}
          />
        ))}
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

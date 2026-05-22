import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { xpToLevel, XP_TODO, XP_SHORT_GOAL, XP_LONG_GOAL } from '../lib/gamification'
import type { UserProfile, Todo, ShortTermGoal, LongTermGoal, DailyBrief, Lang, Habit, Priority } from '../types'
import type { User } from '@supabase/supabase-js'

interface AppState {
  user: User | null
  profile: UserProfile | null
  todos: Todo[]
  shortGoals: ShortTermGoal[]
  longGoals: LongTermGoal[]
  habits: Habit[]
  todayBrief: DailyBrief | null
  allBriefs: DailyBrief[]
  lang: Lang
  darkMode: boolean
  loading: boolean
  levelUpAlert: number | null
  setLang: (l: Lang) => void
  setDarkMode: (v: boolean) => void
  refreshTodos: () => Promise<void>
  refreshGoals: () => Promise<void>
  completeTodo: (id: string) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  addTodo: (t: Omit<Todo, 'id' | 'user_id' | 'created_at' | 'completed' | 'completed_at'>) => Promise<void>
  updateTodo: (id: string, data: Partial<Todo>) => Promise<void>
  addShortGoal: (g: Omit<ShortTermGoal, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  updateShortGoal: (id: string, data: Partial<ShortTermGoal>) => Promise<void>
  deleteShortGoal: (id: string) => Promise<void>
  addLongGoal: (g: Omit<LongTermGoal, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  updateLongGoal: (id: string, data: Partial<LongTermGoal>) => Promise<void>
  deleteLongGoal: (id: string) => Promise<void>
  saveTodayBrief: (content: string, type: 'morning' | 'evening') => Promise<void>
  refreshAllBriefs: () => Promise<void>
  addHabit: (title: string, priority: Priority) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  dismissLevelUp: () => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [shortGoals, setShortGoals] = useState<ShortTermGoal[]>([])
  const [longGoals, setLongGoals] = useState<LongTermGoal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [todayBrief, setTodayBrief] = useState<DailyBrief | null>(null)
  const [allBriefs, setAllBriefs] = useState<DailyBrief[]>([])
  const [lang, setLangState] = useState<Lang>('no')
  const [darkMode, setDarkModeState] = useState(false)
  const [loading, setLoading] = useState(true)
  const [levelUpAlert, setLevelUpAlert] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    Promise.all([loadProfile(), refreshTodos(), refreshGoals(), loadTodayBrief(), loadAllBriefs(), loadAndSeedHabits()])
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  async function loadProfile() {
    if (!user) return
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data as UserProfile)
      setLangState((data as UserProfile).language_preference ?? 'no')
      await updateStreak(data as UserProfile)
    }
  }

  async function updateStreak(p: UserProfile) {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    if (p.last_active_date === today) return
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = p.last_active_date === yesterday ? p.streak + 1 : 1
    const { data } = await supabase.from('users')
      .update({ streak: newStreak, last_active_date: today })
      .eq('id', user.id).select().single()
    if (data) setProfile(data as UserProfile)
  }

  const refreshTodos = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setTodos(data as Todo[])
  }, [user])

  const refreshGoals = useCallback(async () => {
    if (!user) return
    const [sg, lg] = await Promise.all([
      supabase.from('short_term_goals').select('*').eq('user_id', user.id).order('deadline'),
      supabase.from('long_term_goals').select('*').eq('user_id', user.id).order('created_at'),
    ])
    if (sg.data) setShortGoals(sg.data as ShortTermGoal[])
    if (lg.data) setLongGoals(lg.data as LongTermGoal[])
  }, [user])

  async function loadTodayBrief() {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('daily_briefs')
      .select('*').eq('user_id', user.id).eq('date', today).eq('type', 'morning')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (data) setTodayBrief(data as DailyBrief)
  }

  const refreshAllBriefs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setAllBriefs(data as DailyBrief[])
  }, [user])

  async function loadAllBriefs() {
    if (!user) return
    const { data } = await supabase
      .from('daily_briefs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setAllBriefs(data as DailyBrief[])
  }

  async function loadAndSeedHabits() {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('habits').select('*').eq('user_id', user.id).order('created_at')
    if (!data) return
    const habitsData = data as Habit[]
    setHabits(habitsData)

    // Auto-create todos for habits that haven't been created today
    const toSeed = habitsData.filter(h => h.last_created_date !== today)
    if (toSeed.length === 0) return

    for (const habit of toSeed) {
      // Only add if not already an active todo with the same title today
      const { data: existing } = await supabase.from('todos')
        .select('id').eq('user_id', user.id).eq('title', habit.title).eq('completed', false).limit(1)
      if (!existing || existing.length === 0) {
        await supabase.from('todos').insert({
          user_id: user.id, title: habit.title, priority: habit.priority,
          completed: false, completed_at: null, due_date: null, notes: null, goal_id: null,
        })
      }
      await supabase.from('habits').update({ last_created_date: today }).eq('id', habit.id)
    }
    // Refresh todos after seeding
    const { data: fresh } = await supabase.from('todos').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (fresh) setTodos(fresh as Todo[])
    // Update local habits state
    setHabits(prev => prev.map(h => toSeed.find(s => s.id === h.id) ? { ...h, last_created_date: today } : h))
  }

  async function addXp(amount: number) {
    if (!user || !profile) return
    const oldLevel = profile.level
    const newXp = profile.xp + amount
    const newLevel = xpToLevel(newXp)
    const { data } = await supabase.from('users')
      .update({ xp: newXp, level: newLevel }).eq('id', user.id).select().single()
    if (data) {
      setProfile(data as UserProfile)
      if (newLevel > oldLevel) setLevelUpAlert(newLevel)
    }
  }

  async function completeTodo(id: string) {
    if (!user) return
    const now = new Date().toISOString()
    await supabase.from('todos').update({ completed: true, completed_at: now }).eq('id', id)
    await refreshTodos()
    await addXp(XP_TODO)
  }

  async function deleteTodo(id: string) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  async function addTodo(todo: Omit<Todo, 'id' | 'user_id' | 'created_at' | 'completed' | 'completed_at'>) {
    if (!user) return
    const { data } = await supabase.from('todos').insert({ ...todo, user_id: user.id, completed: false, completed_at: null }).select().single()
    if (data) setTodos(prev => [data as Todo, ...prev])
  }

  async function updateTodo(id: string, data: Partial<Todo>) {
    await supabase.from('todos').update(data).eq('id', id)
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
  }

  async function addShortGoal(g: Omit<ShortTermGoal, 'id' | 'user_id' | 'created_at'>) {
    if (!user) return
    const { data } = await supabase.from('short_term_goals').insert({ ...g, user_id: user.id }).select().single()
    if (data) setShortGoals(prev => [...prev, data as ShortTermGoal])
  }

  async function updateShortGoal(id: string, data: Partial<ShortTermGoal>) {
    await supabase.from('short_term_goals').update(data).eq('id', id)
    const wasComplete = shortGoals.find(g => g.id === id)?.progress_percent !== 100 && data.progress_percent === 100
    setShortGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
    if (wasComplete) await addXp(XP_SHORT_GOAL)
  }

  async function deleteShortGoal(id: string) {
    await supabase.from('short_term_goals').delete().eq('id', id)
    setShortGoals(prev => prev.filter(g => g.id !== id))
  }

  async function addLongGoal(g: Omit<LongTermGoal, 'id' | 'user_id' | 'created_at'>) {
    if (!user) return
    const { data } = await supabase.from('long_term_goals').insert({ ...g, user_id: user.id }).select().single()
    if (data) setLongGoals(prev => [...prev, data as LongTermGoal])
  }

  async function updateLongGoal(id: string, data: Partial<LongTermGoal>) {
    await supabase.from('long_term_goals').update(data).eq('id', id)
    const wasComplete = longGoals.find(g => g.id === id)?.progress_percent !== 100 && data.progress_percent === 100
    setLongGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g))
    if (wasComplete) await addXp(XP_LONG_GOAL)
  }

  async function deleteLongGoal(id: string) {
    await supabase.from('long_term_goals').delete().eq('id', id)
    setLongGoals(prev => prev.filter(g => g.id !== id))
  }

  async function saveTodayBrief(content: string, type: 'morning' | 'evening') {
    if (!user) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('daily_briefs').insert({ user_id: user.id, date: today, content, type }).select().single()
    if (data && type === 'morning') setTodayBrief(data as DailyBrief)
    await refreshAllBriefs()
  }

  async function addHabit(title: string, priority: Priority) {
    if (!user) return
    const { data } = await supabase.from('habits').insert({ user_id: user.id, title, priority, last_created_date: null }).select().single()
    if (data) setHabits(prev => [...prev, data as Habit])
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  function setLang(l: Lang) {
    setLangState(l)
    if (user) supabase.from('users').update({ language_preference: l }).eq('id', user.id)
  }

  function setDarkMode(v: boolean) { setDarkModeState(v) }

  return (
    <AppContext.Provider value={{
      user, profile, todos, shortGoals, longGoals, habits, todayBrief, allBriefs,
      lang, darkMode, loading, levelUpAlert,
      setLang, setDarkMode,
      refreshTodos, refreshGoals,
      completeTodo, deleteTodo, addTodo, updateTodo,
      addShortGoal, updateShortGoal, deleteShortGoal,
      addLongGoal, updateLongGoal, deleteLongGoal,
      saveTodayBrief, refreshAllBriefs, addHabit, deleteHabit,
      dismissLevelUp: () => setLevelUpAlert(null),
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

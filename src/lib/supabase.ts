import { createClient } from '@supabase/supabase-js'
import type { UserProfile, Todo, ShortTermGoal, LongTermGoal, DailyBrief } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

export type Database = {
  public: {
    Tables: {
      users: { Row: UserProfile; Insert: Partial<UserProfile>; Update: Partial<UserProfile> }
      todos: { Row: Todo; Insert: Omit<Todo, 'id' | 'created_at'>; Update: Partial<Todo> }
      short_term_goals: { Row: ShortTermGoal; Insert: Omit<ShortTermGoal, 'id' | 'created_at'>; Update: Partial<ShortTermGoal> }
      long_term_goals: { Row: LongTermGoal; Insert: Omit<LongTermGoal, 'id' | 'created_at'>; Update: Partial<LongTermGoal> }
      daily_briefs: { Row: DailyBrief; Insert: Omit<DailyBrief, 'id' | 'created_at'>; Update: Partial<DailyBrief> }
    }
  }
}

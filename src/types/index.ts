export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  language_preference: 'no' | 'en'
  xp: number
  level: number
  streak: number
  last_active_date: string | null
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  is_pinned: boolean
  color: string
  created_at: string
  updated_at: string
}

export type Priority = 'high' | 'medium' | 'low'

export interface Todo {
  id: string
  user_id: string
  title: string
  priority: Priority
  due_date: string | null
  completed: boolean
  completed_at: string | null
  notes: string | null
  goal_id: string | null
  created_at: string
}

export interface ShortTermGoal {
  id: string
  user_id: string
  title: string
  deadline: string
  progress_percent: number
  notes: string | null
  created_at: string
}

export interface Milestone {
  label: string
  target_date: string
  reached: boolean
}

export interface LongTermGoal {
  id: string
  user_id: string
  title: string
  milestones: Milestone[]
  progress_percent: number
  notes: string | null
  created_at: string
}

export interface DailyBrief {
  id: string
  user_id: string
  date: string
  content: string
  type: 'morning' | 'evening'
  created_at: string
}

export type Lang = 'no' | 'en'

export interface Habit {
  id: string
  user_id: string
  title: string
  priority: Priority
  last_created_date: string | null
  created_at: string
}

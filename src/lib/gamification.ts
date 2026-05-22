export const XP_TODO = 10
export const XP_SHORT_GOAL = 50
export const XP_LONG_GOAL = 200
export const XP_PER_LEVEL = 500

export function xpToLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpInCurrentLevel(xp: number): number {
  return xp % XP_PER_LEVEL
}

export function xpProgressPercent(xp: number): number {
  return Math.round((xpInCurrentLevel(xp) / XP_PER_LEVEL) * 100)
}

export function streakMilestone(streak: number): number | null {
  const milestones = [7, 30, 100]
  return milestones.includes(streak) ? streak : null
}

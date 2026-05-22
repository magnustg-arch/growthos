import type { UserProfile, Todo, ShortTermGoal, LongTermGoal, Lang } from '../types'

function buildSystemContext(
  profile: UserProfile,
  todos: Todo[],
  shortGoals: ShortTermGoal[],
  longGoals: LongTermGoal[],
  lang: Lang
): string {
  const today = new Date().toISOString().split('T')[0]
  const completedToday = todos.filter(t => t.completed_at?.startsWith(today))
  const activeTodos = todos.filter(t => !t.completed)

  const langNote = lang === 'no'
    ? 'IMPORTANT: Always respond in Norwegian (Bokmal).'
    : 'Always respond in English.'

  return `${langNote}

You are a personal growth coach in GrowthOS. Be warm, direct, motivating. Keep responses concise.

USER: ${profile.email.split('@')[0]} | Level ${profile.level} | ${profile.xp} XP | Streak: ${profile.streak} days | Date: ${today}

ACTIVE TASKS (${activeTodos.length}):
${activeTodos.map(t => `- [${t.priority.toUpperCase()}] ${t.title}${t.due_date ? ` (due: ${t.due_date})` : ''}`).join('\n') || 'None'}

COMPLETED TODAY: ${completedToday.map(t => t.title).join(', ') || 'None'}

SHORT-TERM GOALS: ${shortGoals.map(g => `${g.title} (${g.progress_percent}%, due ${g.deadline})`).join(' | ') || 'None'}

LONG-TERM GOALS: ${longGoals.map(g => `${g.title} (${g.progress_percent}%)`).join(' | ') || 'None'}`
}

// Strip non-ISO-8859-1 characters from API key to prevent fetch header errors
function sanitizeKey(key: string): string {
  return key.replace(/[^\x20-\x7E]/g, '').trim()
}

export async function generateMorningBrief(
  apiKey: string,
  profile: UserProfile,
  todos: Todo[],
  shortGoals: ShortTermGoal[],
  longGoals: LongTermGoal[],
  lang: Lang
): Promise<string> {
  const system = buildSystemContext(profile, todos, shortGoals, longGoals, lang)
  const prompt = lang === 'no'
    ? 'Skriv en kort personlig morgenbrief (3-5 setninger). Nevn 2-3 viktigste fokusomraader for i dag. Avslutt med kort oppfordring.'
    : 'Write a short personal morning brief (3-5 sentences). Mention 2-3 key focus areas for today. End with brief encouragement.'
  return callClaude(sanitizeKey(apiKey), system, prompt)
}

export async function generateEveningReview(
  apiKey: string,
  profile: UserProfile,
  todos: Todo[],
  shortGoals: ShortTermGoal[],
  longGoals: LongTermGoal[],
  lang: Lang
): Promise<string> {
  const system = buildSystemContext(profile, todos, shortGoals, longGoals, lang)
  const prompt = lang === 'no'
    ? 'Skriv en kort kveldsgjennomgang. Oppsummer hva som ble fullfoert, hva som gjenstaar, og gi en motiverende avslutning. Maks 5 setninger.'
    : 'Write a short evening review. Summarize completed tasks, what remains, give a motivating close. Max 5 sentences.'
  return callClaude(sanitizeKey(apiKey), system, prompt)
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function chatWithClaude(
  apiKey: string,
  profile: UserProfile,
  todos: Todo[],
  shortGoals: ShortTermGoal[],
  longGoals: LongTermGoal[],
  lang: Lang,
  messages: ChatMessage[]
): Promise<string> {
  const system = buildSystemContext(profile, todos, shortGoals, longGoals, lang)
  return callClaudeChat(sanitizeKey(apiKey), system, messages)
}

async function callClaude(apiKey: string, system: string, userMessage: string): Promise<string> {
  if (!apiKey) throw new Error('No API key set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Claude API ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.content[0].text
}

async function callClaudeChat(apiKey: string, system: string, messages: ChatMessage[]): Promise<string> {
  if (!apiKey) throw new Error('No API key set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Claude API ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.content[0].text
}

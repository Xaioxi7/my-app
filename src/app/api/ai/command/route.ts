// src/app/api/ai/command/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

type AiParsed =
  | { tool: 'add_task'; args: { title: string } }
  | { tool: 'complete_task'; args: { id: number; skill?: string } }
  | { tool: 'list_tasks' }
  | { tool: 'unknown'; reason: string }

export async function POST(req: Request) {
  const { message } = (await req.json()) as { message: string }
  const supabase = createSupabaseServer()

  // Get current signed-in user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ reply: 'Please sign in.' }, { status: 401 })
  }
  const userId = user.id

  // Parse commands (use OpenAI if enabled, otherwise simple fallback)
  const useOpenAI = String(process.env.USE_OPENAI).toLowerCase() === 'true'
  const hasKey = !!process.env.OPENAI_API_KEY
  let parsed: AiParsed | null = null

  if (!useOpenAI || !hasKey) {
    const lower = message.toLowerCase()
    if (lower.startsWith('add ') || lower.includes('add task')) {
      parsed = { tool: 'add_task', args: { title: message.replace(/^add\s+/i, '').trim() || 'New task' } }
    } else if (lower.startsWith('done ') || lower.includes('complete')) {
      const id = Number(message.match(/\d+/)?.[0] || 0)
      parsed = { tool: 'complete_task', args: { id } }
    } else {
      parsed = { tool: 'list_tasks' }
    }
  } else {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a command parser. Return ONLY a compact JSON with "tool" and "args". ' +
              'Tools: add_task{title}, complete_task{id,skill?}, list_tasks{}. If unknown, return unknown{reason}. ' +
              'No prose, no code block fences.',
          },
          { role: 'user', content: message },
        ],
      })
      const raw = completion.choices?.[0]?.message?.content?.trim() || ''
      parsed = JSON.parse(raw) as AiParsed
    } catch {
      parsed = { tool: 'list_tasks' }
    }
  }

  try {
    if (parsed?.tool === 'add_task') {
      const title = (parsed.args.title || '').trim()
      if (!title) return NextResponse.json({ reply: 'Task title cannot be empty.' })

      const { error } = await supabase.from('tasks').insert({ user_id: userId, title, done: false })
      if (error) return NextResponse.json({ reply: 'Failed to create task.' })

      return NextResponse.json({ reply: `Task added: ${title}` })
    }

    if (parsed?.tool === 'complete_task') {
      const taskId = Number(parsed.args.id)
      if (!taskId) return NextResponse.json({ reply: 'Missing task id.' })

      const { data: one } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!one) return NextResponse.json({ reply: 'Task not found (or no permission).' })

      const { error: uErr } = await supabase.from('tasks').update({ done: true }).eq('id', taskId).eq('user_id', userId)
      if (uErr) return NextResponse.json({ reply: 'Failed to complete task.' })

      const skill = parsed.args.skill || guessSkillFromTitle(one.title || '')
      if (skill) {
        const { data: skillRow } = await supabase
          .from('skills')
          .select('id, points')
          .eq('user_id', userId)
          .eq('name', skill)
          .maybeSingle()

        if (skillRow) {
          await supabase.from('skills').update({ points: (skillRow.points || 0) + 1 }).eq('id', skillRow.id).eq('user_id', userId)
        } else {
          await supabase.from('skills').insert({ user_id: userId, name: skill, points: 1 })
        }
      }

      return NextResponse.json({ reply: `Task #${taskId} completed${skill ? `, skill "${skill}" +1` : ''}` })
    }

    if (parsed?.tool === 'list_tasks') {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return NextResponse.json({
        reply: data?.length ? `You have ${data.length} tasks.` : 'No tasks yet.',
        tasks: data ?? [],
      })
    }

    return NextResponse.json({ reply: 'Sorry, I did not understand. Want to see your task list?' })
  } catch (e: any) {
    console.error('[COMMAND ERROR]', e?.message || e)
    return NextResponse.json({ reply: 'Server error. Please try again later.' })
  }
}

// Simple skill guess based on title
function guessSkillFromTitle(title: string): string | null {
  const s = title.toLowerCase()
  if (s.includes('python') || s.includes('code') || s.includes('algorithm')) return 'coding'
  if (s.includes('gym') || s.includes('run') || s.includes('walk')) return 'fitness'
  if (s.includes('read') || s.includes('book') || s.includes('paper')) return 'reading'
  return null
}

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

  // 先拿当前登录用户
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ reply: '请先登录' }, { status: 401 })
  }
  const userId = user.id

  // 解析指令（有 OpenAI 用 OpenAI，没开就用简单兜底）
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
      if (!title) return NextResponse.json({ reply: '任务标题不能为空' })

      const { error } = await supabase.from('tasks').insert({ user_id: userId, title, done: false })
      if (error) return NextResponse.json({ reply: '写入任务失败' })

      return NextResponse.json({ reply: `已添加任务：${title}` })
    }

    if (parsed?.tool === 'complete_task') {
      const taskId = Number(parsed.args.id)
      if (!taskId) return NextResponse.json({ reply: '缺少任务 id' })

      const { data: one } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .maybeSingle()
      if (!one) return NextResponse.json({ reply: '没有找到该任务（或无权限）' })

      const { error: uErr } = await supabase.from('tasks').update({ done: true }).eq('id', taskId).eq('user_id', userId)
      if (uErr) return NextResponse.json({ reply: '完成任务失败' })

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

      return NextResponse.json({ reply: `任务 #${taskId} 已完成${skill ? `，技能「${skill}」+1` : ''}` })
    }

    if (parsed?.tool === 'list_tasks') {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return NextResponse.json({
        reply: data?.length ? `你的任务共 ${data.length} 条` : '暂无任务',
        tasks: data ?? [],
      })
    }

    return NextResponse.json({ reply: '我没听懂，要不要看看任务列表？' })
  } catch (e: any) {
    console.error('[COMMAND ERROR]', e?.message || e)
    return NextResponse.json({ reply: '服务端异常，请稍后重试' })
  }
}

// 很简单的“从标题猜技能”
function guessSkillFromTitle(title: string): string | null {
  const s = title.toLowerCase()
  if (s.includes('python') || s.includes('code') || s.includes('算法')) return 'coding'
  if (s.includes('gym') || s.includes('run') || s.includes('walk')) return 'fitness'
  if (s.includes('read') || s.includes('book') || s.includes('paper')) return 'reading'
  return null
}

'use server'

import { revalidatePath } from 'next/cache'
import { serverSupabase } from '@/lib/supabaseServer'

export async function addTaskAction(form: FormData) {
  const title = String(form.get('title') || '').trim()
  if (!title) return { ok: false, error: 'title required' }

  const supabase = serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not signed in' }

  const { error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title,
    completed: false,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/tasks')
  return { ok: true }
}

export async function toggleTaskAction(form: FormData) {
  const id = Number(form.get('id') || 0)
  const done = String(form.get('done') || 'false') === 'true'
  if (!id) return { ok: false, error: 'id required' }

  const supabase = serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not signed in' }

  const { error } = await supabase
    .from('tasks')
    .update({ completed: done })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/tasks')
  return { ok: true }
}

export async function deleteTaskAction(form: FormData) {
  const id = Number(form.get('id') || 0)
  if (!id) return { ok: false, error: 'id required' }

  const supabase = serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'not signed in' }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/tasks')
  return { ok: true }
}

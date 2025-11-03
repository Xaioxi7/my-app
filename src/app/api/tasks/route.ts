import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET /api/tasks
export async function GET() {
  const { data, error } = await supabase.from('tasks').select('*')

  if (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/tasks (optional: add new task)
export async function POST(req: Request) {
  const body = await req.json()
  const { title } = body

  const { data, error } = await supabase.from('tasks').insert([{ title }])

  if (error) {
    console.error('Error adding task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

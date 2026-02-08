'use server'

import { cookies as nextCookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { revalidatePath } from 'next/cache'

const store = () => (nextCookies as any)()

function server() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => store().get(n)?.value,
        set: (n: string, v: string, o?: any) => store().set({ name: n, value: v, ...o }),
        remove: (n: string, o?: any) => store().set({ name: n, value: '', ...o, maxAge: 0 }),
      },
    }
  )
}

export async function updateProfileAction(formData: FormData) {
  const username = String(formData.get('username') || '').trim()
  if (!username) return { ok: false, error: 'Username is required' }

  const supabase = server()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in' }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username, updated_at: new Date().toISOString() })

  if (error) return { ok: false, error: error.message }

  // Revalidate /profile without a full page reload
  revalidatePath('/profile')
  return { ok: true }
}

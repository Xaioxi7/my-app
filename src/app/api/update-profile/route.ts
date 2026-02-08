import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const formData = await req.formData()
  const username = String(formData.get('username') || '')

  // Get Next.js cookie store
  const cookieStore = cookies()

  // Pass cookies via adapter: must include get / set / remove
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options?: any) {
          // Clear by setting maxAge=0
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  // Current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/signin', req.url))

  // Write/update profiles
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username, updated_at: new Date().toISOString() })

  if (error) {
    console.error('update-profile error:', error.message)
    return NextResponse.redirect(new URL(`/profile?error=${encodeURIComponent(error.message)}`, req.url))
  }

  return NextResponse.redirect(new URL('/profile', req.url))
}

// Optional: avoid 404 on direct GET
export async function GET(req: Request) {
  return NextResponse.redirect(new URL('/profile', req.url))
}

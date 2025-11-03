import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const formData = await req.formData()
  const username = String(formData.get('username') || '')

  // ✅ 拿到 Next.js 的 cookie store
  const cookieStore = cookies()

  // ✅ 用适配器形式传 cookies：必须包含 get / set / remove
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
          // 通过设置 maxAge=0 清除
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  // 当前用户
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/signin', req.url))

  // 写入/更新 profiles
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username, updated_at: new Date().toISOString() })

  if (error) {
    console.error('update-profile error:', error.message)
    return NextResponse.redirect(new URL(`/profile?error=${encodeURIComponent(error.message)}`, req.url))
  }

  return NextResponse.redirect(new URL('/profile', req.url))
}

// 可选：防止直接 GET 这个 URL 时 404
export async function GET(req: Request) {
  return NextResponse.redirect(new URL('/profile', req.url))
}

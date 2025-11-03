'use server'

import { cookies as nextCookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

const getStore = () => (nextCookies as any)()

function serverSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return getStore().get(name)?.value
        },
        set(name: string, value: string, options?: any) {
          getStore().set({ name, value, ...options })
        },
        remove(name: string, options?: any) {
          getStore().set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = serverSupabase()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    console.error('Sign-up error:', error.message)
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/profile')
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = serverSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error('Sign-in error:', error.message)
    redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`)
  }
  redirect('/profile')
}

export async function signOutAction() {
  const supabase = serverSupabase()
  await supabase.auth.signOut()
  redirect('/auth/signin')
}

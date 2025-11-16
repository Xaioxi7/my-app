import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EditUsername from './EditUsername'
import { updateProfileAction } from '@/actions/profile'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const hasUsername = Boolean(profile?.username)

  return (
    <main className="mx-auto mt-20 max-w-xl text-center">
      <h1 className="mb-2 text-3xl font-bold">Welcome, {user.email}</h1>
      <p className="mb-6 text-gray-600">
        Username: {profile?.username ?? 'No username set yet.'}
      </p>

      {/* 这里实现：首次没有用户名时显示表单；有了之后显示 Edit 按钮，点开再编辑 */}
      <EditUsername action={updateProfileAction} hasUsername={hasUsername} />

      <form action="/api/signout" method="post" className="mt-8">
        <button className="text-sm text-gray-500 underline">Sign out</button>
      </form>
    </main>
  )
}

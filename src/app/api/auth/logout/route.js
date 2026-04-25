import { cookies } from 'next/headers'
import { AUTH_COOKIE } from '@/lib/auth'

export async function POST() {
  cookies().delete(AUTH_COOKIE)
  return Response.json({ success: true })
}

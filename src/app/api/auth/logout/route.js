import { cookies } from 'next/headers'
import { AUTH_COOKIE } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function clearCookie() {
  try { cookies().delete(AUTH_COOKIE) } catch {}
  cookies().set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
}

export async function POST() {
  clearCookie()
  return Response.json({ success: true })
}

export async function GET() {
  clearCookie()
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reset</title>
<style>body{font-family:-apple-system,sans-serif;background:#06101f;color:#e8f4f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
.card{background:#142340;padding:40px;border-radius:18px;text-align:center;max-width:420px;border:1px solid rgba(0,200,120,0.3)}
h1{color:#00e89a;margin:0 0 8px;font-size:22px}p{color:#7a9bb0;margin:8px 0 24px;font-size:14px}
a{display:inline-block;background:linear-gradient(120deg,#00c878,#00e89a);color:#06101f;padding:11px 24px;border-radius:10px;font-weight:700;text-decoration:none}</style>
</head><body><div class="card">
<h1>✓ Cookie effacé</h1>
<p>Ta session a été réinitialisée. Tu peux maintenant te reconnecter.</p>
<a href="/">Aller au login</a>
</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

'use client'
import { useState, useEffect } from 'react'

export function useAuth() {
  const [authed, setAuthed] = useState(null)

  const refresh = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = await res.json()
      setAuthed(!!data.authed)
    } catch {
      setAuthed(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const login = () => setAuthed(true)

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    setAuthed(false)
  }

  return { authed, login, logout }
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('info@nerixi.com')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onLogin()
      } else {
        setError(data.error || 'Identifiants invalides')
      }
    } catch {
      setError('Erreur réseau')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="login-bg">
        <div className="login-grid" />
      </div>

      <div className="login-card" style={{ position: 'relative', zIndex: 2 }}>
        <div className="login-orb">N</div>

        <p className="logo-glow" style={{ fontSize: 22, textAlign: 'center', margin: 0 }}>NERIXI</p>
        <p style={{ textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 13, marginTop: 6, marginBottom: 28 }}>
          Connecte-toi à ton dashboard CRM
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="info@nerixi.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{ paddingRight: 60 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: 'var(--nerixi-muted)',
                  cursor: 'pointer', fontSize: 12, padding: '4px 8px'
                }}>
                {showPwd ? 'Cacher' : 'Voir'}
              </button>
            </div>
          </div>

          {error && (
            <div className="fade-in" style={{
              background: 'rgba(226, 75, 74, 0.1)',
              border: '1px solid rgba(226, 75, 74, 0.3)',
              color: '#ff8a89',
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13
            }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 6, width: '100%', padding: '13px 22px' }}>
            {loading ? <><span className="spinner" /> &nbsp;Connexion…</> : 'Se connecter →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 11, marginTop: 24, marginBottom: 0 }}>
          Accès réservé · Téo · Nerixi © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

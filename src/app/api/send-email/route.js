function getBaseUrl(request) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (env) return env.replace(/\/$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host')
  return `${proto}://${host}`
}

function injectTracking(htmlContent, trackingId, baseUrl) {
  const pixelUrl = `${baseUrl}/api/email/track/${trackingId}/pixel.gif`
  const pixel = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;border:0" />`

  const rewritten = htmlContent.replace(/<a\s+([^>]*?)href=(["'])([^"']+)\2([^>]*)>/gi, (m, pre, q, href, post) => {
    if (!/^https?:\/\//i.test(href)) return m
    if (href.includes('/api/email/track/')) return m
    if (href.includes('mailto:') || href.includes('tel:')) return m
    const tracked = `${baseUrl}/api/email/track/${trackingId}/click?url=${encodeURIComponent(href)}`
    return `<a ${pre}href=${q}${tracked}${q}${post}>`
  })

  return rewritten.replace(/<\/body>/i, `${pixel}</body>`).includes(pixel)
    ? rewritten.replace(/<\/body>/i, `${pixel}</body>`)
    : rewritten + pixel
}

export async function POST(request) {
  try {
    const { to, toName, subject, content, templateType, track = true, sequenceId = null, enrollmentId = null } = await request.json()

    if (!to || !subject || !content) {
      return Response.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const { findClientByEmail, saveOutboundEmail, logActivity } = await import('@/lib/store')
    const matchClient = await findClientByEmail(to)

    const trackingId = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const baseUrl = getBaseUrl(request)

    const innerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { background: #0a1628; padding: 32px; text-align: center; }
            .header img { height: 40px; }
            .header h1 { color: #00c878; font-size: 22px; margin: 12px 0 0; }
            .body { padding: 32px; color: #333; line-height: 1.7; }
            .body p { margin: 0 0 16px; }
            .footer { background: #0a1628; padding: 24px; text-align: center; }
            .footer p { color: #7a9bb0; font-size: 12px; margin: 4px 0; }
            .footer a { color: #00c878; text-decoration: none; }
            .btn { display: inline-block; background: #00c878; color: #0a1628; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
            .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NERIXI</h1>
            </div>
            <div class="body">
              ${content}
            </div>
            <div class="footer">
              <p><strong style="color:#00c878">NERIXI</strong> — Automatisation IA pour PME & Grands Comptes</p>
              <p><a href="https://nerixi.fr">nerixi.fr</a> · <a href="mailto:info@nerixi.com">info@nerixi.com</a></p>
              <p style="margin-top:12px;font-size:11px">Vous recevez cet email car vous êtes client ou prospect Nerixi.</p>
            </div>
          </div>
        </body>
        </html>
      `

    const htmlContent = track ? injectTracking(innerHtml, trackingId, baseUrl) : innerHtml

    const emailBody = {
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'Nerixi',
        email: process.env.BREVO_SENDER_EMAIL || 'info@nerixi.com'
      },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify(emailBody)
    })

    if (!response.ok) {
      const error = await response.json()
      return Response.json({ error: error.message || 'Erreur Brevo' }, { status: 500 })
    }

    try {
      await saveOutboundEmail({
        clientId: matchClient?.id || null,
        toEmail: to, toName: toName || '',
        subject, content,
        trackingId,
        sequenceId, enrollmentId,
      })
      if (matchClient) {
        await logActivity({
          clientId: matchClient.id,
          type: 'email_sent',
          payload: { subject, to, trackingId, sequenceId },
        })
      }
    } catch {}

    return Response.json({ success: true, message: 'Email envoyé avec succès', trackingId })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

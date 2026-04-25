export async function POST(request) {
  try {
    const { to, toName, subject, content, templateType } = await request.json()

    if (!to || !subject || !content) {
      return Response.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const emailBody = {
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'Nerixi',
        email: process.env.BREVO_SENDER_EMAIL || 'info@nerixi.com'
      },
      to: [{ email: to, name: toName || to }],
      subject: subject,
      htmlContent: `
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

    return Response.json({ success: true, message: 'Email envoyé avec succès' })

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

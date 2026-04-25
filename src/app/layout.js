import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Nerixi CRM — Dashboard',
  description: 'Tableau de bord Nerixi — Automatisation IA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={inter.className} style={{ background: '#0a1628', color: '#e8f4f0', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}

import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getProspect, deleteProspect, createClient, logActivity } from '@/lib/store'
import { runWorkflowsForEvent } from '@/lib/workflows'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function POST(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const p = await getProspect(params.id)
  if (!p) return Response.json({ error: 'Not found' }, { status: 404 })

  let body = {}
  try { body = await request.json() } catch {}
  const ALLOWED = ['prospect', 'en-cours', 'actif', 'churné']
  const targetStatut = ALLOWED.includes(body.statut) ? body.statut : 'en-cours'

  const client = await createClient({
    nom: p.nom,
    entreprise: p.entreprise,
    email: p.email,
    telephone: p.telephone,
    linkedin: p.linkedin,
    secteur: p.secteur || 'Autre',
    statut: targetStatut,
    mrr: p.estimatedMRR || 0,
    notes: [p.notes, p.role && `Rôle : ${p.role}`, p.source && `Source : ${p.source}`].filter(Boolean).join('\n'),
    prochainAction: p.nextAction,
    automatisations: [],
    tags: [p.source || 'prospection'].filter(Boolean),
  })

  await logActivity({
    clientId: client.id,
    type: 'converted_from_prospect',
    payload: { prospectId: p.id, entreprise: p.entreprise },
  })

  runWorkflowsForEvent('client.created', { client }).catch(() => {})

  await deleteProspect(params.id)

  return Response.json({ client })
}

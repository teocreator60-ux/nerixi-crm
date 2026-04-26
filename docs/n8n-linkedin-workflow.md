# Workflow n8n — Générateur LinkedIn Nerixi

Ce workflow reçoit une requête depuis le CRM et renvoie une publication LinkedIn générée par IA, conforme aux **règles d'or Nerixi**.

## Architecture

```
[Webhook IN] → [Code: Build prompt] → [OpenAI / Anthropic] → [Code: Extract content] → [Webhook OUT (Respond)]
```

## 1. Webhook trigger

- **Method**: `POST`
- **Path**: `/nerixi-linkedin` (ou ce que tu veux)
- **Authentication**: None (signature HMAC vérifiée dans le Code node)
- **Response Mode**: `Using 'Respond to Webhook' Node` — important pour pouvoir retourner du contenu
- **Response Code**: 200

L'URL générée doit être copiée dans `.env.local` :
```
N8N_LINKEDIN_WEBHOOK_URL=https://n8n.tondomaine.com/webhook/nerixi-linkedin
N8N_WEBHOOK_SECRET=ton_secret_partage   # optionnel mais recommandé
```

## 2. Payload reçu

Le CRM envoie :

```json
{
  "event": "linkedin.generate",
  "timestamp": "2026-04-25T16:00:00.000Z",
  "source": "nerixi-crm",
  "type": "tofu | bofu | planning | hook | carrousel | recycler",
  "sujet": "Texte saisi par Téo",
  "extra": null
}
```

Headers :
- `X-Nerixi-Signature: sha256=<hex>` (si secret configuré)
- `X-Nerixi-Timestamp: ISO`

## 3. Vérification de signature (optionnel mais recommandé)

Dans un nœud **Code** juste après le Webhook :

```javascript
const crypto = require('crypto')
const SECRET = 'ton_secret_partage' // = N8N_WEBHOOK_SECRET

const sig = $input.first().headers['x-nerixi-signature']?.replace('sha256=', '')
const body = JSON.stringify($input.first().body)
const expected = crypto.createHmac('sha256', SECRET).update(body).digest('hex')

if (sig !== expected) {
  throw new Error('Signature invalide — requête rejetée')
}

return $input.first().json
```

## 4. Code node — Build the prompt

Crée un nœud **Code** avec ce JavaScript :

```javascript
const RULES = `
RÈGLES D'OR LINKEDIN NERIXI (à respecter absolument) :
1. Jamais de lien dans le post — toujours en commentaire épinglé.
2. Hook = lignes 1-3 uniquement, ultra puissantes, le reste est secondaire.
3. Un seul message par post — ne pas mélanger TOFU et BOFU.
4. Chiffres réels uniquement — pas de promesses vagues.
5. Toujours finir par une question ou un CTA — jamais de post "dans le vide".
6. 3 hashtags max — pertinents et de niche (#AcquisitionOrganique #SEOlocal #PMEFrance).
7. Style direct, tutoiement possible si TOFU, vouvoiement si BOFU dirigeant.
8. Mise en forme aérée — sauts de ligne fréquents, phrases courtes.
9. Pas d'emoji excessif (1-3 max).
10. Cible : dirigeants de PME françaises (10-200 salariés).
`

const SIGNATURE = `

—
Téo · Fondateur Nerixi
🚀 Audit gratuit : nerixi.fr (lien en commentaire)`

const { type, sujet, extra } = $json

let userPrompt = ''

if (type === 'tofu') {
  userPrompt = `Rédige un post LinkedIn TOFU (Top of Funnel — sensibilisation) sur le sujet :
"${sujet}"

Objectif : éduquer, donner un insight, attirer l'attention. Pas de pitch produit.

Structure :
- 3 lignes de hook ultra accrocheuses
- 1 storytelling court ou un constat chiffré
- 1 enseignement/principe clé
- 1 question ouverte pour engager

Pas de mention de Nerixi en B2B direct. C'est un post de partage d'expertise.`
}

else if (type === 'bofu') {
  userPrompt = `Rédige un post LinkedIn BOFU (Bottom of Funnel — conversion) sur le sujet :
"${sujet}"

Objectif : montrer un résultat client concret, avec chiffres précis, et orienter vers un audit/RDV.

Structure :
- 3 lignes de hook factuelles avec chiffres réels
- Avant / Après précis
- Méthode utilisée (1-2 phrases)
- Résultat chiffré
- CTA clair : "Audit gratuit en commentaire" ou "DM si tu veux le déroulé"

Mention Nerixi acceptable. Ton dirigeant à dirigeant.`
}

else if (type === 'planning') {
  userPrompt = `Crée un calendrier éditorial LinkedIn de 4 semaines pour le mois "${sujet}".

Pour chaque semaine, donne :
- Lundi : 1 post TOFU (sujet + angle + 1ère ligne du hook)
- Mercredi : 1 post BOFU (sujet + cas client fictif plausible + chiffre)
- Vendredi : 1 carrousel ou 1 post recycle (sujet + intention)

Format markdown avec semaines en h2. Sujets variés autour de l'automatisation IA pour PME, SEO local, acquisition organique.`
}

else if (type === 'hook') {
  userPrompt = `Génère 5 hooks LinkedIn (lignes 1-3) puissants sur le thème :
"${sujet}"

Chaque hook doit :
- Tenir en 3 lignes max
- Provoquer la curiosité ou un déclic
- Contenir un chiffre, un contraste, ou une affirmation forte
- Être prêt à coller en début de post

Format : numérotés 1 à 5, séparés par une ligne vide. Pas d'explications, juste les hooks.`
}

else if (type === 'carrousel') {
  userPrompt = `Crée la structure d'un carrousel LinkedIn (PDF 8 slides) sur le sujet :
"${sujet}"

Pour chaque slide, donne :
- Numéro
- Titre court (max 7 mots)
- 2-3 lignes de contenu (bullets ou phrase)

Slide 1 = hook visuel ; Slide 8 = CTA. Format markdown clair, prêt à filer à un designer.`
}

else if (type === 'recycler') {
  userPrompt = `Voici un contenu source (cas client / post Google Business / article) :

"""
${sujet}
"""

Transforme-le en un post LinkedIn TOFU ou BOFU (choisis le plus adapté). Garde l'essence, anonymise si nécessaire, applique le format LinkedIn :
- 3 lignes de hook
- Storytelling
- Enseignement
- CTA / question

Indique en première ligne entre crochets [TOFU] ou [BOFU].`
}

const systemPrompt = `Tu es l'expert copywriter LinkedIn de Nerixi (automatisation IA pour PME françaises).

${RULES}

Tu rédiges UNIQUEMENT le post final, sans intro ("Voici ton post..."), sans guillemets autour, sans explications. Le post est prêt à copier-coller dans LinkedIn.`

return {
  systemPrompt,
  userPrompt,
  type,
  sujet,
}
```

## 5. AI node

Deux options :

### Option A — OpenAI (le plus simple dans n8n)

Nœud **OpenAI** (ou **OpenAI Chat Model**) :
- Model : `gpt-4o-mini` (rapide, ~$0.0002/post) ou `gpt-4o` (meilleur, ~$0.005/post)
- Messages :
  - System : `={{ $json.systemPrompt }}`
  - User : `={{ $json.userPrompt }}`
- Temperature : `0.8`
- Max tokens : `1500`

### Option B — Anthropic Claude (HTTP Request)

Nœud **HTTP Request** :
- Method : `POST`
- URL : `https://api.anthropic.com/v1/messages`
- Headers :
  - `x-api-key` : ta clé `sk-ant-...`
  - `anthropic-version` : `2023-06-01`
  - `content-type` : `application/json`
- Body (JSON) :
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1500,
  "system": "={{ $json.systemPrompt }}",
  "messages": [
    { "role": "user", "content": "={{ $json.userPrompt }}" }
  ]
}
```

## 6. Code node — Extract content

Après l'AI node, ajoute un dernier **Code** pour normaliser :

```javascript
// Pour OpenAI
const content = $input.first().json.choices?.[0]?.message?.content
              || $input.first().json.message?.content?.[0]?.text  // Anthropic
              || $input.first().json.content?.[0]?.text
              || ''

return { content }
```

## 7. Respond to Webhook node

- **Respond With**: `JSON`
- **Response Body**: `={{ $json }}` (renvoie `{ content: "..." }`)

Le CRM lit le champ `content` et l'affiche dans une nouvelle card LinkedIn.

## Test rapide

1. Active le workflow dans n8n
2. Dans le CRM → onglet **💼 LinkedIn** → choisis **TOFU** → tape un sujet → **Générer la publication**
3. Sous 5-30 secondes, la card apparaît avec le post généré
4. Bouton **📋 Copier** pour récupérer, **↻ Re-générer** pour une autre version

## Coûts indicatifs

| Modèle | Coût par post | Qualité |
|---|---|---|
| gpt-4o-mini | ~0,0002 € | ⭐⭐⭐ Très bon |
| gpt-4o      | ~0,005 €  | ⭐⭐⭐⭐ Excellent |
| Claude Haiku 4.5 | ~0,002 € | ⭐⭐⭐⭐ Excellent |
| Claude Sonnet 4.6 | ~0,015 € | ⭐⭐⭐⭐⭐ Top |

100 posts/mois en gpt-4o-mini = ~0,02 € · pas de quoi s'inquiéter du coût.

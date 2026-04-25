# Nerixi CRM — Dashboard

Dashboard CRM personnel pour Nerixi — Automatisation IA.

## Fonctionnalités

- 📊 **Dashboard** — Vue d'ensemble MRR, trésorerie, clients, prochaines actions
- 👥 **Clients** — Fiches détaillées avec automatisations, notes, avancement
- 📧 **Emails** — Envoi via Brevo avec templates prêts à l'emploi
- 💼 **LinkedIn** — Templates de publications copy-paste

---

## Installation en local

### 1. Prérequis
- Node.js 18+ installé → https://nodejs.org
- VS Code installé

### 2. Ouvrir le projet
```bash
# Dans VS Code, ouvre le dossier nerixi-crm
# Puis ouvre le terminal (Ctrl+`)

cd nerixi-crm
npm install
```

### 3. Configurer Brevo
```bash
# Copie le fichier d'exemple
cp .env.local.example .env.local

# Ouvre .env.local et remplis :
# BREVO_API_KEY=ta_vraie_cle_brevo
# BREVO_SENDER_EMAIL=info@nerixi.com
# BREVO_SENDER_NAME=Nerixi
```

**Où trouver ta clé Brevo :**
→ app.brevo.com > Compte > API > Créer une clé API

### 4. Lancer en local
```bash
npm run dev
```
→ Ouvre http://localhost:3000

---

## Déploiement sur Vercel (gratuit)

### 1. Créer un compte Vercel
→ https://vercel.com (gratuit avec GitHub)

### 2. Pousser le code sur GitHub
```bash
git init
git add .
git commit -m "Initial commit Nerixi CRM"
git remote add origin https://github.com/TON_USERNAME/nerixi-crm.git
git push -u origin main
```

### 3. Déployer sur Vercel
1. Va sur vercel.com
2. "New Project"
3. Importe ton repo GitHub nerixi-crm
4. Dans "Environment Variables" ajoute :
   - `BREVO_API_KEY` = ta clé Brevo
   - `BREVO_SENDER_EMAIL` = info@nerixi.com
   - `BREVO_SENDER_NAME` = Nerixi
5. Clique "Deploy"
6. Ton app est en ligne en 2 minutes !

---

## Personnalisation

### Ajouter un client
Ouvre `src/lib/clients.js` et ajoute un objet dans le tableau `clients` :

```js
{
  id: 6,
  nom: "Prénom Nom",
  entreprise: "Nom Entreprise",
  secteur: "Secteur",
  email: "email@entreprise.fr",
  telephone: "06 XX XX XX XX",
  statut: "actif", // actif | en-cours | prospect
  mrr: 500,
  installation: 5000,
  dateDebut: "2024-04-01",
  avancement: 0,
  notes: "Notes sur le client...",
  automatisations: ["Automatisation 1", "Automatisation 2"],
  prochainAction: "Prochaine étape",
  linkedin: "https://linkedin.com/in/profil",
  tags: ["tag1", "tag2"]
}
```

### Ajouter un template email
Ouvre `src/app/page.js` et ajoute dans `EMAIL_TEMPLATES`.

### Ajouter un template LinkedIn
Ouvre `src/app/page.js` et ajoute dans `LINKEDIN_TEMPLATES`.

---

## Stack technique

- **Next.js 14** — Framework React
- **Tailwind CSS** — Styles
- **Brevo API** — Envoi d'emails
- **Vercel** — Hébergement gratuit

---

Fait avec ❤️ pour Nerixi par Téo

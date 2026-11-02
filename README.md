# 🌍 Palabre — Plateforme d'échange technique pour les développeurs africains

> Projet conçu pour la **Coupe d’Afrique des Développeurs (CADev) 2026**  
> *« Construire la plateforme d’échange africaine, pour les devs, par les devs. »*

---

## 📖 À propos de Palabre

Les développeurs africains font face quotidiennement à des problématiques techniques spécifiques pour lesquelles la documentation globale est souvent incomplète, obsolète ou inadaptée :
- Intégration des passerelles de paiement mobile (**Wave**, **Orange Money**, **MTN Mobile Money**, **Moov Money**, etc.).
- Gestion des intégrations **SMS** et **USSD** multi-opérateurs.
- Instabilité réseau et contraintes de connectivité / bande passante.
- Écarts de versions d'API et comportements variables selon les pays et les opérateurs télécoms.

**Palabre** est une plateforme collaborative permettant aux développeurs :
1. De publier, tester, vérifier et certifier des **fiches techniques de terrain ultra-contextualisées** (pays, opérateur, stack technique, version, étapes pas-à-pas et code prêt à l'emploi).
2. De poser des questions et résoudre des bugs complexes dans l'**espace d'entraide technique**, avec support des messages d'erreur console, extraits de code et captures d'écran.
3. De convertir les solutions validées en fiches de terrain pour pérenniser le savoir technique au profit de toute la communauté.

---

## 🚀 Fonctionnalités Clés

### 1. 🔐 Authentification, Profils & Confidentialité
- Inscription, connexion, déconnexion avec gestion de session persistante via **Supabase Auth**.
- Gestion de profil utilisateur (nom d'affichage, bio, stack technique, profil public).
- **Protection stricte de la vie privée** : les adresses e-mail sont isolées dans `auth.users` et ne sont jamais exposées publiquement dans la table `public.profiles`.

### 2. 📝 Fiches Techniques de Terrain
- **Éditeur guidé** : jauge de progression en temps réel (champs obligatoires remplis).
- **Prévisualisation interactive** : affichage du rendu sans aucune perte de données lors du retour à l'édition.
- **Brouillons & Édition** : sauvegarde intermédiaire de brouillons, modification des fiches publiées réservée à leur auteur.
- **Blocs de code** : affichage lisible avec coloration syntaxique, copie en 1 clic et indication du langage.
- **Variantes contextuelles** : proposition de solutions alternatives rattachées à une fiche parent (autre framework, autre opérateur).

### 3. 🛡️ Système de Certification & Fiabilité Collaborative
- **Règle de certification** : Une fiche passe au statut **« Certifiée par la communauté »** dès lors qu'elle accumule au moins **3 confirmations positives** de développeurs l'ayant testée avec succès.
- **Retours d'expérience** :
  - **Confirmations positives** : confirment que le code fonctionne dans le contexte spécifié.
  - **Retours négatifs / d'obsolescence** : signalent que la solution ne fonctionne plus ou nécessite une mise à jour.
  - Chaque utilisateur dispose d'**une seule confirmation active par fiche**, modifiable ou révocable à tout moment.
  - **Anti-triche** : un auteur ne peut pas confirmer sa propre fiche technique (contrôle par trigger SQL).
- **Statuts explicites** :
  - 🟢 **Certifiée par la communauté** (`ok`) : $\ge 3$ confirmations positives.
  - 🔵 **En attente de validation** (`new`) : moins de 3 confirmations.
  - 🟡 **À revérifier** (`re`) : signalements d'obsolescence ou fiche ancienne (> 90 jours sans test).
  - 🔴 **Contestée** (`fl`) : retours négatifs critiques ($\ge 2$) ou signalements ouverts non résolus.
- Le nombre de vues n'influe **jamais** sur la certification.

### 4. 💡 Espace d'Entraide Technique (Nouveau)
- **Publication de problèmes** : titre, description détaillée, technologie, langage, framework, message d'erreur exact, résultat attendu, versions des outils et environnement d'exécution (OS, conteneur).
- **Bloc de code & Captures d'écran** : coloration, copie, téléversement sécurisé de multiples images via **Supabase Storage** (bucket `entraide-attachments`, max 5 Mo, types autorisés PNG/JPEG/WebP/GIF).
- **Avertissement de sécurité** : rappel systématique de ne jamais partager de clés privées, tokens ou mots de passe.
- **Cycle de vie des questions** : Statuts `open` (Ouvert), `in_progress` (En cours), `resolved` (Résolu).
- **Réponses & Solution validée** : réponses avec code, possibilité pour l'auteur de marquer une réponse comme solution acceptée (ce qui passe automatiquement le problème au statut `resolved`).
- **Passerelle vers les fiches de terrain** : lorsqu'un problème est résolu, un bouton propose de transformer la solution en fiche de terrain pré-remplie en brouillon, sans publication ni certification automatiques, respectant le processus communautaire standard.

### 5. 📊 Tableau de bord Utilisateur
- Métriques réelles calculées en direct : fiches publiées, brouillons, confirmations reçues, vues cumulées.
- Suivi de ses questions d'entraide et des réponses reçues.
- Liste des confirmations reçues et fiches communautaires recommandées à tester.

### 6. 👮 Modération & Espace Administrateur (`/admin`)
- Espace réservé aux modérateurs et administrateurs (contrôle de rôle `user_roles`).
- Vue d'ensemble et traitement des signalements sur les fiches de terrain et sur les questions d'entraide.
- Actions de modération : rejet de signalement, masquage de fiche ou masquage de question.

---

## 🛠️ Stack Technique

- **Frontend** : [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styles & UI** : [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Routage** : [React Router DOM v6](https://reactrouter.com/)
- **Formulaires & Validation** : [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/)
- **Backend & Base de Données** : [Supabase](https://supabase.com/) (PostgreSQL 15+, Row Level Security, Triggers SQL, RPC, Storage)
- **Tests** : [Vitest](https://vitest.dev/), [@testing-library/react](https://testing-library.com/)

---

## 🔒 Audit de Sécurité & Correctifs Appliqués

| Vulnérabilité / Risque initial | Risque | Correctif Implémenté |
| :--- | :--- | :--- |
| **Fuite des e-mails profils** | Scraping public de la colonne `email` dans `profiles` | Colonne `email` retirée de `public.profiles`. Les e-mails sont conservés exclusivement et de manière chiffrée dans `auth.users`. |
| **Falsification des compteurs & statuts** | Un auteur pouvait envoyer un `UPDATE fiches` pour mettre `verification_status = 'ok'` ou `confirmations_count = 999` | Déclencheur SQL `protect_fiche_system_fields()` réinitialisant automatiquement toute tentative de modification de ces champs par un utilisateur non-admin. |
| **Auto-confirmation frauduleuse** | Un auteur pouvait voter pour sa propre fiche pour atteindre les 3 confirmations | Déclencheur SQL `check_fiche_confirmation_author()` bloquant toute tentative d'auto-confirmation par l'auteur. |
| **Signalements sans impact sur le statut** | Les signalements créés n'appelaient pas la réévaluation de la certification | Déclencheur SQL `tr_fiche_reports_change` réévaluant immédiatement le statut de la fiche lors de l'ouverture ou du traitement d'un signalement. |
| **Appel direct RPC non protégé** | `evaluate_fiche_status` pouvait être invoquée directement via PostgREST RPC | `REVOKE EXECUTE ON FUNCTION public.evaluate_fiche_status FROM PUBLIC, anon, authenticated;` (exécution réservée aux déclencheurs internes). |
| **Falsification des compteurs de questions** | Altération manuelle de `answers_count`, `views_count` ou `author_id` sur les questions | Déclencheurs `set_new_question_defaults` et `protect_question_system_fields`. Validation de solution réservée à l'auteur via RPC `mark_question_solution`. |

---

## 📦 Structure du Projet

```text
palabre/
├── public/                     # Fichiers statiques et redirection SPA (_redirects)
├── src/
│   ├── components/
│   │   ├── common/             # Composants partagés (Badge, CodeBlock, ProtectedRoute, SecurityWarningBanner)
│   │   ├── entraide/           # Composants entraide (QuestionCard, QuestionStatusBadge)
│   │   ├── fiches/             # Composants fiches (FicheCard, SearchBar, CodeBlock)
│   │   ├── layout/             # En-tête (Header) et pied de page (Footer)
│   │   ├── modals/             # Modales (Confirmation, Signalement, Variante)
│   │   └── ui/                 # Éléments d'interface utilisateur
│   ├── contexts/               # Contexte d'authentification (AuthContext)
│   ├── lib/                    # Client Supabase, constantes et utilitaires
│   ├── pages/                  # Pages de l'application (Home, Search, Entraide, NewFiche, etc.)
│   ├── schemas/                # Schémas de validation Zod (fiche, auth, interaction, entraide)
│   ├── services/               # Services d'accès aux données Supabase
│   ├── tests/                  # Suites de tests unitaires et composants Vitest
│   ├── types/                  # Types TypeScript stricts
│   ├── App.tsx                 # Configuration des routes
│   └── main.tsx                # Point d'entrée de l'application
├── supabase/
│   ├── migrations/
│   │   ├── 20260218000000_init_palabre_schema.sql         # Schéma complet prêt à l'emploi
│   │   └── 20260219000000_audit_security_fixes_and_entraide.sql # Migration incrémentale d'audit & entraide
│   ├── tests/
│   │   └── rls_and_auth_test.sql                          # Tests SQL de validation RLS & triggers
│   └── seed.sql                                           # Données initiales (catégories)
├── vercel.json                 # Configuration des redirections SPA pour Vercel
├── vite.config.ts              # Configuration Vite & Vitest
└── tailwind.config.js          # Configuration Tailwind avec les tokens Palabre
```

---

## ⚙️ Installation & Démarrage en Local

### 1. Prérequis
- [Node.js](https://nodejs.org/) v18 ou version supérieure
- Gestionnaire de paquets `npm`

### 2. Cloner et installer les dépendances
```bash
git clone <url-du-repo>
cd palabre
npm install
```

### 3. Configurer les variables d'environnement
Créez un fichier `.env.local` à la racine du projet :
```dotenv
VITE_SUPABASE_URL=https://<votre-id-projet>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<votre-cle-anon-ou-publishable>
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```
L'application est accessible à l'adresse `http://localhost:5173`.

### 5. Exécuter les tests
```bash
npm test
```

### 6. Compiler pour la production
```bash
npm run build
```

---

## 🗄️ Initialisation & Application des Migrations Supabase

### Scénario A : Nouvelle base de données (Installation fraîche)
1. Ouvrez votre [Dashboard Supabase](https://supabase.com/dashboard) > **SQL Editor**.
2. Exécutez le fichier [20260218000000_init_palabre_schema.sql](supabase/migrations/20260218000000_init_palabre_schema.sql).
3. Exécutez ensuite le fichier [seed.sql](supabase/seed.sql).

### Scénario B : Base existante (Application de l'audit et de l'espace entraide)
1. Ouvrez votre [Dashboard Supabase](https://supabase.com/dashboard) > **SQL Editor**.
2. Exécutez le script incrémental non destructif [20260219000000_audit_security_fixes_and_entraide.sql](supabase/migrations/20260219000000_audit_security_fixes_and_entraide.sql).

### Vérification des règles de sécurité (Tests SQL)
Pour valider l'intégrité, les déclencheurs de protection et les politiques RLS :
1. Dans le **SQL Editor**, collez et exécutez le fichier [supabase/tests/rls_and_auth_test.sql](supabase/tests/rls_and_auth_test.sql).
2. Le script est découpé en 2 volets :
   - **Volet 1 (Intégrité & Déclencheurs)** : vérifie l'absence de fuite d'e-mail dans `profiles`, la réinitialisation à l'INSERT, le blocage de la falsification à l'UPDATE, le blocage strict de l'auto-confirmation par l'auteur, le recalcul sur signalement, et les autorisations de `mark_question_solution()`.
   - **Volet 2 (Politiques RLS avec impersonation)** : simule les rôles `anon`, `authenticated` et `admin` via claims JWT pour prouver que les anonymes ne peuvent pas lire les brouillons ni écrire, que les pairs ne peuvent pas modifier les contenus d'autrui, et que les modérateurs peuvent agir.
3. **Sécurité & Isolation** : Le script génère des UUIDs dynamiques et supprime automatiquement 100% des entités de test à la fin (y compris en cas d'erreur). Aucune donnée de production n'est impactée.

### Attribuer le rôle Administrateur / Modérateur
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<ID_UTILISATEUR_SUPABASE_AUTH>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## 📄 Licence & Droits

Projet développé pour la **Coupe d’Afrique des Développeurs (CADev) 2026**.  
Tous droits réservés © 2026 Palabre.

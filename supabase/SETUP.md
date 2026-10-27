# Activer l’inscription et la connexion Supabase

Palabre utilise Supabase Auth et PostgreSQL pour les comptes, les profils et les
rôles. Il n’existe pas de compte de démonstration ni de backend de remplacement :
les identifiants ci-dessous sont nécessaires pour que l’inscription et la
connexion fonctionnent.

## 1. Créer le projet Supabase

1. Créez un projet sur [supabase.com/dashboard](https://supabase.com/dashboard).
2. Dans **Project Settings → API Keys**, copiez la **Project URL** et la clé
   publique **Publishable**. L’ancienne clé publique `anon` convient aussi.
   N’utilisez jamais `service_role` dans l’application.
3. À la racine de Palabre, copiez `.env.example` vers `.env.local` et renseignez
   vos valeurs :

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-ou-anon>
   ```

   `.env.local` est ignoré par Git. Ne publiez pas son contenu.

## 2. Installer le schéma et ses protections

Dans **SQL Editor** de votre projet Supabase, exécutez dans cet ordre le contenu
intégral des migrations :

1. `migrations/20260218000000_init_palabre_schema.sql`
2. `migrations/20261020000000_admin_access_controls.sql`
3. `migrations/20261025150325_admin_access_requests.sql`

La première migration crée les tables, le déclencheur de profil à l’inscription
et les politiques RLS. La seconde autorise les administrateurs à consulter le
répertoire des profils sans exposer les adresses e-mail. La troisième crée les
demandes d’accès admin protégées par RLS et la validation atomique des demandes.

Ces migrations doivent être exécutées dans le projet dont l’URL est définie
dans `.env.local`. Si la connexion échoue après la validation du mot de passe,
et que Supabase signale `PGRST205` ou une table absente du schéma cache, vérifiez
que `public.user_roles` et `public.profiles` existent bien dans **Table Editor**.
Dans **Integrations → Data API**, vérifiez aussi que le schéma `public` est
exposé. Après avoir modifié les paramètres d’exposition, rechargez le schéma
PostgREST depuis le SQL Editor :

```sql
NOTIFY pgrst, 'reload schema';
```

N’accordez jamais un rôle administrateur depuis un formulaire public. Suivez
`ADMIN_SETUP.md` pour créer le premier administrateur avec le SQL Editor.

## 3. Configurer Auth

Dans **Authentication → URL Configuration** :

- définissez **Site URL** sur `http://localhost:5173` pour le développement ;
- ajoutez `http://localhost:5173/login` et
  `http://127.0.0.1:5173/login` dans **Redirect URLs** si vous utilisez ces deux
  adresses pour ouvrir l’application ;
- ajoutez également les URL `/admin/login` correspondantes pour confirmer les
  comptes créés depuis le portail admin ;
- avant le déploiement, définissez la véritable URL HTTPS de Palabre comme Site
  URL et ajoutez ses pages `/login` et `/admin/login` à la liste des URL
  autorisées.

Dans **Authentication → Email Templates → Confirm signup**, le lien par défaut
`{{ .ConfirmationURL }}` peut être conservé. Si vous personnalisez ce modèle,
utilisez le lien ci-dessous : il vérifie le jeton directement dans Palabre,
même si l’e-mail est ouvert sur un autre appareil ou navigateur.

```html
<p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=signup">Confirmer mon adresse e-mail</a></p>
```

L’application échange ce jeton à usage unique, puis confirme l’adresse ou
affiche une erreur si le lien a expiré. Ne remplacez pas `{{ .RedirectTo }}` par
une URL non autorisée dans la liste **Redirect URLs**.

En production, configurez un fournisseur SMTP pour les e-mails de confirmation
et de récupération de mot de passe. Le service e-mail par défaut de Supabase
est limité et ne convient pas à un service en production.

## 4. Lancer et vérifier

Après avoir enregistré `.env.local`, redémarrez Vite pour recharger la
configuration :

```powershell
npm run dev
```

Créez un compte depuis le portail utilisateur ou envoyez une demande depuis
`/admin/login`. Les demandes admin restent sans privilège jusqu’à leur
approbation par un administrateur existant, dans **Comptes → Demandes d’accès
administrateur**. Si la confirmation e-mail est activée, cliquez sur le lien
reçu puis reconnectez-vous au portail admin pour envoyer la demande.

L’inscription publique ne peut jamais attribuer le rôle `admin`. Pour créer le
premier administrateur, suivez `ADMIN_SETUP.md` ; les administrateurs suivants
doivent être approuvés depuis la console.

Pour diagnostiquer la configuration, vérifiez que le navigateur ne signale pas
de clé API invalide et que les migrations sont bien appliquées. Les variables
Vite sont intégrées au démarrage du serveur : toute modification de `.env.local`
nécessite un redémarrage.

QDVL8JVncJctR4gz:code supabase
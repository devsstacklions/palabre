# Création du premier administrateur

Avant cette étape, créez/configurez Supabase et exécutez les migrations comme
indiqué dans [SETUP.md](./SETUP.md).

La création d'un administrateur se fait par le propriétaire du projet dans le
tableau de bord Supabase, jamais depuis une route publique ou le navigateur de
l'application.

1. Créez d'abord le compte concerné depuis **Authentication → Users** dans
   Supabase. Utilisez le processus d'invitation ou de création d'utilisateur de
   Supabase ; ne placez pas de mot de passe dans le dépôt ni dans une migration.
2. Ouvrez le **SQL Editor** avec un compte propriétaire du projet.
3. Remplacez l'adresse ci-dessous par celle du compte vérifié, puis exécutez :

   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE lower(email) = lower('admin@example.com')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

4. Vérifiez que le rôle a été affecté au seul compte attendu :

   ```sql
   SELECT u.email, r.role
   FROM auth.users AS u
   JOIN public.user_roles AS r ON r.user_id = u.id
   WHERE lower(u.email) = lower('admin@example.com');
   ```

5. Connectez-vous normalement à Palabre. Le rôle est lu dans `user_roles` par
   l'API authentifiée de Supabase ; aucune valeur locale du navigateur ne donne
   des privilèges. Pour retirer l'accès, supprimez explicitement ce rôle depuis
   le SQL Editor après vérification de l'identité du compte.

La migration `20261020000000_admin_access_controls.sql` doit être appliquée
avant d'utiliser le tableau de bord : elle autorise les comptes ADMIN à lire
tous les profils tout en retirant l'accès API à la colonne d'adresse e-mail.

Après la création de ce premier administrateur, les nouveaux candidats peuvent
créer un compte depuis `/admin/login` et demander l'accès. Leur compte reste un
compte utilisateur tant qu'un administrateur existant n'a pas approuvé la
demande dans **Console admin → Comptes → Demandes d’accès administrateur**.
Cette approbation ajoute le rôle admin côté base de données ; aucun formulaire
public ne peut s'attribuer ce rôle.

Appliquez également `migrations/20261025150325_admin_access_requests.sql`
avant d'activer ce parcours.

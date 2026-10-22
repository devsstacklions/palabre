import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const hasPlaceholder = (value: string | undefined) =>
  !value ||
  /votre-projet|votre_cle|project-ref|publishable-ou-anon|<[^>]+>|clé-publique-réelle/i.test(value);

export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() &&
    supabaseAnonKey?.trim() &&
    !hasPlaceholder(supabaseUrl) &&
    !hasPlaceholder(supabaseAnonKey) &&
    supabaseAnonKey.trim().length >= 20
);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase n’est pas configuré. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans .env.local puis redémarrez Vite.'
  );
}

export const supabase = createClient(
  supabaseUrl?.trim() || 'https://configuration-required.supabase.co',
  supabaseAnonKey?.trim() || 'configuration-required',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
<<<<<<< HEAD
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
=======

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Attention: Les variables VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY ne sont pas définies dans .env.local.'
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
  );
}

export const supabase = createClient(
<<<<<<< HEAD
  supabaseUrl?.trim() || 'https://configuration-required.supabase.co',
  supabaseAnonKey?.trim() || 'configuration-required',
=======
  supabaseUrl || 'https://pwisquamqrkqbjwtglzj.supabase.co',
  supabaseAnonKey || 'sb_publishable_czxDzeDmKHj868HWIFd8fg_6osH1',
>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
<<<<<<< HEAD
=======

>>>>>>> de6efc04b307a70c95fb5c79f8b8dcff05ba7529

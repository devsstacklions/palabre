import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() &&
    supabaseAnonKey?.trim() &&
    !supabaseUrl.includes('votre-projet') &&
    !supabaseAnonKey.includes('votre_cle')
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

import { describe, expect, it, vi } from 'vitest';

const supabaseState = vi.hoisted(() => ({ configured: false }));

vi.mock('../lib/supabase', () => ({
  get isSupabaseConfigured() {
    return supabaseState.configured;
  },
}));

import { getAuthErrorMessage } from '../lib/auth-errors';

describe('auth error messages', () => {
  it('explains that Supabase must be configured', () => {
    expect(getAuthErrorMessage(new Error('Invalid API key'), 'login')).toContain(
      'service de connexion n’est pas configuré'
    );
  });

  it('explains when the roles table is missing from the Supabase API schema', () => {
    supabaseState.configured = true;

    expect(
      getAuthErrorMessage(
        {
          code: 'PGRST205',
          message: "Could not find the table 'public.user_roles' in the schema cache",
        },
        'login'
      )
    ).toContain('Exécutez les migrations SQL du dossier supabase/migrations');
  });
});

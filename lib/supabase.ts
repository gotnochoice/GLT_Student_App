import { AuthClient } from '@supabase/auth-js';
import { PostgrestClient } from '@supabase/postgrest-js';

export const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** A tiny Supabase client: sign-in plus database queries. We skip the full
 *  supabase-js (realtime, storage, functions) to stay under the data budget.
 *  "implicit" flow so a magic link still works when it opens in a different
 *  browser from the one that asked for it (WhatsApp's in-app browser, then
 *  Gmail, then Chrome is common). */
function build() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const auth = new AuthClient({
    url: `${url}/auth/v1`, headers: { apikey: key }, storageKey: 'glt-auth',
    flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true,
  });
  const db = new PostgrestClient(`${url}/rest/v1`, {
    headers: { apikey: key },
    fetch: async (input, init) => {
      const { data } = await auth.getSession();
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${data.session?.access_token ?? key}`);
      return fetch(input, { ...init, headers });
    },
  });
  return { auth, from: db.from.bind(db), rpc: db.rpc.bind(db) };
}

let client: ReturnType<typeof build> | null = null;
export const supabase = () => (client ??= build());

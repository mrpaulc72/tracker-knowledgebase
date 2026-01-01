import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return null instead of throwing to prevent build-time crashes.
    // The UI should handle the null state gracefully.
    console.warn('Supabase URL or Anon Key is missing. Environment variables must be set.');
    return null as any;
  }

  return createClient(url, key);
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase Admin: Service Role Key or URL is missing.');
  }

  return createClient(url, serviceRoleKey);
}

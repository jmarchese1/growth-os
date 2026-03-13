import { createSupabaseServerClient } from './supabase/server';
import { redirect } from 'next/navigation';

/**
 * Get the current authenticated user from Supabase.
 * Redirects to /login if not authenticated.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return user;
}

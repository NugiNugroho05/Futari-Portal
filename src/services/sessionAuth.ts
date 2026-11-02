import { supabase } from '../supabaseClient';

/**
 * STRICT SESSION RESOLUTION
 * -------------------------
 * Every Supabase query / mutation in the portal must be bound to the *verified* active
 * session. `supabase.auth.getUser()` re-validates the JWT against Supabase Auth (unlike
 * `getSession()`, which only reads local storage), so it is the single source of truth
 * for "who is performing this action". No hardcoded / mock / fallback emails are allowed.
 */

export class SessionAuthError extends Error {
  constructor(message = 'Sesi login Supabase tidak valid atau telah berakhir. Silakan login ulang.') {
    super(message);
    this.name = 'SessionAuthError';
  }
}

export interface ActiveSessionUser {
  id: string;
  email: string;
}

/** Resolves the verified authenticated user, or throws `SessionAuthError`. */
export async function getActiveSessionUser(): Promise<ActiveSessionUser> {
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  const email = user?.email?.trim().toLowerCase();
  if (error || !user || !email) {
    throw new SessionAuthError();
  }
  return { id: user.id, email };
}

/** Resolves the verified authenticated user's email, or throws `SessionAuthError`. */
export async function getActiveSessionEmail(): Promise<string> {
  return (await getActiveSessionUser()).email;
}

/** Non-throwing variant for read-only fetches: returns `null` when no valid session exists. */
export async function tryGetActiveSessionUser(): Promise<ActiveSessionUser | null> {
  try {
    return await getActiveSessionUser();
  } catch {
    return null;
  }
}

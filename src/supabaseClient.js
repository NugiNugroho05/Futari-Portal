import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL)) ||
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL)) ||
  'https://jadxcsmbtpsfeztqpied.supabase.co';

// Normalize URL if `/rest/v1/` was included in the environment variable so Supabase Auth (/auth/v1) and PostgREST (/rest/v1) resolve properly
export const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

export const supabaseAnonKey =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.REACT_APP_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' &&
    process.env &&
    (process.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY)) ||
  'sb_publishable_Br5TOaZXU2H5IvUPdI1qQQ_sivwPP47';

// Configure storage to use window.sessionStorage instead of localStorage so that
// session is destroyed when the browser or tab is closed, preventing auto-login.
const browserSessionStorage =
  typeof window !== 'undefined' && window.sessionStorage
    ? window.sessionStorage
    : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: browserSessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

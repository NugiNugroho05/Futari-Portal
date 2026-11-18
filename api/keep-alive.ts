import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL ||
  'https://jadxcsmbtpsfeztqpied.supabase.co';

// Strip trailing `/rest/v1` or slashes to prevent duplicate `/rest/v1/rest/v1` paths
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/i, '')
  .replace(/\/+$/, '');

const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  'sb_publishable_Br5TOaZXU2H5IvUPdI1qQQ_sivwPP47';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function runSupabaseKeepAlive() {
  // Query 1 row from `attendance` (with fallback to `personnel`) so PostgreSQL registers active database traffic
  const { error: attendanceError } = await supabase
    .from('attendance')
    .select('id')
    .limit(1);

  if (attendanceError) {
    const { error: personnelError } = await supabase
      .from('personnel')
      .select('id')
      .limit(1);

    if (personnelError) {
      throw new Error(personnelError.message || attendanceError.message);
    }
  }

  return {
    ok: true,
    message: 'Supabase keep-alive success',
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({
      ok: false,
      message: 'Method Not Allowed',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const payload = await runSupabaseKeepAlive();
    res.status(200).json(payload);
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message: error?.message || 'Supabase keep-alive failed',
      timestamp: new Date().toISOString(),
    });
  }
}

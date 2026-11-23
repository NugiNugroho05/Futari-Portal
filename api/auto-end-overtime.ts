import { createClient } from '@supabase/supabase-js';

export const AUTO_CHECKOUT_NO_OVERTIME_NOTE =
  'Auto Check-Out System (No Overtime Confirmation)';

function getSupabaseServerClient() {
  const rawSupabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.REACT_APP_SUPABASE_URL ||
    'https://jadxcsmbtpsfeztqpied.supabase.co';

  const supabaseUrl = rawSupabaseUrl
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');

  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.REACT_APP_SUPABASE_ANON_KEY ||
    'sb_publishable_Br5TOaZXU2H5IvUPdI1qQQ_sivwPP47';

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toJakartaDateKey(date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const yy = parts.find((p) => p.type === 'year')?.value;
    const mm = parts.find((p) => p.type === 'month')?.value;
    const dd = parts.find((p) => p.type === 'day')?.value;
    if (yy && mm && dd) return `${yy}-${mm}-${dd}`;
  } catch {
    // Fallback to UTC date string
  }
  return date.toISOString().slice(0, 10);
}

function isRowEligibleForAutoEndOvertime(
  row: any,
  now: Date = new Date()
): boolean {
  if (!row || !row.email || !row.check_in_time) return false;
  if (
    row.clock_out_time !== null &&
    row.clock_out_time !== undefined &&
    String(row.clock_out_time).trim() !== ''
  ) {
    return false;
  }
  // Only auto-end users whose `is_overtime` is still false / not true
  if (row.is_overtime === true) {
    return false;
  }
  const parsed = new Date(row.check_in_time);
  if (Number.isNaN(parsed.getTime())) return false;
  return toJakartaDateKey(parsed) === toJakartaDateKey(now);
}

/**
 * 20:20 WIB (`13:20 UTC`) Cron Handler:
 * Finds all users who are still "Checked-In" today AND have `is_overtime === false` (or null),
 * and automatically marks them Checked-Out in Supabase with:
 * `notes = "Auto Check-Out System (No Overtime Confirmation)"`.
 */
export async function runAutoEndOvertime() {
  const supabase = getSupabaseServerClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: activeRows, error } = await supabase
    .from('attendance')
    .select(
      'id, email, mode, check_in_time, clock_out_time, is_overtime, task_description, notes'
    )
    .is('clock_out_time', null);

  if (error) {
    throw new Error(`Failed to query active attendance: ${error.message}`);
  }

  const eligibleRows = (activeRows || []).filter((row) =>
    isRowEligibleForAutoEndOvertime(row, now)
  );

  const affectedEmails: string[] = [];

  for (const row of eligibleRows) {
    const existingTaskDesc = String(row.task_description || '').trim();
    const updatePayload = {
      clock_out_time: nowIso,
      is_overtime: false,
      notes: AUTO_CHECKOUT_NO_OVERTIME_NOTE,
      task_description: existingTaskDesc || AUTO_CHECKOUT_NO_OVERTIME_NOTE,
    };

    if (row.id !== undefined && row.id !== null) {
      const { error: updateErr } = await supabase
        .from('attendance')
        .update(updatePayload)
        .eq('id', row.id);
      if (!updateErr) {
        affectedEmails.push(String(row.email || '').trim().toLowerCase());
      }
    } else if (row.email) {
      const { error: updateErr } = await supabase
        .from('attendance')
        .update(updatePayload)
        .ilike('email', String(row.email).trim())
        .is('clock_out_time', null);
      if (!updateErr) {
        affectedEmails.push(String(row.email).trim().toLowerCase());
      }
    }
  }

  return {
    ok: true,
    action: 'auto-end-overtime',
    message: '20:20 WIB auto-end overtime check-out executed',
    autoCheckedOutCount: affectedEmails.length,
    affectedEmails,
    notesApplied: AUTO_CHECKOUT_NO_OVERTIME_NOTE,
    timestamp: nowIso,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({
      ok: false,
      message: 'Method Not Allowed',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const payload = await runAutoEndOvertime();
    res.status(200).json(payload);
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message:
        error?.message || 'Failed to execute 20:20 WIB auto-end overtime',
      timestamp: new Date().toISOString(),
    });
  }
}

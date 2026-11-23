import { createClient } from '@supabase/supabase-js';

const PORTAL_URL = 'https://pitifutari.vercel.app';
const RESEND_FROM = 'Futari Portal <onboarding@resend.dev>';

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

function isRowCheckedInUnconfirmedOvertimeTodayWib(
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
  // Only target records where `is_overtime` is still false / not true
  if (row.is_overtime === true) {
    return false;
  }
  const parsed = new Date(row.check_in_time);
  if (Number.isNaN(parsed.getTime())) return false;
  return toJakartaDateKey(parsed) === toJakartaDateKey(now);
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return {
      sent: false,
      reason: 'RESEND_API_KEY is not configured in environment variables',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  const result = await response.json().catch(() => ({}));
  return {
    sent: response.ok,
    status: response.status,
    result,
  };
}

/**
 * 20:00 WIB (`13:00 UTC`) Cron Handler:
 * Finds all users who are still "Checked-In" today AND have `is_overtime === false` (or null),
 * and sends an urgent Overtime Confirmation Warning email via Resend REST API.
 */
export async function runReminderOvertime() {
  const supabase = getSupabaseServerClient();
  const now = new Date();

  const { data: activeRows, error } = await supabase
    .from('attendance')
    .select('id, email, mode, check_in_time, clock_out_time, is_overtime')
    .is('clock_out_time', null);

  if (error) {
    throw new Error(`Failed to query active attendance: ${error.message}`);
  }

  const unconfirmedOvertimeRows = (activeRows || []).filter((row) =>
    isRowCheckedInUnconfirmedOvertimeTodayWib(row, now)
  );

  const uniqueEmails = Array.from(
    new Set(
      unconfirmedOvertimeRows
        .map((r) => String(r.email || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const { data: personnelRows } = await supabase
    .from('personnel')
    .select('name, email');
  const nameByEmail: Record<string, string> = {};
  for (const p of personnelRows || []) {
    if (p?.email) {
      nameByEmail[String(p.email).trim().toLowerCase()] =
        String(p.name || '').trim() || String(p.email).split('@')[0];
    }
  }

  const emailResults = [];
  for (const email of uniqueEmails) {
    const staffName = nameByEmail[email] || email.split('@')[0];
    const html = `
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #f59e0b;">
        <h2 style="margin: 0 0 12px; color: #fbbf24;">Peringatan Konfirmasi Lembur (20:00 WIB)</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0;">
          Halo <strong>${staffName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Waktu telah menunjukkan pukul <strong>20:00 WIB</strong>. Anda masih tercatat <strong>Checked-In</strong> dan belum melakukan konfirmasi lembur (<code>is_overtime = false</code>).
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #fde68a;">
          <strong>PENTING:</strong> Apabila Anda sedang lembur, segera buka Futari Portal dan klik tombol <strong>"Ya, Saya Lembur"</strong> sebelum pukul <strong>20:20 WIB</strong>. Jika tidak ada konfirmasi hingga pukul 20:20 WIB, sistem akan otomatis melakukan <em>Auto Check-Out</em> tanpa perhitungan lembur.
        </p>
        <div style="margin: 24px 0;">
          <a href="${PORTAL_URL}" style="display: inline-block; padding: 12px 22px; background: linear-gradient(90deg, #d97706, #f59e0b); color: #0f172a; text-decoration: none; font-weight: 800; font-size: 14px; border-radius: 10px;">
            Konfirmasi Lembur atau Check-Out di Futari Portal
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
          Tautan langsung: <a href="${PORTAL_URL}" style="color: #fbbf24;">${PORTAL_URL}</a>
        </p>
      </div>
    `;

    const delivery = await sendResendEmail({
      to: email,
      subject:
        '[Futari Portal] PENTING: Konfirmasi Lembur Pukul 20:00 WIB (Auto-End 20:20 WIB)',
      html,
    });

    emailResults.push({ email, ...delivery });
  }

  return {
    ok: true,
    action: 'reminder-overtime',
    message: '20:00 WIB overtime confirmation reminder executed',
    notifiedCount: uniqueEmails.length,
    recipients: emailResults,
    timestamp: now.toISOString(),
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
    const payload = await runReminderOvertime();
    res.status(200).json(payload);
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message:
        error?.message || 'Failed to execute 20:00 WIB overtime reminder',
      timestamp: new Date().toISOString(),
    });
  }
}

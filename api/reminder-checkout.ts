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

function isRowCheckedInTodayWib(row: any, now: Date = new Date()): boolean {
  if (!row || !row.email || !row.check_in_time) return false;
  if (
    row.clock_out_time !== null &&
    row.clock_out_time !== undefined &&
    String(row.clock_out_time).trim() !== ''
  ) {
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
 * 19:00 WIB (`12:00 UTC`) Cron Handler:
 * Finds all users who are still "Checked-In" today (haven't checked out yet)
 * and sends a Photo Check-Out reminder email via Resend REST API.
 */
export async function runReminderCheckout() {
  const supabase = getSupabaseServerClient();
  const now = new Date();

  const { data: activeRows, error } = await supabase
    .from('attendance')
    .select('id, email, mode, check_in_time, clock_out_time, is_overtime')
    .is('clock_out_time', null);

  if (error) {
    throw new Error(`Failed to query active attendance: ${error.message}`);
  }

  const todayCheckedInRows = (activeRows || []).filter((row) =>
    isRowCheckedInTodayWib(row, now)
  );

  // Deduplicate by email
  const uniqueEmails = Array.from(
    new Set(
      todayCheckedInRows
        .map((r) => String(r.email || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );

  // Fetch names from personnel directory for personalized email greeting
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
      <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
        <h2 style="margin: 0 0 12px; color: #00B4D8;">Pengingat Photo Check-Out (19:00 WIB)</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #e2e8f0;">
          Halo <strong>${staffName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Waktu operasional reguler telah menunjukkan pukul <strong>19:00 WIB</strong> dan status absensi Anda hari ini masih tercatat <strong>Checked-In</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Jika pekerjaan Anda hari ini sudah selesai, silakan segera lakukan <strong>Photo Check-Out / Clock-Out</strong> dan isi deskripsi pekerjaan harian Anda melalui tombol di bawah ini:
        </p>
        <div style="margin: 24px 0;">
          <a href="${PORTAL_URL}" style="display: inline-block; padding: 12px 22px; background: linear-gradient(90deg, #0277BD, #00B4D8); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 10px;">
            Buka Futari Portal &amp; Check-Out Sekarang
          </a>
        </div>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
          Tautan langsung: <a href="${PORTAL_URL}" style="color: #00B4D8;">${PORTAL_URL}</a>
        </p>
      </div>
    `;

    const delivery = await sendResendEmail({
      to: email,
      subject: '[Futari Portal] Pengingat Photo Check-Out Pukul 19:00 WIB',
      html,
    });

    emailResults.push({ email, ...delivery });
  }

  return {
    ok: true,
    action: 'reminder-checkout',
    message: '19:00 WIB checkout reminder executed',
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
    const payload = await runReminderCheckout();
    res.status(200).json(payload);
  } catch (error: any) {
    res.status(500).json({
      ok: false,
      message: error?.message || 'Failed to execute 19:00 WIB checkout reminder',
      timestamp: new Date().toISOString(),
    });
  }
}

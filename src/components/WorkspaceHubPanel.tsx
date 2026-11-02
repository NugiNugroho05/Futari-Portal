import React, { useState } from 'react';
import {
  Calendar,
  Mail,
  FileSpreadsheet,
  FileText,
  Presentation,
  CheckSquare,
  Video,
  MessageSquare,
  HardDrive,
  Users,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { executeWorkspaceAction } from '../services/workspaceApi';
import { StaffMemberRecord } from '../utils/futariLogic';

interface WorkspaceHubPanelProps {
  currentUser: StaffMemberRecord;
  isGoogleConnected: boolean;
  onConnectGoogle: () => void;
  isDark: boolean;
}

interface PendingWorkspaceMutation {
  service: 'calendar' | 'gmail' | 'tasks' | 'meet' | 'slides' | 'chat';
  label: string;
  description: string;
  payload: Record<string, string>;
}

export const WorkspaceHubPanel: React.FC<WorkspaceHubPanelProps> = ({
  currentUser,
  isGoogleConnected,
  onConnectGoogle,
  isDark,
}) => {
  const [pendingMutation, setPendingMutation] =
    useState<PendingWorkspaceMutation | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    externalUrl?: string;
  } | null>(null);

  const confirmAndExecute = async () => {
    if (!pendingMutation) return;
    setIsExecuting(true);
    try {
      const res = await executeWorkspaceAction(
        pendingMutation.service,
        pendingMutation.payload
      );
      setStatusMessage({ text: res.message, externalUrl: res.externalUrl });
    } finally {
      setIsExecuting(false);
      setPendingMutation(null);
    }
  };

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${cardClass}`}
      >
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Google Workspace Operations Suite
          </h2>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Integrasi langsung Google Drive, Docs, Sheets, Slides, Calendar, Gmail,
            Contacts, Tasks, Chat & Meet untuk {currentUser.name} ({currentUser.role}).
          </p>
        </div>

        <button
          type="button"
          onClick={onConnectGoogle}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 whitespace-nowrap shrink-0"
        >
          {isGoogleConnected
            ? 'Google Workspace Terhubung (Perbarui Token)'
            : 'Sign in with Google Workspace'}
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl border border-[#00B4D8]/40 bg-[#00B4D8]/10 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00B4D8] shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
          {statusMessage.externalUrl && (
            <a
              href={statusMessage.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-[#00B4D8] hover:underline whitespace-nowrap"
            >
              <span>Buka di Google</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Workspace Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Google Calendar */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${cardClass}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-sm font-semibold">Google Calendar</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Jadwalkan Technical Meeting & Briefing Operasional Event JKT–Bandung.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPendingMutation({
                service: 'calendar',
                label: 'Buat Event di Google Calendar?',
                description:
                  'Aksi ini akan menambahkan jadwal "Technical Briefing Event Futari (JKT & Bandung)" ke Google Calendar Anda.',
                payload: {
                  title: 'Technical Briefing Event Futari (JKT & Bandung)',
                  description: `PIC: ${currentUser.name} (${currentUser.role})`,
                },
              })
            }
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-[#0277BD] text-white hover:bg-[#00B4D8] transition-colors w-full"
          >
            Jadwalkan Briefing di Calendar
          </button>
        </div>

        {/* 2. Gmail */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${cardClass}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-sm font-semibold">Gmail Executive Dispatch</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Kirim ringkasan kehadiran WFO/WFE & realisasi Petty Cash ke manajemen.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPendingMutation({
                service: 'gmail',
                label: 'Kirim Email Laporan via Gmail?',
                description:
                  'Aksi ini akan mengirim email ringkasan harian absensi dan petty cash atas nama akun Google Anda.',
                payload: {
                  to: 'hildasari@futari.id',
                  subject: `Laporan Operasional Futari - ${currentUser.name}`,
                  body: `Halo CEO Hildasari Umami, berikut laporan harian dari ${currentUser.name} (${currentUser.role}).`,
                },
              })
            }
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-[#0277BD] text-white hover:bg-[#00B4D8] transition-colors w-full"
          >
            Kirim Ringkasan via Gmail
          </button>
        </div>

        {/* 3. Google Tasks */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${cardClass}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <CheckSquare className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-sm font-semibold">Google Tasks</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Sinkronkan daftar checklist produksi, audit struk Petty Cash, dan rekap lembur.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPendingMutation({
                service: 'tasks',
                label: 'Tambah Tugas Baru ke Google Tasks?',
                description:
                  'Aksi ini akan membuat item tugas "Verifikasi Catatan Lembur >= 20:00 & Audit Petty Cash" di Google Tasks Anda.',
                payload: {
                  title: 'Verifikasi Catatan Lembur >= 20:00 & Audit Petty Cash',
                  description: `Ditugaskan oleh ${currentUser.name}`,
                },
              })
            }
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-[#0277BD] text-white hover:bg-[#00B4D8] transition-colors w-full"
          >
            Buat Checklist di Google Tasks
          </button>
        </div>

        {/* 4. Google Slides */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${cardClass}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <Presentation className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-sm font-semibold">Google Slides</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Generate deck presentasi laporan event mingguan untuk klien & eksekutif.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPendingMutation({
                service: 'slides',
                label: 'Buat Deck Presentasi Baru di Google Slides?',
                description:
                  'Aksi ini akan membuat file presentasi baru "Futari Event Operations & Budget Deck" di Google Drive Anda.',
                payload: {
                  title: 'Futari Event Operations & Budget Deck',
                },
              })
            }
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-[#0277BD] text-white hover:bg-[#00B4D8] transition-colors w-full"
          >
            Generate Deck Google Slides
          </button>
        </div>

        {/* 5. Google Meet */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${cardClass}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <Video className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-sm font-semibold">Google Meet</h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Buat ruang koordinasi video instan antara kantor Jakarta & Bandung Hub.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPendingMutation({
                service: 'meet',
                label: 'Buat Ruang Rapat Google Meet Baru?',
                description:
                  'Aksi ini akan membuat ruang rapat Google Meet baru untuk koordinasi tim Jakarta & Bandung.',
                payload: {
                  title: 'Futari JKT-Bandung Sync',
                },
              })
            }
            className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-[#0277BD] text-white hover:bg-[#00B4D8] transition-colors w-full"
          >
            Buka Ruang Google Meet
          </button>
        </div>

        {/* 6. Google Drive, Docs, Sheets, Chat & Contacts Summary */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between ${cardClass}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-sm font-semibold">
                Drive, Docs, Sheets, Chat & Contacts
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Ekspor PDF Absensi terhubung ke Google Docs/Drive, dan ekspor Excel Petty Cash terhubung ke Google Sheets/Drive.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3 text-[11px] text-[#00B4D8] font-medium">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Docs
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Sheets
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> 22 Kontak
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Workspace Mutating Operations */}
      {pendingMutation && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 text-white p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#00B4D8]">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold">{pendingMutation.label}</h3>
            </div>
            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {pendingMutation.description}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingMutation(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecuting}
                onClick={confirmAndExecute}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0277BD] hover:bg-[#00B4D8] text-white"
              >
                {isExecuting ? 'Memproses...' : 'Confirm & Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

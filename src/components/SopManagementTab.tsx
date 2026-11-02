import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  PlusCircle,
  ShieldCheck,
  Lock,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  CompanySopItem,
  StaffMemberRecord,
  canManageCompanySops,
} from '../utils/futariLogic';

interface SopManagementTabProps {
  currentUser: StaffMemberRecord;
  sops: CompanySopItem[];
  onAddSop: (input: {
    title: string;
    content: string;
    date: string;
    category?: string;
  }) => void;
  onUpdateSop: (
    sopId: string,
    updates: {
      title: string;
      content: string;
      date: string;
      category?: string;
    }
  ) => void;
  onDeleteSop: (sopId: string) => void;
  isDark: boolean;
}

export const SopManagementTab: React.FC<SopManagementTabProps> = ({
  currentUser,
  sops,
  onAddSop,
  onUpdateSop,
  onDeleteSop,
  isDark,
}) => {
  const canManage = canManageCompanySops(currentUser);

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingSopId, setEditingSopId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState<string>('');
  const [contentInput, setContentInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('2026-10-20');
  const [categoryInput, setCategoryInput] = useState<string>(
    'Operational & Governance'
  );
  const [formError, setFormError] = useState<string>('');

  const surfaceCard = isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  const handleOpenAddForm = () => {
    if (!canManage) return;
    setEditingSopId(null);
    setTitleInput('');
    setContentInput('');
    setDateInput('2026-10-20');
    setCategoryInput('Operational & Governance');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleStartEditSop = (sop: CompanySopItem) => {
    if (!canManage) return;
    setEditingSopId(sop.id);
    setTitleInput(sop.title);
    setContentInput(sop.content);
    setDateInput(sop.date);
    setCategoryInput(sop.category || 'Operational & Governance');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setFormError('');

    const cleanTitle = titleInput.trim();
    const cleanContent = contentInput.trim();
    if (!cleanTitle) {
      setFormError('Judul SOP (Title) wajib diisi.');
      return;
    }
    if (!cleanContent) {
      setFormError('Isi Dokumen SOP (Content) wajib diisi.');
      return;
    }
    if (!dateInput) {
      setFormError('Tanggal Berlaku SOP (Date) wajib diisi.');
      return;
    }

    if (editingSopId) {
      onUpdateSop(editingSopId, {
        title: cleanTitle,
        content: cleanContent,
        date: dateInput,
        category: categoryInput,
      });
    } else {
      onAddSop({
        title: cleanTitle,
        content: cleanContent,
        date: dateInput,
        category: categoryInput,
      });
    }

    setTitleInput('');
    setContentInput('');
    setEditingSopId(null);
    setIsFormOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
      data-testid="sop-management-tab"
    >
      {/* Header & Strict RBAC Banner */}
      <div className={`p-4 md:p-6 rounded-2xl border min-w-0 ${surfaceCard}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#00B4D8]/15 text-[#00B4D8]">
                SOP PERUSAHAAN · COMPANY STANDARD OPERATING PROCEDURES
              </span>
              <span
                data-testid="sop-rbac-badge"
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 border break-words whitespace-normal ${
                  canManage
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {canManage ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Akses Editor Aktif ({currentUser.name} —{' '}
                      {currentUser.division === 'Executive'
                        ? 'Executive'
                        : currentUser.role}
                      )
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      Read-Only Mode ({currentUser.name} · {currentUser.role}) —
                      Hanya Executive &amp; Digital yang Dapat Menambah/Edit SOP
                    </span>
                  </>
                )}
              </span>
            </div>
            <h1 className="text-lg md:text-2xl font-bold font-display mt-1.5 break-words">
              SOP Perusahaan (Standard Operating Procedures Futari)
            </h1>
            <p className={`text-xs md:text-sm mt-1 break-words ${mutedText}`}>
              Pedoman resmi operasional Jakarta HQ &amp; Bandung Creative Hub.
              Seluruh personel wajib mematuhi SOP yang berlaku.
            </p>
          </div>

          {/* STRICT RBAC: ONLY Executive (Hildasari Umami, M Rio Antoni) or Digital (Nugi Nugroho) can see "Tambah SOP Baru" */}
          {canManage && (
            <div className="shrink-0">
              <button
                type="button"
                data-testid="add-sop-btn"
                onClick={handleOpenAddForm}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-2 shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah SOP Baru</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit SOP Form (Strictly rendered ONLY when canManage is true) */}
      {canManage && isFormOpen && (
        <form
          onSubmit={handleSubmitForm}
          data-testid="sop-editor-form"
          className={`p-5 sm:p-6 rounded-2xl border-2 border-[#00B4D8]/60 space-y-4 ${surfaceCard}`}
        >
          <div className="flex items-center justify-between border-b border-slate-700/40 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00B4D8]" />
              <h2 className="text-sm sm:text-base font-bold font-display">
                {editingSopId
                  ? 'Edit Dokumen SOP Perusahaan'
                  : 'Form Tambah SOP Baru (Executive & Digital Only)'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingSopId(null);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="sop-title-input"
                className="block text-xs font-semibold text-[#00B4D8] mb-1"
              >
                Judul SOP (Title)
              </label>
              <input
                id="sop-title-input"
                data-testid="sop-title-input"
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Contoh: SOP Keamanan & Loading Produksi Event Venue"
                className={`w-full px-3 py-2 rounded-lg text-xs border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="sop-date-input"
                className="block text-xs font-semibold text-[#00B4D8] mb-1"
              >
                Tanggal Berlaku (Date)
              </label>
              <input
                id="sop-date-input"
                data-testid="sop-date-input"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-mono border ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="sop-content-input"
              className="block text-xs font-semibold text-[#00B4D8] mb-1"
            >
              Isi / Detail Prosedur SOP (Content)
            </label>
            <textarea
              id="sop-content-input"
              data-testid="sop-content-input"
              rows={4}
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              placeholder="Tuliskan rincian aturan dan langkah operasional standar perusahaan..."
              className={`w-full px-3 py-2 rounded-lg text-xs border ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {formError && (
            <p className="text-xs text-rose-400 font-medium">{formError}</p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingSopId(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              data-testid="submit-sop-btn"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 shadow-md cursor-pointer"
            >
              {editingSopId ? 'Simpan Perubahan SOP' : 'Publikasikan SOP Baru'}
            </button>
          </div>
        </form>
      )}

      {/* SOP Cards Grid (Visible to all users; Edit/Delete only for Executive/Digital) */}
      {sops.length === 0 ? (
        <div
          data-testid="sop-empty-state"
          className={`p-8 rounded-2xl border border-dashed text-center text-xs ${surfaceCard}`}
        >
          Belum ada dokumen SOP Perusahaan yang ditambahkan (0 SOP).
          {canManage
            ? ' Klik tombol "Tambah SOP Baru" di atas untuk menerbitkan dokumen SOP resmi perusahaan.'
            : ' Menunggu Executive atau Digital menerbitkan dokumen SOP perusahaan.'}
        </div>
      ) : (
        <div
          data-testid="sop-cards-grid"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {sops.map((sop, idx) => (
            <div
              key={sop.id}
              data-testid={`sop-card-${sop.id}`}
              className={`p-4 md:p-6 rounded-2xl border flex flex-col justify-between gap-4 transition-colors min-w-0 ${surfaceCard}`}
            >
            <div className="space-y-2.5 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0277BD]/20 text-[#00B4D8] border border-[#00B4D8]/30">
                    SOP #{String(idx + 1).padStart(2, '0')}
                  </span>
                  {sop.category && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                      {sop.category}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#00B4D8] shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{sop.date}</span>
                </span>
              </div>

              <h3 className="text-sm md:text-base font-bold font-display leading-snug break-words">
                {sop.title}
              </h3>

              <p
                className={`text-xs md:text-sm leading-relaxed whitespace-pre-line break-words ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {sop.content}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-700/30 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Diterbitkan oleh:{' '}
                  <strong>{sop.authorName || 'Executive Management'}</strong>
                </span>
              </div>

              {canManage ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid={`edit-sop-btn-${sop.id}`}
                    onClick={() => handleStartEditSop(sop)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#00B4D8]/15 text-[#00B4D8] hover:bg-[#00B4D8]/25 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`delete-sop-btn-${sop.id}`}
                    onClick={() => onDeleteSop(sop.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                </div>
              ) : (
                <span className={`text-[10px] font-mono ${mutedText}`}>
                  Read-Only
                </span>
              )}
            </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

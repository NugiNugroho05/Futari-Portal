import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Terminal,
  UserPlus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Ban,
  KeyRound,
  Cpu,
  Database,
  X,
  RefreshCw,
  Trash2,
  UserCheck,
  Sparkles,
  Users,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  StaffMemberRecord,
  DivisionType,
  BranchType,
  WorkModeType,
  VirtualOfficeRoomName,
  VIRTUAL_OFFICE_ROOMS,
  COMPANY_ROLES,
  COMPANY_DIVISIONS,
  DEVELOPER_SUPERADMIN_EMAIL,
  NewWorkspaceAccountInput,
  SuperadminProfileUpdateInput,
  AvatarHairStyle,
  getStaffAvatar3DConfig,
  isDirectReportOf,
  isDeveloperSuperadmin,
  normalizeSupabaseDivision,
  getGlassSurfaceClasses,
} from '../utils/futariLogic';

interface UserManagementTabProps {
  currentUser: StaffMemberRecord;
  staffList: StaffMemberRecord[];
  onChangeUserRole: (staffId: string, newRole: string) => void;
  onChangeUserDivision: (staffId: string, newDivision: DivisionType) => void;
  onToggleSuspendUser: (staffId: string) => void;
  onDeleteUser: (staffId: string) => void;
  onRegisterNewAccount: (
    input: NewWorkspaceAccountInput & { rawDivision?: string }
  ) => Promise<void> | void;
  onSuperadminEditFullProfile?: (
    targetStaffId: string,
    updates: SuperadminProfileUpdateInput
  ) => Promise<boolean | void> | void;
  onShowToast?: (toast: {
    type?: 'success' | 'info' | 'error' | 'warning';
    title: string;
    message: string;
  }) => void;
  isDark: boolean;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  currentUser,
  staffList,
  onChangeUserRole,
  onChangeUserDivision,
  onToggleSuspendUser,
  onDeleteUser,
  onRegisterNewAccount,
  onSuperadminEditFullProfile,
  onShowToast,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<StaffMemberRecord | null>(
    null
  );

  // Detailed Edit Modal state (Role, Division, Supervisor, Team Members Assignment, Custom Attendance Viewers)
  const [editingStaff, setEditingStaff] = useState<StaffMemberRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDivision, setEditDivision] = useState<string>(COMPANY_DIVISIONS[0]);
  const [editBranch, setEditBranch] = useState<BranchType>('JKT');
  const [editSupervisor, setEditSupervisor] = useState('');
  const [editRoomName, setEditRoomName] = useState<VirtualOfficeRoomName>(
    'Ruangan Creative/Design'
  );
  const [editWorkMode, setEditWorkMode] = useState<WorkModeType>('WFO');
  const [editTeamMemberIds, setEditTeamMemberIds] = useState<string[]>([]);
  const [editAllowedViewerIds, setEditAllowedViewerIds] = useState<string[]>([]);
  const [editShirtColor, setEditShirtColor] = useState('#00B4D8');
  const [editHairStyle, setEditHairStyle] = useState<AvatarHairStyle>('short');
  const [editHairColor, setEditHairColor] = useState('#0f172a');
  const [editUseHijab, setEditUseHijab] = useState(false);
  const [editHijabColor, setEditHijabColor] = useState('#0277BD');

  const [isSavingDetailedEdit, setIsSavingDetailedEdit] = useState(false);
  const [saveDetailedEditError, setSaveDetailedEditError] = useState('');

  const activePersonnelList = useMemo(
    () => staffList.filter((s) => !s.isSuspended),
    [staffList]
  );

  // Registration / Add Personnel (`personnel` table insert ONLY — Dev Only) form states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSupervisor, setNewSupervisor] = useState<string>(
    activePersonnelList[0]?.name || 'Hildasari Umami'
  );
  const [newRole, setNewRole] = useState<string>(COMPANY_ROLES[0]);
  const [newDivisionText, setNewDivisionText] = useState<string>(COMPANY_DIVISIONS[0]);
  const [newDivision, setNewDivision] = useState<DivisionType>(
    normalizeSupabaseDivision(COMPANY_DIVISIONS[0], COMPANY_ROLES[0])
  );
  const [newBranch, setNewBranch] = useState<BranchType>('JKT');
  const [newRoom, setNewRoom] = useState<VirtualOfficeRoomName>('Ruangan Creative/Design');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmittingPersonnel, setIsSubmittingPersonnel] = useState(false);
  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
    if (onShowToast) {
      onShowToast({
        type,
        title: 'User Management',
        message: msg,
      });
    }
  };

  const activeCount = useMemo(
    () => staffList.filter((s) => !s.isSuspended).length,
    [staffList]
  );
  const suspendedCount = useMemo(
    () => staffList.filter((s) => Boolean(s.isSuspended)).length,
    [staffList]
  );

  const filteredPersonnel = useMemo(() => {
    return staffList.filter((person) => {
      if (statusFilter === 'ACTIVE' && person.isSuspended) return false;
      if (statusFilter === 'SUSPENDED' && !person.isSuspended) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        person.name.toLowerCase().includes(q) ||
        person.email.toLowerCase().includes(q) ||
        person.role.toLowerCase().includes(q) ||
        person.divisionLabel.toLowerCase().includes(q) ||
        person.roomName.toLowerCase().includes(q) ||
        (person.supervisor || '').toLowerCase().includes(q)
      );
    });
  }, [staffList, searchQuery, statusFilter]);

  const handleOpenModal = () => {
    setFormError('');
    setFormSuccess('');
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    const defaultSup =
      activePersonnelList.find((p) => p.name === 'Ade Yenny')?.name ||
      activePersonnelList[0]?.name ||
      'Hildasari Umami';
    setNewSupervisor(defaultSup);
    setNewRole('employee');
    setNewDivision('Design_Talent_Production');
    setNewDivisionText('Design_Talent_Production');
    setNewBranch('JKT');
    setNewRoom('Ruangan Creative/Design');
    setIsRegisterModalOpen(true);
  };

  const handleOpenDetailedEditModal = (person: StaffMemberRecord) => {
    const cfg = getStaffAvatar3DConfig(person);
    const personEmail = (person.email || '').trim().toLowerCase();
    const currentDirectReports = staffList
      .filter((candidate) => {
        if (candidate.staffId === person.staffId) return false;
        const candSupEmail = (candidate.supervisor_email || '').trim().toLowerCase();
        if (personEmail && candSupEmail) {
          return candSupEmail === personEmail;
        }
        return isDirectReportOf(candidate, person);
      })
      .map((s) => s.staffId);

    setEditingStaff(person);
    setSaveDetailedEditError('');
    setIsSavingDetailedEdit(false);
    setEditName(person.name);
    setEditEmail(person.email);
    setEditPassword(person.password || 'futari2026');
    setEditRole(person.role);
    setEditDivision(person.division);
    setEditBranch(person.branch);
    setEditSupervisor(person.supervisor || 'Board of Founders Futari');
    setEditRoomName(person.roomName);
    setEditWorkMode(person.workMode);
    setEditTeamMemberIds(currentDirectReports);
    setEditAllowedViewerIds(person.allowedAttendanceViewerIds || []);
    setEditShirtColor(cfg.shirtColor);
    setEditHairStyle(cfg.hairStyle);
    setEditHairColor(cfg.hairColor);
    setEditUseHijab(cfg.useHijab);
    setEditHijabColor(cfg.hijabColor || person.avatarColor);
  };

  const toggleMultiSelectId = (
    staffId: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(staffId)) {
      setter(list.filter((id) => id !== staffId));
    } else {
      setter([...list, staffId]);
    }
  };

  const handleSaveDetailedEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || isSavingDetailedEdit) return;

    setSaveDetailedEditError('');
    setIsSavingDetailedEdit(true);

    try {
      if (onSuperadminEditFullProfile) {
        await onSuperadminEditFullProfile(editingStaff.staffId, {
          name: editName.trim() || editingStaff.name,
          email: editEmail.trim() || editingStaff.email,
          password: editPassword.trim() || editingStaff.password,
          role: editRole,
          division: editDivision,
          branch: editBranch,
          supervisor: editSupervisor,
          roomName: editRoomName,
          workMode: editWorkMode,
          teamMemberIds: editTeamMemberIds,
          allowedAttendanceViewerIds: editAllowedViewerIds,
          avatarColor: editShirtColor,
          avatar3DConfig: {
            shirtColor: editShirtColor,
            hairStyle: editHairStyle,
            hairColor: editHairColor,
            useHijab: editUseHijab,
            hijabColor: editHijabColor,
          },
        });
      } else {
        onChangeUserRole(editingStaff.staffId, editRole);
        onChangeUserDivision(editingStaff.staffId, editDivision);
      }

      triggerToast(
        `Pengaturan "${
          editName.trim() || editingStaff.name
        }" (Role: ${editRole}, Divisi: ${editDivision}) berhasil disimpan ke Supabase.`,
        'success'
      );
      // Close modal ONLY after successful save
      setEditingStaff(null);
    } catch (err: any) {
      console.error('Save changes failed:', err);
      setSaveDetailedEditError(
        err?.message || 'Gagal menyimpan perubahan ke database Supabase. Silakan coba lagi.'
      );
    } finally {
      setIsSavingDetailedEdit(false);
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanDivision = (newDivisionText || newDivision || '').trim();
    const cleanSupervisor = (newSupervisor || 'Unassigned').trim();

    if (!cleanName) {
      setFormError('Nama lengkap personel (Name) wajib diisi.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Alamat email personel (Email) yang valid wajib diisi.');
      return;
    }
    if (!newRole) {
      setFormError('Role personel wajib dipilih.');
      return;
    }
    if (!cleanDivision) {
      setFormError('Divisi personel (Division) wajib diisi.');
      return;
    }
    if (staffList.some((s) => s.email.toLowerCase() === cleanEmail)) {
      setFormError('Email ini sudah terdaftar di dalam tabel personnel.');
      return;
    }

    setIsSubmittingPersonnel(true);
    try {
      await onRegisterNewAccount({
        name: cleanName,
        email: cleanEmail,
        password: newPassword.trim() || undefined,
        supervisor: cleanSupervisor,
        role: newRole,
        division: newDivision,
        rawDivision: cleanDivision,
        branch: newBranch,
        roomName: newRoom,
        workMode: 'WFO',
      });

      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole(COMPANY_ROLES[0]);
      setNewDivisionText(COMPANY_DIVISIONS[0]);
      setNewDivision(normalizeSupabaseDivision(COMPANY_DIVISIONS[0], COMPANY_ROLES[0]));
      setFormSuccess(
        `Data personel "${cleanName}" (${cleanEmail}) dengan role "${newRole}" dan divisi "${cleanDivision}" berhasil disimpan ke tabel personnel.`
      );
      triggerToast(
        `Data "${cleanName} <${cleanEmail}>" (Role: ${newRole}, Division: ${cleanDivision}) berhasil ditambahkan ke tabel personnel.`,
        'success'
      );
      setIsRegisterModalOpen(false);
    } catch (err: any) {
      setFormError(
        err?.message || 'Gagal menyimpan data personel baru ke tabel personnel.'
      );
    } finally {
      setIsSubmittingPersonnel(false);
    }
  };

  const handleConfirmDeleteUser = () => {
    if (!pendingDeleteUser) return;
    const deletedName = pendingDeleteUser.name;
    const deletedEmail = pendingDeleteUser.email;
    onDeleteUser(pendingDeleteUser.staffId);
    triggerToast(
      `Akun "${deletedName} <${deletedEmail}>" telah dihapus permanen dari database personel Futari.`,
      'info'
    );
    if (editingStaff?.staffId === pendingDeleteUser.staffId) {
      setEditingStaff(null);
    }
    setPendingDeleteUser(null);
  };

  const surfacePanel = getGlassSurfaceClasses(isDark);

  if (!isDeveloperSuperadmin(currentUser)) {
    return (
      <div
        data-testid="user-management-access-denied"
        className={`rounded-2xl p-6 ${surfacePanel} border border-rose-500/40 text-center space-y-2`}
      >
        <Shield className="w-8 h-8 text-rose-400 mx-auto" />
        <h2 className="text-base font-bold text-rose-400">
          Akses Terkunci — Hanya Role Dev
        </h2>
        <p className="text-xs text-slate-400">
          Halaman User Management hanya dapat diakses oleh akun dengan role{' '}
          <code className="font-mono text-amber-400">dev</code>.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      data-testid="developer-user-management-tab"
      className="space-y-6"
    >
      {/* Developer / Superadmin Technical Header */}
      <div className={`rounded-2xl p-5 sm:p-6 relative overflow-hidden ${surfacePanel}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/50">
                <Shield className="w-3.5 h-3.5" />
                <span>DEVELOPER USER MANAGEMENT CONSOLE</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-cyan-500/15 text-[#00B4D8] border border-cyan-500/40">
                <Terminal className="w-3.5 h-3.5" />
                <span>ACCESS_LEVEL: {currentUser.accessLevel?.toUpperCase() || 'DEVELOPER'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                <KeyRound className="w-3.5 h-3.5" />
                <span>AUTH: {currentUser.email}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight flex items-center gap-2.5">
              <span>User Management &amp; Access Control Matrix</span>
            </h1>

            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Klik baris personel mana pun atau tombol{' '}
              <strong className="text-[#00B4D8]">&ldquo;Manage User&rdquo;</strong> untuk
              membuka <strong>Detailed Edit Modal</strong> (Role &amp; Division, Supervisor,
              Team Members Assignment, dan Custom Attendance Viewers).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenModal}
              data-testid="add-google-workspace-account-btn"
              className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Add/Register New Google Workspace Account</span>
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/40 font-mono">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Total Personnel DB
              </p>
              <p
                data-testid="dev-total-accounts-count"
                className="text-xl font-bold text-white mt-0.5 tabular-nums"
              >
                {staffList.length} Accounts
              </p>
            </div>
            <Database className="w-5 h-5 text-[#00B4D8]" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Active Accounts
              </p>
              <p
                data-testid="dev-active-accounts-count"
                className="text-xl font-bold text-emerald-400 mt-0.5 tabular-nums"
              >
                {activeCount} Active
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Suspended / Deactivated
              </p>
              <p
                data-testid="dev-suspended-accounts-count"
                className="text-xl font-bold text-rose-400 mt-0.5 tabular-nums"
              >
                {suspendedCount} Suspended
              </p>
            </div>
            <Ban className="w-5 h-5 text-rose-400" />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Root Session Owner
              </p>
              <p className="text-xs font-bold text-amber-400 mt-1 truncate">
                {currentUser.name} ({currentUser.role})
              </p>
            </div>
            <Cpu className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Add Account / Register Personnel Form (Supabase `personnel` Table Insert Only — Dev Only) */}
      <form
        onSubmit={handleCreateAccountSubmit}
        data-testid="add-personnel-form"
        className={`p-4 sm:p-6 rounded-2xl ${surfacePanel} border border-amber-500/40 space-y-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-700/40">
          <div>
            <h2 className="text-base font-bold font-display flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Add Account — Register Personnel (Supabase `personnel` Table)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftarkan data karyawan baru ke tabel <code className="font-mono text-amber-400">personnel</code>. Pembuatan akun autentikasi dilakukan terpisah melalui Supabase Admin Dashboard untuk mencegah auto-login client-side.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/40 shrink-0">
            <Database className="w-3.5 h-3.5" />
            <span>INSERT ONLY (No Auth SignUp)</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label
              htmlFor="add-personnel-name-input"
              className="block text-xs font-semibold text-amber-400 mb-1"
            >
              Name (Nama Lengkap)
            </label>
            <input
              id="add-personnel-name-input"
              data-testid="add-personnel-name-input"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (formError) setFormError('');
                if (formSuccess) setFormSuccess('');
              }}
              placeholder="Contoh: Dimas Prakoso"
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={isSubmittingPersonnel}
              required
            />
          </div>

          <div>
            <label
              htmlFor="add-personnel-email-input"
              className="block text-xs font-semibold text-amber-400 mb-1"
            >
              Email
            </label>
            <input
              id="add-personnel-email-input"
              data-testid="add-personnel-email-input"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (formError) setFormError('');
                if (formSuccess) setFormSuccess('');
              }}
              placeholder="Contoh: dimas.prakoso@futari.id"
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={isSubmittingPersonnel}
              required
            />
          </div>

          <div>
            <label
              htmlFor="add-personnel-role-select"
              className="block text-xs font-semibold text-amber-400 mb-1"
            >
              Role
            </label>
            <select
              id="add-personnel-role-select"
              data-testid="add-personnel-role-select"
              value={newRole}
              onChange={(e) => {
                setNewRole(e.target.value);
                if (formError) setFormError('');
                if (formSuccess) setFormSuccess('');
              }}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={isSubmittingPersonnel}
              required
            >
              {COMPANY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="add-personnel-division-select"
              className="block text-xs font-semibold text-amber-400 mb-1"
            >
              Division
            </label>
            <select
              id="add-personnel-division-select"
              data-testid="add-personnel-division-input"
              value={newDivisionText}
              onChange={(e) => {
                const val = e.target.value;
                setNewDivisionText(val);
                setNewDivision(normalizeSupabaseDivision(val, newRole));
                if (formError) setFormError('');
                if (formSuccess) setFormSuccess('');
              }}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={isSubmittingPersonnel}
              required
            >
              {COMPANY_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formError && (
          <div
            data-testid="add-personnel-error"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-400 text-xs flex items-center gap-2 font-medium"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div
            data-testid="add-personnel-success"
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2 font-medium"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmittingPersonnel}
            data-testid="add-personnel-submit-btn"
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {isSubmittingPersonnel
                ? 'Menyimpan ke Tabel personnel...'
                : 'Simpan ke Tabel personnel'}
            </span>
          </button>
        </div>
      </form>

      {/* Simplified User Management Table (No Inline Dropdowns — Clickable Rows + "Manage User" Button) */}
      <div className={`p-4 sm:p-6 rounded-2xl ${surfacePanel} space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold font-display flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#00B4D8]" />
              <span>Simplified Personnel Directory &amp; Access Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tabel bebas clutter tanpa dropdown inline. Klik baris atau tombol{' '}
              <strong className="text-[#00B4D8]">Manage User</strong> untuk mengatur Role,
              Divisi, Supervisor, Anggota Tim, dan Custom Attendance Viewers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                aria-label="Cari Personel di User Management"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, email, supervisor..."
                className={`pl-8 pr-3 py-1.5 rounded-lg text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-[#00B4D8] ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-950 text-xs font-mono">
              {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    statusFilter === status
                      ? 'bg-[#00B4D8] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clean Clutter-Free Data Table */}
        <div className="overflow-x-auto w-full rounded-xl border border-slate-800/80">
          <table
            data-testid="user-management-table"
            className="w-full text-left border-collapse text-xs min-w-[780px]"
          >
            <thead>
              <tr className="bg-slate-950/90 text-slate-300 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 font-semibold">Personnel &amp; Email</th>
                <th className="py-3 px-3 font-semibold">Role &amp; Division</th>
                <th className="py-3 px-3 font-semibold">Supervisor &amp; Team</th>
                <th className="py-3 px-3 font-semibold">Attendance Viewers</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPersonnel.map((person) => {
                const isDevAccount =
                  person.email.toLowerCase() === DEVELOPER_SUPERADMIN_EMAIL;
                const isSuspended = Boolean(person.isSuspended);
                const pEmail = (person.email || '').trim().toLowerCase();
                const directReportCount = staffList.filter((s) => {
                  if (s.staffId === person.staffId) return false;
                  const sSupEmail = (s.supervisor_email || '').trim().toLowerCase();
                  if (pEmail && sSupEmail) {
                    return sSupEmail === pEmail;
                  }
                  return isDirectReportOf(s, person);
                }).length;
                const customViewerCount =
                  person.allowedAttendanceViewerIds?.length || 0;

                return (
                  <tr
                    key={person.staffId}
                    data-testid={`user-row-${person.staffId}`}
                    onClick={() => handleOpenDetailedEditModal(person)}
                    className={`transition-colors cursor-pointer ${
                      isSuspended
                        ? 'bg-rose-950/20 opacity-75 hover:bg-rose-950/30'
                        : isDevAccount
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : isDark
                        ? 'hover:bg-slate-800/50'
                        : 'hover:bg-sky-50/80'
                    }`}
                  >
                    {/* Column 1: Name, Avatar, Email & Branch */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 font-mono"
                          style={{
                            backgroundColor: isSuspended
                              ? '#64748b'
                              : person.avatarColor,
                          }}
                        >
                          {person.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold truncate">{person.name}</p>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-[#00B4D8]">
                              {person.branch}
                            </span>
                            {isDevAccount && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                DEV ROOT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            {person.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Clean Read-Only Role & Division Badges (No Inline Dropdowns) */}
                    <td className="py-3 px-3">
                      <p
                        data-testid={`row-role-label-${person.staffId}`}
                        className="font-semibold text-[#00B4D8] break-words"
                      >
                        {person.role}
                      </p>
                      <span
                        data-testid={`row-division-label-${person.staffId}`}
                        className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700"
                      >
                        {person.division}
                      </span>
                    </td>

                    {/* Column 3: Supervisor & Assigned Team Members Count */}
                    <td className="py-3 px-3">
                      <p
                        data-testid={`row-supervisor-label-${person.staffId}`}
                        className="text-xs font-medium break-words"
                      >
                        {person.supervisor}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {directReportCount > 0 ? (
                          <span className="text-emerald-400 font-semibold">
                            {directReportCount} Team Member{directReportCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span>0 Direct Reports</span>
                        )}
                      </p>
                    </td>

                    {/* Column 4: Custom Attendance Viewers */}
                    <td className="py-3 px-3 font-mono">
                      {customViewerCount > 0 ? (
                        <span
                          data-testid={`row-custom-viewers-${person.staffId}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/15 text-[#00B4D8] border border-cyan-500/30"
                        >
                          <Eye className="w-3 h-3" />
                          <span>+{customViewerCount} Custom Viewer{customViewerCount > 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Default RBAC
                        </span>
                      )}
                    </td>

                    {/* Column 5: Status Badge */}
                    <td className="py-3 px-3 font-mono">
                      {isSuspended ? (
                        <span
                          data-testid={`status-badge-${person.staffId}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        >
                          <Ban className="w-3 h-3" />
                          <span>SUSPENDED</span>
                        </span>
                      ) : (
                        <span
                          data-testid={`status-badge-${person.staffId}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ACTIVE ({person.workMode})</span>
                        </span>
                      )}
                    </td>

                    {/* Column 6: Prominent "Manage User" Button */}
                    <td
                      className="py-3 px-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-label={`Manage User ${person.name}`}
                        data-testid={`manage-user-btn-${person.staffId}`}
                        onClick={() => handleOpenDetailedEditModal(person)}
                        className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-[#0277BD] to-[#00B4D8] text-white hover:opacity-95 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                        <span>Manage User</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Glassmorphism Detailed Edit Modal (Role & Division, Supervisor, Team Members Assignment, Custom Attendance Viewers) */}
      <AnimatePresence>
        {editingStaff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="superadmin-edit-modal-title"
            data-testid="user-management-edit-modal"
            className="no-print fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingStaff(null)}
          >
            <motion.form
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveDetailedEditSubmit}
              data-testid="superadmin-edit-profile-modal"
              className={`w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl p-5 sm:p-6 space-y-5 relative z-10 ${
                isDark
                  ? 'bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-2xl text-slate-100'
                  : 'bg-white/90 backdrop-blur-md border border-white/60 shadow-2xl text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-700/40 pb-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm font-mono shrink-0"
                    style={{ backgroundColor: editingStaff.avatarColor }}
                  >
                    {editingStaff.initials}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#00B4D8]/20 text-[#00B4D8]">
                      Detailed User Settings · Developer RBAC Override
                    </span>
                    <h3
                      id="superadmin-edit-modal-title"
                      className="text-base sm:text-lg font-bold font-display mt-0.5"
                    >
                      Manage User — {editingStaff.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="close-manage-user-modal-btn"
                  onClick={() => setEditingStaff(null)}
                  aria-label="Tutup Detailed Edit Modal"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {saveDetailedEditError && (
                <div
                  data-testid="manage-user-error-banner"
                  className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{saveDetailedEditError}</span>
                </div>
              )}

              {/* Section 1: Role, Division & Supervisor (Dropdown) */}
              <div className="p-4 rounded-xl border border-slate-700/50 bg-slate-950/40 space-y-3.5">
                <p className="text-xs font-bold font-mono uppercase tracking-wider text-[#00B4D8] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>1. Role, Division &amp; Direct Supervisor</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="modal-role-select"
                      className="block text-xs font-semibold mb-1"
                    >
                      Role Jabatan
                    </label>
                    <select
                      id="modal-role-select"
                      data-testid="modal-role-select"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                    >
                      {Array.from(
                        new Set([...COMPANY_ROLES, editRole].filter(Boolean))
                      ).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="modal-division-select"
                      className="block text-xs font-semibold mb-1"
                    >
                      Division (Divisi RBAC)
                    </label>
                    <select
                      id="modal-division-select"
                      data-testid="modal-division-select"
                      value={editDivision}
                      onChange={(e) =>
                        setEditDivision(e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                    >
                      {Array.from(
                        new Set([...COMPANY_DIVISIONS, editDivision].filter(Boolean))
                      ).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="superadmin-edit-supervisor"
                      className="block text-xs font-semibold mb-1"
                    >
                      Supervisor (Report To)
                    </label>
                    <select
                      id="superadmin-edit-supervisor"
                      data-testid="superadmin-edit-supervisor"
                      value={editSupervisor}
                      onChange={(e) => setEditSupervisor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-[#00B4D8]"
                    >
                      <option value="Board of Founders Futari">
                        Board of Founders Futari (Top Executive)
                      </option>
                      {activePersonnelList
                        .filter((p) => p.staffId !== editingStaff.staffId)
                        .map((p) => {
                          const formatted = `${p.name} (${p.role})`;
                          return (
                            <option key={p.staffId} value={formatted}>
                              {formatted}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                {/* Identity & Room Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label
                      htmlFor="superadmin-edit-name"
                      className="block text-xs font-semibold mb-1"
                    >
                      Nama Lengkap
                    </label>
                    <input
                      id="superadmin-edit-name"
                      data-testid="superadmin-edit-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="superadmin-edit-password"
                      className="block text-xs font-semibold mb-1"
                    >
                      Password Akun
                    </label>
                    <input
                      id="superadmin-edit-password"
                      data-testid="superadmin-edit-password"
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs font-mono bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Ruangan Virtual Office
                    </label>
                    <select
                      value={editRoomName}
                      onChange={(e) =>
                        setEditRoomName(e.target.value as VirtualOfficeRoomName)
                      }
                      className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white"
                    >
                      {VIRTUAL_OFFICE_ROOMS.map((rm) => (
                        <option key={rm.roomName} value={rm.roomName}>
                          {rm.roomName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Team Members Assignment (Multi-Select) */}
              <div
                data-testid="modal-team-members-section"
                className="p-4 rounded-xl border border-slate-700/50 bg-slate-950/40 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>2. Team Members Assignment (Bawahan Langsung)</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pilih personel yang melapor langsung ke{' '}
                      <strong>{editName || editingStaff.name}</strong> sebagai Supervisor
                      mereka (otomatis tampil di tab <strong>Tim &amp; Absensi</strong>).
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    {editTeamMemberIds.length} Anggota Tim
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  {staffList
                    .filter((candidate) => candidate.staffId !== editingStaff.staffId)
                    .map((candidate) => {
                      const isChecked = editTeamMemberIds.includes(candidate.staffId);
                      return (
                        <label
                          key={candidate.staffId}
                          data-testid={`team-member-checkbox-${candidate.staffId}`}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 font-semibold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              toggleMultiSelectId(
                                candidate.staffId,
                                editTeamMemberIds,
                                setEditTeamMemberIds
                              )
                            }
                            className="rounded accent-emerald-500"
                          />
                          <div className="min-w-0">
                            <p className="truncate">{candidate.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {candidate.role}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Section 3: Custom Attendance Viewers (Multi-Select) */}
              <div
                data-testid="modal-custom-viewers-section"
                className="p-4 rounded-xl border border-slate-700/50 bg-slate-950/40 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold font-mono uppercase tracking-wider text-[#00B4D8] flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        3. Custom Attendance Viewers (Hak Akses Lihat Absensi Khusus)
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tentukan secara eksplisit pengguna spesifik mana saja yang diizinkan
                      melihat &amp; mengekspor data absensi milik{' '}
                      <strong>{editName || editingStaff.name}</strong>.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]/40 shrink-0">
                    {editAllowedViewerIds.length} Custom Viewer
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  {staffList
                    .filter((viewer) => viewer.staffId !== editingStaff.staffId)
                    .map((viewer) => {
                      const isAllowed = editAllowedViewerIds.includes(viewer.staffId);
                      return (
                        <label
                          key={viewer.staffId}
                          data-testid={`custom-viewer-checkbox-${viewer.staffId}`}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isAllowed
                              ? 'border-[#00B4D8]/60 bg-[#00B4D8]/15 text-cyan-200 font-semibold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() =>
                              toggleMultiSelectId(
                                viewer.staffId,
                                editAllowedViewerIds,
                                setEditAllowedViewerIds
                              )
                            }
                            className="rounded accent-[#00B4D8]"
                          />
                          <div className="min-w-0">
                            <p className="truncate">{viewer.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {viewer.role} ({viewer.divisionLabel})
                            </p>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Section 4: 3D Avatar & Account Status Controls */}
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-700/50 space-y-3">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>4. 3D Avatar Customization &amp; Account Security</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Shirt Color
                    </label>
                    <input
                      type="color"
                      value={editShirtColor}
                      onChange={(e) => setEditShirtColor(e.target.value)}
                      className="w-full h-8 rounded cursor-pointer bg-transparent border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Hair Style
                    </label>
                    <select
                      value={editHairStyle}
                      onChange={(e) =>
                        setEditHairStyle(e.target.value as AvatarHairStyle)
                      }
                      className="w-full px-2 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-white"
                    >
                      <option value="short">Short</option>
                      <option value="parted">Parted</option>
                      <option value="long">Long</option>
                      <option value="bun">Bun</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Status Kehadiran
                    </label>
                    <select
                      value={editWorkMode}
                      onChange={(e) =>
                        setEditWorkMode(e.target.value as WorkModeType)
                      }
                      className="w-full px-2 py-1.5 rounded text-xs bg-slate-900 border border-slate-700 text-white"
                    >
                      <option value="WFO">WFO</option>
                      <option value="WFE">WFE</option>
                      <option value="OFFLINE">OFFLINE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Hijab 3D
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditUseHijab((p) => !p)}
                      className={`w-full py-1.5 rounded text-xs font-bold ${
                        editUseHijab
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {editUseHijab ? 'HIJAB: ON' : 'HIJAB: OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Account Suspend/Delete & Save */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-2">
                  {editingStaff.email.toLowerCase() !== DEVELOPER_SUPERADMIN_EMAIL && (
                    <>
                      <button
                        type="button"
                        data-testid={`suspend-toggle-${editingStaff.staffId}`}
                        onClick={() => {
                          onToggleSuspendUser(editingStaff.staffId);
                          setEditingStaff((prev) =>
                            prev ? { ...prev, isSuspended: !prev.isSuspended } : null
                          );
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-mono font-bold border border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          {editingStaff.isSuspended
                            ? 'Reactivate Account'
                            : 'Suspend Account'}
                        </span>
                      </button>
                      <button
                        type="button"
                        data-testid={`delete-user-btn-${editingStaff.staffId}`}
                        onClick={() => setPendingDeleteUser(editingStaff)}
                        className="px-3 py-2 rounded-lg text-xs font-mono font-bold border border-red-500/60 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete User</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    disabled={isSavingDetailedEdit}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    data-testid="submit-superadmin-edit-btn"
                    disabled={isSavingDetailedEdit}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingDetailedEdit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Add/Register New Google Workspace Account */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-workspace-modal-title"
            data-testid="register-workspace-account-modal"
            className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85"
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              onSubmit={handleCreateAccountSubmit}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-2 border-amber-500/60 bg-slate-900 text-white p-5 sm:p-6 shadow-2xl space-y-4 font-mono"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <UserPlus className="w-5 h-5 shrink-0" />
                  <h3
                    id="register-workspace-modal-title"
                    className="text-sm sm:text-base font-bold font-display text-white"
                  >
                    Add New Google Workspace Account
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  aria-label="Tutup Modal Register Account"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Tambahkan personel baru ke dalam struktur organisasi Futari lengkap dengan
                kredensial password awal dan Supervisor langsung (Report To) untuk hierarki
                tim di tab Profile serta meja baru di 3D Virtual Office.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-ws-name-input"
                    className="block text-xs font-semibold text-amber-400 mb-1"
                  >
                    Nama Lengkap Personel
                  </label>
                  <input
                    id="new-ws-name-input"
                    data-testid="new-ws-name-input"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Dimas Prakoso"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-ws-email-input"
                    className="block text-xs font-semibold text-amber-400 mb-1"
                  >
                    Google Workspace Email
                  </label>
                  <input
                    id="new-ws-email-input"
                    data-testid="new-ws-email-input"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Contoh: dimas.prakoso@futari.id"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-ws-role-select"
                    className="block text-xs font-semibold text-amber-400 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="new-ws-role-select"
                    data-testid="new-ws-role-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {COMPANY_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-ws-division-select"
                    className="block text-xs font-semibold text-amber-400 mb-1"
                  >
                    Division
                  </label>
                  <select
                    id="new-ws-division-select"
                    data-testid="new-ws-division-select"
                    value={newDivisionText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewDivisionText(val);
                      setNewDivision(normalizeSupabaseDivision(val, newRole));
                    }}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {COMPANY_DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="new-ws-supervisor-select"
                    className="block text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Supervisor (Report To)</span>
                  </label>
                  <select
                    id="new-ws-supervisor-select"
                    data-testid="new-ws-supervisor-select"
                    value={newSupervisor}
                    onChange={(e) => setNewSupervisor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {activePersonnelList.map((person) => (
                      <option key={person.staffId} value={person.name}>
                        {person.name} ({person.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-ws-branch-select"
                    className="block text-xs font-semibold text-amber-400 mb-1"
                  >
                    Lokasi Cabang
                  </label>
                  <select
                    id="new-ws-branch-select"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value as BranchType)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="JKT">JKT (Jakarta HQ Cipete)</option>
                    <option value="Bandung">Bandung (Creative Hub Braga)</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-400 font-semibold">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="submit-new-workspace-account-btn"
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300"
                >
                  Register Account &amp; Provision Access
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Prompt Modal: Permanent User Deletion */}
      <AnimatePresence>
        {pendingDeleteUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-modal-title"
            data-testid="delete-user-confirm-modal"
            className="no-print fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/85"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              className="w-full max-w-md rounded-2xl border-2 border-red-500/70 bg-slate-900 text-white p-6 shadow-2xl space-y-4 font-mono"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5 text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3
                    id="delete-user-modal-title"
                    className="text-sm sm:text-base font-bold font-display text-white"
                  >
                    Confirm Permanent User Deletion
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDeleteUser(null)}
                  aria-label="Cancel Delete Modal"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p
                data-testid="delete-confirmation-prompt-text"
                className="text-xs sm:text-sm font-bold text-red-300 leading-relaxed"
              >
                Are you sure you want to permanently delete this user?
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-red-500/30 space-y-1 text-xs">
                <p className="font-bold text-white">{pendingDeleteUser.name}</p>
                <p className="text-slate-400">{pendingDeleteUser.email}</p>
                <p className="text-[#00B4D8]">
                  {pendingDeleteUser.role} · {pendingDeleteUser.divisionLabel}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  data-testid="cancel-delete-user-btn"
                  onClick={() => setPendingDeleteUser(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-testid="confirm-delete-user-btn"
                  onClick={handleConfirmDeleteUser}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Delete User</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

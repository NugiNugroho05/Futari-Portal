import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Building2,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
  Mail,
  Clock,
  Award,
  FileDown,
  Edit3,
  Palette,
  Sparkles,
  CheckCircle2,
  KeyRound,
  Camera,
  Save,
  Lock,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  StaffMemberRecord,
  INITIAL_FUTARI_STAFF,
  AttendanceRecord,
  VirtualOfficeRoomName,
  VIRTUAL_OFFICE_ROOMS,
  AvatarHairStyle,
  SelfServiceProfileUpdateInput,
  getDirectReportsForSupervisor,
  getStaffAvatar3DConfig,
} from '../utils/futariLogic';

interface ProfileTabProps {
  currentUser: StaffMemberRecord;
  staffList?: StaffMemberRecord[];
  onSelectStaffRole?: (staff: StaffMemberRecord) => void;
  onUpdateOwnProfile?: (updates: SelfServiceProfileUpdateInput) => void;
  userAttendanceLogs: AttendanceRecord[];
  payrollCycleLabel: string;
  onOpenStructuredPdfModal: () => void;
  isDark: boolean;
}

const SHIRT_COLOR_PRESETS = [
  { label: 'Futari Cyan', hex: '#00B4D8' },
  { label: 'Deep Ocean', hex: '#0277BD' },
  { label: 'Emerald Ops', hex: '#10b981' },
  { label: 'Royal Indigo', hex: '#6366f1' },
  { label: 'Sunset Amber', hex: '#f59e0b' },
  { label: 'Coral Rose', hex: '#f43f5e' },
  { label: 'Slate Executive', hex: '#334155' },
  { label: 'Violet Creative', hex: '#8b5cf6' },
];

const HAIR_COLOR_PRESETS = [
  { label: 'Jet Black', hex: '#0f172a' },
  { label: 'Dark Espresso', hex: '#292524' },
  { label: 'Chestnut Brown', hex: '#78350f' },
  { label: 'Auburn Copper', hex: '#9a3412' },
  { label: 'Silver Ash', hex: '#64748b' },
  { label: 'Golden Blonde', hex: '#ca8a04' },
];

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  staffList = INITIAL_FUTARI_STAFF,
  onSelectStaffRole,
  onUpdateOwnProfile,
  userAttendanceLogs,
  payrollCycleLabel,
  onOpenStructuredPdfModal,
  isDark,
}) => {
  const current3D = useMemo(
    () => getStaffAvatar3DConfig(currentUser),
    [currentUser]
  );

  // Self-Service Profile Form State
  const [editName, setEditName] = useState<string>(currentUser.name);
  const [editPassword, setEditPassword] = useState<string>(
    currentUser.password || 'futari2026'
  );
  const [editSupervisor, setEditSupervisor] = useState<string>(
    currentUser.supervisor
  );
  const [editRoomName, setEditRoomName] = useState<VirtualOfficeRoomName>(
    currentUser.roomName
  );
  const [editAvatarColor, setEditAvatarColor] = useState<string>(
    currentUser.avatarColor
  );
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>(
    currentUser.photoUrl || ''
  );

  // 3D Avatar Customization State
  const [shirtColor, setShirtColor] = useState<string>(current3D.shirtColor);
  const [hairStyle, setHairStyle] = useState<AvatarHairStyle>(
    current3D.hairStyle
  );
  const [hairColor, setHairColor] = useState<string>(current3D.hairColor);
  const [useHijab, setUseHijab] = useState<boolean>(current3D.useHijab);
  const [hijabColor, setHijabColor] = useState<string>(
    current3D.hijabColor || currentUser.avatarColor
  );
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Password visibility toggle state
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Avatar Upload State (Supabase Storage 'avatars' bucket)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState<boolean>(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string>('');
  const [avatarUploadSuccess, setAvatarUploadSuccess] = useState<string>('');

  const handleRemoveAvatar = async () => {
    setAvatarUploadError('');
    setAvatarUploadSuccess('');
    setIsRemovingAvatar(true);

    try {
      const userEmail = (currentUser.email || '').trim().toLowerCase();
      if (!userEmail) throw new Error('Email akun tidak ditemukan pada sesi aktif.');

      // 1. Update Supabase personnel table setting avatar_url to null
      const { error: dbError } = await supabase
        .from('personnel')
        .update({ avatar_url: null })
        .eq('email', userEmail);

      if (dbError) {
        console.warn('Personnel table remove avatar warning:', dbError.message);
      }

      // 2. Update local state
      if (onUpdateOwnProfile) {
        onUpdateOwnProfile({
          avatar_url: null,
          photoUrl: undefined,
        });
      }
      setEditPhotoUrl('');
      setAvatarUploadSuccess('Foto profil berhasil dihapus.');
    } catch (err: any) {
      setAvatarUploadError(err?.message || 'Gagal menghapus foto profil.');
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploadError('');
    setAvatarUploadSuccess('');
    setIsUploadingAvatar(true);

    try {
      const userEmail = (currentUser.email || '').trim().toLowerCase();
      if (!userEmail) throw new Error('Email akun tidak ditemukan pada sesi aktif.');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.${ext}`;

      // 1. Upload to Supabase Storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(`Gagal upload avatar: ${uploadError.message}`);
      }

      // 2. Get Public URL
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicData?.publicUrl;
      if (!avatarUrl) {
        throw new Error('Gagal mendapatkan public URL avatar.');
      }

      // 3. Update personnel table avatar_url
      const { error: dbError } = await supabase
        .from('personnel')
        .update({ avatar_url: avatarUrl })
        .eq('email', userEmail);

      if (dbError) {
        console.warn('Personnel table update warning:', dbError.message);
      }

      // 4. Update in-app state
      if (onUpdateOwnProfile) {
        onUpdateOwnProfile({
          avatar_url: avatarUrl,
          photoUrl: avatarUrl,
        });
      }
      setEditPhotoUrl(avatarUrl);
      setAvatarUploadSuccess('Foto profil berhasil diunggah dan disinkronkan ke seluruh sistem!');
    } catch (err: any) {
      setAvatarUploadError(err?.message || 'Terjadi kesalahan saat mengunggah foto profil.');
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  // Supabase Auth Change Password State (`supabase.auth.updateUser({ password: newPassword })`)
  // (Form removed in favor of single password input in Update Profile)

  // Dynamically fetched personnel from Supabase `personnel` table for Direct Supervisor options
  const [personnelList, setPersonnelList] = useState<
    Array<{ id: any; name: string; email: string; role: string; division?: string; supervisor_email?: string | null }>
  >([]);
  const [resolvedSupervisorName, setResolvedSupervisorName] = useState<string>(() => {
    return currentUser.supervisor || '';
  });

  useEffect(() => {
    let isMounted = true;
    const fetchPersonnelFromDb = async () => {
      try {
        const { data, error } = await supabase
          .from('personnel')
          .select('id, name, email, role, division, supervisor_email')
          .order('name', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          setPersonnelList(data);

          // Immediately look up the user's supervisor in Supabase
          const cleanUserEmail = (currentUser.email || '').trim().toLowerCase();
          const userInDb = data.find(
            (p) => (p.email || '').trim().toLowerCase() === cleanUserEmail
          );
          const activeSupervisorEmail = (
            userInDb?.supervisor_email ||
            currentUser.supervisor_email ||
            ''
          ).trim().toLowerCase();

          if (activeSupervisorEmail) {
            const supUser = data.find(
              (p) => (p.email || '').trim().toLowerCase() === activeSupervisorEmail
            );
            if (supUser) {
              setResolvedSupervisorName(`${supUser.name} (${supUser.role || 'Staff'})`);
              setEditSupervisor(supUser.email);
            } else {
              setResolvedSupervisorName(activeSupervisorEmail);
              setEditSupervisor(activeSupervisorEmail);
            }
          } else {
            const roleLower = (currentUser.role || '').toLowerCase();
            const divLower = (currentUser.division || '').toLowerCase();
            const isExecutive =
              roleLower === 'executive' ||
              roleLower.includes('founder') ||
              roleLower.includes('ceo') ||
              divLower === 'executive';
            if (isExecutive) {
              setResolvedSupervisorName('Board of Founders Futari (Top Executive)');
              setEditSupervisor('Board of Founders Futari (Top Executive)');
            } else if (currentUser.supervisor) {
              setResolvedSupervisorName(currentUser.supervisor);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch personnel for supervisor select:', err);
      }
    };
    fetchPersonnelFromDb();
    return () => {
      isMounted = false;
    };
  }, [currentUser.email, currentUser.supervisor_email]);

  // Sync local form state whenever currentUser or personnelList changes
  useEffect(() => {
    const cfg = getStaffAvatar3DConfig(currentUser);
    setEditName(currentUser.name);
    setEditPassword(currentUser.password || 'futari2026');

    // Resolve supervisor by supervisor_email first, fallback to currentUser.supervisor
    const activeSupervisorEmail = (currentUser.supervisor_email || '').trim().toLowerCase();
    if (activeSupervisorEmail) {
      const match = (personnelList.length > 0 ? personnelList : staffList).find(
        (p) => (p.email || '').trim().toLowerCase() === activeSupervisorEmail
      );
      if (match) {
        setEditSupervisor(match.email);
      } else {
        setEditSupervisor(activeSupervisorEmail);
      }
    } else {
      const rawSup = (currentUser.supervisor || '').trim();
      const matchByName = (personnelList.length > 0 ? personnelList : staffList).find(
        (p) =>
          p.name.trim().toLowerCase() === rawSup.toLowerCase() ||
          rawSup.toLowerCase().startsWith(`${p.name.trim().toLowerCase()} (`) ||
          p.email.toLowerCase() === rawSup.toLowerCase()
      );
      if (matchByName) {
        setEditSupervisor(matchByName.email);
      } else {
        setEditSupervisor(rawSup);
      }
    }

    setEditRoomName(currentUser.roomName);
    setEditAvatarColor(currentUser.avatarColor);
    setEditPhotoUrl(currentUser.photoUrl || '');
    setShirtColor(cfg.shirtColor);
    setHairStyle(cfg.hairStyle);
    setHairColor(cfg.hairColor);
    setUseHijab(cfg.useHijab);
    setHijabColor(cfg.hijabColor || currentUser.avatarColor);
  }, [currentUser, personnelList]);

  const surfaceCard = isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  const fullLocationName =
    currentUser.branch === 'JKT'
      ? 'Jakarta (Jl. Nusa Indah No.33, RT.14/RW.5, Cipete Sel., Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12410)'
      : 'Bandung (BDG — Braga Creative Hub)';

  // Filter mock database for personnel who have the currently active user set as their supervisor
  const directReports = useMemo(
    () => getDirectReportsForSupervisor(staffList, currentUser),
    [staffList, currentUser]
  );

  // Dynamically populated from Supabase personnel table
  const supervisorCandidates = useMemo(() => {
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const source = personnelList.length > 0 ? personnelList : staffList;
    return source
      .filter((p) => {
        const email = (p.email || '').trim().toLowerCase();
        return email !== userEmail;
      })
      .map((p) => ({
        id: String(p.id),
        name: p.name,
        role: p.role || 'Staff',
        email: p.email,
      }));
  }, [personnelList, staffList, currentUser.email]);

  const handleSaveSelfServiceProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateOwnProfile) return;

    // Resolve chosen supervisor email
    const chosenSupEmail = editSupervisor.trim();
    const matchedSup = supervisorCandidates.find(
      (c) =>
        c.email.toLowerCase() === chosenSupEmail.toLowerCase() ||
        c.name.toLowerCase() === chosenSupEmail.toLowerCase()
    );

    const resolvedSupervisorEmail = matchedSup
      ? matchedSup.email.toLowerCase()
      : chosenSupEmail.includes('@')
      ? chosenSupEmail.toLowerCase()
      : null;

    const resolvedSupervisorName = matchedSup
      ? matchedSup.name
      : chosenSupEmail;

    onUpdateOwnProfile({
      name: editName.trim() || currentUser.name,
      password: editPassword.trim() || currentUser.password,
      supervisor: resolvedSupervisorName || currentUser.supervisor,
      supervisor_email: resolvedSupervisorEmail,
      roomName: editRoomName,
      avatarColor: editAvatarColor,
      photoUrl: editPhotoUrl.trim() || undefined,
      avatar3DConfig: {
        shirtColor,
        hairStyle,
        hairColor,
        useHijab,
        hijabColor,
      },
    });

    // Also update password directly if modified
    if (editPassword && editPassword.trim() && editPassword.trim().length >= 6) {
      try {
        await supabase.auth.updateUser({ password: editPassword.trim() });
      } catch (authErr) {
        console.warn('Could not update password via Supabase Auth:', authErr);
      }
    }

    setSaveFeedback(
      `Profil & 3D Avatar (${
        editName.trim() || currentUser.name
      }) berhasil disimpan dan langsung disinkronkan ke 3D Virtual Office!`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display mt-0.5">
            User Profile
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenStructuredPdfModal}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-2 whitespace-nowrap shadow-md cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>Lihat &amp; Unduh Laporan Absensi (PDF)</span>
        </button>
      </div>

      {/* Save Feedback Toast */}
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            data-testid="profile-save-toast"
            className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 text-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{saveFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveFeedback(null)}
              className="text-emerald-300 hover:text-white font-mono text-[11px] font-bold"
            >
              [TUTUP]
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Profile Hero Card */}
      <div
        data-testid="employee-profile-card"
        className={`p-5 sm:p-8 rounded-2xl border ${surfaceCard}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-700/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Prominent Avatar or Custom Photo with Upload Trigger */}
            <div className="relative group shrink-0">
              {currentUser.avatar_url || currentUser.photoUrl ? (
                <img
                  src={currentUser.avatar_url || currentUser.photoUrl}
                  alt={currentUser.name}
                  data-testid="profile-avatar"
                  className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-[#00B4D8]/30"
                />
              ) : (
                <div
                  data-testid="profile-avatar"
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white shadow-lg ring-4 ring-[#00B4D8]/30"
                  style={{ backgroundColor: currentUser.avatarColor || '#0277BD' }}
                >
                  {currentUser.initials}
                </div>
              )}

              {/* Functional Camera Upload Button Overlay */}
              <label
                htmlFor="avatar-upload-file-input"
                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity cursor-pointer backdrop-blur-[2px]"
                title="Ganti Foto Profil (Upload ke Supabase)"
              >
                {isUploadingAvatar ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span>Upload</span>
                  </>
                )}
              </label>
              <input
                id="avatar-upload-file-input"
                data-testid="avatar-upload-file-input"
                type="file"
                accept="image/*"
                disabled={isUploadingAvatar}
                onChange={handleAvatarFileSelected}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#00B4D8]/15 text-[#00B4D8]">
                  {currentUser.division}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-emerald-500/15 text-emerald-400">
                  Status: {currentUser.workMode} ({currentUser.checkInTime} WIB)
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-violet-500/15 text-violet-300">
                  3D: {current3D.useHijab ? 'Hijab Mode' : `Hair: ${current3D.hairStyle}`}
                </span>
              </div>
              <h2
                data-testid="profile-name"
                className="text-2xl font-bold font-display mt-1.5"
              >
                {currentUser.name}
              </h2>
              <p
                data-testid="profile-role"
                className="text-sm font-semibold text-[#00B4D8]"
              >
                {currentUser.role}
              </p>
              <p className={`text-xs mt-1 flex items-center gap-1.5 ${mutedText}`}>
                <Mail className="w-3.5 h-3.5 text-[#00B4D8]" />
                <span>{currentUser.email}</span>
              </p>
              {(currentUser.avatar_url || currentUser.photoUrl) && (
                <div className="mt-2">
                  <button
                    type="button"
                    disabled={isRemovingAvatar || isUploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isRemovingAvatar ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    <span>Remove Avatar</span>
                  </button>
                </div>
              )}
              {avatarUploadError && (
                <p className="text-xs text-rose-400 font-medium mt-1.5">
                  {avatarUploadError}
                </p>
              )}
              {avatarUploadSuccess && (
                <p className="text-xs text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{avatarUploadSuccess}</span>
                </p>
              )}
            </div>
          </div>

          {/* Official Digital ID & Assigned Room Card */}
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0277BD] to-[#00B4D8] flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold">ID Card Digital Futari</p>
              <p className="text-[#00B4D8] font-semibold">
                {currentUser.roomName}
              </p>
              <p className={`font-mono text-[11px] ${mutedText}`}>
                ID: {currentUser.staffId.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Mandatory Profile Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-[#00B4D8] font-semibold">
              <User className="w-4 h-4" />
              <span>Nama Lengkap Karyawan</span>
            </div>
            <p className="text-base font-bold mt-1.5">{currentUser.name}</p>
            <p className={`text-[11px] mt-0.5 ${mutedText}`}>
              Terdaftar di Direktori {staffList.length} Personel
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-[#00B4D8] font-semibold">
              <Award className="w-4 h-4" />
              <span>Jabatan (Role)</span>
            </div>
            <p className="text-base font-bold mt-1.5">{currentUser.role}</p>
            <p className={`text-[11px] mt-0.5 ${mutedText}`}>
              Zona Meja Virtual: {currentUser.deskZone}
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-[#00B4D8] font-semibold">
              <Building2 className="w-4 h-4" />
              <span>Divisi (Division)</span>
            </div>
            <p
              data-testid="profile-division"
              className="text-base font-bold mt-1.5"
            >
              {currentUser.division}
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-[#00B4D8] font-semibold">
              <UserCheck className="w-4 h-4" />
              <span>Direct Supervisor</span>
            </div>
            <p
              data-testid="profile-supervisor"
              className="text-base font-bold mt-1.5"
            >
              Direct Supervisor: {resolvedSupervisorName || currentUser.supervisor || '-'}
            </p>
            <p className={`text-[11px] mt-0.5 ${mutedText}`}>
              Persetujuan Cuti, Lembur &amp; Petty Cash
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-[#00B4D8] font-semibold">
              <MapPin className="w-4 h-4" />
              <span>Lokasi Penempatan (Location)</span>
            </div>
            <p
              data-testid="profile-location"
              className="text-base font-bold mt-1.5"
            >
              {fullLocationName}
            </p>
            <p className={`text-[11px] mt-0.5 ${mutedText}`}>
              Cabang Utama: {currentUser.branch}
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-[#00B4D8] font-semibold">
              <Clock className="w-4 h-4" />
              <span>Rekap Kehadiran Siklus Aktif</span>
            </div>
            <p className="text-base font-bold font-mono mt-1.5">
              Telat: {currentUser.lateMinutesMonth} Menit
            </p>
            <p className={`text-[11px] mt-0.5 ${mutedText}`}>
              Siklus: {payrollCycleLabel} ({userAttendanceLogs.length} log)
            </p>
          </div>
        </div>

        {/* =================================================================
            UPDATE PROFILE & 3D AVATAR CUSTOMIZATION STUDIO
           ================================================================= */}
        <form
          onSubmit={handleSaveSelfServiceProfile}
          data-testid="self-service-profile-form"
          className={`mt-6 p-5 sm:p-6 rounded-2xl border-2 border-[#00B4D8]/40 ${
            isDark ? 'bg-slate-950/85' : 'bg-slate-50'
          } space-y-5`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/30">
            <div>
              <div className="flex items-center gap-2 text-[#00B4D8]">
                <Edit3 className="w-4 h-4" />
                <h3 className="text-base font-bold font-display">
                  Update Profile
                </h3>
              </div>
            </div>
            <button
              type="submit"
              data-testid="save-self-service-profile-btn"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-2 shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Personal Info & Supervisor/Team Self-Service */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="self-edit-name-input"
                    className="block text-xs font-semibold text-[#00B4D8] mb-1"
                  >
                    Nama Lengkap Anda
                  </label>
                  <input
                    id="self-edit-name-input"
                    data-testid="self-edit-name-input"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="self-edit-password-input"
                    className="block text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Password Akun</span>
                  </label>
                  <div className="relative">
                    <input
                      id="self-edit-password-input"
                      data-testid="self-edit-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className={`w-full px-3 py-2 pr-9 rounded-lg text-xs border ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00B4D8] cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="self-edit-supervisor-select"
                    className="block text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Direct Supervisor (Report To)</span>
                  </label>
                  <select
                    id="self-edit-supervisor-select"
                    data-testid="self-edit-supervisor-select"
                    value={editSupervisor}
                    onChange={(e) => setEditSupervisor(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- Pilih Atasan Langsung (Direct Supervisor) --</option>
                    <option value="Board of Founders Futari (Top Executive)">
                      Board of Founders Futari (Top Executive)
                    </option>
                    {supervisorCandidates.map((sup) => (
                      <option key={sup.id} value={sup.email}>
                        {sup.name} ({sup.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="self-edit-room-select"
                    className="block text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Ruangan / Team Virtual Office</span>
                  </label>
                  <select
                    id="self-edit-room-select"
                    data-testid="self-edit-room-select"
                    value={editRoomName}
                    onChange={(e) =>
                      setEditRoomName(e.target.value as VirtualOfficeRoomName)
                    }
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {VIRTUAL_OFFICE_ROOMS.map((room) => (
                      <option key={room.roomName} value={room.roomName}>
                        {room.roomName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="self-edit-avatar-color"
                    className="block text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Warna Badge Avatar 2D</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="self-edit-avatar-color"
                      type="color"
                      value={editAvatarColor}
                      onChange={(e) => setEditAvatarColor(e.target.value)}
                      className="w-10 h-9 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <span className="text-xs font-mono">{editAvatarColor}</span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="self-edit-photo-url"
                    className="block text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>URL Foto Profil (Opsional)</span>
                  </label>
                  <input
                    id="self-edit-photo-url"
                    type="text"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="Kosongkan untuk Avatar Inisial..."
                    className={`w-full px-3 py-2 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Right 5 Cols: 3D Avatar Customization Panel (Shirt Color, Hair Style/Color, Hijab Toggle) */}
            <div
              data-testid="avatar-3d-customization-panel"
              className={`lg:col-span-5 p-4 rounded-xl border ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800'
                  : 'bg-white border-slate-200'
              } space-y-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#00B4D8]">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    3D Avatar Settings (Virtual Office)
                  </h4>
                </div>

                {/* Live Mini 3D Silhouette Preview */}
                <div
                  data-testid="avatar-3d-live-preview"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <div className="relative w-7 h-9 flex flex-col items-center justify-end">
                    {/* Head + Hair/Hijab */}
                    <div
                      className="w-4 h-4 rounded-full relative z-10 border border-black/20"
                      style={{
                        backgroundColor: useHijab ? hijabColor : '#f1c27d',
                      }}
                    >
                      {!useHijab && (
                        <div
                          className="w-4 h-2 rounded-t-full absolute -top-0.5 inset-x-0"
                          style={{ backgroundColor: hairColor }}
                        />
                      )}
                    </div>
                    {/* Torso / Shirt */}
                    <div
                      className="w-6 h-4 rounded-t-md -mt-0.5"
                      style={{ backgroundColor: shirtColor }}
                    />
                  </div>
                  <div className="text-[10px] font-mono leading-tight">
                    <p className="text-white font-bold">Preview 3D</p>
                    <p className="text-[#00B4D8]">
                      {useHijab ? 'Hijab Aktif' : `Rambut: ${hairStyle}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Shirt Color */}
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  1. Warna Baju 3D (Shirt Color):{' '}
                  <span className="font-mono text-[#00B4D8]">{shirtColor}</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SHIRT_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      title={preset.label}
                      data-testid={`shirt-color-preset-${preset.hex}`}
                      onClick={() => setShirtColor(preset.hex)}
                      className={`w-6 h-6 rounded-lg border transition-transform cursor-pointer ${
                        shirtColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'ring-2 ring-white scale-110 border-white'
                          : 'border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="Pilih Shirt Color Kustom"
                    data-testid="avatar-3d-shirt-color-input"
                    value={shirtColor}
                    onChange={(e) => setShirtColor(e.target.value)}
                    className="w-7 h-6 rounded cursor-pointer bg-transparent border border-slate-700"
                  />
                </div>
              </div>

              {/* 2. Hijab Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white">
                    2. Gunakan Hijab 3D (Hijab Toggle)
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Menampilkan mesh Hijab 3D di Virtual Office
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {useHijab && (
                    <input
                      type="color"
                      aria-label="Warna Hijab 3D"
                      value={hijabColor}
                      onChange={(e) => setHijabColor(e.target.value)}
                      title="Pilih Warna Hijab"
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border border-slate-700"
                    />
                  )}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useHijab}
                    data-testid="avatar-3d-hijab-toggle"
                    onClick={() => setUseHijab((prev) => !prev)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      useHijab
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {useHijab ? 'HIJAB: ON' : 'HIJAB: OFF'}
                  </button>
                </div>
              </div>

              {/* 3. Hair Style & Hair Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="avatar-3d-hair-style-select"
                    className="block text-xs font-semibold mb-1"
                  >
                    3. Gaya Rambut (Hair Style)
                  </label>
                  <select
                    id="avatar-3d-hair-style-select"
                    data-testid="avatar-3d-hair-style-select"
                    value={hairStyle}
                    onChange={(e) =>
                      setHairStyle(e.target.value as AvatarHairStyle)
                    }
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="short">Short Crop (Pendek Rapi)</option>
                    <option value="parted">Side Parted (Belah Samping)</option>
                    <option value="long">Long Flowing (Panjang)</option>
                    <option value="bun">Top Bun (Cepol Rapi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    4. Warna Rambut (Hair Color)
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {HAIR_COLOR_PRESETS.map((hc) => (
                      <button
                        key={hc.hex}
                        type="button"
                        title={hc.label}
                        onClick={() => setHairColor(hc.hex)}
                        className={`w-5 h-5 rounded-md border cursor-pointer ${
                          hairColor.toLowerCase() === hc.hex.toLowerCase()
                            ? 'ring-2 ring-[#00B4D8] border-white'
                            : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: hc.hex }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Warna Rambut Kustom"
                      data-testid="avatar-3d-hair-color-input"
                      value={hairColor}
                      onChange={(e) => setHairColor(e.target.value)}
                      className="w-6 h-5 rounded cursor-pointer bg-transparent border border-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Organizational Hierarchy Display: Direct Supervisor & Team Members (Direct Reports) */}
        <div
          data-testid="profile-direct-reports-section"
          className={`mt-6 p-5 rounded-xl border ${
            isDark
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-700/30">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00B4D8]" />
              <h3 className="text-sm font-bold font-display">
                Team Members:
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#00B4D8]/15 text-[#00B4D8]">
                {directReports.length} Personel
              </span>
            </div>
          </div>

          {directReports.length > 0 ? (
            <div className="mt-3 space-y-3">
              <p
                data-testid="profile-direct-reports-names"
                className={`text-xs ${mutedText}`}
              >
                Anggota tim langsung di bawah supervisi{' '}
                <strong className="text-[#00B4D8]">{currentUser.name}</strong>:{' '}
                <span className="font-semibold text-emerald-400">
                  {directReports.map((m) => m.name).join(', ')}
                </span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {directReports.map((member) => (
                  <div
                    key={member.staffId}
                    data-testid={`direct-report-item-${member.staffId}`}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{member.name}</p>
                      <p className={`text-[11px] truncate ${mutedText}`}>
                        {member.role} · {member.branch}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400 truncate">
                        Status: {member.workMode} ({member.checkInTime} WIB)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p
              data-testid="profile-no-direct-reports"
              className={`text-xs mt-3 font-mono ${mutedText}`}
            >
              Tidak ada personel yang melapor langsung ke {currentUser.name} (Individual Contributor).
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

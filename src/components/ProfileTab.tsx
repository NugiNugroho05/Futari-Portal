import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
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
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import {
  StaffMemberRecord,
  INITIAL_FUTARI_STAFF,
  AttendanceRecord,
  VirtualOfficeRoomName,
  VIRTUAL_OFFICE_ROOMS,
  AvatarGender,
  AvatarHairStyle,
  AvatarOutfitType,
  Avatar3DConfig,
  SelfServiceProfileUpdateInput,
  getDirectReportsForSupervisor,
  getStaffAvatar3DConfig,
  encodePersonnelAvatarUrlWithMetadata,
  canViewAllAttendance,
  formatBranchDisplay,
  formatRoomDisplayName,
  isJawaRoomName,
  normalizeVirtualOfficeRoomName,
} from '../utils/futariLogic';
import { buildRobloxStylizedCharacter } from './VirtualOffice3D';

interface ProfileTabProps {
  currentUser: StaffMemberRecord;
  staffList?: StaffMemberRecord[];
  onSelectStaffRole?: (staff: StaffMemberRecord) => void;
  onUpdateOwnProfile?: (
    updates: SelfServiceProfileUpdateInput
  ) => Promise<void> | void;
  userAttendanceLogs: AttendanceRecord[];
  payrollCycleLabel: string;
  onOpenStructuredPdfModal: () => void;
  selectedAttendanceTargetId?: string;
  onSelectAttendanceTargetId?: (staffId: string) => void;
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

const OUTFIT_TYPE_LABELS: Record<AvatarOutfitType, string> = {
  short_sleeve: 'Kaos Lengan Pendek',
  formal_shirt: 'Kemeja Formal (Kerah & Kancing)',
  long_sleeve: 'Lengan Panjang',
};

const MALE_HAIR_OPTIONS: Array<{ value: AvatarHairStyle; label: string }> = [
  { value: 'short', label: 'Short Crop (Pendek Rapi)' },
  { value: 'medium_messy', label: 'Medium Messy (Berlapis Modern)' },
  { value: 'side_part', label: 'Side Part (Belah Samping)' },
  { value: 'fade', label: 'Fade (Undercut Rapi)' },
];

const FEMALE_HAIR_OPTIONS: Array<{ value: AvatarHairStyle; label: string }> = [
  { value: 'ponytail', label: 'Ponytail (Kuncir Belakang)' },
  { value: 'long', label: 'Long Hair (Panjang Terurai)' },
  { value: 'bob_cut', label: 'Bob Cut (Sebahu Rapi)' },
];

/**
 * Live Real-Time 3D Roblox-Style Avatar Preview Component inside User Profile (Spacious Left Column)
 */
const RobloxAvatar3DPreviewCanvas: React.FC<{
  cfg: Avatar3DConfig;
}> = ({ cfg }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cfgRef = useRef<Avatar3DConfig>(cfg);
  cfgRef.current = cfg;

  const rebuildFnRef = useRef<((nextCfg: Avatar3DConfig) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = 240;
    const h = 230;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 20);
    camera.position.set(0, 0.85, 2.45);
    camera.lookAt(0, 0.74, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch {
      return;
    }

    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(2.4, 3.6, 3.4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-2.2, 2.2, -2.0);
    scene.add(rimLight);

    // Subtle glowing pedestal ring under character
    const pedestalGeo = new THREE.CylinderGeometry(0.4, 0.44, 0.05, 28);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x00b4d8,
      emissiveIntensity: 0.35,
      roughness: 0.3,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, 0.01, 0);
    scene.add(pedestal);

    let activeBuild = buildRobloxStylizedCharacter(cfgRef.current, 'profile_preview');
    scene.add(activeBuild.characterGroup);

    const rebuildCharacter = (nextCfg: Avatar3DConfig) => {
      scene.remove(activeBuild.characterGroup);
      activeBuild.characterGroup.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const matWithMap = m as THREE.Material & { map?: THREE.Texture | null };
            if (matWithMap.map) {
              matWithMap.map.dispose();
            }
            m.dispose();
          });
        }
      });
      activeBuild = buildRobloxStylizedCharacter(nextCfg, 'profile_preview');
      scene.add(activeBuild.characterGroup);
    };
    rebuildFnRef.current = rebuildCharacter;

    let animId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth idle breathing, gentle turntable sway & limb movement (keeps face clearly visible)
      activeBuild.characterGroup.position.y = Math.sin(t * 2.2) * 0.016 + 0.03;
      activeBuild.characterGroup.rotation.y = Math.sin(t * 0.85) * 0.34;
      const armSway = Math.sin(t * 2.1) * 0.09;
      activeBuild.leftArmGroup.rotation.x = armSway;
      activeBuild.rightArmGroup.rotation.x = -armSway;
      activeBuild.headGroup.rotation.y = Math.sin(t * 1.3) * 0.07;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      rebuildFnRef.current = null;
      cancelAnimationFrame(animId);
      pedestalGeo.dispose();
      pedestalMat.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    rebuildFnRef.current?.(cfg);
  }, [
    cfg.gender,
    cfg.shirtColor,
    cfg.hairStyle,
    cfg.hairColor,
    cfg.useHijab,
    cfg.hijabColor,
    cfg.outfitType,
  ]);

  return (
    <div
      data-testid="avatar-3d-live-preview"
      className="flex flex-col items-center justify-center p-2.5 md:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 h-full space-y-2 md:space-y-3"
    >
      <div className="w-full flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#00B4D8]/15 text-[#00B4D8] font-mono font-bold text-[10px]">
          <Sparkles className="w-3 h-3" />
          <span>LIVE 3D AVATAR PREVIEW</span>
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-900 text-slate-300 border border-slate-800">
          {cfg.gender === 'female' ? 'Wanita' : 'Pria'}
        </span>
      </div>

      <div className="relative w-full h-[180px] md:h-[240px] rounded-xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 flex items-center justify-center overflow-hidden">
        <div
          ref={mountRef}
          className="w-[240px] h-[230px] flex items-center justify-center scale-[0.8] md:scale-100 origin-center"
        />
      </div>
    </div>
  );
};

export const ProfileTab: React.FC<ProfileTabProps> = ({
  currentUser,
  staffList = INITIAL_FUTARI_STAFF,
  onSelectStaffRole,
  onUpdateOwnProfile,
  userAttendanceLogs,
  payrollCycleLabel,
  onOpenStructuredPdfModal,
  selectedAttendanceTargetId,
  onSelectAttendanceTargetId,
  isDark,
}) => {
  const current3D = useMemo(
    () => getStaffAvatar3DConfig(currentUser),
    [currentUser]
  );

  const hasGlobalAttendanceView = useMemo(
    () => canViewAllAttendance(currentUser),
    [currentUser]
  );

  // Self-Service Profile Form State (isolated draft state; protected by `isDirty` from background polling resets)
  const [editName, setEditName] = useState<string>(currentUser.name);
  const [editPassword, setEditPassword] = useState<string>(
    currentUser.password || ''
  );
  const [editSupervisor, setEditSupervisor] = useState<string>(
    currentUser.supervisor
  );
  const [editRoomName, setEditRoomName] = useState<VirtualOfficeRoomName>(
    normalizeVirtualOfficeRoomName(currentUser.roomName) || currentUser.roomName
  );
  const [editAvatarColor, setEditAvatarColor] = useState<string>(
    currentUser.avatarColor
  );
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>(
    currentUser.photoUrl || ''
  );

  // 3D Avatar Customization Draft State
  const [gender, setGender] = useState<AvatarGender>(
    current3D.gender || (current3D.useHijab ? 'female' : 'male')
  );
  const [shirtColor, setShirtColor] = useState<string>(current3D.shirtColor);
  const [outfitType, setOutfitType] = useState<AvatarOutfitType>(
    current3D.outfitType || 'formal_shirt'
  );
  const [hairStyle, setHairStyle] = useState<AvatarHairStyle>(
    current3D.hairStyle
  );
  const [hairColor, setHairColor] = useState<string>(current3D.hairColor);
  const [useHijab, setUseHijab] = useState<boolean>(current3D.useHijab);
  const [hijabColor, setHijabColor] = useState<string>(
    current3D.hijabColor || currentUser.avatarColor
  );

  // Isolated dirty tracking so 4-second background Supabase polling NEVER resets unsaved edits
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);
  isDirtyRef.current = isDirty;
  const hydratedUserKeyRef = useRef<string | null>(null);
  const hydratedSignatureRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const markDirty = () => {
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      setIsDirty(true);
    }
  };

  const handleSelectGender = (nextGender: AvatarGender) => {
    markDirty();
    setGender(nextGender);
    if (nextGender === 'male') {
      setUseHijab(false);
      if (!MALE_HAIR_OPTIONS.some((o) => o.value === hairStyle)) {
        setHairStyle('short');
      }
    } else {
      if (!FEMALE_HAIR_OPTIONS.some((o) => o.value === hairStyle)) {
        setHairStyle('ponytail');
      }
    }
  };
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveProfileError, setSaveProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

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

      const encodedNullWithMeta = encodePersonnelAvatarUrlWithMetadata(null, {
        roomName: editRoomName || currentUser.roomName,
        branch: currentUser.branch,
        password: editPassword.trim() || currentUser.password,
        avatarColor: editAvatarColor || currentUser.avatarColor,
        avatar3DConfig: {
          gender,
          shirtColor,
          outfitType,
          hairStyle,
          hairColor,
          useHijab: gender === 'male' ? false : useHijab,
          hijabColor,
        },
        allowedAttendanceViewerIds: currentUser.allowedAttendanceViewerIds,
      });

      // 1. Update Supabase personnel table clearing photo while preserving metadata
      const { error: dbError } = await supabase
        .from('personnel')
        .update({ avatar_url: encodedNullWithMeta })
        .ilike('email', userEmail);

      if (dbError) {
        console.warn('Personnel table remove avatar warning:', dbError.message);
      }

      // 2. Update local state
      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile({
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

      const encodedAvatarWithMeta = encodePersonnelAvatarUrlWithMetadata(
        avatarUrl,
        {
          roomName: editRoomName || currentUser.roomName,
          branch: isJawaRoomName(editRoomName || currentUser.roomName)
            ? 'Jawa'
            : currentUser.branch,
          password: editPassword.trim() || currentUser.password,
          avatarColor: editAvatarColor || currentUser.avatarColor,
          avatar3DConfig: {
            gender,
            shirtColor,
            outfitType,
            hairStyle,
            hairColor,
            useHijab: gender === 'male' ? false : useHijab,
            hijabColor,
          },
          allowedAttendanceViewerIds: currentUser.allowedAttendanceViewerIds,
        }
      );

      // 3. Update personnel table avatar_url while preserving profile metadata
      const { error: dbError } = await supabase
        .from('personnel')
        .update({ avatar_url: encodedAvatarWithMeta })
        .ilike('email', userEmail);

      if (dbError) {
        console.warn('Personnel table update warning:', dbError.message);
      }

      // 4. Update in-app state
      if (onUpdateOwnProfile) {
        await onUpdateOwnProfile({
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
              if (!isDirtyRef.current) {
                setEditSupervisor(supUser.email);
              }
            } else {
              setResolvedSupervisorName(activeSupervisorEmail);
              if (!isDirtyRef.current) {
                setEditSupervisor(activeSupervisorEmail);
              }
            }
          } else {
            const roleLower = (currentUser.role || '').toLowerCase();
            const divLower = String(currentUser.division || '').toLowerCase();
            const isExecutive =
              roleLower === 'executive' ||
              roleLower.includes('founder') ||
              roleLower.includes('ceo') ||
              divLower === 'executive';
            if (isExecutive) {
              setResolvedSupervisorName('Board of Founders Futari (Top Executive)');
              if (!isDirtyRef.current) {
                setEditSupervisor('Board of Founders Futari (Top Executive)');
              }
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

  const hydrateDraftFromUser = (
    user: StaffMemberRecord,
    directory: Array<{ name: string; email: string }>
  ) => {
    const cfg = getStaffAvatar3DConfig(user);
    setEditName(user.name);
    setEditPassword(user.password || '');

    const activeSupervisorEmail = (user.supervisor_email || '').trim().toLowerCase();
    if (activeSupervisorEmail) {
      const match = directory.find(
        (p) => (p.email || '').trim().toLowerCase() === activeSupervisorEmail
      );
      setEditSupervisor(match ? match.email : activeSupervisorEmail);
    } else {
      const rawSup = (user.supervisor || '').trim();
      const matchByName = directory.find(
        (p) =>
          p.name.trim().toLowerCase() === rawSup.toLowerCase() ||
          rawSup.toLowerCase().startsWith(`${p.name.trim().toLowerCase()} (`) ||
          p.email.toLowerCase() === rawSup.toLowerCase()
      );
      setEditSupervisor(matchByName ? matchByName.email : rawSup);
    }

    setEditRoomName(
      normalizeVirtualOfficeRoomName(user.roomName) || user.roomName
    );
    setEditAvatarColor(user.avatarColor);
    setEditPhotoUrl(user.photoUrl || '');
    setGender(cfg.gender || (cfg.useHijab ? 'female' : 'male'));
    setShirtColor(cfg.shirtColor);
    setOutfitType(cfg.outfitType || 'formal_shirt');
    setHairStyle(cfg.hairStyle);
    setHairColor(cfg.hairColor);
    setUseHijab(cfg.gender === 'male' ? false : cfg.useHijab);
    setHijabColor(cfg.hijabColor || user.avatarColor);
  };

  // Hydrate local form & 3D avatar draft ONLY on initial load / account switch, or when saved profile changes AND form is not dirty
  useEffect(() => {
    const cfg = getStaffAvatar3DConfig(currentUser);
    const userKey = `${currentUser.staffId}|${(currentUser.email || '').trim().toLowerCase()}`;
    const persistedSignature = JSON.stringify({
      userKey,
      name: currentUser.name,
      password: currentUser.password || '',
      supervisor: currentUser.supervisor || '',
      supervisor_email: currentUser.supervisor_email || '',
      roomName: normalizeVirtualOfficeRoomName(currentUser.roomName) || currentUser.roomName,
      avatarColor: currentUser.avatarColor,
      photoUrl: currentUser.photoUrl || currentUser.avatar_url || '',
      gender: cfg.gender || (cfg.useHijab ? 'female' : 'male'),
      shirtColor: cfg.shirtColor,
      outfitType: cfg.outfitType || 'formal_shirt',
      hairStyle: cfg.hairStyle,
      hairColor: cfg.hairColor,
      useHijab: cfg.gender === 'male' ? false : cfg.useHijab,
      hijabColor: cfg.hijabColor || currentUser.avatarColor,
      dirCount: personnelList.length > 0 ? 1 : 0,
    });

    const isDifferentUser = hydratedUserKeyRef.current !== userKey;
    if (isDifferentUser) {
      hydratedUserKeyRef.current = userKey;
      hydratedSignatureRef.current = persistedSignature;
      isDirtyRef.current = false;
      setIsDirty(false);
      hydrateDraftFromUser(
        currentUser,
        personnelList.length > 0 ? personnelList : staffList
      );
      return;
    }

    // CRITICAL FIX: Never overwrite user's unsaved form or 3D avatar edits during background sync/polling!
    if (isDirtyRef.current) {
      return;
    }

    if (hydratedSignatureRef.current !== persistedSignature) {
      hydratedSignatureRef.current = persistedSignature;
      hydrateDraftFromUser(
        currentUser,
        personnelList.length > 0 ? personnelList : staffList
      );
    }
  }, [currentUser, personnelList, staffList]);

  const handleResetUnsavedDraft = () => {
    isDirtyRef.current = false;
    setIsDirty(false);
    hydrateDraftFromUser(
      currentUser,
      personnelList.length > 0 ? personnelList : staffList
    );
  };

  const surfaceCard = isDark
    ? 'bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl text-slate-100'
    : 'bg-white/70 backdrop-blur-md border border-white/40 shadow-lg text-slate-900';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  const fullLocationName =
    currentUser.branch === 'JKT'
      ? 'Jakarta (Jl. Nusa Indah No.33, RT.14/RW.5, Cipete Sel., Kec. Cilandak, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12410)'
      : 'Jawa (Regional Hub Jawa)';

  // Filter personnel who have the currently active user set as their supervisor
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
    if (!onUpdateOwnProfile || isSavingProfile) return;

    setSaveFeedback(null);
    setSaveProfileError(null);

    const cleanPassword = editPassword.trim();
    if (cleanPassword && cleanPassword.length < 6) {
      setSaveProfileError(
        'Password akun minimal harus 6 karakter sesuai standar keamanan Supabase Authentication.'
      );
      return;
    }

    // Resolve chosen supervisor email
    const chosenSupEmail = editSupervisor.trim();
    const isTopExecutiveSup =
      !chosenSupEmail ||
      chosenSupEmail.toLowerCase().includes('board of founders') ||
      chosenSupEmail.toLowerCase().includes('top executive');

    const matchedSup = isTopExecutiveSup
      ? undefined
      : supervisorCandidates.find(
          (c) =>
            c.email.toLowerCase() === chosenSupEmail.toLowerCase() ||
            c.name.toLowerCase() === chosenSupEmail.toLowerCase() ||
            `${c.name} (${c.role})`.toLowerCase() ===
              chosenSupEmail.toLowerCase()
        );

    const resolvedSupervisorEmail = isTopExecutiveSup
      ? null
      : matchedSup
      ? matchedSup.email.toLowerCase()
      : chosenSupEmail.includes('@')
      ? chosenSupEmail.toLowerCase()
      : null;

    const resolvedSupervisorDisplay = isTopExecutiveSup
      ? 'Board of Founders Futari (Top Executive)'
      : matchedSup
      ? `${matchedSup.name} (${matchedSup.role})`
      : chosenSupEmail;

    setIsSavingProfile(true);
    try {
      await onUpdateOwnProfile({
        name: editName.trim() || currentUser.name,
        password: cleanPassword || currentUser.password,
        supervisor: resolvedSupervisorDisplay || currentUser.supervisor,
        supervisor_email: resolvedSupervisorEmail,
        roomName: editRoomName,
        branch: isJawaRoomName(editRoomName) ? 'Jawa' : 'JKT',
        avatarColor: editAvatarColor,
        photoUrl: editPhotoUrl.trim() || undefined,
        avatar3DConfig: {
          gender,
          shirtColor,
          outfitType,
          hairStyle,
          hairColor,
          useHijab: gender === 'male' ? false : useHijab,
          hijabColor,
        },
      });

      isDirtyRef.current = false;
      setIsDirty(false);
      hydratedSignatureRef.current = null;
      setResolvedSupervisorName(
        resolvedSupervisorDisplay || currentUser.supervisor
      );
      setSaveFeedback(
        `Profil & 3D Avatar (${
          editName.trim() || currentUser.name
        } · Ruangan: ${formatRoomDisplayName(
          editRoomName
        )}) berhasil disimpan ke database Supabase dan langsung disinkronkan ke 3D Virtual Office!`
      );
    } catch (err: any) {
      setSaveProfileError(
        err?.message ||
          'Gagal menyimpan perubahan profil ke Supabase. Silakan coba lagi.'
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`space-y-3.5 md:space-y-6 ${isDirty ? 'pb-20 md:pb-6' : ''}`}
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-display mt-0.5">
            User Profile
          </h1>

          {/* Compact mobile PDF action right next to title to save vertical height */}
          <button
            type="button"
            onClick={onOpenStructuredPdfModal}
            className="md:hidden px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 flex items-center gap-1.5 whitespace-nowrap shadow-md cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Laporan PDF</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          {hasGlobalAttendanceView && onSelectAttendanceTargetId && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <label
                htmlFor="profile-global-attendance-select"
                className="text-[11px] md:text-xs font-semibold text-[#00B4D8] whitespace-nowrap"
              >
                Rekap Absensi:
              </label>
              <select
                id="profile-global-attendance-select"
                data-testid="profile-global-attendance-select"
                value={selectedAttendanceTargetId || currentUser.staffId}
                onChange={(e) => onSelectAttendanceTargetId(e.target.value)}
                className={`flex-1 md:flex-none min-w-0 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-xs font-semibold border ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {staffList.map((s) => (
                  <option key={s.staffId} value={s.staffId}>
                    {s.name} ({s.role} · {s.division})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenStructuredPdfModal}
            className="hidden md:flex px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 items-center gap-2 whitespace-nowrap shadow-md cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Lihat &amp; Unduh Laporan Absensi (PDF)</span>
          </button>
        </div>
      </div>

      {/* Save Error Banner */}
      <AnimatePresence>
        {saveProfileError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            data-testid="profile-save-error"
            className="p-3 md:p-4 rounded-xl border border-rose-500/50 bg-rose-500/15 text-rose-300 text-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{saveProfileError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveProfileError(null)}
              className="text-rose-300 hover:text-white font-mono text-[11px] font-bold"
            >
              [TUTUP]
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Feedback Toast */}
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            data-testid="profile-save-toast"
            className="p-3 md:p-4 rounded-xl border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 text-xs flex items-center justify-between gap-3"
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
        className={`p-3.5 sm:p-5 md:p-8 rounded-2xl border ${surfaceCard}`}
      >
        {/* Compact Horizontal Header on Mobile (< 768px), Spacious Split Header on Desktop (>= 768px) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 pb-3.5 md:pb-6 border-b border-slate-700/30">
          <div className="flex flex-row items-center gap-3 md:gap-5 min-w-0">
            {/* Prominent Avatar or Custom Photo with Upload Trigger */}
            <div className="relative group shrink-0">
              {currentUser.avatar_url || currentUser.photoUrl ? (
                <img
                  src={currentUser.avatar_url || currentUser.photoUrl}
                  alt={currentUser.name}
                  data-testid="profile-avatar"
                  className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl object-cover shadow-lg ring-2 md:ring-4 ring-[#00B4D8]/30"
                />
              ) : (
                <div
                  data-testid="profile-avatar"
                  className="w-14 h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl font-extrabold text-white shadow-lg ring-2 md:ring-4 ring-[#00B4D8]/30"
                  style={{ backgroundColor: currentUser.avatarColor || '#0277BD' }}
                >
                  {currentUser.initials}
                </div>
              )}

              {/* Functional Camera Upload Button Overlay */}
              <label
                htmlFor="avatar-upload-file-input"
                className="absolute inset-0 rounded-xl md:rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity cursor-pointer backdrop-blur-[2px]"
                title="Ganti Foto Profil (Upload ke Supabase)"
              >
                {isUploadingAvatar ? (
                  <RefreshCw className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 md:w-5 md:h-5 mb-0.5" />
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

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] md:text-xs font-semibold bg-[#00B4D8]/15 text-[#00B4D8]">
                  {currentUser.division}
                </span>
                {/* Compact inline ID Card badge on mobile (< 768px) */}
                <span className="md:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[140px]">
                    ID Card · {formatRoomDisplayName(currentUser.roomName)}
                  </span>
                </span>
              </div>
              <h2
                data-testid="profile-name"
                className="text-base sm:text-lg md:text-2xl font-bold font-display mt-0.5 md:mt-1.5 truncate"
              >
                {currentUser.name}
              </h2>
              <p
                data-testid="profile-role"
                className="text-xs md:text-sm font-semibold text-[#00B4D8] truncate"
              >
                {currentUser.role}
              </p>
              <p className={`text-[11px] md:text-xs mt-0.5 md:mt-1 flex items-center gap-1.5 min-w-0 ${mutedText}`}>
                <Mail className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#00B4D8] shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </p>
              {(currentUser.avatar_url || currentUser.photoUrl) && (
                <div className="mt-1.5 md:mt-2">
                  <button
                    type="button"
                    disabled={isRemovingAvatar || isUploadingAvatar}
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-[11px] font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
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
                <p className="text-[11px] md:text-xs text-rose-400 font-medium mt-1">
                  {avatarUploadError}
                </p>
              )}
              {avatarUploadSuccess && (
                <p className="text-[11px] md:text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{avatarUploadSuccess}</span>
                </p>
              )}
            </div>
          </div>

          {/* Official Digital ID & Assigned Room Card (Desktop >= 768px) */}
          <div
            className={`hidden md:flex p-4 rounded-xl border items-center gap-3 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0277BD] to-[#00B4D8] flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold">ID Card Digital Futari</p>
              <p className="text-[#00B4D8] font-semibold">
                {formatRoomDisplayName(currentUser.roomName)}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Mandatory Profile Attributes Grid (Compact 2-Column Grid on Mobile < 768px, 3-Column on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 mt-3.5 md:mt-6">
          <div
            className={`p-2.5 md:p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[#00B4D8] font-semibold">
              <User className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="truncate">Nama Lengkap</span>
            </div>
            <p className="text-xs md:text-base font-bold mt-1 md:mt-1.5 leading-snug break-words">
              {currentUser.name}
            </p>
          </div>

          <div
            className={`p-2.5 md:p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[#00B4D8] font-semibold">
              <Award className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="truncate">Jabatan (Role)</span>
            </div>
            <p className="text-xs md:text-base font-bold mt-1 md:mt-1.5 leading-snug break-words">
              {currentUser.role}
            </p>
          </div>

          <div
            className={`p-2.5 md:p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[#00B4D8] font-semibold">
              <Building2 className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="truncate">Divisi (Division)</span>
            </div>
            <p
              data-testid="profile-division"
              className="text-xs md:text-base font-bold mt-1 md:mt-1.5 leading-snug break-words"
            >
              {currentUser.division}
            </p>
          </div>

          <div
            className={`p-2.5 md:p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[#00B4D8] font-semibold">
              <UserCheck className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="truncate">Direct Supervisor</span>
            </div>
            <p
              data-testid="profile-supervisor"
              className="text-xs md:text-base font-bold mt-1 md:mt-1.5 leading-snug break-words"
            >
              {resolvedSupervisorName || currentUser.supervisor || '-'}
            </p>
          </div>

          <div
            className={`p-2.5 md:p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[#00B4D8] font-semibold">
              <MapPin className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="truncate">Lokasi Penempatan</span>
            </div>
            <p
              data-testid="profile-location"
              className="text-xs md:text-base font-bold mt-1 md:mt-1.5 leading-snug break-words"
            >
              {formatBranchDisplay(currentUser.branch)}
            </p>
          </div>

          <div
            className={`p-2.5 md:p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-[#00B4D8] font-semibold">
              <Clock className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="truncate">Rekap Kehadiran</span>
            </div>
            <p className="text-xs md:text-base font-bold font-mono mt-1 md:mt-1.5 leading-snug">
              Telat: {currentUser.lateMinutesMonth} Menit
            </p>
          </div>
        </div>

        {/* =================================================================
            UPDATE PROFILE & 3D AVATAR CUSTOMIZATION STUDIO
           ================================================================= */}
        <form
          ref={formRef}
          onSubmit={handleSaveSelfServiceProfile}
          data-testid="self-service-profile-form"
          className={`mt-4 md:mt-6 p-3.5 sm:p-5 md:p-6 rounded-2xl border-2 border-[#00B4D8]/40 ${
            isDark ? 'bg-slate-950/85' : 'bg-slate-50'
          } space-y-3.5 md:space-y-5`}
        >
          <div className="flex flex-row items-center justify-between gap-2 pb-2.5 md:pb-3 border-b border-slate-700/30">
            <div className="flex items-center gap-2 text-[#00B4D8] min-w-0">
              <Edit3 className="w-4 h-4 shrink-0" />
              <h3 className="text-sm md:text-base font-bold font-display truncate">
                Update Profile
              </h3>
              {isDirty && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                  Draft
                </span>
              )}
            </div>
            <button
              type="submit"
              data-testid="save-self-service-profile-btn"
              disabled={isSavingProfile}
              className="px-3.5 md:px-4 py-1.5 md:py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-60 flex items-center gap-1.5 md:gap-2 shadow-md cursor-pointer shrink-0"
            >
              {isSavingProfile ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>

          {/* ===============================================================
              TOP FULL-WIDTH SECTION: PERSONAL INFO & TEAM SELF-SERVICE
             =============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
            <div>
              <label
                htmlFor="self-edit-name-input"
                className="block text-[11px] md:text-xs font-semibold text-[#00B4D8] mb-1"
              >
                Nama Lengkap Anda
              </label>
              <input
                id="self-edit-name-input"
                data-testid="self-edit-name-input"
                type="text"
                value={editName}
                onChange={(e) => {
                  markDirty();
                  setEditName(e.target.value);
                }}
                className={`w-full px-3 py-2 md:py-2.5 rounded-xl text-xs border ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label
                htmlFor="self-edit-password-input"
                className="block text-[11px] md:text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
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
                  onChange={(e) => {
                    markDirty();
                    setEditPassword(e.target.value);
                  }}
                  placeholder="Masukkan password baru (min. 6 karakter)"
                  className={`w-full px-3 py-2 md:py-2.5 pr-9 rounded-xl text-xs border ${
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

            <div>
              <label
                htmlFor="self-edit-supervisor-select"
                className="block text-[11px] md:text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Direct Supervisor (Report To)</span>
              </label>
              <select
                id="self-edit-supervisor-select"
                data-testid="self-edit-supervisor-select"
                value={editSupervisor}
                onChange={(e) => {
                  markDirty();
                  setEditSupervisor(e.target.value);
                }}
                className={`w-full px-3 py-2 md:py-2.5 rounded-xl text-xs border ${
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

            <div className="sm:col-span-2">
              <label
                htmlFor="self-edit-room-select"
                className="block text-[11px] md:text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Ruangan / Team Virtual Office</span>
              </label>
              <select
                id="self-edit-room-select"
                data-testid="self-edit-room-select"
                value={editRoomName}
                onChange={(e) => {
                  markDirty();
                  setEditRoomName(e.target.value as VirtualOfficeRoomName);
                }}
                className={`w-full px-3 py-2 md:py-2.5 rounded-xl text-xs border ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {VIRTUAL_OFFICE_ROOMS.map((room) => (
                  <option key={room.roomName} value={room.roomName}>
                    {formatRoomDisplayName(room.roomName)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="self-edit-avatar-color"
                className="block text-[11px] md:text-xs font-semibold text-[#00B4D8] mb-1 flex items-center gap-1"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Warna Badge Avatar 2D</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="self-edit-avatar-color"
                  type="color"
                  value={editAvatarColor}
                  onChange={(e) => {
                    markDirty();
                    setEditAvatarColor(e.target.value);
                  }}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono">{editAvatarColor}</span>
              </div>
            </div>
          </div>

          {/* ===============================================================
              BOTTOM SPACIOUS CARD: 3D AVATAR SETTINGS (COMPACT MOBILE / 2-COL DESKTOP)
             =============================================================== */}
          <div
            data-testid="avatar-3d-customization-panel"
            className={`mt-3.5 md:mt-6 p-3 sm:p-5 md:p-6 rounded-2xl border ${
              isDark
                ? 'bg-slate-900/90 border-slate-800'
                : 'bg-white border-slate-200'
            } space-y-3 md:space-y-5`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 md:pb-3 border-b border-slate-700/30">
              <div className="flex items-center gap-2 text-[#00B4D8]">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider font-display">
                  3D Avatar Settings
                </h4>
              </div>
              {isDirty && (
                <span className="text-[10px] font-mono text-amber-300">
                  Belum disimpan
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 md:gap-6 items-stretch">
              {/* Left 5 Cols: Real-Time 3D Avatar Preview */}
              <div className="lg:col-span-5">
                <RobloxAvatar3DPreviewCanvas
                  cfg={{
                    gender,
                    shirtColor,
                    outfitType,
                    hairStyle,
                    hairColor,
                    useHijab: gender === 'male' ? false : useHijab,
                    hijabColor,
                  }}
                />
              </div>

              {/* Right 7 Cols: Controls (Gender, Outfit, Shirt Color, Hijab / Hair Style & Color) */}
              <div className="lg:col-span-7 space-y-3 md:space-y-4 flex flex-col justify-between">
                {/* 1. Gender Avatar (Pria / Wanita) & 2. Model Baju (Outfit Type) */}
                <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                  <div>
                    <label className="block text-[11px] md:text-xs font-semibold mb-1 md:mb-1.5">
                      1. Gender Avatar
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                      <button
                        type="button"
                        data-testid="avatar-3d-gender-male"
                        onClick={() => handleSelectGender('male')}
                        className={`py-2 md:py-2.5 px-2 md:px-3 rounded-xl text-[11px] md:text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 md:gap-1.5 ${
                          gender === 'male'
                            ? 'bg-[#0277BD] text-white border-[#00B4D8] shadow-md'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <User className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                        <span>Pria</span>
                      </button>

                      <button
                        type="button"
                        data-testid="avatar-3d-gender-female"
                        onClick={() => handleSelectGender('female')}
                        className={`py-2 md:py-2.5 px-2 md:px-3 rounded-xl text-[11px] md:text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 md:gap-1.5 ${
                          gender === 'female'
                            ? 'bg-[#0277BD] text-white border-[#00B4D8] shadow-md'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <User className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                        <span>Wanita</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="avatar-3d-outfit-type-select"
                      className="block text-[11px] md:text-xs font-semibold mb-1 md:mb-1.5"
                    >
                      2. Model Baju
                    </label>
                    <select
                      id="avatar-3d-outfit-type-select"
                      data-testid="avatar-3d-outfit-type-select"
                      value={outfitType}
                      onChange={(e) => {
                        markDirty();
                        setOutfitType(e.target.value as AvatarOutfitType);
                      }}
                      className={`w-full px-2.5 md:px-3 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-semibold border ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="short_sleeve">Kaos Lengan Pendek</option>
                      <option value="formal_shirt">
                        Kemeja Formal (Kerah &amp; Kancing)
                      </option>
                      <option value="long_sleeve">Lengan Panjang</option>
                    </select>
                  </div>
                </div>

                {/* 3. Warna Baju 3D (Shirt Color) */}
                <div>
                  <label className="block text-[11px] md:text-xs font-semibold mb-1 md:mb-1.5">
                    3. Warna Baju 3D (Shirt Color):{' '}
                    <span className="font-mono text-[#00B4D8]">{shirtColor}</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    {SHIRT_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        title={preset.label}
                        data-testid={`shirt-color-preset-${preset.hex}`}
                        onClick={() => {
                          markDirty();
                          setShirtColor(preset.hex);
                        }}
                        className={`w-6 h-6 md:w-7 md:h-7 rounded-lg border transition-transform cursor-pointer ${
                          shirtColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'ring-2 ring-white scale-110 border-white'
                            : 'border-slate-700 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                    <input
                      type="color"
                      aria-label="Pilih Shirt Color Kustom"
                      data-testid="avatar-3d-shirt-color-input"
                      value={shirtColor}
                      onChange={(e) => {
                        markDirty();
                        setShirtColor(e.target.value);
                      }}
                      className="w-7 h-6 md:w-8 md:h-7 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                    />
                  </div>
                </div>

                {/* 4. Hijab 3D Toggle (ONLY shown when gender === 'female') */}
                {gender === 'female' && (
                  <div className="flex flex-row items-center justify-between gap-2 p-2.5 md:p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <p className="text-[11px] md:text-xs font-bold text-white">
                      4. Gunakan Hijab 3D
                    </p>
                    <div className="flex items-center gap-2">
                      {useHijab && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] md:text-[11px] text-slate-300 font-mono">
                            Warna:
                          </span>
                          <input
                            type="color"
                            aria-label="Warna Hijab 3D"
                            value={hijabColor}
                            onChange={(e) => {
                              markDirty();
                              setHijabColor(e.target.value);
                            }}
                            title="Pilih Warna Hijab"
                            className="w-6 h-6 md:w-7 md:h-7 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={useHijab}
                        data-testid="avatar-3d-hijab-toggle"
                        onClick={() => {
                          markDirty();
                          setUseHijab((prev) => !prev);
                        }}
                        className={`px-3 md:px-3.5 py-1.5 rounded-xl text-[11px] md:text-xs font-mono font-bold transition-colors cursor-pointer ${
                          useHijab
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {useHijab ? 'HIJAB: ON' : 'HIJAB: OFF'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Hair Style & Hair Color (Shown for Pria, or Wanita when Hijab is OFF) */}
                {(gender === 'male' || !useHijab) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4">
                    <div>
                      <label
                        htmlFor="avatar-3d-hair-style-select"
                        className="block text-[11px] md:text-xs font-semibold mb-1 md:mb-1.5"
                      >
                        {gender === 'male'
                          ? '4. Gaya Rambut Pria (Hair Style)'
                          : '5. Gaya Rambut Wanita (Hair Style)'}
                      </label>
                      <select
                        id="avatar-3d-hair-style-select"
                        data-testid="avatar-3d-hair-style-select"
                        value={hairStyle}
                        onChange={(e) => {
                          markDirty();
                          setHairStyle(e.target.value as AvatarHairStyle);
                        }}
                        className={`w-full px-2.5 md:px-3 py-2 md:py-2.5 rounded-xl text-[11px] md:text-xs font-semibold border ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      >
                        {(gender === 'male'
                          ? MALE_HAIR_OPTIONS
                          : FEMALE_HAIR_OPTIONS
                        ).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] md:text-xs font-semibold mb-1 md:mb-1.5">
                        {gender === 'male'
                          ? '5. Warna Rambut (Hair Color)'
                          : '6. Warna Rambut (Hair Color)'}
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 pt-0.5">
                        {HAIR_COLOR_PRESETS.map((hc) => (
                          <button
                            key={hc.hex}
                            type="button"
                            title={hc.label}
                            onClick={() => {
                              markDirty();
                              setHairColor(hc.hex);
                            }}
                            className={`w-6 h-6 rounded-lg border cursor-pointer ${
                              hairColor.toLowerCase() === hc.hex.toLowerCase()
                                ? 'ring-2 ring-[#00B4D8] border-white scale-110'
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
                          onChange={(e) => {
                            markDirty();
                            setHairColor(e.target.value);
                          }}
                          className="w-7 h-6 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Organizational Hierarchy Display: Direct Supervisor & Team Members (Direct Reports) */}
        <div
          data-testid="profile-direct-reports-section"
          className={`mt-4 md:mt-6 p-3.5 md:p-5 rounded-xl border ${
            isDark
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex flex-row items-center justify-between gap-2 pb-2.5 md:pb-3 border-b border-slate-700/30">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00B4D8]" />
              <h3 className="text-xs md:text-sm font-bold font-display">
                Team Members:
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] md:text-[11px] font-mono font-bold bg-[#00B4D8]/15 text-[#00B4D8]">
                {directReports.length} Personel
              </span>
            </div>
          </div>

          {directReports.length > 0 ? (
            <div className="mt-2.5 md:mt-3 space-y-2.5 md:space-y-3">
              <p
                data-testid="profile-direct-reports-names"
                className={`text-[11px] md:text-xs ${mutedText}`}
              >
                Anggota tim langsung di bawah supervisi{' '}
                <strong className="text-[#00B4D8]">{currentUser.name}</strong>:{' '}
                <span className="font-semibold text-emerald-400">
                  {directReports.map((m) => m.name).join(', ')}
                </span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-2.5">
                {directReports.map((member) => (
                  <div
                    key={member.staffId}
                    data-testid={`direct-report-item-${member.staffId}`}
                    className={`p-2.5 md:p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 md:gap-3 ${
                      isDark
                        ? 'bg-slate-900 border-slate-800'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{member.name}</p>
                      <p className={`text-[11px] truncate ${mutedText}`}>
                        {member.role} · {formatBranchDisplay(member.branch)}
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
              className={`text-[11px] md:text-xs mt-2.5 md:mt-3 font-mono ${mutedText}`}
            >
              Tidak ada personel yang melapor langsung ke {currentUser.name} (Individual Contributor).
            </p>
          )}
        </div>
      </div>

      {/* Floating / Sticky Save Bar when there are unsaved draft changes (ideal for Mobile & quick access) */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            data-testid="profile-sticky-save-bar"
            className={`no-print fixed bottom-3 inset-x-3 md:inset-x-auto md:right-6 md:bottom-6 z-40 rounded-2xl border-2 border-[#00B4D8]/60 px-3.5 py-2.5 md:px-4 md:py-3 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 ${
              isDark
                ? 'bg-slate-950/95 text-slate-100'
                : 'bg-white/95 text-slate-900'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#00B4D8] truncate">
                Perubahan belum disimpan
              </p>
              <p className={`text-[10px] truncate ${mutedText}`}>
                Tekan Save Profile untuk menyimpan ke Supabase
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={handleResetUnsavedDraft}
                className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                disabled={isSavingProfile}
                onClick={() => formRef.current?.requestSubmit()}
                data-testid="sticky-save-profile-btn"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0277BD] to-[#00B4D8] hover:opacity-95 disabled:opacity-60 flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

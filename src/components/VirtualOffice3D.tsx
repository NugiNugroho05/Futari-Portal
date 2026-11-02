import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StaffMemberRecord,
  VIRTUAL_OFFICE_ROOMS,
  VIRTUAL_OFFICE_BUILDINGS,
  VirtualOfficeBranchView,
  VirtualOfficeBuildingSpec,
  filterActiveWfoPersonnel,
  FUTARI_CYAN_HIGHLIGHT_HEX,
  getHighlightedAvatarHudData,
  resolveNextHighlightedStaffId,
  getStaffAvatar3DConfig,
  getDayNightLightingConfig,
  isBandungPersonnel,
  formatRealTimeHHMM,
  SupabaseAttendanceRow,
  isAttendanceRowActiveForToday,
  applyActiveAttendanceToStaffList,
} from '../utils/futariLogic';
import { supabase } from '../supabaseClient';
import {
  RotateCcw,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  X,
  MousePointerClick,
  Footprints,
  Building2,
  Sun,
  Sunset,
  Moon,
  Sunrise,
  Laptop,
  DoorOpen,
} from 'lucide-react';

interface VirtualOffice3DProps {
  staff?: StaffMemberRecord[];
  staffList?: StaffMemberRecord[];
  currentUserId?: string;
  isPresent?: boolean;
  onTogglePresent?: (nextPresent: boolean, targetStaffId: string) => void;
  selectedStaffId: string | null;
  onSelectStaff: (staffId: string | null) => void;
  newlyAddedStaffId?: string | null;
  walkInStaffId?: string | null;
  walkOutStaffId?: string | null;
  onWalkOutComplete?: (staffId: string) => void;
  onActiveAttendanceChange?: (
    activeAttendanceByEmail: Record<string, SupabaseAttendanceRow>
  ) => void;
  isDark: boolean;
}

const FUTARI_CYAN_THREE = new THREE.Color(FUTARI_CYAN_HIGHLIGHT_HEX);
const ZERO_EMISSIVE_THREE = new THREE.Color(0x000000);

/**
 * Safely disposes geometries, materials, and textures attached to a Three.js Object3D tree
 * while skipping any shared geometries or shared materials passed in the exclusion sets.
 * Prevents WebGL memory leaks when dynamically spawning/despawning 3D avatars or unmounting.
 */
function disposeObject3DResources(
  root: THREE.Object3D,
  sharedGeometries?: Set<THREE.BufferGeometry>,
  sharedMaterials?: Set<THREE.Material>
) {
  root.traverse((obj) => {
    const anyObj = obj as THREE.Mesh & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (
      anyObj.geometry &&
      (!sharedGeometries || !sharedGeometries.has(anyObj.geometry))
    ) {
      anyObj.geometry.dispose();
    }
    if (anyObj.material) {
      const mats = Array.isArray(anyObj.material)
        ? anyObj.material
        : [anyObj.material];
      for (const mat of mats) {
        if (!sharedMaterials || !sharedMaterials.has(mat)) {
          const matWithMap = mat as THREE.Material & {
            map?: THREE.Texture | null;
          };
          if (matWithMap.map) {
            matWithMap.map.dispose();
          }
          mat.dispose();
        }
      }
    }
  });
}

/**
 * Creates a crisp 2D CanvasTexture Sprite for floating employee Name & Role tags above 3D avatars.
 */
function createFloatingNameTagSprite(
  name: string,
  role: string,
  accentHex: string,
  isHighlighted: boolean
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = isHighlighted ? 'rgba(2, 119, 189, 0.95)' : 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isHighlighted ? '#00B4D8' : accentHex;
    ctx.lineWidth = isHighlighted ? 4 : 2;
    ctx.beginPath();
    ctx.roundRect(6, 6, 244, 52, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name.slice(0, 18), 128, 30);

    ctx.fillStyle = isHighlighted ? '#e0f2fe' : '#38bdf8';
    ctx.font = '600 13px monospace';
    ctx.fillText(role.slice(0, 22), 128, 48);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.1, 0.52, 1);
  return sprite;
}

/**
 * Creates a floating 3D architectural banner sprite for Building Titles & Entrance/Exit Doors.
 */
function createArchitecturalLabelSprite(
  title: string,
  subtitle: string,
  borderHex: string,
  scaleX = 3.6,
  scaleY = 0.85
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 384, 96);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = borderHex;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 80, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.slice(0, 28), 192, 42);

    ctx.fillStyle = borderHex;
    ctx.font = '600 15px monospace';
    ctx.fillText(subtitle.slice(0, 36), 192, 68);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  return sprite;
}

/**
 * Builds white BoxGeometry perimeter walls around a building platform,
 * leaving explicit doorway gaps on the front (+Z) wall for "Entrance Door" and "Exit Door".
 */
function buildBuildingPerimeterWallsWithDoors(
  spec: VirtualOfficeBuildingSpec,
  wallMat: THREE.Material,
  doorFrameMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const halfW = spec.width / 2;
  const halfD = spec.depth / 2;
  const h = spec.wallHeight;
  const t = spec.wallThickness;
  const wallY = h / 2;

  const minX = spec.centerX - halfW;
  const maxX = spec.centerX + halfW;
  const backZ = spec.centerZ - halfD;
  const frontZ = spec.centerZ + halfD;

  // 1. Back Wall (-Z): Continuous white BoxGeometry wall
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(spec.width + t, h, t),
    wallMat
  );
  backWall.position.set(spec.centerX, wallY, backZ);
  group.add(backWall);

  // 2. Left Wall (-X): Continuous white BoxGeometry wall
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(t, h, spec.depth),
    wallMat
  );
  leftWall.position.set(minX, wallY, spec.centerZ);
  group.add(leftWall);

  // 3. Right Wall (+X): Continuous white BoxGeometry wall
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(t, h, spec.depth),
    wallMat
  );
  rightWall.position.set(maxX, wallY, spec.centerZ);
  group.add(rightWall);

  // 4. Front Wall (+Z): Segmented around Entrance Door and Exit Door gaps
  const doors = [spec.entranceDoor, spec.exitDoor].sort((a, b) => a.x - b.x);
  const d1Left = doors[0].x - doors[0].width / 2;
  const d1Right = doors[0].x + doors[0].width / 2;
  const d2Left = doors[1].x - doors[1].width / 2;
  const d2Right = doors[1].x + doors[1].width / 2;

  const segments: Array<{ startX: number; endX: number }> = [
    { startX: minX, endX: d1Left },
    { startX: d1Right, endX: d2Left },
    { startX: d2Right, endX: maxX },
  ];

  segments.forEach((seg) => {
    const segLen = seg.endX - seg.startX;
    if (segLen > 0.1) {
      const segMesh = new THREE.Mesh(
        new THREE.BoxGeometry(segLen, h, t),
        wallMat
      );
      segMesh.position.set(seg.startX + segLen / 2, wallY, frontZ);
      group.add(segMesh);
    }
  });

  // Door Jamb Pillars & Threshold Mats for Entrance Door and Exit Door
  const jambGeo = new THREE.BoxGeometry(0.18, h + 0.18, t + 0.12);
  doors.forEach((door, idx) => {
    const isEntrance = idx === 0;
    const leftJamb = new THREE.Mesh(jambGeo, doorFrameMat);
    leftJamb.position.set(door.x - door.width / 2, wallY + 0.05, frontZ);
    group.add(leftJamb);

    const rightJamb = new THREE.Mesh(jambGeo, doorFrameMat);
    rightJamb.position.set(door.x + door.width / 2, wallY + 0.05, frontZ);
    group.add(rightJamb);

    // Threshold Floor Portal Pad
    const padMat = new THREE.MeshStandardMaterial({
      color: isEntrance ? 0x10b981 : 0xf43f5e,
      emissive: isEntrance ? 0x059669 : 0xe11d48,
      emissiveIntensity: 0.45,
      roughness: 0.35,
    });
    const padMesh = new THREE.Mesh(
      new THREE.BoxGeometry(door.width - 0.15, 0.05, 1.05),
      padMat
    );
    padMesh.position.set(door.x, 0.03, frontZ);
    group.add(padMesh);

    const doorSign = createArchitecturalLabelSprite(
      isEntrance ? 'ENTRANCE DOOR' : 'EXIT DOOR',
      spec.title,
      isEntrance ? '#10b981' : '#f43f5e',
      2.3,
      0.56
    );
    doorSign.position.set(door.x, h + 0.55, frontZ);
    group.add(doorSign);
  });

  return group;
}

export const VirtualOffice3D: React.FC<VirtualOffice3DProps> = ({
  staff: staffProp,
  staffList: staffListProp,
  currentUserId,
  selectedStaffId,
  onSelectStaff,
  newlyAddedStaffId = null,
  walkInStaffId = null,
  walkOutStaffId = null,
  onWalkOutComplete,
  onActiveAttendanceChange,
  isDark,
}) => {
  const staff = staffListProp || staffProp || [];
  const mountRef = useRef<HTMLDivElement | null>(null);
  const selectedStaffIdRef = useRef<string | null>(selectedStaffId);
  const staffRef = useRef<StaffMemberRecord[]>(staff);
  const onSelectStaffRef = useRef(onSelectStaff);
  const onWalkOutCompleteRef = useRef(onWalkOutComplete);
  const onActiveAttendanceChangeRef = useRef(onActiveAttendanceChange);
  onWalkOutCompleteRef.current = onWalkOutComplete;
  onActiveAttendanceChangeRef.current = onActiveAttendanceChange;

  // Live Active Attendance State from Supabase `attendance` table (check_in_time IS NOT NULL AND clock_out_time IS NULL)
  const [activeAttendanceByEmail, setActiveAttendanceByEmail] = useState<
    Record<string, SupabaseAttendanceRow>
  >({});
  const [hasLoadedSupabaseAttendance, setHasLoadedSupabaseAttendance] =
    useState<boolean>(false);
  const [realtimeSpawnedStaffId, setRealtimeSpawnedStaffId] = useState<
    string | null
  >(null);

  // Camera branch view state ('JAKARTA_HQ' | 'BANDUNG_BRANCH')
  const [activeBranchView, setActiveBranchView] =
    useState<VirtualOfficeBranchView>('JAKARTA_HQ');

  // Real-Time Live Clock updated every minute via setInterval
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const liveClockHHMM = useMemo(
    () => formatRealTimeHHMM(currentTime),
    [currentTime]
  );

  // Dynamic Day/Night Lighting Cycle tied strictly to the live real-time clock
  const effectiveHour = currentTime.getHours();
  const lightingConfig = useMemo(
    () => getDayNightLightingConfig(effectiveHour),
    [effectiveHour]
  );
  const lightingConfigRef = useRef(lightingConfig);
  lightingConfigRef.current = lightingConfig;

  const flyToBuildingFnRef = useRef<
    ((branchView: VirtualOfficeBranchView) => void) | null
  >(null);
  const triggerWalkAnimationRef = useRef<
    ((staffId: string, mode: 'walk_in' | 'walk_out') => void) | null
  >(null);
  const syncAvatarsFnRef = useRef<
    | ((
        nextStaffList: StaffMemberRecord[],
        opts?: {
          newlyAddedId?: string | null;
          walkInId?: string | null;
          walkOutId?: string | null;
          realtimeSpawnId?: string | null;
        }
      ) => void)
    | null
  >(null);

  const [walkingBannerText, setWalkingBannerText] = useState<string | null>(null);
  const [lastExitedStaffId, setLastExitedStaffId] = useState<string | null>(null);

  selectedStaffIdRef.current = selectedStaffId;
  staffRef.current = staff;
  onSelectStaffRef.current = onSelectStaff;

  // ---------------------------------------------------------------------------
  // 1. INITIAL LOAD (Today's Active Attendance Only) + 2. SUPABASE REALTIME SUBSCRIPTION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const loadTodayActiveAttendance = async () => {
      try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .gte('check_in_time', startOfToday.toISOString())
          .is('clock_out_time', null);

        if (!isMounted) return;

        if (!error && Array.isArray(data)) {
          const nextMap: Record<string, SupabaseAttendanceRow> = {};
          for (const rawRow of data as SupabaseAttendanceRow[]) {
            if (isAttendanceRowActiveForToday(rawRow)) {
              const emailKey = (rawRow.email || '').trim().toLowerCase();
              if (emailKey) {
                nextMap[emailKey] = rawRow;
              }
            }
          }
          setActiveAttendanceByEmail(nextMap);
          setHasLoadedSupabaseAttendance(true);
          onActiveAttendanceChangeRef.current?.(nextMap);
        } else {
          setHasLoadedSupabaseAttendance(true);
        }
      } catch {
        if (isMounted) {
          setHasLoadedSupabaseAttendance(true);
        }
      }
    };

    loadTodayActiveAttendance();

    // Subscribe to real-time INSERT (Check-In) and UPDATE (Clock-Out) events on the `attendance` table
    const attendanceChannel = supabase
      .channel('virtual-office-attendance-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          if (!isMounted) return;
          const newRow = payload.new as SupabaseAttendanceRow;
          const emailKey = (newRow?.email || '').trim().toLowerCase();
          if (!emailKey) return;

          if (isAttendanceRowActiveForToday(newRow)) {
            const matchedStaff = staffRef.current.find(
              (s) => (s.email || '').trim().toLowerCase() === emailKey
            );
            const targetStaffId =
              matchedStaff?.staffId || String(newRow.id ?? emailKey);
            setRealtimeSpawnedStaffId(targetStaffId);
            setWalkingBannerText(
              `${
                matchedStaff?.name || emailKey
              } baru saja Check-In! Avatar 3D hadir secara real-time di Virtual Office...`
            );
            setActiveAttendanceByEmail((prev) => {
              const next = {
                ...prev,
                [emailKey]: newRow,
              };
              onActiveAttendanceChangeRef.current?.(next);
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          if (!isMounted) return;
          const updatedRow = payload.new as SupabaseAttendanceRow;
          const emailKey = (updatedRow?.email || '').trim().toLowerCase();
          if (!emailKey) return;

          const hasClockOutTime =
            (updatedRow.clock_out_time !== null &&
              updatedRow.clock_out_time !== undefined &&
              String(updatedRow.clock_out_time).trim() !== '') ||
            (updatedRow.check_out_time !== null &&
              updatedRow.check_out_time !== undefined &&
              String(updatedRow.check_out_time).trim() !== '');

          if (hasClockOutTime || !isAttendanceRowActiveForToday(updatedRow)) {
            const matchedStaff = staffRef.current.find(
              (s) => (s.email || '').trim().toLowerCase() === emailKey
            );
            if (
              matchedStaff &&
              selectedStaffIdRef.current === matchedStaff.staffId
            ) {
              onSelectStaffRef.current(null);
            }
            if (matchedStaff) {
              setLastExitedStaffId(matchedStaff.staffId);
            }
            setWalkingBannerText(
              `${
                matchedStaff?.name || emailKey
              } telah Clock-Out. Avatar 3D dihapus secara real-time dari Virtual Office.`
            );
            setActiveAttendanceByEmail((prev) => {
              if (!(emailKey in prev)) return prev;
              const next = { ...prev };
              delete next[emailKey];
              onActiveAttendanceChangeRef.current?.(next);
              return next;
            });
          } else {
            setActiveAttendanceByEmail((prev) => {
              const next = {
                ...prev,
                [emailKey]: updatedRow,
              };
              onActiveAttendanceChangeRef.current?.(next);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(attendanceChannel);
    };
  }, []);

  // Merge active attendance records with staff list:
  // ONLY render a 3D avatar if the user has a check_in_time AND their clock_out_time is NULL for today
  // (or if they have an active local check-in state passed from the parent).
  const resolvedStaffWithRealtimePresence = useMemo<StaffMemberRecord[]>(() => {
    const mergedFromSupabase = applyActiveAttendanceToStaffList(
      staff,
      activeAttendanceByEmail
    );
    return mergedFromSupabase.map((member) => {
      if (member.workMode === 'WFO') {
        return member;
      }
      const original = staff.find((s) => s.staffId === member.staffId);
      if (
        original &&
        original.workMode === 'WFO' &&
        original.checkInTime &&
        original.checkInTime !== '-'
      ) {
        return original;
      }
      return member;
    });
  }, [staff, activeAttendanceByEmail]);

  const activeWfoStaff = useMemo(
    () => filterActiveWfoPersonnel(resolvedStaffWithRealtimePresence),
    [resolvedStaffWithRealtimePresence]
  );
  const sceneStaffToRender = activeWfoStaff;
  const sceneStaffToRenderRef = useRef<StaffMemberRecord[]>(sceneStaffToRender);
  sceneStaffToRenderRef.current = sceneStaffToRender;

  const isPresent = useMemo(
    () =>
      currentUserId
        ? activeWfoStaff.some((s) => s.staffId === currentUserId)
        : activeWfoStaff.length > 0,
    [activeWfoStaff, currentUserId]
  );

  const jakartaWfoCount = useMemo(
    () => activeWfoStaff.filter((s) => !isBandungPersonnel(s)).length,
    [activeWfoStaff]
  );
  const bandungWfoCount = useMemo(
    () => activeWfoStaff.filter((s) => isBandungPersonnel(s)).length,
    [activeWfoStaff]
  );

  // Live Attendance HUD Data for the currently highlighted avatar
  const highlightedHud = useMemo(
    () =>
      getHighlightedAvatarHudData(
        resolvedStaffWithRealtimePresence,
        selectedStaffId
      ),
    [resolvedStaffWithRealtimePresence, selectedStaffId]
  );

  // Trigger walk-in animation when walkInStaffId, newlyAddedStaffId, or realtimeSpawnedStaffId changes
  useEffect(() => {
    const targetId = walkInStaffId || newlyAddedStaffId || realtimeSpawnedStaffId;
    if (targetId && triggerWalkAnimationRef.current) {
      triggerWalkAnimationRef.current(targetId, 'walk_in');
    }
  }, [walkInStaffId, newlyAddedStaffId, realtimeSpawnedStaffId]);

  // Trigger walk-out animation when walkOutStaffId changes
  useEffect(() => {
    if (walkOutStaffId && triggerWalkAnimationRef.current) {
      triggerWalkAnimationRef.current(walkOutStaffId, 'walk_out');
    }
  }, [walkOutStaffId]);

  const handleSwitchBranchCamera = (targetBranch: VirtualOfficeBranchView) => {
    setActiveBranchView(targetBranch);
    flyToBuildingFnRef.current?.(targetBranch);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const initialLight = lightingConfigRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialLight.backgroundHex);
    scene.fog = new THREE.FogExp2(initialLight.fogHex, 0.011);

    const jktSpec = VIRTUAL_OFFICE_BUILDINGS.JAKARTA_HQ;
    const bdgSpec = VIRTUAL_OFFICE_BUILDINGS.BANDUNG_BRANCH;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 180);
    camera.position.set(
      jktSpec.cameraPosition.x,
      jktSpec.cameraPosition.y,
      jktSpec.cameraPosition.z
    );
    camera.lookAt(
      jktSpec.cameraTarget.x,
      jktSpec.cameraTarget.y,
      jktSpec.cameraTarget.z
    );

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software/i.test(rendererStr);

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // -------------------------------------------------------------------------
    // 1. FREE 3D NAVIGATION + SMOOTH CAMERA INTERPOLATION BETWEEN BRANCHES
    // -------------------------------------------------------------------------
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 65;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.target.set(
      jktSpec.cameraTarget.x,
      jktSpec.cameraTarget.y,
      jktSpec.cameraTarget.z
    );
    controls.update();

    // Smooth camera fly state
    let cameraFlyGoal: {
      pos: THREE.Vector3;
      target: THREE.Vector3;
    } | null = null;

    // Cancel camera fly if user manually drags OrbitControls
    const handleControlsStart = () => {
      cameraFlyGoal = null;
    };
    controls.addEventListener('start', handleControlsStart);

    flyToBuildingFnRef.current = (branchView: VirtualOfficeBranchView) => {
      const targetSpec = VIRTUAL_OFFICE_BUILDINGS[branchView];
      cameraFlyGoal = {
        pos: new THREE.Vector3(
          targetSpec.cameraPosition.x,
          targetSpec.cameraPosition.y,
          targetSpec.cameraPosition.z
        ),
        target: new THREE.Vector3(
          targetSpec.cameraTarget.x,
          targetSpec.cameraTarget.y,
          targetSpec.cameraTarget.z
        ),
      };
    };

    // -------------------------------------------------------------------------
    // 2. DYNAMIC DAY/NIGHT LIGHTING RIG (Bound to getDayNightLightingConfig)
    // -------------------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(
      initialLight.ambientLightHex,
      initialLight.ambientIntensity
    );
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      initialLight.hemiSkyHex,
      initialLight.hemiGroundHex,
      initialLight.hemiIntensity
    );
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(
      initialLight.directionalLightHex,
      initialLight.directionalIntensity
    );
    dirLight.position.set(...initialLight.directionalPosition);
    scene.add(dirLight);

    const jktIndoorLight = new THREE.PointLight(0x00b4d8, 1.35, 34);
    jktIndoorLight.position.set(0, 8.5, 0);
    scene.add(jktIndoorLight);

    const bdgIndoorLight = new THREE.PointLight(0x00b4d8, 1.35, 22);
    bdgIndoorLight.position.set(bdgSpec.centerX, 7.5, bdgSpec.centerZ);
    scene.add(bdgIndoorLight);

    // -------------------------------------------------------------------------
    // 3. TWO DISTINCT BUILDINGS/PLATFORMS: JAKARTA HQ & BANDUNG BRANCH
    // -------------------------------------------------------------------------
    const whiteWallMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.42,
      metalness: 0.08,
    });
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      metalness: 0.35,
    });

    // --- BUILDING A: JAKARTA HQ (Center X = 0, Z = 0.2) ---
    const jktFloorMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0x1e293b,
      roughness: 0.82,
      metalness: 0.12,
    });
    const jktFloor = new THREE.Mesh(
      new THREE.BoxGeometry(jktSpec.width, 0.35, jktSpec.depth),
      jktFloorMat
    );
    jktFloor.position.set(jktSpec.centerX, -0.18, jktSpec.centerZ);
    scene.add(jktFloor);

    const jktGrid = new THREE.GridHelper(
      24,
      24,
      0x0277bd,
      isDark ? 0x1e293b : 0x334155
    );
    jktGrid.position.set(jktSpec.centerX, 0.01, jktSpec.centerZ);
    scene.add(jktGrid);

    // Jakarta HQ Perimeter White Walls with Entrance Door & Exit Door gaps
    const jktWalls = buildBuildingPerimeterWallsWithDoors(
      jktSpec,
      whiteWallMat,
      doorFrameMat
    );
    scene.add(jktWalls);

    const jktBanner = createArchitecturalLabelSprite(
      'GEDUNG JAKARTA HQ (8 ZONA)',
      'Jl. Nusa Indah No.33, Cipete Selatan',
      '#00B4D8',
      5.2,
      1.15
    );
    jktBanner.position.set(jktSpec.centerX, 3.3, jktSpec.centerZ - jktSpec.depth / 2);
    scene.add(jktBanner);

    // --- BUILDING B: BANDUNG BRANCH (Separated in 3D Space at Center X = 28, Z = 0) ---
    const bdgFloorMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x0f172a : 0x1e293b,
      roughness: 0.82,
      metalness: 0.12,
    });
    const bdgFloor = new THREE.Mesh(
      new THREE.BoxGeometry(bdgSpec.width, 0.35, bdgSpec.depth),
      bdgFloorMat
    );
    bdgFloor.position.set(bdgSpec.centerX, -0.18, bdgSpec.centerZ);
    scene.add(bdgFloor);

    const bdgGrid = new THREE.GridHelper(
      11,
      11,
      0x00b4d8,
      isDark ? 0x1e293b : 0x334155
    );
    bdgGrid.position.set(bdgSpec.centerX, 0.01, bdgSpec.centerZ);
    scene.add(bdgGrid);

    // Bandung Branch Perimeter White Walls with Entrance Door & Exit Door gaps
    const bdgWalls = buildBuildingPerimeterWallsWithDoors(
      bdgSpec,
      whiteWallMat,
      doorFrameMat
    );
    scene.add(bdgWalls);

    const bdgBanner = createArchitecturalLabelSprite(
      'BANDUNG BRANCH HUB',
      'Jl. Braga No.42 · Alfian & Yanti',
      '#00B4D8',
      4.4,
      1.05
    );
    bdgBanner.position.set(bdgSpec.centerX, 3.1, bdgSpec.centerZ - bdgSpec.depth / 2);
    scene.add(bdgBanner);

    // Subtle Inter-Branch Connector Walkway / Plaza Markers between Jakarta HQ (X=12.4) and Bandung Branch (X=22.2)
    for (let stepX = 14.0; stepX <= 20.5; stepX += 1.6) {
      const paver = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.08, 1.4),
        new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x0277bd,
          emissiveIntensity: 0.3,
          roughness: 0.4,
        })
      );
      paver.position.set(stepX, -0.05, 0);
      scene.add(paver);
    }

    // -------------------------------------------------------------------------
    // 4. RENDER ARCHITECTURAL ROOM ZONES INSIDE JAKARTA HQ (8 ZONES) & BANDUNG (1 ZONE)
    // -------------------------------------------------------------------------
    VIRTUAL_OFFICE_ROOMS.forEach((room) => {
      const { centerX, centerZ, width: rW, depth: rD } = room.floorBounds;
      const roomColor = new THREE.Color(room.accentColor);

      const zoneGeo = new THREE.BoxGeometry(rW, 0.06, rD);
      const zoneMat = new THREE.MeshStandardMaterial({
        color: roomColor,
        roughness: 0.65,
        metalness: 0.15,
        transparent: true,
        opacity: isDark ? 0.24 : 0.32,
      });
      const zonePad = new THREE.Mesh(zoneGeo, zoneMat);
      zonePad.position.set(centerX, 0.03, centerZ);
      scene.add(zonePad);

      // Low interior glass/partition border for each zone
      const wallThickness = 0.08;
      const wallHeight = 0.42;
      const interiorPartitionMat = new THREE.MeshStandardMaterial({
        color: roomColor,
        roughness: 0.35,
        metalness: 0.3,
        transparent: true,
        opacity: 0.55,
      });

      const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(rW, wallHeight, wallThickness),
        interiorPartitionMat
      );
      northWall.position.set(centerX, wallHeight / 2, centerZ - rD / 2);
      scene.add(northWall);

      const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, rD),
        interiorPartitionMat
      );
      westWall.position.set(centerX - rW / 2, wallHeight / 2, centerZ);
      scene.add(westWall);

      const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, rD),
        interiorPartitionMat
      );
      eastWall.position.set(centerX + rW / 2, wallHeight / 2, centerZ);
      scene.add(eastWall);
    });

    // -------------------------------------------------------------------------
    // 5. DESKS + OPEN "LAPTOP" MESHES + CUSTOMIZABLE 3D AVATARS
    // -------------------------------------------------------------------------
    const deskTopGeo = new THREE.BoxGeometry(1.38, 0.08, 0.78);
    const deskLegGeo = new THREE.BoxGeometry(0.08, 0.58, 0.68);
    const chairSeatGeo = new THREE.BoxGeometry(0.52, 0.08, 0.52);
    const chairBackGeo = new THREE.BoxGeometry(0.52, 0.52, 0.08);

    // Open Laptop Mesh Geometries (Base Keyboard Deck + Hinged Lid + Glowing Display)
    const laptopBaseGeo = new THREE.BoxGeometry(0.46, 0.024, 0.32);
    const laptopKeyboardGeo = new THREE.BoxGeometry(0.38, 0.008, 0.18);
    const laptopLidGeo = new THREE.BoxGeometry(0.46, 0.30, 0.018);
    const laptopScreenGeo = new THREE.PlaneGeometry(0.41, 0.25);

    const torsoGeo = new THREE.CapsuleGeometry(0.23, 0.36, 8, 16);
    const headGeo = new THREE.SphereGeometry(0.19, 16, 16);
    const shortHairGeo = new THREE.SphereGeometry(
      0.202,
      16,
      12,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.58
    );
    const partedHairGeo = new THREE.BoxGeometry(0.36, 0.12, 0.34);
    const longHairBackGeo = new THREE.BoxGeometry(0.36, 0.36, 0.16);
    const bunHairGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const hijabHoodGeo = new THREE.SphereGeometry(0.215, 16, 16);
    const hijabDrapeGeo = new THREE.ConeGeometry(0.26, 0.32, 16);
    const plumbobGeo = new THREE.OctahedronGeometry(0.11, 0);
    const ringGeo = new THREE.RingGeometry(0.34, 0.48, 28);

    const deskTopMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0xf8fafc,
      roughness: 0.45,
      metalness: 0.15,
    });
    const deskLegMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
      metalness: 0.4,
    });
    const laptopBodyMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.25,
      metalness: 0.75,
    });
    const laptopKeyboardMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.2,
    });
    const laptopScreenMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00b4d8,
      emissiveIntensity: initialLight.laptopScreenEmissiveIntensity,
      roughness: 0.15,
    });

    const sharedGeometries = new Set<THREE.BufferGeometry>([
      deskTopGeo,
      deskLegGeo,
      chairSeatGeo,
      chairBackGeo,
      laptopBaseGeo,
      laptopKeyboardGeo,
      laptopLidGeo,
      laptopScreenGeo,
      torsoGeo,
      headGeo,
      shortHairGeo,
      partedHairGeo,
      longHairBackGeo,
      bunHairGeo,
      hijabHoodGeo,
      hijabDrapeGeo,
      plumbobGeo,
      ringGeo,
    ]);

    const sharedMaterials = new Set<THREE.Material>([
      whiteWallMat,
      doorFrameMat,
      jktFloorMat,
      bdgFloorMat,
      deskTopMat,
      deskLegMat,
      laptopBodyMat,
      laptopKeyboardMat,
      laptopScreenMat,
    ]);

    interface AvatarEntry {
      staffId: string;
      staffName: string;
      isBandung: boolean;
      deskRootGroup: THREE.Group;
      avatarActorGroup: THREE.Group;
      bodyMat: THREE.MeshStandardMaterial;
      headMat: THREE.MeshStandardMaterial;
      plumbobMesh: THREE.Mesh;
      plumbobMat: THREE.MeshStandardMaterial;
      ringMesh: THREE.Mesh;
      ringMat: THREE.MeshBasicMaterial;
      homeX: number;
      homeZ: number;
      entranceX: number;
      entranceZ: number;
      exitX: number;
      exitZ: number;
      spawnProgress: number;
      walkMode: 'idle' | 'walk_in' | 'walk_out' | 'exited';
      walkProgress: number;
      clickableMeshes: THREE.Object3D[];
    }

    const avatarEntriesMap = new Map<string, AvatarEntry>();
    let interactableMeshes: THREE.Object3D[] = [];

    const rebuildInteractableMeshes = () => {
      const nextMeshes: THREE.Object3D[] = [];
      avatarEntriesMap.forEach((entry) => {
        nextMeshes.push(...entry.clickableMeshes);
      });
      interactableMeshes = nextMeshes;
    };

    const removeAndDisposeAvatarEntry = (staffId: string) => {
      const existing = avatarEntriesMap.get(staffId);
      if (!existing) return;
      scene.remove(existing.deskRootGroup);
      scene.remove(existing.avatarActorGroup);
      disposeObject3DResources(
        existing.deskRootGroup,
        sharedGeometries,
        sharedMaterials
      );
      disposeObject3DResources(
        existing.avatarActorGroup,
        sharedGeometries,
        sharedMaterials
      );
      avatarEntriesMap.delete(staffId);
    };

    const createAndSpawnAvatarEntry = (
      person: StaffMemberRecord,
      opts?: {
        newlyAddedId?: string | null;
        walkInId?: string | null;
        walkOutId?: string | null;
        realtimeSpawnId?: string | null;
      }
    ) => {
      const inBandung = isBandungPersonnel(person);
      const buildingSpec = inBandung ? bdgSpec : jktSpec;

      const { x, z } = person.deskCoords;
      const cfg3D = getStaffAvatar3DConfig(person);
      const shirtColorThree = new THREE.Color(cfg3D.shirtColor);
      const hairColorThree = new THREE.Color(cfg3D.hairColor);
      const hijabColorThree = new THREE.Color(
        cfg3D.hijabColor || cfg3D.shirtColor
      );

      // A. Desk & Chair Stationary Group + Open Laptop Mesh
      const deskRootGroup = new THREE.Group();
      deskRootGroup.position.set(x, 0, z);

      const isNewlySpawned =
        person.staffId === opts?.newlyAddedId ||
        person.staffId === opts?.realtimeSpawnId;
      const isWalkInTarget =
        person.staffId === opts?.walkInId ||
        person.staffId === opts?.realtimeSpawnId;
      const isWalkOutTarget = person.staffId === opts?.walkOutId;
      if (isNewlySpawned) {
        deskRootGroup.scale.set(0.05, 0.05, 0.05);
      }

      const deskTop = new THREE.Mesh(deskTopGeo, deskTopMat);
      deskTop.position.set(0, 0.6, -0.25);
      deskRootGroup.add(deskTop);

      const leftLeg = new THREE.Mesh(deskLegGeo, deskLegMat);
      leftLeg.position.set(-0.56, 0.29, -0.25);
      deskRootGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(deskLegGeo, deskLegMat);
      rightLeg.position.set(0.56, 0.29, -0.25);
      deskRootGroup.add(rightLeg);

      // OPEN LAPTOP MESH on every spawned desk
      const laptopGroup = new THREE.Group();
      laptopGroup.position.set(0, 0.652, -0.24);
      laptopGroup.userData = {
        isLaptopMesh: true,
        staffId: person.staffId,
      };

      const laptopBase = new THREE.Mesh(laptopBaseGeo, laptopBodyMat);
      laptopGroup.add(laptopBase);

      const laptopKeys = new THREE.Mesh(laptopKeyboardGeo, laptopKeyboardMat);
      laptopKeys.position.set(0, 0.014, 0.02);
      laptopGroup.add(laptopKeys);

      const laptopLidPivot = new THREE.Group();
      laptopLidPivot.position.set(0, 0.012, -0.15);
      laptopLidPivot.rotation.x = -0.28;

      const laptopLid = new THREE.Mesh(laptopLidGeo, laptopBodyMat);
      laptopLid.position.set(0, 0.15, 0);
      laptopLidPivot.add(laptopLid);

      const laptopDisplay = new THREE.Mesh(laptopScreenGeo, laptopScreenMat);
      laptopDisplay.position.set(0, 0.15, 0.011);
      laptopLidPivot.add(laptopDisplay);

      laptopGroup.add(laptopLidPivot);
      deskRootGroup.add(laptopGroup);

      // Ergonomic Chair
      const chairMat = new THREE.MeshStandardMaterial({
        color: shirtColorThree,
        roughness: 0.5,
        metalness: 0.2,
      });
      const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
      chairSeat.position.set(0, 0.36, 0.28);
      deskRootGroup.add(chairSeat);

      const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
      chairBack.position.set(0, 0.65, 0.52);
      deskRootGroup.add(chairBack);

      scene.add(deskRootGroup);

      // B. Walking & Interactive 3D Avatar Actor Group
      const avatarActorGroup = new THREE.Group();
      const homeX = x;
      const homeZ = z + 0.28;
      const entranceX = buildingSpec.entranceDoor.x;
      const entranceZ = buildingSpec.entranceDoor.z;
      const exitX = buildingSpec.exitDoor.x;
      const exitZ = buildingSpec.exitDoor.z;

      const startWalkIn = isWalkInTarget || isNewlySpawned;
      avatarActorGroup.position.set(
        startWalkIn ? entranceX : homeX,
        0,
        startWalkIn ? entranceZ : homeZ
      );
      scene.add(avatarActorGroup);

      const clickableMeshes: THREE.Object3D[] = [];

      // Selection floor halo ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: FUTARI_CYAN_THREE,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(0, 0.03, 0);
      avatarActorGroup.add(ringMesh);

      // 1. Torso
      const bodyMat = new THREE.MeshStandardMaterial({
        color: shirtColorThree,
        emissive: ZERO_EMISSIVE_THREE,
        emissiveIntensity: 0,
        roughness: 0.38,
        metalness: 0.15,
      });
      const bodyMesh = new THREE.Mesh(torsoGeo, bodyMat);
      bodyMesh.position.set(0, 0.68, 0);
      bodyMesh.userData = { staffId: person.staffId };
      avatarActorGroup.add(bodyMesh);
      clickableMeshes.push(bodyMesh);

      // 2. Head
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: ZERO_EMISSIVE_THREE,
        emissiveIntensity: 0,
        roughness: 0.45,
        metalness: 0.05,
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.set(0, 1.09, 0);
      headMesh.userData = { staffId: person.staffId };
      avatarActorGroup.add(headMesh);
      clickableMeshes.push(headMesh);

      // 3. Hair or Hijab Mesh
      if (cfg3D.useHijab) {
        const hijabMat = new THREE.MeshStandardMaterial({
          color: hijabColorThree,
          roughness: 0.45,
          metalness: 0.1,
        });
        const hijabHood = new THREE.Mesh(hijabHoodGeo, hijabMat);
        hijabHood.position.set(0, 1.1, 0.02);
        hijabHood.scale.set(1.02, 1.05, 1.06);
        hijabHood.userData = { staffId: person.staffId };
        avatarActorGroup.add(hijabHood);
        clickableMeshes.push(hijabHood);

        const hijabDrape = new THREE.Mesh(hijabDrapeGeo, hijabMat);
        hijabDrape.position.set(0, 0.94, 0.02);
        hijabDrape.userData = { staffId: person.staffId };
        avatarActorGroup.add(hijabDrape);
      } else {
        const hairMat = new THREE.MeshStandardMaterial({
          color: hairColorThree,
          roughness: 0.55,
          metalness: 0.1,
        });

        const hairCap = new THREE.Mesh(shortHairGeo, hairMat);
        hairCap.position.set(0, 1.11, 0);
        hairCap.userData = { staffId: person.staffId };
        avatarActorGroup.add(hairCap);

        if (cfg3D.hairStyle === 'parted') {
          const partedCrest = new THREE.Mesh(partedHairGeo, hairMat);
          partedCrest.position.set(0.03, 1.24, -0.02);
          partedCrest.rotation.z = -0.12;
          avatarActorGroup.add(partedCrest);
        } else if (cfg3D.hairStyle === 'long') {
          const longBack = new THREE.Mesh(longHairBackGeo, hairMat);
          longBack.position.set(0, 0.98, 0.12);
          avatarActorGroup.add(longBack);
        } else if (cfg3D.hairStyle === 'bun') {
          const topBun = new THREE.Mesh(bunHairGeo, hairMat);
          topBun.position.set(0, 1.31, 0.06);
          avatarActorGroup.add(topBun);
        }
      }

      // 4. Sims-Like Floating Plumbob Crystal + Persistent Name Tag Sprite
      const plumbobMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.55,
        roughness: 0.2,
      });
      const plumbobMesh = new THREE.Mesh(plumbobGeo, plumbobMat);
      plumbobMesh.position.set(0, 1.52, 0);
      plumbobMesh.scale.set(0.75, 1.25, 0.75);
      plumbobMesh.userData = { staffId: person.staffId };
      avatarActorGroup.add(plumbobMesh);
      clickableMeshes.push(plumbobMesh);

      const nameSprite = createFloatingNameTagSprite(
        person.name,
        person.role,
        cfg3D.shirtColor,
        person.staffId === selectedStaffIdRef.current
      );
      nameSprite.position.set(0, 1.92, 0);
      nameSprite.userData = { staffId: person.staffId };
      avatarActorGroup.add(nameSprite);

      avatarEntriesMap.set(person.staffId, {
        staffId: person.staffId,
        staffName: person.name,
        isBandung: inBandung,
        deskRootGroup,
        avatarActorGroup,
        bodyMat,
        headMat,
        plumbobMesh,
        plumbobMat,
        ringMesh,
        ringMat,
        homeX,
        homeZ,
        entranceX,
        entranceZ,
        exitX,
        exitZ,
        spawnProgress: isNewlySpawned ? 0.01 : 1,
        walkMode: isWalkOutTarget
          ? 'walk_out'
          : startWalkIn
          ? 'walk_in'
          : 'idle',
        walkProgress: isWalkOutTarget || startWalkIn ? 0.0 : 1,
        clickableMeshes,
      });
    };

    const syncAvatarsInScene = (
      nextStaffList: StaffMemberRecord[],
      opts?: {
        newlyAddedId?: string | null;
        walkInId?: string | null;
        walkOutId?: string | null;
        realtimeSpawnId?: string | null;
      }
    ) => {
      const nextIds = new Set(nextStaffList.map((p) => p.staffId));

      // 1. Remove & dispose any avatars that clocked out / are no longer active
      Array.from(avatarEntriesMap.keys()).forEach((existingId) => {
        if (!nextIds.has(existingId)) {
          removeAndDisposeAvatarEntry(existingId);
        }
      });

      // 2. Spawn any newly checked-in avatars
      nextStaffList.forEach((person) => {
        if (!avatarEntriesMap.has(person.staffId)) {
          createAndSpawnAvatarEntry(person, opts);
        }
      });

      rebuildInteractableMeshes();
    };

    syncAvatarsFnRef.current = syncAvatarsInScene;
    syncAvatarsInScene(sceneStaffToRenderRef.current, {
      newlyAddedId: newlyAddedStaffId,
      walkInId: walkInStaffId,
      walkOutId: walkOutStaffId,
      realtimeSpawnId: realtimeSpawnedStaffId,
    });

    // Expose Walk-In (Entrance Door -> Desk) & Walk-Out (Desk -> Exit Door -> Disappear) Animation Trigger
    triggerWalkAnimationRef.current = (
      targetStaffId: string,
      mode: 'walk_in' | 'walk_out'
    ) => {
      const entry = avatarEntriesMap.get(targetStaffId);
      if (entry) {
        entry.avatarActorGroup.visible = true;
        entry.deskRootGroup.visible = true;
        entry.walkMode = mode;
        entry.walkProgress = 0.0;
        if (mode === 'walk_in') {
          entry.spawnProgress = 0.05;
        }
        const bldgLabel = entry.isBandung ? 'Bandung Branch' : 'Jakarta HQ';
        setWalkingBannerText(
          mode === 'walk_in'
            ? `${entry.staffName} berjalan masuk dari Entrance Door (${bldgLabel}) menuju meja & Laptop kerjanya...`
            : `${entry.staffName} berdiri dari kursi, berjalan menuju Exit Door (${bldgLabel}), dan keluar dari 3D Virtual Office...`
        );
        setTimeout(() => {
          setWalkingBannerText(null);
        }, 3200);
      }
    };

    // -------------------------------------------------------------------------
    // 6. RAYCASTING CLICK HANDLER (Distinguish Click from OrbitControls Drag)
    // -------------------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(interactableMeshes, false);

      const clickedStaffId =
        intersects.length > 0 && intersects[0].object.userData?.staffId
          ? (intersects[0].object.userData.staffId as string)
          : null;

      const nextSelected = resolveNextHighlightedStaffId(
        selectedStaffIdRef.current,
        clickedStaffId,
        staffRef.current
      );
      onSelectStaffRef.current(nextSelected);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // -------------------------------------------------------------------------
    // 7. ANIMATION LOOP (Camera Branch Fly, Day/Night Cycle, Entrance/Exit Walk)
    // -------------------------------------------------------------------------
    let animId = 0;
    const clock = new THREE.Clock();
    const targetBgColor = new THREE.Color();
    const targetAmbientColor = new THREE.Color();
    const targetDirColor = new THREE.Color();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // A. Smooth Camera Interpolation between Jakarta HQ & Bandung Branch
      if (cameraFlyGoal) {
        const dampAlpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(cameraFlyGoal.pos, dampAlpha);
        controls.target.lerp(cameraFlyGoal.target, dampAlpha);
        if (
          camera.position.distanceTo(cameraFlyGoal.pos) < 0.08 &&
          controls.target.distanceTo(cameraFlyGoal.target) < 0.08
        ) {
          camera.position.copy(cameraFlyGoal.pos);
          controls.target.copy(cameraFlyGoal.target);
          cameraFlyGoal = null;
        }
      }

      controls.update();

      // B. Dynamic Day/Night Lighting Interpolation
      const activeLight = lightingConfigRef.current;
      const lightAlpha = 1 - Math.exp(-4.0 * dt);
      targetBgColor.set(activeLight.backgroundHex);
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(targetBgColor, lightAlpha);
      }
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(targetBgColor, lightAlpha);
      }
      targetAmbientColor.set(activeLight.ambientLightHex);
      ambientLight.color.lerp(targetAmbientColor, lightAlpha);
      ambientLight.intensity = THREE.MathUtils.lerp(
        ambientLight.intensity,
        activeLight.ambientIntensity,
        lightAlpha
      );

      targetDirColor.set(activeLight.directionalLightHex);
      dirLight.color.lerp(targetDirColor, lightAlpha);
      dirLight.intensity = THREE.MathUtils.lerp(
        dirLight.intensity,
        activeLight.directionalIntensity,
        lightAlpha
      );
      dirLight.position.set(...activeLight.directionalPosition);
      laptopScreenMat.emissiveIntensity =
        activeLight.laptopScreenEmissiveIntensity;

      const activeSelectedId = selectedStaffIdRef.current;

      let idx = 0;
      avatarEntriesMap.forEach((entry) => {
        const i = idx++;
        const isHighlighted = entry.staffId === activeSelectedId;

        // 1. Elastic Desk Spawn Animation when new user is added
        if (entry.spawnProgress < 1) {
          entry.spawnProgress = Math.min(1, entry.spawnProgress + dt * 1.8);
          const p = entry.spawnProgress;
          const elasticScale =
            p === 1
              ? 1
              : Math.pow(2, -10 * p) *
                  Math.sin(((p * 10 - 0.75) * (2 * Math.PI)) / 3) +
                1;
          const clampedScale = Math.max(0.05, elasticScale);
          entry.deskRootGroup.scale.set(
            clampedScale,
            clampedScale,
            clampedScale
          );
        }

        // 2. Entrance Door -> Desk (walk_in) OR Stand Up -> Walk to Exit Door -> Disappear (walk_out)
        if (entry.walkMode === 'exited') {
          entry.avatarActorGroup.visible = false;
          entry.deskRootGroup.visible = false;
        } else if (entry.walkProgress < 1) {
          entry.walkProgress = Math.min(1, entry.walkProgress + dt * 0.85);
          const w = entry.walkProgress;
          const smoothW = w * w * (3 - 2 * w);

          const startX =
            entry.walkMode === 'walk_out' ? entry.homeX : entry.entranceX;
          const startZ =
            entry.walkMode === 'walk_out' ? entry.homeZ : entry.entranceZ;
          const endX =
            entry.walkMode === 'walk_out' ? entry.exitX : entry.homeX;
          const endZ =
            entry.walkMode === 'walk_out' ? entry.exitZ : entry.homeZ;

          const curX = THREE.MathUtils.lerp(startX, endX, smoothW);
          const curZ = THREE.MathUtils.lerp(startZ, endZ, smoothW);
          const standUpLift = entry.walkMode === 'walk_out' ? 0.14 : 0;
          const stepBob =
            Math.abs(Math.sin(w * Math.PI * 10)) * 0.18 * (1 - w) + standUpLift;
          entry.avatarActorGroup.position.set(curX, stepBob, curZ);
          entry.avatarActorGroup.rotation.y =
            Math.sin(w * Math.PI * 10) * 0.12 * (1 - w);

          if (entry.walkProgress >= 1 && entry.walkMode === 'walk_out') {
            entry.walkMode = 'exited';
            entry.avatarActorGroup.position.set(entry.exitX, 0, entry.exitZ + 1.5);
            entry.avatarActorGroup.visible = false;
            entry.deskRootGroup.visible = false;
            setLastExitedStaffId(entry.staffId);
            setWalkingBannerText(null);
            onWalkOutCompleteRef.current?.(entry.staffId);
          }
        } else {
          const idleBob = Math.sin(elapsed * 2.4 + i * 0.7) * 0.025;
          const highlightLift = isHighlighted ? 0.08 : 0;
          entry.avatarActorGroup.position.set(
            entry.homeX,
            idleBob + highlightLift,
            entry.homeZ
          );
          entry.avatarActorGroup.rotation.y = 0;
        }

        // 3. Plumbob rotation & Highlight emissive color (#00B4D8)
        entry.plumbobMesh.rotation.y = elapsed * 1.8 + i;
        if (isHighlighted) {
          entry.bodyMat.emissive.copy(FUTARI_CYAN_THREE);
          entry.bodyMat.emissiveIntensity =
            0.65 + Math.sin(elapsed * 5.0) * 0.2;
          entry.headMat.emissive.copy(FUTARI_CYAN_THREE);
          entry.headMat.emissiveIntensity = 0.35;
          entry.plumbobMat.color.copy(FUTARI_CYAN_THREE);
          entry.plumbobMat.emissive.copy(FUTARI_CYAN_THREE);
          entry.plumbobMat.emissiveIntensity = 0.95;

          const pulseScale = 1.0 + Math.sin(elapsed * 4.5) * 0.12;
          entry.ringMesh.scale.set(pulseScale, pulseScale, 1);
          entry.ringMat.opacity = 0.95;
        } else {
          entry.bodyMat.emissive.copy(ZERO_EMISSIVE_THREE);
          entry.bodyMat.emissiveIntensity = 0;
          entry.headMat.emissive.copy(ZERO_EMISSIVE_THREE);
          entry.headMat.emissiveIntensity = 0;
          entry.plumbobMat.color.setHex(0x10b981);
          entry.plumbobMat.emissive.setHex(0x10b981);
          entry.plumbobMat.emissiveIntensity = 0.5;
          entry.ringMat.opacity = 0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      syncAvatarsFnRef.current = null;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', handleControlsStart);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      disposeObject3DResources(scene);
      sharedGeometries.forEach((geo) => geo.dispose());
      sharedMaterials.forEach((mat) => mat.dispose());
      controls.dispose();
      renderer.dispose();
    };
  }, [isDark]);

  // Dynamically spawn/despawn 3D avatars in place when attendance state changes
  useEffect(() => {
    syncAvatarsFnRef.current?.(sceneStaffToRender, {
      newlyAddedId: newlyAddedStaffId,
      walkInId: walkInStaffId,
      walkOutId: walkOutStaffId,
      realtimeSpawnId: realtimeSpawnedStaffId,
    });
  }, [
    sceneStaffToRender,
    newlyAddedStaffId,
    walkInStaffId,
    walkOutStaffId,
    realtimeSpawnedStaffId,
  ]);

  const PhaseIcon =
    lightingConfig.phase === 'Morning'
      ? Sunrise
      : lightingConfig.phase === 'Day'
      ? Sun
      : lightingConfig.phase === 'Afternoon'
      ? Sunset
      : Moon;

  return (
    <div
      data-testid="virtual-office-3d-root"
      data-is-present={String(isPresent)}
      data-wfo-count={activeWfoStaff.length}
      data-jakarta-wfo-count={jakartaWfoCount}
      data-bandung-wfo-count={bandungWfoCount}
      data-active-branch-view={activeBranchView}
      data-lighting-phase={lightingConfig.phase}
      data-lighting-hour={lightingConfig.hour}
      data-highlighted-staff-id={selectedStaffId || 'none'}
      data-exiting-staff-id={walkOutStaffId || 'none'}
      data-last-exited-staff-id={lastExitedStaffId || 'none'}
      className="relative w-full h-[420px] sm:h-[500px] rounded-2xl overflow-hidden border border-slate-800/80 shadow-inner select-none"
    >
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        data-testid="virtual-office-canvas-mount"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Overlay Bar: Branch Camera Switcher ("View Jakarta HQ" / "View Bandung Branch") + Day/Night Cycle + Walk-In/Out */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Two Separate 3D Buildings Camera Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            data-testid="view-jakarta-hq-btn"
            onClick={() => handleSwitchBranchCamera('JAKARTA_HQ')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-lg cursor-pointer ${
              activeBranchView === 'JAKARTA_HQ'
                ? 'bg-[#00B4D8] text-slate-950 border-white'
                : 'bg-slate-950/90 text-slate-200 border-slate-700 hover:border-[#00B4D8]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>View Jakarta HQ ({jakartaWfoCount} WFO · 8 Zones)</span>
          </button>

          <button
            type="button"
            data-testid="view-bandung-branch-btn"
            onClick={() => handleSwitchBranchCamera('BANDUNG_BRANCH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-lg cursor-pointer ${
              activeBranchView === 'BANDUNG_BRANCH'
                ? 'bg-[#00B4D8] text-slate-950 border-white'
                : 'bg-slate-950/90 text-slate-200 border-slate-700 hover:border-[#00B4D8]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>View Bandung Branch ({bandungWfoCount} WFO · Alfian &amp; Yanti)</span>
          </button>

          {/* Dynamic Day/Night Lighting Cycle Badge (Real-Time Live Clock) */}
          <div
            data-testid="day-night-lighting-badge"
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-950/90 text-slate-200 border border-slate-700 flex items-center gap-2 shadow-lg"
          >
            <PhaseIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {lightingConfig.phase} ({liveClockHHMM} WIB)
            </span>
          </div>
        </div>

        {/* Right: Reset Camera */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            data-testid="reset-3d-camera-btn"
            onClick={() => handleSwitchBranchCamera(activeBranchView)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950/95 text-slate-200 border border-slate-700 hover:border-[#00B4D8] hover:text-white transition-colors flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#00B4D8]" />
            <span className="hidden md:inline">Reset Kamera</span>
          </button>
        </div>
      </div>

      {/* Sims-Like Walk-In / Walk-Out Toast Notification inside 3D Viewport */}
      <AnimatePresence>
        {walkingBannerText && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            data-testid="walk-in-animation-banner"
            className="absolute top-16 left-3 z-20 px-3.5 py-2 rounded-xl bg-slate-950/95 border border-emerald-500/60 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-xl"
          >
            <Footprints className="w-4 h-4 text-emerald-400" />
            <span>{walkingBannerText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          LIVE ATTENDANCE INFO OVERLAY (HUD) — Rendered when an avatar is highlighted
         ===================================================================== */}
      <AnimatePresence>
        {highlightedHud ? (
          <motion.div
            key={highlightedHud.staffId}
            initial={{ opacity: 0, x: 16, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            role="region"
            aria-label="Live Attendance Info Overlay HUD"
            data-testid="live-attendance-hud"
            className="absolute top-16 right-3 z-20 w-72 sm:w-80 rounded-2xl p-4 bg-slate-950/95 text-white border-2 border-[#00B4D8] shadow-2xl space-y-3 pointer-events-auto"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  data-testid="hud-avatar-badge"
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0 ring-2 ring-[#00B4D8]"
                  style={{ backgroundColor: highlightedHud.avatarColor }}
                >
                  {highlightedHud.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#00B4D8]" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#00B4D8] font-bold">
                      AVATAR HIGHLIGHTED · {highlightedHud.branch}
                    </span>
                  </div>
                  <h4
                    data-testid="hud-person-name"
                    className="text-sm font-bold font-display truncate mt-0.5"
                  >
                    {highlightedHud.name}
                  </h4>
                  <p
                    data-testid="hud-person-role"
                    className="text-xs text-slate-300 truncate"
                  >
                    {highlightedHud.roleAndDivision}
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="hud-close-btn"
                aria-label="Tutup Info Overlay HUD"
                onClick={() => onSelectStaff(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#00B4D8]" />
                  <span>Room / Zone:</span>
                </span>
                <span
                  data-testid="hud-room-name"
                  className="font-semibold text-[#00B4D8] text-right truncate max-w-[165px]"
                >
                  {highlightedHud.roomName}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Status:</span>
                </span>
                <span
                  data-testid="hud-attendance-status"
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                >
                  {highlightedHud.statusText}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00B4D8]" />
                  <span>Jam Check-In:</span>
                </span>
                <span
                  data-testid="hud-checkin-time"
                  className="font-mono font-bold text-white tabular-nums"
                >
                  {highlightedHud.checkInWib}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-[#00B4D8]" />
                  <span>Workstation:</span>
                </span>
                <span className="font-mono text-[11px] text-emerald-400">
                  Open Laptop Active
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>Emissive: {highlightedHud.highlightEmissiveHex}</span>
              <span>Klik luar avatar untuk tutup</span>
            </p>
          </motion.div>
        ) : (
          <div
            data-testid="hud-idle-prompt"
            className="absolute top-14 right-3 z-10 px-3 py-2 rounded-xl bg-slate-950/90 text-slate-300 border border-slate-800 text-[11px] hidden sm:flex items-center gap-2 pointer-events-none"
          >
            <MousePointerClick className="w-3.5 h-3.5 text-[#00B4D8]" />
            <span>
              2 Gedung 3D (JKT HQ &amp; Bandung) · Klik avatar untuk Live HUD
            </span>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Interactive Quick-Select Strip (Strictly WFO Personnel Only, auto-flies camera to their building) */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto py-1 px-1 pointer-events-auto">
        {activeWfoStaff.map((person) => {
          const isSelected = person.staffId === selectedStaffId;
          const personInBdg = isBandungPersonnel(person);
          return (
            <button
              key={person.staffId}
              type="button"
              data-testid={`avatar-3d-chip-${person.staffId}`}
              onClick={() => {
                const nextId = resolveNextHighlightedStaffId(
                  selectedStaffId,
                  person.staffId,
                  staff
                );
                onSelectStaff(nextId);
                if (nextId) {
                  handleSwitchBranchCamera(
                    personInBdg ? 'BANDUNG_BRANCH' : 'JAKARTA_HQ'
                  );
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-[#00B4D8] text-slate-950 border-white font-bold shadow-md'
                  : 'bg-slate-950/90 text-slate-200 border-slate-800 hover:border-[#00B4D8]/60'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isSelected ? '#0f172a' : person.avatarColor,
                }}
              />
              <span>{person.name}</span>
              <span className="text-[10px] opacity-75">
                ({person.branch} · {person.checkInTime})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

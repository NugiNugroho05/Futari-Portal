import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StaffMemberRecord,
  Avatar3DConfig,
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
  formatBranchDisplay,
  formatRoomDisplayName,
  SupabaseAttendanceRow,
  isAttendanceRowActiveForToday,
  applyActiveAttendanceToStaffList,
  assignRoomGridCoordinatesToStaffList,
  computeRoomGridDeskCoords,
  BreakModeType,
  normalizeBreakMode,
  formatBreakModeLabel,
  decodePersonnelAvatarUrlAndMetadata,
  SupabasePersonnelRow,
  resolveIndividualBreakStatus,
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
  currentUserEmail?: string;
  currentUserBreakStatus?: BreakModeType;
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
const NORMAL_SKIN_COLOR_THREE = new THREE.Color(0xf7c894);
const ANGRY_RED_SKIN_COLOR_THREE = new THREE.Color(0xef4444);

/**
 * +25% Faster Animation Speed Multiplier (`0.34x`, raised from `0.25x` into the `0.32x - 0.35x` window)
 * so walking, typing, stretching, waving, and break transitions feel responsive, smooth, and natural.
 */
const ANIM_SPEED = 0.34;

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
 * Deterministic shared animation clock (seconds). Derived from the wall-clock epoch so that every
 * browser (Jakarta, Jawa, any device) computes the SAME `elapsed` at the same real second, which makes
 * all avatar activity cycles (typing, stretching, inter-room visits, chat bubbles, poses) identical on all screens.
 */
const SHARED_ANIMATION_EPOCH_MS = 1_700_000_000_000;
function getSharedAnimationSeconds(): number {
  return (Date.now() - SHARED_ANIMATION_EPOCH_MS) / 1000;
}

const BREAK_BADGE_STYLES: Record<
  Exclude<BreakModeType, 'none'>,
  { label: string; fill: string; stroke: string }
> = {
  eating: { label: '🍽 Break · Eating', fill: 'rgba(217, 119, 6, 0.95)', stroke: '#fbbf24' },
  sleeping: { label: '😴 Break · Sleeping', fill: 'rgba(79, 70, 229, 0.95)', stroke: '#a5b4fc' },
  smoking: { label: '🚬 Break · Smoking', fill: 'rgba(71, 85, 105, 0.95)', stroke: '#cbd5e1' },
};

/** Small floating badge shown under/above an avatar while that employee is on Break. */
function createBreakBadgeSprite(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 48;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.7, 0.32, 1);
  sprite.visible = false;
  sprite.userData = { badgeKind: 'none', badgeCanvas: canvas };
  return sprite;
}

function updateBreakBadgeSprite(sprite: THREE.Sprite, kind: BreakModeType) {
  if (sprite.userData.badgeKind === kind) return;
  sprite.userData.badgeKind = kind;
  if (kind === 'none') {
    sprite.visible = false;
    return;
  }
  const canvas = sprite.userData.badgeCanvas as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  const style = BREAK_BADGE_STYLES[kind];
  if (ctx && style) {
    ctx.clearRect(0, 0, 256, 48);
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 40, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(style.label, 128, 31);
  }
  const mat = sprite.material as THREE.SpriteMaterial;
  if (mat.map) mat.map.needsUpdate = true;
  sprite.visible = true;
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
 * Builds an indoor decorative potted plant (ceramic pot + soil + multi-layered lush foliage)
 * for corner placement inside office zones and building lobbies.
 */
function createIndoorPlantGroup(accentHex: string = '#10b981'): THREE.Group {
  const group = new THREE.Group();

  const potMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.15,
  });
  const potRimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentHex),
    roughness: 0.35,
    metalness: 0.25,
  });
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x3f2e21,
    roughness: 0.9,
  });
  const leafMatDark = new THREE.MeshStandardMaterial({
    color: 0x059669,
    roughness: 0.5,
    metalness: 0.08,
  });
  const leafMatLight = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.45,
    metalness: 0.08,
  });

  const potMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.14, 0.28, 14),
    potMat
  );
  potMesh.position.y = 0.14;
  potMesh.castShadow = true;
  potMesh.receiveShadow = true;
  group.add(potMesh);

  const potRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.018, 8, 18),
    potRimMat
  );
  potRim.rotation.x = Math.PI / 2;
  potRim.position.y = 0.28;
  group.add(potRim);

  const soilDisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.03, 12),
    soilMat
  );
  soilDisk.position.y = 0.27;
  group.add(soilDisk);

  // Multi-layered stylized indoor foliage clusters
  const lowerFoliage = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.22, 0),
    leafMatDark
  );
  lowerFoliage.position.set(0, 0.44, 0);
  lowerFoliage.scale.set(1.15, 0.9, 1.15);
  lowerFoliage.castShadow = true;
  group.add(lowerFoliage);

  const midFoliageLeft = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.16, 0),
    leafMatLight
  );
  midFoliageLeft.position.set(-0.09, 0.58, 0.06);
  midFoliageLeft.castShadow = true;
  group.add(midFoliageLeft);

  const midFoliageRight = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.15, 0),
    leafMatLight
  );
  midFoliageRight.position.set(0.1, 0.56, -0.05);
  midFoliageRight.castShadow = true;
  group.add(midFoliageRight);

  const topCrown = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.28, 7),
    leafMatLight
  );
  topCrown.position.set(0, 0.72, 0);
  topCrown.castShadow = true;
  group.add(topCrown);

  return group;
}

export interface SteamPuffParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  side: -1 | 1;
  phaseOffset: number;
}

export interface ZzzSleepParticle {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  phaseOffset: number;
}

export interface RobloxAvatarBuildResult {
  characterGroup: THREE.Group;
  upperBodyGroup: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
  headGroup: THREE.Group;
  leftEyeMesh: THREE.Mesh;
  rightEyeMesh: THREE.Mesh;
  leftPupilMesh: THREE.Mesh;
  rightPupilMesh: THREE.Mesh;
  leftBrowMesh: THREE.Mesh;
  rightBrowMesh: THREE.Mesh;
  steamPuffs: SteamPuffParticle[];
  zzzParticles: ZzzSleepParticle[];
  cigaretteGroup: THREE.Group;
  spoonFoodGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  leftKneeGroup: THREE.Group;
  rightKneeGroup: THREE.Group;
  clickableMeshes: THREE.Object3D[];
}

/**
 * Creates a cartoon 3D Thought / Speech Bubble Sprite (white rounded cloud bubble with
 * comic outline, thought trail dots, and animated-style `...` discussion indicators)
 * displayed above BOTH avatars' heads when conversing during inter-room visits.
 */
function createChatBubbleSprite(): {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 192);

    // Subtle soft shadow
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.38)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;

    // Main rounded comic speech/thought bubble body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(26, 18, 204, 114, 44);
    ctx.fill();
    ctx.stroke();

    // Thought/Speech trail circles leading toward the avatar's head (bottom-left)
    ctx.beginPath();
    ctx.arc(68, 148, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(44, 171, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Inner cyan accent ring inside bubble
    ctx.strokeStyle = 'rgba(0, 180, 216, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(36, 28, 184, 94, 36);
    ctx.stroke();

    // Three expressive cartoon discussion dots (`• • •`)
    const dotColors = ['#0284c7', '#00B4D8', '#f59e0b'];
    [88, 128, 168].forEach((cx, idx) => {
      ctx.fillStyle = dotColors[idx];
      ctx.beginPath();
      ctx.arc(cx, 75, 13, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.76, 0.57, 1);
  sprite.visible = false;
  return { sprite, mat };
}

/**
 * Helper: Builds a smooth rounded-corner & beveled 3D box geometry (centered at origin)
 * for plush mattresses, fluffy pillows, and folded blankets.
 */
function createRoundedPillowBoxGeo(
  width: number,
  height: number,
  depth: number,
  cornerRadius: number,
  bevel: number
): THREE.BufferGeometry {
  const safeBevel = Math.min(
    bevel,
    width * 0.22,
    height * 0.38,
    depth * 0.22
  );
  const w = Math.max(0.04, width - safeBevel * 2);
  const d = Math.max(0.04, depth - safeBevel * 2);
  const h = Math.max(0.01, height - safeBevel * 2);
  const r = Math.min(cornerRadius, w * 0.45, d * 0.45);

  const shape = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -d / 2;
  shape.moveTo(x0 + r, y0);
  shape.lineTo(x0 + w - r, y0);
  shape.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  shape.lineTo(x0 + w, y0 + d - r);
  shape.quadraticCurveTo(x0 + w, y0 + d, x0 + w - r, y0 + d);
  shape.lineTo(x0 + r, y0 + d);
  shape.quadraticCurveTo(x0, y0 + d, x0, y0 + d - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: safeBevel,
    bevelSize: safeBevel,
    bevelSegments: 5,
    curveSegments: 12,
  });
  geo.rotateX(Math.PI / 2);
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a plush, neat 3D Floor Mattress Bed (`mattressBedGroup`) that pops out of the avatar's
 * pocket onto the floor when `Break -> Sleeping` is triggered:
 * - Thick rounded-edge cream/white mattress pad resting cleanly on a low bed base
 * - Fluffy white pillow at the head (+Z) end
 * - Neat bright sky-blue / cyan blanket with a crisp folded top collar
 */
function createPocketMattressBedGroup(): THREE.Group {
  const bedGroup = new THREE.Group();

  const baseFrameMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.65,
    metalness: 0.12,
  });
  const mattressMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.58,
    metalness: 0.03,
  });
  const pipingMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.5,
  });
  const pillowMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.02,
  });
  const blanketMat = new THREE.MeshStandardMaterial({
    color: 0x00b4d8,
    roughness: 0.52,
    metalness: 0.05,
  });
  const blanketCuffMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    roughness: 0.48,
  });

  // 1. Neat low floor bed base (Y = 0.00 .. 0.045)
  const bedBase = new THREE.Mesh(
    createRoundedPillowBoxGeo(0.84, 0.045, 1.62, 0.14, 0.012),
    baseFrameMat
  );
  bedBase.position.set(0, 0.0225, 0.1);
  bedBase.receiveShadow = true;
  bedGroup.add(bedBase);

  // 2. Thick rounded-edge plush mattress (Y = 0.04 .. 0.20, Z = -0.67 .. +0.87)
  const mattressPad = new THREE.Mesh(
    createRoundedPillowBoxGeo(0.78, 0.16, 1.54, 0.13, 0.032),
    mattressMat
  );
  mattressPad.position.set(0, 0.12, 0.1);
  mattressPad.castShadow = true;
  mattressPad.receiveShadow = true;
  bedGroup.add(mattressPad);

  // Subtle pastel sky-blue mattress piping trim band
  const pipingBand = new THREE.Mesh(
    createRoundedPillowBoxGeo(0.792, 0.024, 1.552, 0.13, 0.008),
    pipingMat
  );
  pipingBand.position.set(0, 0.175, 0.1);
  bedGroup.add(pipingBand);

  // 3. Fluffy white pillow at the head (+Z = +0.64) end (top surface Y = 0.276)
  const pillowMesh = new THREE.Mesh(
    createRoundedPillowBoxGeo(0.5, 0.088, 0.3, 0.09, 0.03),
    pillowMat
  );
  pillowMesh.position.set(0, 0.232, 0.64);
  pillowMesh.castShadow = true;
  bedGroup.add(pillowMesh);

  // 4. Neat bright blue/cyan blanket over lower mattress (Z = -0.66 .. +0.22) + folded top collar
  const blanketMesh = new THREE.Mesh(
    createRoundedPillowBoxGeo(0.804, 0.17, 0.88, 0.12, 0.026),
    blanketMat
  );
  blanketMesh.position.set(0, 0.124, -0.22);
  blanketMesh.castShadow = true;
  blanketMesh.receiveShadow = true;
  bedGroup.add(blanketMesh);

  const blanketFoldCuff = new THREE.Mesh(
    createRoundedPillowBoxGeo(0.81, 0.042, 0.14, 0.05, 0.014),
    blanketCuffMat
  );
  blanketFoldCuff.position.set(0, 0.204, 0.17);
  blanketFoldCuff.castShadow = true;
  bedGroup.add(blanketFoldCuff);

  return bedGroup;
}

/**
 * Builds the large 3D Dining Hall & Cafeteria ("RUANG MAKAN") pavilion located between
 * Jakarta HQ and Gedung Jawa (centerX = 17.5, centerZ = 7.4, width = 8.8, depth = 7.0),
 * complete with communal dining tables, chairs, food plates, soup bowls, drinks, pantry counter,
 * and floating architectural banner.
 */
function createDiningHallZoneGroup(isDark: boolean): THREE.Group {
  const group = new THREE.Group();
  const centerX = 17.5;
  const centerZ = 7.4;
  const width = 8.8;
  const depth = 7.0;

  // 1. Dining Hall Raised Platform & Warm Terracotta/Wood Cafeteria Flooring
  const platformMat = new THREE.MeshStandardMaterial({
    color: isDark ? 0x1e293b : 0x334155,
    roughness: 0.6,
    metalness: 0.15,
  });
  const platformMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.3, depth),
    platformMat
  );
  platformMesh.position.set(centerX, -0.15, centerZ);
  platformMesh.receiveShadow = true;
  group.add(platformMesh);

  const woodFloorMat = new THREE.MeshStandardMaterial({
    color: isDark ? 0x292524 : 0x44403c,
    roughness: 0.65,
    metalness: 0.08,
  });
  const woodFloor = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.35, 0.04, depth - 0.35),
    woodFloorMat
  );
  woodFloor.position.set(centerX, 0.02, centerZ);
  woodFloor.receiveShadow = true;
  group.add(woodFloor);

  // Warm Amber Trim Carpet Runner
  const diningRug = new THREE.Mesh(
    new THREE.BoxGeometry(width - 1.1, 0.025, depth - 1.3),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.85,
      transparent: true,
      opacity: isDark ? 0.24 : 0.32,
    })
  );
  diningRug.position.set(centerX, 0.048, centerZ + 0.25);
  diningRug.receiveShadow = true;
  group.add(diningRug);

  // 2. Low Glass Perimeter Railings (Back wall + East/West side rails, open North & South walkway entrances)
  const railFrameMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.35,
    metalness: 0.55,
  });
  const backWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
    metalness: 0.08,
  });

  // Back wall (-Z at Z = centerZ - depth/2 = 3.9)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(width, 1.45, 0.24),
    backWallMat
  );
  backWall.position.set(centerX, 0.725, centerZ - depth / 2);
  group.add(backWall);

  // Top amber accent strip on back wall
  const backHeaderBar = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.08, 0.1, 0.28),
    railFrameMat
  );
  backHeaderBar.position.set(centerX, 1.48, centerZ - depth / 2);
  group.add(backHeaderBar);

  // Side glass partitions with wide open entryways toward Jakarta HQ (West) & Gedung Jawa (East)
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.18,
    metalness: 0.2,
    transparent: true,
    opacity: 0.32,
  });
  ([-1, 1] as const).forEach((sideX) => {
    const wallX = centerX + (sideX * width) / 2;
    const sideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.82, depth * 0.52),
      glassMat
    );
    sideGlass.position.set(wallX, 0.41, centerZ - depth * 0.22);
    group.add(sideGlass);

    const sideRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.05, depth * 0.52),
      railFrameMat
    );
    sideRail.position.set(wallX, 0.84, centerZ - depth * 0.22);
    group.add(sideRail);
  });

  // 3. Pantry & Buffet Counter along the Back Wall (Z = 4.55)
  const counterBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.25,
  });
  const counterTopMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.3,
    metalness: 0.15,
  });
  const buffetCounter = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.78, 0.76),
    counterBodyMat
  );
  buffetCounter.position.set(centerX, 0.39, centerZ - depth / 2 + 0.56);
  buffetCounter.castShadow = true;
  group.add(buffetCounter);

  const buffetTop = new THREE.Mesh(
    new THREE.BoxGeometry(6.52, 0.06, 0.84),
    counterTopMat
  );
  buffetTop.position.set(centerX, 0.81, centerZ - depth / 2 + 0.56);
  group.add(buffetTop);

  // Drink Dispenser & Chafing Dishes on the Buffet Counter
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.8,
  });
  for (let cIdx = -2; cIdx <= 1; cIdx++) {
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.16, 0.44),
      steelMat
    );
    tray.position.set(centerX + cIdx * 1.15, 0.92, centerZ - depth / 2 + 0.56);
    group.add(tray);
  }
  const drinkDispenser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.48, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.25,
      metalness: 0.2,
    })
  );
  drinkDispenser.position.set(centerX + 2.35, 1.06, centerZ - depth / 2 + 0.56);
  group.add(drinkDispenser);

  // 4. Two Large Communal Dining Tables (West Table at X = 15.35, East Table at X = 19.65, Z = 7.8)
  const tableWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.42,
    metalness: 0.1,
  });
  const legMetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.6,
  });
  const chairSeatMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.45,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
  });
  const foodRiceMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    roughness: 0.6,
  });
  const foodDishMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.5,
  });
  const cupMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.25,
  });

  const tableCenters: Array<{ tx: number; tz: number }> = [
    { tx: 15.35, tz: 7.85 },
    { tx: 19.65, tz: 7.85 },
  ];

  tableCenters.forEach(({ tx, tz }) => {
    // Communal table top (2.9m wide x 1.24m deep, calibrated to seated avatar height)
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.95, 0.08, 1.24),
      tableWoodMat
    );
    tableTop.position.set(tx, 0.58, tz);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // 4 Table legs
    [
      [-1.3, -0.48],
      [1.3, -0.48],
      [-1.3, 0.48],
      [1.3, 0.48],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.56, 12),
        legMetalMat
      );
      leg.position.set(tx + lx, 0.28, tz + lz);
      group.add(leg);
    });

    // 3 Dining Chairs on North side (-Z) and 3 Dining Chairs on South side (+Z) + Plates & Drinks
    ([-0.92, 0, 0.92] as const).forEach((seatOffsetX) => {
      ([-1, 1] as const).forEach((sideZ) => {
        const seatX = tx + seatOffsetX;
        const seatZ = tz + sideZ * 0.78;

        const chairSeat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.07, 18),
          chairSeatMat
        );
        chairSeat.position.set(seatX, 0.3, seatZ);
        chairSeat.castShadow = true;
        group.add(chairSeat);

        const chairBack = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.36, 0.06),
          chairSeatMat
        );
        chairBack.position.set(seatX, 0.49, seatZ + sideZ * 0.2);
        chairBack.castShadow = true;
        group.add(chairBack);

        const chairPedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.14, 0.28, 12),
          legMetalMat
        );
        chairPedestal.position.set(seatX, 0.15, seatZ);
        group.add(chairPedestal);

        // Dinner Plate + Food Mound + Drink Cup on the table in front of each seat
        const plateZ = tz + sideZ * 0.34;
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.13, 0.024, 18),
          plateMat
        );
        plate.position.set(seatX, 0.632, plateZ);
        group.add(plate);

        const riceMound = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
          foodRiceMat
        );
        riceMound.position.set(seatX - 0.03, 0.642, plateZ);
        group.add(riceMound);

        const sideDish = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 10, 10),
          foodDishMat
        );
        sideDish.scale.set(1.1, 0.6, 1.0);
        sideDish.position.set(seatX + 0.05, 0.655, plateZ + 0.02);
        group.add(sideDish);

        const drinkCup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.038, 0.11, 12),
          cupMat
        );
        drinkCup.position.set(seatX + sideZ * 0.22, 0.675, plateZ - sideZ * 0.04);
        group.add(drinkCup);
      });
    });
  });

  // 5. Potted Plants & Floating 3D Architectural Banner "RUANG MAKAN"
  [
    [centerX - width / 2 + 0.5, centerZ - depth / 2 + 0.55],
    [centerX + width / 2 - 0.5, centerZ - depth / 2 + 0.55],
    [centerX - width / 2 + 0.5, centerZ + depth / 2 - 0.45],
    [centerX + width / 2 - 0.5, centerZ + depth / 2 - 0.45],
  ].forEach(([px, pz]) => {
    const plant = createIndoorPlantGroup('#f59e0b');
    plant.position.set(px, 0.03, pz);
    group.add(plant);
  });

  const diningBanner = createArchitecturalLabelSprite(
    'RUANG MAKAN · CAFETERIA',
    'Kantin & Area Makan Bersama Futari',
    '#f59e0b',
    4.9,
    1.1
  );
  diningBanner.position.set(centerX, 2.75, centerZ - depth / 2);
  group.add(diningBanner);

  // Warm ambient cafeteria point light
  const diningWarmLight = new THREE.PointLight(0xfbbf24, 1.2, 16);
  diningWarmLight.position.set(centerX, 4.5, centerZ);
  group.add(diningWarmLight);

  return group;
}

/**
 * Returns one of 12 pre-assigned communal dining table seats inside RUANG MAKAN
 * along with the facing angle (`rotationY`) so the avatar sits facing their plate.
 */
function getAssignedDiningSeatSpec(seedIndex: number): {
  seatX: number;
  seatZ: number;
  facingAngle: number;
} {
  const tableXs = [15.35, 19.65];
  const seatOffsets = [-0.92, 0, 0.92];
  const tableIdx = seedIndex % 2;
  const sideIdx = Math.floor(seedIndex / 2) % 2; // 0 = South side (+Z facing North PI), 1 = North side (-Z facing South 0)
  const colIdx = Math.floor(seedIndex / 4) % 3;

  const tx = tableXs[tableIdx];
  const tz = 7.85;
  const sideZ = sideIdx === 0 ? 1 : -1;
  return {
    seatX: tx + seatOffsets[colIdx],
    seatZ: tz + sideZ * 0.78,
    facingAngle: sideZ === 1 ? Math.PI : 0,
  };
}

/**
 * Creates a crisp 2D CanvasTexture for floating cartoon "Zzz" sleep particles.
 */
function createZzzParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    ctx.font = '900 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeText('Z', 64, 68);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Z', 64, 68);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Computes a collision-free corridor & doorway waypoint path between any two points
 * in the 3D Virtual Office (Entrance Door -> Desk, Desk -> Exit Door, Desk -> Outside Smoking Patio,
 * or Desk -> Another Room Zone) so avatars NEVER walk through glass partition walls or perimeter walls.
 */
export function buildCorridorWaypoints(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  isBandung: boolean
): Array<{ x: number; z: number }> {
  const pts: Array<{ x: number; z: number }> = [{ x: startX, z: startZ }];

  const pushUnique = (x: number, z: number) => {
    const prev = pts[pts.length - 1];
    if (Math.hypot(x - prev.x, z - prev.z) > 0.12) {
      pts.push({ x, z });
    }
  };

  const isInDiningHall = (x: number, z: number) =>
    x >= 13.0 && x <= 22.0 && z >= 3.8 && z <= 11.0;

  const appendLeaveDiningHall = (sx: number, sz: number) => {
    if (sz < 7.85) {
      pushUnique(sx, 6.25);
      pushUnique(17.5, 6.25);
    } else {
      pushUnique(sx, 9.45);
    }
    pushUnique(17.5, 9.75);
  };

  const appendEnterDiningHall = (ex: number, ez: number) => {
    pushUnique(17.5, 9.75);
    if (ez < 7.85) {
      pushUnique(17.5, 6.25);
      pushUnique(ex, 6.25);
    } else {
      pushUnique(ex, 9.45);
    }
    pushUnique(ex, ez);
  };

  if (isBandung) {
    // Gedung Jawa interior bounds: X in [22.3, 33.7], Z in [-5.1, 4.85]
    // Entrance Door at (25.8, 5.2), Exit Door at (30.2, 5.2), indoor south aisle Z = 3.65
    const jawaDoorThresholdZ = 3.65;
    const isInsideJawa = (x: number, z: number) =>
      x >= 22.3 && x <= 33.7 && z >= -5.1 && z <= 4.85;

    const startOutside = !isInsideJawa(startX, startZ);
    const endOutside = !isInsideJawa(endX, endZ);

    if (startOutside && !endOutside) {
      if (isInDiningHall(startX, startZ)) {
        appendLeaveDiningHall(startX, startZ);
        pushUnique(22.5, 9.75);
        pushUnique(25.8, 6.1);
      } else if (startZ > 5.3) {
        const doorX = startX > 28.0 ? 30.2 : 25.8;
        pushUnique(doorX, 5.85);
        pushUnique(doorX, jawaDoorThresholdZ);
        pushUnique(endX, jawaDoorThresholdZ);
        pushUnique(endX, endZ);
        return pts;
      }
      pushUnique(25.8, jawaDoorThresholdZ);
      pushUnique(endX, jawaDoorThresholdZ);
      pushUnique(endX, endZ);
      return pts;
    }

    if (!startOutside && endOutside) {
      pushUnique(startX, jawaDoorThresholdZ);
      pushUnique(30.2, jawaDoorThresholdZ);
      pushUnique(30.2, 5.95);
      if (isInDiningHall(endX, endZ)) {
        pushUnique(22.5, 9.75);
        appendEnterDiningHall(endX, endZ);
        return pts;
      }
      pushUnique(endX, endZ);
      return pts;
    }

    if (startOutside && endOutside) {
      if (isInDiningHall(startX, startZ) && !isInDiningHall(endX, endZ)) {
        appendLeaveDiningHall(startX, startZ);
        pushUnique(22.5, 9.75);
      } else if (!isInDiningHall(startX, startZ) && isInDiningHall(endX, endZ)) {
        pushUnique(22.5, 9.75);
        appendEnterDiningHall(endX, endZ);
        return pts;
      }
      pushUnique(endX, endZ);
      return pts;
    }

    // Moving inside Gedung Jawa
    pushUnique(startX, jawaDoorThresholdZ);
    pushUnique(endX, jawaDoorThresholdZ);
    pushUnique(endX, endZ);
    return pts;
  }

  // Jakarta HQ interior bounds: X in [-12.1, +12.1], Z in [-9.4, +9.3]
  // Entrance Door (-4.2, 9.8), Exit Door (+4.2, 9.8)
  const SPINE_X = -3.85;
  const LOBBY_Z = 8.35;

  const getRoomAisleZ = (z: number): number => {
    if (z < -2.4) return -2.75;
    if (z < 2.6) return 2.75;
    return LOBBY_Z;
  };

  const isInsideJkt = (x: number, z: number) =>
    x >= -12.1 && x <= 12.1 && z >= -9.4 && z <= 9.3;

  const startOutside = !isInsideJkt(startX, startZ);
  const endOutside = !isInsideJkt(endX, endZ);

  if (startOutside && !endOutside) {
    // Entering Jakarta HQ from Entrance/Exit Door, Smoking Patio, or Ruang Makan
    const targetAisleZ = getRoomAisleZ(endZ);
    if (isInDiningHall(startX, startZ)) {
      appendLeaveDiningHall(startX, startZ);
      pushUnique(13.0, 10.55);
      pushUnique(4.2, 10.55);
      pushUnique(4.2, LOBBY_Z);
    } else {
      const doorX = startX < 0 ? -4.2 : 4.2;
      if (startZ > 10.0) {
        pushUnique(doorX, 10.45);
      }
      pushUnique(doorX, LOBBY_Z);
    }
    if (Math.abs(targetAisleZ - LOBBY_Z) > 0.2) {
      pushUnique(SPINE_X, LOBBY_Z);
      pushUnique(SPINE_X, targetAisleZ);
    }
    pushUnique(endX, targetAisleZ);
    pushUnique(endX, endZ);
    return pts;
  }

  if (!startOutside && endOutside) {
    // Walking OUT from Desk -> Exit Door (4.2, 9.8) -> Ruang Makan or Outdoor Smoking Area
    const startAisleZ = getRoomAisleZ(startZ);
    pushUnique(startX, startAisleZ);
    if (Math.abs(startAisleZ - LOBBY_Z) > 0.2) {
      pushUnique(SPINE_X, startAisleZ);
      pushUnique(SPINE_X, LOBBY_Z);
    }
    pushUnique(4.2, LOBBY_Z);
    pushUnique(4.2, 10.55);
    if (isInDiningHall(endX, endZ)) {
      pushUnique(13.0, 10.55);
      appendEnterDiningHall(endX, endZ);
      return pts;
    }
    pushUnique(endX, endZ);
    return pts;
  }

  if (startOutside && endOutside) {
    // Moving directly between Ruang Makan and Outdoor Smoking Area
    if (isInDiningHall(startX, startZ) && !isInDiningHall(endX, endZ)) {
      appendLeaveDiningHall(startX, startZ);
      pushUnique(13.0, 10.55);
    } else if (!isInDiningHall(startX, startZ) && isInDiningHall(endX, endZ)) {
      pushUnique(13.0, 10.55);
      appendEnterDiningHall(endX, endZ);
      return pts;
    }
    pushUnique(endX, endZ);
    return pts;
  }

  // Indoor Room-to-Room Navigation (Desk A -> Corridor -> Desk/Room B)
  const startAisleZ = getRoomAisleZ(startZ);
  const endAisleZ = getRoomAisleZ(endZ);
  pushUnique(startX, startAisleZ);
  if (Math.abs(startAisleZ - endAisleZ) > 0.2) {
    pushUnique(SPINE_X, startAisleZ);
    pushUnique(SPINE_X, endAisleZ);
  }
  pushUnique(endX, endAisleZ);
  pushUnique(endX, endZ);
  return pts;
}

/**
 * Samples position (x, z) and facing direction angle along a multi-segment waypoint polyline
 * for normalized progress t in [0, 1].
 */
function sampleWaypointPolyline(
  waypoints: Array<{ x: number; z: number }>,
  t: number
): { x: number; z: number; angle: number } {
  if (waypoints.length === 0) return { x: 0, z: 0, angle: Math.PI };
  if (waypoints.length === 1) {
    return { x: waypoints[0].x, z: waypoints[0].z, angle: Math.PI };
  }

  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dz = waypoints[i + 1].z - waypoints[i].z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    segLengths.push(len);
    totalLen += len;
  }

  const clampedT = THREE.MathUtils.clamp(t, 0, 1);
  let targetDist = clampedT * totalLen;

  for (let i = 0; i < segLengths.length; i++) {
    const segLen = segLengths[i];
    if (targetDist <= segLen || i === segLengths.length - 1) {
      const localU = THREE.MathUtils.clamp(targetDist / segLen, 0, 1);
      const p0 = waypoints[i];
      const p1 = waypoints[i + 1];
      const x = THREE.MathUtils.lerp(p0.x, p1.x, localU);
      const z = THREE.MathUtils.lerp(p0.z, p1.z, localU);
      const angle = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      return { x, z, angle };
    }
    targetDist -= segLen;
  }

  const last = waypoints[waypoints.length - 1];
  const prev = waypoints[waypoints.length - 2];
  return {
    x: last.x,
    z: last.z,
    angle: Math.atan2(last.x - prev.x, last.z - prev.z),
  };
}

/**
 * Generates a high-resolution (512x512) 2D THREE.CanvasTexture that paints
 * outfit details (collar, buttons, placket, pocket, ribbed cuffs/trim) cleanly
 * onto the front face of the rounded torso mesh — eliminating separate floating cloth meshes.
 */
function createOutfitTorsoCanvasTexture(
  shirtHex: string,
  outfitType: 'short_sleeve' | 'formal_shirt' | 'long_sleeve'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const baseColor = new THREE.Color(shirtHex || '#00B4D8');
    const baseCss = `#${baseColor.getHexString()}`;
    const darkColor = baseColor.clone().multiplyScalar(0.76);
    const darkCss = `#${darkColor.getHexString()}`;
    const darkerColor = baseColor.clone().multiplyScalar(0.6);
    const darkerCss = `#${darkerColor.getHexString()}`;
    const lightColor = baseColor.clone().lerp(new THREE.Color('#ffffff'), 0.18);
    const lightCss = `#${lightColor.getHexString()}`;

    // 1. Base Shirt Fabric with Subtle Soft Cylindrical Shading
    ctx.fillStyle = baseCss;
    ctx.fillRect(0, 0, 512, 512);

    const sideShade = ctx.createLinearGradient(0, 0, 512, 0);
    sideShade.addColorStop(0, 'rgba(0,0,0,0.18)');
    sideShade.addColorStop(0.14, 'rgba(0,0,0,0.03)');
    sideShade.addColorStop(0.5, 'rgba(255,255,255,0.07)');
    sideShade.addColorStop(0.86, 'rgba(0,0,0,0.03)');
    sideShade.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = sideShade;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle fabric fold lines near waist
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(85, 445);
    ctx.quadraticCurveTo(256, 460, 427, 445);
    ctx.stroke();

    if (outfitType === 'short_sleeve') {
      // KAOS LENGAN PENDEK: Clean T-Shirt with smooth crew-neck collar seam & subtle chest detail
      // Crew neck skin opening at top center
      ctx.fillStyle = '#F7C894';
      ctx.beginPath();
      ctx.ellipse(256, 6, 94, 54, 0, 0, Math.PI);
      ctx.fill();

      // Ribbed crew-neck collar band
      ctx.strokeStyle = darkCss;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.ellipse(256, 6, 103, 62, 0, 0.05 * Math.PI, 0.95 * Math.PI);
      ctx.stroke();

      // Inner collar highlight & double stitch line
      ctx.strokeStyle = lightCss;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(256, 6, 95, 55, 0, 0.06 * Math.PI, 0.94 * Math.PI);
      ctx.stroke();

      ctx.strokeStyle = darkerCss;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.ellipse(256, 6, 114, 72, 0, 0.08 * Math.PI, 0.92 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Clean double-stitched bottom hem
      ctx.strokeStyle = darkerCss;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(24, 488);
      ctx.lineTo(488, 488);
      ctx.moveTo(24, 496);
      ctx.lineTo(488, 496);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (outfitType === 'formal_shirt') {
      // KEMEJA FORMAL: Symmetrical Folded V-Collar, Vertical Button Placket, 4 Buttons & Left Chest Pocket
      // Vertical Center Placket Strip
      ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      ctx.fillRect(230, 82, 52, 430);

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(234, 82, 44, 430);

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(235, 82, 42, 430);

      // Skin V-Neck Opening at top center
      ctx.fillStyle = '#F7C894';
      ctx.beginPath();
      ctx.moveTo(182, 0);
      ctx.lineTo(256, 98);
      ctx.lineTo(330, 0);
      ctx.closePath();
      ctx.fill();

      // Neck inner shadow
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(184, 2);
      ctx.lineTo(256, 98);
      ctx.lineTo(328, 2);
      ctx.stroke();

      // Left & Right Symmetrical Folded Shirt Collar Wings
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;

      // Left Collar Flap
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.moveTo(182, 0);
      ctx.lineTo(256, 98);
      ctx.lineTo(176, 136);
      ctx.lineTo(132, 34);
      ctx.closePath();
      ctx.fill();

      // Right Collar Flap
      ctx.beginPath();
      ctx.moveTo(330, 0);
      ctx.lineTo(256, 98);
      ctx.lineTo(336, 136);
      ctx.lineTo(380, 34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Collar Crisp Stitch Outline
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(182, 2);
      ctx.lineTo(256, 98);
      ctx.lineTo(176, 136);
      ctx.lineTo(132, 34);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(330, 2);
      ctx.lineTo(256, 98);
      ctx.lineTo(336, 136);
      ctx.lineTo(380, 34);
      ctx.closePath();
      ctx.stroke();

      // 4 Detailed Shirt Buttons along the placket
      const buttonYPositions = [152, 244, 336, 428];
      buttonYPositions.forEach((by) => {
        // Button drop shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath();
        ctx.arc(256, by + 2, 11, 0, Math.PI * 2);
        ctx.fill();

        // Button body
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(256, by, 10.5, 0, Math.PI * 2);
        ctx.fill();

        // Button rim
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4 tiny thread holes
        ctx.fillStyle = darkerCss;
        [
          [-3.2, -3.2],
          [3.2, -3.2],
          [-3.2, 3.2],
          [3.2, 3.2],
        ].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.arc(256 + dx, by + dy, 1.4, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Left Chest Pocket (on viewer's right: X = 316..424, Y = 175..295)
      const px = 318;
      const py = 182;
      const pw = 104;
      const ph = 112;

      ctx.save();
      ctx.fillStyle = darkCss;
      ctx.strokeStyle = lightCss;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + pw, py);
      ctx.lineTo(px + pw, py + ph - 22);
      ctx.lineTo(px + pw / 2, py + ph);
      ctx.lineTo(px, py + ph - 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pocket top fold bar & stitched seam
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(px + 2, py, pw - 4, 14);

      ctx.strokeStyle = darkerCss;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px + 6, py + 20);
      ctx.lineTo(px + pw - 6, py + 20);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else {
      // LENGAN PANJANG (Crewneck Sweater / Long Sleeve Top): Ribbed Collar, V-Gusset Stitch & Ribbed Waist Hem
      ctx.fillStyle = '#F7C894';
      ctx.beginPath();
      ctx.ellipse(256, 6, 88, 48, 0, 0, Math.PI);
      ctx.fill();

      // Thick Ribbed Crew-Neck Collar Band
      ctx.strokeStyle = darkCss;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.ellipse(256, 6, 100, 58, 0, 0.04 * Math.PI, 0.96 * Math.PI);
      ctx.stroke();

      // Classic Sweatshirt V-Insert Gusset below collar
      ctx.fillStyle = darkCss;
      ctx.beginPath();
      ctx.moveTo(214, 64);
      ctx.lineTo(298, 64);
      ctx.lineTo(256, 122);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = lightCss;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(214, 64);
      ctx.lineTo(256, 122);
      ctx.lineTo(298, 64);
      ctx.stroke();

      // Ribbed Elastic Waistband Hem at the bottom
      ctx.fillStyle = darkCss;
      ctx.fillRect(0, 452, 512, 60);

      ctx.strokeStyle = darkerCss;
      ctx.lineWidth = 2.5;
      for (let rx = 12; rx < 512; rx += 16) {
        ctx.beginPath();
        ctx.moveTo(rx, 454);
        ctx.lineTo(rx, 512);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, 452);
      ctx.lineTo(512, 452);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a 256x256 2D THREE.CanvasTexture wrapped directly onto each rounded arm mesh
 * so sleeve length, cuffs, and forearm skin transition smoothly on a single unified mesh.
 */
function createOutfitSleeveCanvasTexture(
  shirtHex: string,
  outfitType: 'short_sleeve' | 'formal_shirt' | 'long_sleeve'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const baseColor = new THREE.Color(shirtHex || '#00B4D8');
    const baseCss = `#${baseColor.getHexString()}`;
    const darkColor = baseColor.clone().multiplyScalar(0.76);
    const darkCss = `#${darkColor.getHexString()}`;
    const darkerColor = baseColor.clone().multiplyScalar(0.58);
    const darkerCss = `#${darkerColor.getHexString()}`;

    if (outfitType === 'short_sleeve') {
      // Top half (shoulder to mid-bicep) = shirtColor; lower half = bare skin (#F7C894)
      ctx.fillStyle = baseCss;
      ctx.fillRect(0, 0, 256, 128);

      // Sleeve cuff seam band
      ctx.fillStyle = darkCss;
      ctx.fillRect(0, 116, 256, 12);
      ctx.strokeStyle = darkerCss;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 116);
      ctx.lineTo(256, 116);
      ctx.moveTo(0, 128);
      ctx.lineTo(256, 128);
      ctx.stroke();

      // Lower forearm in skin tone
      ctx.fillStyle = '#F7C894';
      ctx.fillRect(0, 128, 256, 128);
    } else if (outfitType === 'formal_shirt') {
      // Full shirt sleeve down to wrist with crisp white formal cuff & button
      ctx.fillStyle = baseCss;
      ctx.fillRect(0, 0, 256, 214);

      // Crisp white formal shirt cuff at wrist
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 214, 256, 42);

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 214);
      ctx.lineTo(256, 214);
      ctx.stroke();

      // Small cuff button detail
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(128, 234, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Lengan Panjang: Full sweater sleeve with ribbed elastic wrist cuff
      ctx.fillStyle = baseCss;
      ctx.fillRect(0, 0, 256, 212);

      ctx.fillStyle = darkCss;
      ctx.fillRect(0, 212, 256, 44);

      ctx.strokeStyle = darkerCss;
      ctx.lineWidth = 2;
      for (let rx = 8; rx < 256; rx += 14) {
        ctx.beginPath();
        ctx.moveTo(rx, 212);
        ctx.lineTo(rx, 256);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, 212);
      ctx.lineTo(256, 212);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Helper to create a smooth tapered 3D hair strand/sweep along a CatmullRomCurve3
 * where the radius tapers smoothly at the root and tip so hair blends organically
 * into the skull contour without boxy/blunt ends.
 */
function createTaperedHairSweepGeometry(
  points: THREE.Vector3[],
  maxRadius: number,
  tubularSegments = 28,
  radialSegments = 16
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false);
  const geo = new THREE.TubeGeometry(
    curve,
    tubularSegments,
    maxRadius,
    radialSegments,
    false
  );
  const pos = geo.attributes.position;
  const ringCount = tubularSegments + 1;
  const vertsPerRing = radialSegments + 1;
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i < ringCount; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, center);
    // Smooth sine-bell taper at both ends (root t=0 and tip t=1)
    const taper = Math.pow(Math.sin(t * Math.PI), 0.42);
    const scale = Math.max(0.18, taper);
    for (let j = 0; j < vertsPerRing; j++) {
      const idx = i * vertsPerRing + j;
      v.fromBufferAttribute(pos, idx);
      v.sub(center).multiplyScalar(scale).add(center);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }

  geo.computeVertexNormals();
  return geo;
}
function createRoundedBeveledTorsoGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(width, height, depth, 14, 16, 10);
  const pos = geo.attributes.position;
  const hw = width / 2 - radius;
  const hh = height / 2 - radius;
  const hd = depth / 2 - radius;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    c.set(
      THREE.MathUtils.clamp(v.x, -hw, hw),
      THREE.MathUtils.clamp(v.y, -hh, hh),
      THREE.MathUtils.clamp(v.z, -hd, hd)
    );
    const diff = v.sub(c);
    const len = diff.length();
    if (len > 0.00001) {
      diff.multiplyScalar(radius / len);
    }
    pos.setXYZ(i, c.x + diff.x, c.y + diff.y, c.z + diff.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a proportional, smooth-rounded Roblox-Style Stylized 3D Humanoid Character:
 * - Rounded Pill-Cylinder Head with facial features (glossy eyes + white pupil highlights, articulated eyebrows, rosy cheeks, curved smile)
 * - Unified Continuous 3D Hijab (smooth Lathe/sculpted headscarf framing the face in a clean oval and draping seamlessly over neck & shoulders without separate torus rings)
 *   OR Smooth Sculpted 3D Multi-Layered Hair:
 *   - Male ('male'): Short Crop ('short'), Medium Messy ('medium_messy'), Side Part ('side_part' / 'parted'), Fade ('fade')
 *   - Female ('female'): Ponytail ('ponytail' / 'bun'), Long Hair ('long'), Bob Cut ('bob_cut')
 * - Rounded Beveled Roblox Torso wrapped in a High-Res 512x512 2D THREE.CanvasTexture (`short_sleeve`, `formal_shirt`, `long_sleeve`) with zero floating cloth pieces
 * - Rounded Capsule Left/Right Arms wrapped in a 2D sleeve texture & Left/Right Legs with shoes
 * - Built-in cartoon Steam Puff particles on the head for the funny desk-slap anger animation.
 */
export function buildRobloxStylizedCharacter(
  cfg3D: Avatar3DConfig,
  staffId: string = 'preview_avatar'
): RobloxAvatarBuildResult {
  const characterGroup = new THREE.Group();
  const clickableMeshes: THREE.Object3D[] = [];

  const shirtHex = cfg3D.shirtColor || '#00B4D8';
  const shirtColorThree = new THREE.Color(shirtHex);
  const hairColorThree = new THREE.Color(cfg3D.hairColor || '#1e293b');
  const hijabColorThree = new THREE.Color(
    cfg3D.hijabColor || cfg3D.shirtColor || '#0277BD'
  );
  const outfitType = cfg3D.outfitType || 'formal_shirt';
  const gender = cfg3D.gender || (cfg3D.useHijab ? 'female' : 'male');
  const effectiveUseHijab = gender === 'female' && Boolean(cfg3D.useHijab);

  const registerClickable = (mesh: THREE.Object3D) => {
    mesh.userData = { staffId };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    clickableMeshes.push(mesh);
  };

  // Shared materials for this character instance (smooth soft shading)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: shirtColorThree,
    emissive: ZERO_EMISSIVE_THREE,
    emissiveIntensity: 0,
    roughness: 0.36,
    metalness: 0.08,
  });

  // High-Res 512x512 2D CanvasTexture for the front torso (+Z face group 4)
  const torsoFrontTexture = createOutfitTorsoCanvasTexture(shirtHex, outfitType);
  const torsoFrontMat = new THREE.MeshStandardMaterial({
    map: torsoFrontTexture,
    emissive: ZERO_EMISSIVE_THREE,
    emissiveIntensity: 0,
    roughness: 0.36,
    metalness: 0.08,
  });

  // High-Res 256x256 2D CanvasTexture for unified smooth sleeves
  const sleeveTexture = createOutfitSleeveCanvasTexture(shirtHex, outfitType);
  const sleeveMat = new THREE.MeshStandardMaterial({
    map: sleeveTexture,
    emissive: ZERO_EMISSIVE_THREE,
    emissiveIntensity: 0,
    roughness: 0.36,
    metalness: 0.06,
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: 0xf7c894,
    emissive: ZERO_EMISSIVE_THREE,
    emissiveIntensity: 0,
    roughness: 0.36,
    metalness: 0.04,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.48,
    metalness: 0.08,
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.36,
    metalness: 0.14,
  });

  const shoeSoleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.45,
  });

  // ---------------------------------------------------------------------------
  // 1. LEFT & RIGHT 2-JOINT ARTICULATED LEGS (Hip Pivot Y = 0.44 + Knee Pivot Y = -0.20)
  //    Enables true 90-degree seated posture on office & dining chairs as well as walking!
  // ---------------------------------------------------------------------------
  const buildLeg = (
    side: -1 | 1
  ): { hipPivot: THREE.Group; kneePivot: THREE.Group } => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.1, 0.44, 0);

    // Upper Leg (Thigh) Capsule from hip (0) down to knee (-0.20)
    const thighMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.078, 0.11, 12, 18),
      pantsMat
    );
    thighMesh.position.set(0, -0.1, 0);
    registerClickable(thighMesh);
    hipPivot.add(thighMesh);

    // Knee Joint Pivot at Y = -0.20 inside hipPivot
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.2, 0);
    hipPivot.add(kneePivot);

    // Lower Leg (Shin) Capsule from knee (0) down to ankle (-0.19)
    const shinMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.072, 0.11, 12, 18),
      pantsMat
    );
    shinMesh.position.set(0, -0.095, 0);
    registerClickable(shinMesh);
    kneePivot.add(shinMesh);

    // Rounded Sneaker Shoe attached below shin
    const shoeMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.052, 0.09, 10, 16),
      shoeMat
    );
    shoeMesh.rotation.x = Math.PI / 2;
    shoeMesh.scale.set(1.35, 1.0, 0.78);
    shoeMesh.position.set(0, -0.195, 0.024);
    registerClickable(shoeMesh);
    kneePivot.add(shoeMesh);

    const soleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.076, 0.022, 18),
      shoeSoleMat
    );
    soleMesh.scale.set(1.0, 1.0, 1.45);
    soleMesh.position.set(0, -0.228, 0.024);
    kneePivot.add(soleMesh);

    return { hipPivot, kneePivot };
  };

  const leftLegBuilt = buildLeg(-1);
  const rightLegBuilt = buildLeg(1);
  const leftLegGroup = leftLegBuilt.hipPivot;
  const rightLegGroup = rightLegBuilt.hipPivot;
  const leftKneeGroup = leftLegBuilt.kneePivot;
  const rightKneeGroup = rightLegBuilt.kneePivot;
  characterGroup.add(leftLegGroup);
  characterGroup.add(rightLegGroup);

  // ---------------------------------------------------------------------------
  // 2. UPPER BODY PIVOT GROUP (Waist Y = 0.45) -> ROUNDED BEVELED TORSO WITH 2D CANVAS TEXTURE
  // ---------------------------------------------------------------------------
  const upperBodyGroup = new THREE.Group();
  upperBodyGroup.position.set(0, 0.45, 0);
  characterGroup.add(upperBodyGroup);

  // Single Unified Rounded-Beveled Roblox Torso (no floating collars, buttons, or cloth pieces!)
  // BoxGeometry material groups: [0:+X, 1:-X, 2:+Y, 3:-Y, 4:+Z (Front 2D Texture), 5:-Z]
  const torsoGeo = createRoundedBeveledTorsoGeometry(0.39, 0.44, 0.21, 0.068);
  const torsoMaterials = [
    bodyMat,
    bodyMat,
    bodyMat,
    bodyMat,
    torsoFrontMat,
    bodyMat,
  ];
  const torsoCore = new THREE.Mesh(torsoGeo, torsoMaterials);
  torsoCore.position.set(0, 0.22, 0);
  registerClickable(torsoCore);
  upperBodyGroup.add(torsoCore);

  // ---------------------------------------------------------------------------
  // 3. LEFT & RIGHT ROUNDED ARMS WRAPPED IN 2D SLEEVE TEXTURE (Shoulder Y = 0.40)
  // ---------------------------------------------------------------------------
  const buildArm = (side: -1 | 1): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.26, 0.395, 0);

    // Smooth rounded shoulder cap
    const shoulderDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
      bodyMat
    );
    shoulderDome.position.set(0, -0.025, 0);
    registerClickable(shoulderDome);
    armPivot.add(shoulderDome);

    // Unified Cylinder Sleeve wrapped with 2D Sleeve CanvasTexture (shirt -> cuff or forearm skin)
    const armCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.067, 0.061, 0.28, 22, 1, false),
      sleeveMat
    );
    armCylinder.position.set(0, -0.165, 0);
    registerClickable(armCylinder);
    armPivot.add(armCylinder);

    // Smooth rounded hand sphere
    const handSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.062, 18, 18),
      headMat
    );
    handSphere.position.set(0, -0.335, 0);
    registerClickable(handSphere);
    armPivot.add(handSphere);

    return armPivot;
  };

  const leftArmGroup = buildArm(-1);
  const rightArmGroup = buildArm(1);
  upperBodyGroup.add(leftArmGroup);
  upperBodyGroup.add(rightArmGroup);

  // ---------------------------------------------------------------------------
  // 4. SMOOTH ROUNDED ROBLOX HEAD + EXPRESSIVE FACE (Y = 0.68 inside upperBodyGroup)
  // ---------------------------------------------------------------------------
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.68, 0);
  upperBodyGroup.add(headGroup);

  // Neck connector
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.074, 0.084, 0.1, 20),
    headMat
  );
  neckMesh.position.set(0, -0.18, 0);
  headGroup.add(neckMesh);

  // Seamless Rounded Pill-Cylinder Head (Lathe/Capsule-smooth cylinder core + domes)
  const headCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.14, 32),
    headMat
  );
  registerClickable(headCyl);
  headGroup.add(headCyl);

  const headTopDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
    headMat
  );
  headTopDome.position.y = 0.068;
  headTopDome.scale.set(1.0, 0.58, 1.0);
  registerClickable(headTopDome);
  headGroup.add(headTopDome);

  const headBottomDome = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.16,
      32,
      18,
      0,
      Math.PI * 2,
      Math.PI * 0.48,
      Math.PI * 0.52
    ),
    headMat
  );
  headBottomDome.position.y = -0.068;
  headBottomDome.scale.set(1.0, 0.55, 1.0);
  headGroup.add(headBottomDome);

  // Facial Features on the front (+Z) of the head (100% unobstructed)
  const eyeDarkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.1,
  });
  const eyeShineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: hairColorThree,
    roughness: 0.42,
  });
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xf43f5e,
    transparent: true,
    opacity: 0.25,
  });

  let leftEyeMesh!: THREE.Mesh;
  let rightEyeMesh!: THREE.Mesh;
  let leftPupilMesh!: THREE.Mesh;
  let rightPupilMesh!: THREE.Mesh;
  let leftBrowMesh!: THREE.Mesh;
  let rightBrowMesh!: THREE.Mesh;

  ([-1, 1] as const).forEach((side) => {
    // Rounded Capsule Eyes (scalable vertically for peaceful closed-eye sleep expression)
    const eyeMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.017, 0.022, 8, 14),
      eyeDarkMat
    );
    eyeMesh.position.set(side * 0.056, 0.014, 0.156);
    headGroup.add(eyeMesh);

    // Specular Eye Highlight Dot
    const pupilHighlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.0075, 10, 10),
      eyeShineMat
    );
    pupilHighlight.position.set(side * 0.056 + 0.006, 0.025, 0.169);
    headGroup.add(pupilHighlight);

    if (side === -1) {
      leftEyeMesh = eyeMesh;
      leftPupilMesh = pupilHighlight;
    } else {
      rightEyeMesh = eyeMesh;
      rightPupilMesh = pupilHighlight;
    }

    // Smooth Rounded Capsule Eyebrows (articulated for angry scowl expression)
    const browMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0075, 0.038, 8, 12),
      browMat
    );
    browMesh.rotation.z = Math.PI / 2 + side * -0.08;
    browMesh.position.set(side * 0.056, 0.062, 0.158);
    headGroup.add(browMesh);
    if (side === -1) {
      leftBrowMesh = browMesh;
    } else {
      rightBrowMesh = browMesh;
    }

    // Subtle Rosy Cheek Blush
    const cheekBlush = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 12, 12),
      blushMat
    );
    cheekBlush.scale.set(1.2, 0.7, 0.35);
    cheekBlush.position.set(side * 0.085, -0.02, 0.152);
    headGroup.add(cheekBlush);
  });

  // Friendly Curved Smile
  const smileArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.008, 10, 20, Math.PI),
    eyeDarkMat
  );
  smileArc.rotation.z = Math.PI;
  smileArc.position.set(0, -0.028, 0.158);
  headGroup.add(smileArc);

  // ---------------------------------------------------------------------------
  // 4B. CARTOON STEAM PUFF PARTICLES (For Funny Angry Desk-Slap & Smoking Animation)
  // ---------------------------------------------------------------------------
  const steamPuffs: SteamPuffParticle[] = [];
  const puffCloudGeo = new THREE.SphereGeometry(0.052, 14, 14);
  for (let pIdx = 0; pIdx < 4; pIdx++) {
    const side: -1 | 1 = pIdx % 2 === 0 ? -1 : 1;
    const puffMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0.35,
      roughness: 0.6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const puffMesh = new THREE.Mesh(puffCloudGeo, puffMat);
    puffMesh.visible = false;
    puffMesh.position.set(side * 0.16, 0.16, 0);
    headGroup.add(puffMesh);
    steamPuffs.push({
      mesh: puffMesh,
      mat: puffMat,
      side,
      phaseOffset: pIdx * 0.25,
    });
  }

  // ---------------------------------------------------------------------------
  // 4C. CARTOON "Zzz" SLEEP PARTICLES (For Sleeping/Nodding at Desk Activity)
  // ---------------------------------------------------------------------------
  const zzzParticles: ZzzSleepParticle[] = [];
  const zzzTex = createZzzParticleTexture();
  for (let zIdx = 0; zIdx < 3; zIdx++) {
    const zzzMat = new THREE.SpriteMaterial({
      map: zzzTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const zzzSprite = new THREE.Sprite(zzzMat);
    zzzSprite.visible = false;
    zzzSprite.scale.set(0.14, 0.14, 1);
    zzzSprite.position.set(0.14, 0.2, 0.1);
    headGroup.add(zzzSprite);
    zzzParticles.push({
      sprite: zzzSprite,
      mat: zzzMat,
      phaseOffset: zIdx * 0.33,
    });
  }

  // ---------------------------------------------------------------------------
  // 4D. CIGARETTE / VAPE PROP IN RIGHT HAND (For Outdoor Smoking Break Activity)
  // ---------------------------------------------------------------------------
  const cigaretteGroup = new THREE.Group();
  cigaretteGroup.visible = false;
  cigaretteGroup.position.set(0, -0.34, 0.06);
  const cigBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.09, 10),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
  );
  cigBody.rotation.x = Math.PI / 2;
  cigaretteGroup.add(cigBody);
  const cigTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xef4444,
      emissiveIntensity: 1.4,
    })
  );
  cigTip.position.set(0, 0, 0.048);
  cigaretteGroup.add(cigTip);
  rightArmGroup.add(cigaretteGroup);

  // ---------------------------------------------------------------------------
  // 4E. SPOON & FOOD PROP IN RIGHT HAND (For "Eating" Break in Ruang Makan)
  // ---------------------------------------------------------------------------
  const spoonFoodGroup = new THREE.Group();
  spoonFoodGroup.visible = false;
  spoonFoodGroup.position.set(0, -0.34, 0.055);
  const spoonHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.11, 10),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.8,
    })
  );
  spoonHandle.rotation.x = Math.PI / 2;
  spoonFoodGroup.add(spoonHandle);
  const spoonBowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.4,
    })
  );
  spoonBowl.scale.set(1.0, 0.55, 1.25);
  spoonBowl.position.set(0, 0.005, 0.058);
  spoonFoodGroup.add(spoonBowl);
  rightArmGroup.add(spoonFoodGroup);

  // ---------------------------------------------------------------------------
  // 5. SEAMLESS UNIFIED 3D HIJAB OR SMOOTH SCULPTED 3D HAIR
  // ---------------------------------------------------------------------------
  if (effectiveUseHijab) {
    const hijabMat = new THREE.MeshStandardMaterial({
      color: hijabColorThree,
      roughness: 0.36,
      metalness: 0.05,
    });

    // A. Continuous Sculpted Head-to-Neck Hood (Smooth sphere hood + elliptical oval face opening)
    // Back & Side Continuous Hood wrapping around the head down to the neck base
    const hijabOuterHood = new THREE.Mesh(
      new THREE.SphereGeometry(0.184, 32, 24, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * 0.88),
      hijabMat
    );
    hijabOuterHood.position.set(0, 0.01, -0.005);
    hijabOuterHood.scale.set(1.03, 1.09, 1.07);
    registerClickable(hijabOuterHood);
    headGroup.add(hijabOuterHood);

    // Smooth Top Forehead Canopy (curves gently over the top forehead above y = +0.092)
    const hijabCrownCanopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.182, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.34),
      hijabMat
    );
    hijabCrownCanopy.position.set(0, 0.032, 0.004);
    hijabCrownCanopy.scale.set(1.03, 1.04, 1.05);
    registerClickable(hijabCrownCanopy);
    headGroup.add(hijabCrownCanopy);

    // Continuous Oval Face-Framing Cowl (Single smooth elliptical tube hugging forehead, temples, cheeks & under-chin)
    const faceOvalPoints: THREE.Vector3[] = [];
    const ovalSteps = 36;
    for (let k = 0; k <= ovalSteps; k++) {
      const theta = (k / ovalSteps) * Math.PI * 2;
      const ox = Math.cos(theta) * 0.146;
      const oy = Math.sin(theta) * 0.148 + 0.004;
      // Curves gently forward around cheeks/chin and tucks smoothly into hood
      const oz = 0.088 + Math.cos(theta * 2) * 0.012 - (Math.sin(theta) < 0 ? 0.014 : 0);
      faceOvalPoints.push(new THREE.Vector3(ox, oy, oz));
    }
    const faceOvalCurve = new THREE.CatmullRomCurve3(faceOvalPoints, true);
    const faceOvalFrame = new THREE.Mesh(
      new THREE.TubeGeometry(faceOvalCurve, 44, 0.036, 16, true),
      hijabMat
    );
    registerClickable(faceOvalFrame);
    headGroup.add(faceOvalFrame);

    // B. Unified Continuous Neck-to-Shoulder & Chest Hijab Mantle using LatheGeometry (NO separate stacked rings!)
    // Lathe profile (x = radius, y = height in upperBodyGroup space from Y = 0.25 chest up to Y = 0.60 under-chin)
    const hijabMantleProfile = [
      new THREE.Vector2(0.001, 0.265), // Smooth closed lower chest hem bottom
      new THREE.Vector2(0.205, 0.272), // Soft rounded lower chest hem edge
      new THREE.Vector2(0.242, 0.325), // Wide graceful drape across shoulders & upper chest
      new THREE.Vector2(0.228, 0.395), // Upper shoulder slope
      new THREE.Vector2(0.168, 0.465), // Smooth continuous taper into neck
      new THREE.Vector2(0.142, 0.535), // Neck cowl merging directly into head hood
      new THREE.Vector2(0.132, 0.595), // Upper neck inside head base (zero gap!)
      new THREE.Vector2(0.001, 0.595),
    ];
    const hijabMantleGeo = new THREE.LatheGeometry(hijabMantleProfile, 36);
    hijabMantleGeo.computeVertexNormals();
    const hijabMantleMesh = new THREE.Mesh(hijabMantleGeo, hijabMat);
    hijabMantleMesh.position.set(0, 0, 0.006);
    // Ellipsoidal scale so the drape is wide across shoulders (X) and naturally contoured front-to-back (Z)
    hijabMantleMesh.scale.set(1.12, 1.0, 0.78);
    registerClickable(hijabMantleMesh);
    upperBodyGroup.add(hijabMantleMesh);
  } else {
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColorThree,
      roughness: 0.36,
      metalness: 0.06,
    });

    const style = cfg3D.hairStyle;

    // 1. Unified Smooth Cranial Hair Cap (Contoured Lathe/Sphere dome that hugs the top, temples & back seamlessly)
    const hairTopDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.172, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.44),
      hairMat
    );
    hairTopDome.position.set(0, 0.035, -0.005);
    hairTopDome.scale.set(1.03, 1.07, 1.05);
    registerClickable(hairTopDome);
    headGroup.add(hairTopDome);

    // 2. Smooth Contoured Back & Side Cranial Cup (hugs back of skull and temples without protruding onto face)
    if (style !== 'fade') {
      const backCup = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.172,
          36,
          24,
          Math.PI * 0.84,
          Math.PI * 1.32,
          0,
          Math.PI * 0.78
        ),
        hairMat
      );
      backCup.position.set(0, 0.018, -0.005);
      backCup.scale.set(1.025, 1.05, 1.04);
      registerClickable(backCup);
      headGroup.add(backCup);

      // Soft curved temple sideburn blends on left & right sides of the head
      ([-1, 1] as const).forEach((side) => {
        const templeSweep = new THREE.Mesh(
          createTaperedHairSweepGeometry(
            [
              new THREE.Vector3(side * 0.145, 0.095, 0.065),
              new THREE.Vector3(side * 0.168, 0.048, 0.032),
              new THREE.Vector3(side * 0.164, -0.012, -0.005),
            ],
            0.028,
            18,
            14
          ),
          hairMat
        );
        headGroup.add(templeSweep);
      });
    }

    if (style === 'short') {
      // Short Crop (Pria): Smooth organic crown cap + tapered forehead hairline sweep (zero boxy fringe)
      const crownCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.156, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.46),
        hairMat
      );
      crownCap.scale.set(1.08, 0.78, 1.12);
      crownCap.position.set(0, 0.058, 0.008);
      headGroup.add(crownCap);

      const frontHairlineSweep = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(-0.142, 0.078, 0.072),
            new THREE.Vector3(-0.082, 0.106, 0.132),
            new THREE.Vector3(0, 0.114, 0.148),
            new THREE.Vector3(0.082, 0.106, 0.132),
            new THREE.Vector3(0.142, 0.078, 0.072),
          ],
          0.032,
          28,
          16
        ),
        hairMat
      );
      headGroup.add(frontHairlineSweep);
    } else if (style === 'medium_messy') {
      // Medium Messy (Pria): Smooth sculpted crown + tapered organic wave locks hugging the forehead & crown
      const waveCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.162, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.48),
        hairMat
      );
      waveCrown.scale.set(1.1, 0.84, 1.12);
      waveCrown.position.set(0, 0.062, 0.006);
      headGroup.add(waveCrown);

      const messySweepLeft = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(-0.148, 0.072, 0.058),
            new THREE.Vector3(-0.085, 0.118, 0.132),
            new THREE.Vector3(0.015, 0.108, 0.152),
          ],
          0.036,
          24,
          16
        ),
        hairMat
      );
      headGroup.add(messySweepLeft);

      const messySweepRight = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(-0.025, 0.126, 0.135),
            new THREE.Vector3(0.072, 0.116, 0.138),
            new THREE.Vector3(0.148, 0.075, 0.062),
          ],
          0.035,
          24,
          16
        ),
        hairMat
      );
      headGroup.add(messySweepRight);

      const crownWaveLock = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(-0.095, 0.148, -0.02),
            new THREE.Vector3(0.0, 0.172, 0.035),
            new THREE.Vector3(0.098, 0.142, 0.015),
          ],
          0.034,
          20,
          14
        ),
        hairMat
      );
      headGroup.add(crownWaveLock);
    } else if (style === 'side_part' || style === 'parted') {
      // Side Part (Pria): Contoured asymmetrical side-parted dome + tapered side-swept hairline wave
      const partedCrown = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.46),
        hairMat
      );
      partedCrown.scale.set(1.09, 0.82, 1.1);
      partedCrown.rotation.z = -0.11;
      partedCrown.position.set(0.012, 0.06, 0.008);
      headGroup.add(partedCrown);

      const sidePartSweep = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(-0.118, 0.108, 0.088),
            new THREE.Vector3(-0.035, 0.122, 0.142),
            new THREE.Vector3(0.065, 0.108, 0.146),
            new THREE.Vector3(0.146, 0.076, 0.075),
          ],
          0.036,
          28,
          16
        ),
        hairMat
      );
      headGroup.add(sidePartSweep);

      const leftPartLock = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(-0.105, 0.112, 0.095),
            new THREE.Vector3(-0.145, 0.082, 0.072),
            new THREE.Vector3(-0.162, 0.035, 0.025),
          ],
          0.026,
          18,
          14
        ),
        hairMat
      );
      headGroup.add(leftPartLock);
    } else if (style === 'fade') {
      // Fade / Undercut (Pria): Smooth Lathe-contoured fade cap + subtle tapered front hairline arc
      const fadeProfile = [
        new THREE.Vector2(0.161, 0.052),
        new THREE.Vector2(0.167, 0.088),
        new THREE.Vector2(0.158, 0.132),
        new THREE.Vector2(0.118, 0.168),
        new THREE.Vector2(0.058, 0.184),
        new THREE.Vector2(0.001, 0.188),
      ];
      const fadeLatheGeo = new THREE.LatheGeometry(fadeProfile, 36);
      fadeLatheGeo.computeVertexNormals();
      const fadeLathe = new THREE.Mesh(fadeLatheGeo, hairMat);
      fadeLathe.scale.set(1.0, 1.0, 1.04);
      headGroup.add(fadeLathe);

      const fadeFrontArc = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(-0.125, 0.092, 0.088),
            new THREE.Vector3(-0.062, 0.112, 0.138),
            new THREE.Vector3(0, 0.116, 0.148),
            new THREE.Vector3(0.062, 0.112, 0.138),
            new THREE.Vector3(0.125, 0.092, 0.088),
          ],
          0.028,
          24,
          14
        ),
        hairMat
      );
      headGroup.add(fadeFrontArc);
    } else if (style === 'ponytail' || style === 'bun') {
      // Ponytail (Wanita): Soft parted curtain bangs + hair tie + tapered S-curve ponytail
      ([-1, 1] as const).forEach((side) => {
        const ponyCurtainBang = new THREE.Mesh(
          createTaperedHairSweepGeometry(
            [
              new THREE.Vector3(side * 0.008, 0.122, 0.144),
              new THREE.Vector3(side * 0.078, 0.108, 0.136),
              new THREE.Vector3(side * 0.145, 0.068, 0.072),
            ],
            0.032,
            22,
            14
          ),
          hairMat
        );
        headGroup.add(ponyCurtainBang);
      });

      const tieBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.038, 0.013, 12, 22),
        bodyMat
      );
      tieBand.position.set(0, 0.035, -0.172);
      headGroup.add(tieBand);

      const ponyTailSweep = new THREE.Mesh(
        createTaperedHairSweepGeometry(
          [
            new THREE.Vector3(0, 0.036, -0.168),
            new THREE.Vector3(0, 0.048, -0.228),
            new THREE.Vector3(0, -0.042, -0.252),
            new THREE.Vector3(0, -0.155, -0.228),
            new THREE.Vector3(0, -0.215, -0.195),
          ],
          0.056,
          28,
          16
        ),
        hairMat
      );
      registerClickable(ponyTailSweep);
      headGroup.add(ponyTailSweep);
    } else if (style === 'bob_cut') {
      // Bob Cut (Wanita): Smooth inward-curved Lathe bob silhouette + soft parted bangs (no flat cylinder sheet)
      ([-1, 1] as const).forEach((side) => {
        const bobCurtainBang = new THREE.Mesh(
          createTaperedHairSweepGeometry(
            [
              new THREE.Vector3(side * 0.008, 0.122, 0.144),
              new THREE.Vector3(side * 0.078, 0.108, 0.136),
              new THREE.Vector3(side * 0.148, 0.068, 0.074),
            ],
            0.033,
            22,
            14
          ),
          hairMat
        );
        headGroup.add(bobCurtainBang);

        // Chin-framing inward-curved side bob locks
        const bobSideLock = new THREE.Mesh(
          createTaperedHairSweepGeometry(
            [
              new THREE.Vector3(side * 0.142, 0.085, 0.055),
              new THREE.Vector3(side * 0.168, 0.005, 0.042),
              new THREE.Vector3(side * 0.158, -0.075, 0.045),
              new THREE.Vector3(side * 0.128, -0.125, 0.055),
            ],
            0.044,
            24,
            16
          ),
          hairMat
        );
        registerClickable(bobSideLock);
        headGroup.add(bobSideLock);
      });

      // Rounded back-and-side bob bell using LatheGeometry (phiStart wraps back & sides cleanly)
      const bobBellProfile = [
        new THREE.Vector2(0.142, -0.118),
        new THREE.Vector2(0.178, -0.088),
        new THREE.Vector2(0.188, -0.025),
        new THREE.Vector2(0.184, 0.042),
        new THREE.Vector2(0.172, 0.095),
      ];
      const bobBellGeo = new THREE.LatheGeometry(
        bobBellProfile,
        32,
        Math.PI * 0.8,
        Math.PI * 1.4
      );
      bobBellGeo.computeVertexNormals();
      const bobBellMesh = new THREE.Mesh(
        bobBellGeo,
        new THREE.MeshStandardMaterial({
          color: hairColorThree,
          roughness: 0.36,
          metalness: 0.06,
          side: THREE.DoubleSide,
        })
      );
      registerClickable(bobBellMesh);
      headGroup.add(bobBellMesh);
    } else if (style === 'long') {
      // Long Hair (Wanita): Soft parted curtain bangs + tapered shoulder-draping locks + contoured back cascade
      ([-1, 1] as const).forEach((side) => {
        const curtainBang = new THREE.Mesh(
          createTaperedHairSweepGeometry(
            [
              new THREE.Vector3(side * 0.008, 0.124, 0.145),
              new THREE.Vector3(side * 0.082, 0.108, 0.136),
              new THREE.Vector3(side * 0.148, 0.064, 0.072),
            ],
            0.033,
            22,
            14
          ),
          hairMat
        );
        headGroup.add(curtainBang);

        const flowingLock = new THREE.Mesh(
          createTaperedHairSweepGeometry(
            [
              new THREE.Vector3(side * 0.146, 0.072, 0.045),
              new THREE.Vector3(side * 0.168, -0.035, 0.032),
              new THREE.Vector3(side * 0.162, -0.155, 0.042),
              new THREE.Vector3(side * 0.145, -0.265, 0.058),
            ],
            0.045,
            28,
            16
          ),
          hairMat
        );
        registerClickable(flowingLock);
        headGroup.add(flowingLock);
      });

      const backDrape = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.118, 0.28, 16, 24),
        hairMat
      );
      backDrape.scale.set(1.42, 1.0, 0.54);
      backDrape.position.set(0, -0.135, -0.128);
      registerClickable(backDrape);
      headGroup.add(backDrape);
    }
  }

  return {
    characterGroup,
    upperBodyGroup,
    bodyMat,
    headMat,
    headGroup,
    leftEyeMesh,
    rightEyeMesh,
    leftPupilMesh,
    rightPupilMesh,
    leftBrowMesh,
    rightBrowMesh,
    steamPuffs,
    zzzParticles,
    cigaretteGroup,
    spoonFoodGroup,
    leftArmGroup,
    rightArmGroup,
    leftLegGroup,
    rightLegGroup,
    leftKneeGroup,
    rightKneeGroup,
    clickableMeshes,
  };
}
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
  currentUserEmail,
  currentUserBreakStatus,
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
  const currentUserIdRef = useRef<string | undefined>(currentUserId);
  const currentUserEmailRef = useRef<string>(
    (currentUserEmail || '').trim().toLowerCase()
  );
  const currentUserBreakStatusRef = useRef<BreakModeType | undefined>(
    currentUserBreakStatus
  );
  const staffRef = useRef<StaffMemberRecord[]>(staff);
  const onSelectStaffRef = useRef(onSelectStaff);
  const onWalkOutCompleteRef = useRef(onWalkOutComplete);
  const onActiveAttendanceChangeRef = useRef(onActiveAttendanceChange);
  onWalkOutCompleteRef.current = onWalkOutComplete;
  onActiveAttendanceChangeRef.current = onActiveAttendanceChange;
  currentUserIdRef.current = currentUserId;
  currentUserEmailRef.current = (currentUserEmail || '').trim().toLowerCase();
  currentUserBreakStatusRef.current = currentUserBreakStatus;

  // Live Active Attendance State from Supabase `attendance` table (check_in_time IS NOT NULL AND clock_out_time IS NULL)
  const [activeAttendanceByEmail, setActiveAttendanceByEmail] = useState<
    Record<string, SupabaseAttendanceRow>
  >({});
  const activeAttendanceByEmailRef = useRef<
    Record<string, SupabaseAttendanceRow>
  >({});
  activeAttendanceByEmailRef.current = activeAttendanceByEmail;
  // Live Per-Employee Break Status State hydrated & subscribed from Supabase `personnel` table (`break_status` + metadata)
  const [realtimeBreakByEmail, setRealtimeBreakByEmail] = useState<
    Record<string, BreakModeType>
  >({});
  const realtimeBreakByEmailRef = useRef<Record<string, BreakModeType>>({});
  realtimeBreakByEmailRef.current = realtimeBreakByEmail;
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

    // Hydrate & subscribe to `personnel` per-employee `break_status` column (+ avatar_url metadata fallback)
    const loadPersonnelBreaks = async () => {
      try {
        const { data, error } = await supabase.from('personnel').select('*');
        if (!isMounted || error || !Array.isArray(data)) return;
        const map: Record<string, BreakModeType> = {};
        for (const row of data as SupabasePersonnelRow[]) {
          const emailKey = (row.email || '').trim().toLowerCase();
          if (!emailKey) continue;
          const decoded = decodePersonnelAvatarUrlAndMetadata(row.avatar_url);
          map[emailKey] = resolveIndividualBreakStatus({
            personnelBreakStatus: row.break_status,
            avatarMetaBreakStatus: decoded.meta.breakStatus,
          });
        }
        // Always apply fresh DB values so remote Break / Stop Break changes update immediately
        setRealtimeBreakByEmail(map);
      } catch {
        // Non-fatal
      }
    };
    loadPersonnelBreaks();

    const personnelBreakChannel = supabase
      .channel('virtual-office-personnel-break-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnel',
        },
        (payload) => {
          if (!isMounted) return;
          const updatedRow = payload.new as SupabasePersonnelRow | undefined;
          const emailKey = (updatedRow?.email || '').trim().toLowerCase();
          if (updatedRow && emailKey) {
            const hasBreakCol =
              updatedRow.break_status !== undefined &&
              updatedRow.break_status !== null &&
              String(updatedRow.break_status).trim() !== '';
            const hasAvatarCol = Object.prototype.hasOwnProperty.call(
              updatedRow,
              'avatar_url'
            );
            if (hasBreakCol || hasAvatarCol) {
              const decoded = decodePersonnelAvatarUrlAndMetadata(
                updatedRow.avatar_url
              );
              const nextBreak = resolveIndividualBreakStatus({
                personnelBreakStatus: updatedRow.break_status,
                avatarMetaBreakStatus: decoded.meta.breakStatus,
              });
              setRealtimeBreakByEmail((prev) => ({
                ...prev,
                [emailKey]: nextBreak,
              }));
            } else {
              // If Postgres WAL omitted TOASTed columns, fetch fresh personnel breaks immediately
              loadPersonnelBreaks();
            }
          } else {
            loadPersonnelBreaks();
          }
        }
      )
      .subscribe();

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

    // Silent 5-second background auto-polling fallback for `personnel` & `attendance`
    // Guarantees live cross-user Break animations (Eating / Sleeping / Smoking / Stop Break) even if WebSocket disconnects
    const pollIntervalId = window.setInterval(() => {
      if (!isMounted) return;
      loadTodayActiveAttendance();
      loadPersonnelBreaks();
    }, 4000);

    const handleWindowFocusSync = () => {
      if (!isMounted || document.visibilityState !== 'visible') return;
      loadTodayActiveAttendance();
      loadPersonnelBreaks();
    };
    window.addEventListener('focus', handleWindowFocusSync);
    document.addEventListener('visibilitychange', handleWindowFocusSync);

    return () => {
      isMounted = false;
      window.clearInterval(pollIntervalId);
      window.removeEventListener('focus', handleWindowFocusSync);
      document.removeEventListener('visibilitychange', handleWindowFocusSync);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(personnelBreakChannel);
    };
  }, []);

  // Merge active attendance records + live break_status with staff list:
  // ONLY render a 3D avatar if the user has a check_in_time AND their clock_out_time is NULL for today
  // (or if they have an active local check-in state passed from the parent).
  const resolvedStaffWithRealtimePresence = useMemo<StaffMemberRecord[]>(() => {
    const mergedFromSupabase = applyActiveAttendanceToStaffList(
      staff,
      activeAttendanceByEmail
    );
    const cleanActiveEmail = (currentUserEmail || '').trim().toLowerCase();
    const mergedWithLocal = mergedFromSupabase.map((member) => {
      const original = staff.find(
        (s) =>
          s.staffId === member.staffId ||
          ((s.email || '').trim().toLowerCase() !== '' &&
            (s.email || '').trim().toLowerCase() ===
              (member.email || '').trim().toLowerCase())
      );

      let resolvedMember = member;
      if (
        member.workMode !== 'WFO' &&
        original &&
        original.workMode === 'WFO' &&
        original.checkInTime &&
        original.checkInTime !== '-'
      ) {
        resolvedMember = original;
      }

      if (resolvedMember.workMode !== 'WFO') {
        return { ...resolvedMember, breakStatus: 'none' as BreakModeType };
      }

      const emailKey = (resolvedMember.email || '').trim().toLowerCase();
      const isCurrentUserMatch =
        (currentUserId && resolvedMember.staffId === currentUserId) ||
        (cleanActiveEmail && emailKey === cleanActiveEmail);
      const activeAttRow = emailKey ? activeAttendanceByEmail[emailKey] : undefined;
      const personnelRealtimeBreak = emailKey
        ? realtimeBreakByEmail[emailKey]
        : undefined;

      // Read THIS individual employee's break_status from Supabase `attendance` & `personnel`
      let effectiveBreak: BreakModeType = resolveIndividualBreakStatus({
        personnelBreakStatus:
          personnelRealtimeBreak ?? original?.breakStatus ?? resolvedMember.breakStatus,
        attendanceBreakStatus: activeAttRow?.break_status,
        fallbackBreakStatus: resolvedMember.breakStatus,
      });

      if (isCurrentUserMatch && currentUserBreakStatus !== undefined) {
        effectiveBreak = normalizeBreakMode(currentUserBreakStatus);
      }

      return {
        ...resolvedMember,
        breakStatus: effectiveBreak,
      };
    });
    return assignRoomGridCoordinatesToStaffList(mergedWithLocal);
  }, [
    staff,
    activeAttendanceByEmail,
    realtimeBreakByEmail,
    currentUserId,
    currentUserEmail,
    currentUserBreakStatus,
  ]);

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
  const highlightedBreakStatus: BreakModeType = useMemo(() => {
    if (!highlightedHud) return 'none';
    const match = resolvedStaffWithRealtimePresence.find(
      (s) => s.staffId === highlightedHud.staffId
    );
    return normalizeBreakMode(match?.breakStatus);
  }, [highlightedHud, resolvedStaffWithRealtimePresence]);

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

  const focusAvatarCameraFnRef = useRef<
    ((staffId: string | null) => void) | null
  >(null);

  // Smoothly zoom camera toward highlighted avatar when selectedStaffId changes
  useEffect(() => {
    focusAvatarCameraFnRef.current?.(selectedStaffId);
  }, [selectedStaffId]);

  const handleSwitchBranchCamera = (targetBranch: VirtualOfficeBranchView) => {
    setActiveBranchView(targetBranch);
    flyToBuildingFnRef.current?.(targetBranch);
  };

  const handleReset3DCamera = () => {
    onSelectStaff(null);
    flyToBuildingFnRef.current?.(activeBranchView);
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
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 65;
    dirLight.shadow.camera.left = -22;
    dirLight.shadow.camera.right = 36;
    dirLight.shadow.camera.top = 18;
    dirLight.shadow.camera.bottom = -18;
    dirLight.shadow.bias = -0.0008;
    scene.add(dirLight);

    const jktIndoorLight = new THREE.PointLight(0x38bdf8, 1.45, 36);
    jktIndoorLight.position.set(0, 8.5, 0);
    scene.add(jktIndoorLight);

    const jktWarmLight = new THREE.PointLight(0xfff7ed, 0.9, 28);
    jktWarmLight.position.set(-4, 6.5, 2);
    scene.add(jktWarmLight);

    const bdgIndoorLight = new THREE.PointLight(0x38bdf8, 1.45, 24);
    bdgIndoorLight.position.set(bdgSpec.centerX, 7.5, bdgSpec.centerZ);
    scene.add(bdgIndoorLight);

    const bdgWarmLight = new THREE.PointLight(0xfff7ed, 0.85, 20);
    bdgWarmLight.position.set(bdgSpec.centerX, 5.5, bdgSpec.centerZ + 1);
    scene.add(bdgWarmLight);

    // -------------------------------------------------------------------------
    // 3. TWO DISTINCT BUILDINGS/PLATFORMS: JAKARTA HQ & GEDUNG JAWA
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
      color: isDark ? 0x111c2d : 0x1e293b,
      roughness: 0.65,
      metalness: 0.14,
    });
    const jktFloor = new THREE.Mesh(
      new THREE.BoxGeometry(jktSpec.width, 0.35, jktSpec.depth),
      jktFloorMat
    );
    jktFloor.position.set(jktSpec.centerX, -0.18, jktSpec.centerZ);
    jktFloor.receiveShadow = true;
    scene.add(jktFloor);

    const jktGrid = new THREE.GridHelper(
      24,
      24,
      0x0284c7,
      isDark ? 0x1e293b : 0x334155
    );
    jktGrid.position.set(jktSpec.centerX, 0.006, jktSpec.centerZ);
    scene.add(jktGrid);

    // Jakarta HQ Perimeter White Walls with Entrance Door & Exit Door gaps
    const jktWalls = buildBuildingPerimeterWallsWithDoors(
      jktSpec,
      whiteWallMat,
      doorFrameMat
    );
    scene.add(jktWalls);

    // Decorative Lobby Potted Plants inside Jakarta HQ Entrance & Corners
    const jktLobbyPlantLocations: Array<[number, number, string]> = [
      [-11.3, 8.8, '#10b981'],
      [11.3, 8.8, '#00B4D8'],
      [-11.3, -8.6, '#8b5cf6'],
      [11.3, -8.6, '#f59e0b'],
    ];
    jktLobbyPlantLocations.forEach(([px, pz, accent]) => {
      const plant = createIndoorPlantGroup(accent);
      plant.position.set(px, 0.02, pz);
      scene.add(plant);
    });

    const jktBanner = createArchitecturalLabelSprite(
      'GEDUNG JAKARTA HQ (8 ZONA)',
      'Jl. Nusa Indah No.33, Cipete Selatan',
      '#00B4D8',
      5.2,
      1.15
    );
    jktBanner.position.set(jktSpec.centerX, 3.3, jktSpec.centerZ - jktSpec.depth / 2);
    scene.add(jktBanner);

    // --- BUILDING B: GEDUNG JAWA (Separated in 3D Space at Center X = 28, Z = 0) ---
    const bdgFloorMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x111c2d : 0x1e293b,
      roughness: 0.65,
      metalness: 0.14,
    });
    const bdgFloor = new THREE.Mesh(
      new THREE.BoxGeometry(bdgSpec.width, 0.35, bdgSpec.depth),
      bdgFloorMat
    );
    bdgFloor.position.set(bdgSpec.centerX, -0.18, bdgSpec.centerZ);
    bdgFloor.receiveShadow = true;
    scene.add(bdgFloor);

    const bdgGrid = new THREE.GridHelper(
      11,
      11,
      0x00b4d8,
      isDark ? 0x1e293b : 0x334155
    );
    bdgGrid.position.set(bdgSpec.centerX, 0.006, bdgSpec.centerZ);
    scene.add(bdgGrid);

    // Gedung Jawa Perimeter White Walls with Entrance Door & Exit Door gaps
    const bdgWalls = buildBuildingPerimeterWallsWithDoors(
      bdgSpec,
      whiteWallMat,
      doorFrameMat
    );
    scene.add(bdgWalls);

    // Decorative Potted Plants inside Gedung Jawa Corners
    [
      [bdgSpec.centerX - 4.7, bdgSpec.centerZ + 4.1],
      [bdgSpec.centerX + 4.7, bdgSpec.centerZ + 4.1],
      [bdgSpec.centerX - 4.7, bdgSpec.centerZ - 4.1],
      [bdgSpec.centerX + 4.7, bdgSpec.centerZ - 4.1],
    ].forEach(([px, pz]) => {
      const plant = createIndoorPlantGroup('#00B4D8');
      plant.position.set(px, 0.02, pz);
      scene.add(plant);
    });

    const bdgBanner = createArchitecturalLabelSprite(
      'GEDUNG JAWA',
      'GEDUNG JAWA · Hub Regional',
      '#00B4D8',
      4.4,
      1.05
    );
    bdgBanner.position.set(bdgSpec.centerX, 3.1, bdgSpec.centerZ - bdgSpec.depth / 2);
    scene.add(bdgBanner);

    // Subtle Inter-Branch Connector Walkway / Plaza Markers between Jakarta HQ (X=12.4) and Gedung Jawa (X=22.2)
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

    // Large 3D Dining Hall & Cafeteria ("RUANG MAKAN") Zone between Jakarta HQ & Gedung Jawa
    const diningHallGroup = createDiningHallZoneGroup(isDark);
    scene.add(diningHallGroup);

    // Outdoor Smoking Patio / Balcony Zones outside Exit Doors (Jakarta HQ & Gedung Jawa)
    const smokingPatioSpecs = [
      { x: 6.8, z: 11.15, label: 'SMOKING AREA · JKT' },
      { x: 31.2, z: 6.45, label: 'SMOKING AREA · JAWA' },
    ];
    smokingPatioSpecs.forEach((patio) => {
      const patioPad = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.12, 2.0),
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.7,
          metalness: 0.15,
        })
      );
      patioPad.position.set(patio.x, -0.06, patio.z);
      scene.add(patioPad);

      const ashtrayStand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, 0.62, 14),
        new THREE.MeshStandardMaterial({
          color: 0x475569,
          roughness: 0.35,
          metalness: 0.55,
        })
      );
      ashtrayStand.position.set(patio.x + 1.15, 0.31, patio.z);
      scene.add(ashtrayStand);
    });

    // -------------------------------------------------------------------------
    // 4. RENDER MODERN ARCHITECTURAL ROOM ZONES, DIVISION CARPETS, GLASS PARTITIONS & INDOOR PLANTS
    // -------------------------------------------------------------------------
    const partitionFrameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.65,
    });

    VIRTUAL_OFFICE_ROOMS.forEach((room) => {
      const { centerX, centerZ, width: rW, depth: rD } = room.floorBounds;
      const roomColor = new THREE.Color(room.accentColor);

      // Base Division Zone Floor Pad
      const zoneGeo = new THREE.BoxGeometry(rW, 0.05, rD);
      const zoneMat = new THREE.MeshStandardMaterial({
        color: roomColor,
        roughness: 0.72,
        metalness: 0.1,
        transparent: true,
        opacity: isDark ? 0.22 : 0.28,
      });
      const zonePad = new THREE.Mesh(zoneGeo, zoneMat);
      zonePad.position.set(centerX, 0.025, centerZ);
      zonePad.receiveShadow = true;
      scene.add(zonePad);

      // Inner Woven Division Carpet / Rug with Accent Trim
      const rugW = Math.max(1.6, rW - 0.55);
      const rugD = Math.max(1.4, rD - 0.55);
      const innerRugMat = new THREE.MeshStandardMaterial({
        color: roomColor,
        roughness: 0.88,
        metalness: 0.04,
        transparent: true,
        opacity: isDark ? 0.34 : 0.42,
      });
      const innerRug = new THREE.Mesh(
        new THREE.BoxGeometry(rugW, 0.025, rugD),
        innerRugMat
      );
      innerRug.position.set(centerX, 0.055, centerZ);
      innerRug.receiveShadow = true;
      scene.add(innerRug);

      // Sleek Transparent Glass Partitions with Aluminum Rails between Zones
      const glassThickness = 0.055;
      const glassHeight = 0.78;
      const interiorGlassMat = new THREE.MeshStandardMaterial({
        color: roomColor.clone().lerp(new THREE.Color(0xe0f2fe), 0.45),
        roughness: 0.15,
        metalness: 0.25,
        transparent: true,
        opacity: 0.34,
      });

      const northGlass = new THREE.Mesh(
        new THREE.BoxGeometry(rW, glassHeight, glassThickness),
        interiorGlassMat
      );
      northGlass.position.set(centerX, glassHeight / 2, centerZ - rD / 2);
      scene.add(northGlass);

      const northRail = new THREE.Mesh(
        new THREE.BoxGeometry(rW + 0.04, 0.045, 0.08),
        partitionFrameMat
      );
      northRail.position.set(centerX, glassHeight + 0.02, centerZ - rD / 2);
      scene.add(northRail);

      const westGlass = new THREE.Mesh(
        new THREE.BoxGeometry(glassThickness, glassHeight, rD),
        interiorGlassMat
      );
      westGlass.position.set(centerX - rW / 2, glassHeight / 2, centerZ);
      scene.add(westGlass);

      const westRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.045, rD),
        partitionFrameMat
      );
      westRail.position.set(centerX - rW / 2, glassHeight + 0.02, centerZ);
      scene.add(westRail);

      const eastGlass = new THREE.Mesh(
        new THREE.BoxGeometry(glassThickness, glassHeight, rD),
        interiorGlassMat
      );
      eastGlass.position.set(centerX + rW / 2, glassHeight / 2, centerZ);
      scene.add(eastGlass);

      const eastRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.045, rD),
        partitionFrameMat
      );
      eastRail.position.set(centerX + rW / 2, glassHeight + 0.02, centerZ);
      scene.add(eastRail);

      // Corner Aluminum Partition Posts
      [
        [centerX - rW / 2, centerZ - rD / 2],
        [centerX + rW / 2, centerZ - rD / 2],
        [centerX - rW / 2, centerZ + rD / 2],
        [centerX + rW / 2, centerZ + rD / 2],
      ].forEach(([postX, postZ]) => {
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, glassHeight + 0.05, 0.09),
          partitionFrameMat
        );
        post.position.set(postX, (glassHeight + 0.05) / 2, postZ);
        scene.add(post);
      });

      // Indoor Potted Plant in the back-left corner of each room zone
      const roomPlant = createIndoorPlantGroup(room.accentColor);
      roomPlant.position.set(
        centerX - rW / 2 + 0.38,
        0.04,
        centerZ - rD / 2 + 0.38
      );
      roomPlant.scale.set(0.82, 0.82, 0.82);
      scene.add(roomPlant);
    });

    // -------------------------------------------------------------------------
    // 5. DESKS + OPEN "LAPTOP" MESHES + CUSTOMIZABLE 3D AVATARS
    // -------------------------------------------------------------------------
    const deskTopGeo = new THREE.BoxGeometry(1.38, 0.08, 0.78);
    const deskLegGeo = new THREE.BoxGeometry(0.08, 0.54, 0.68);
    const chairSeatGeo = new THREE.BoxGeometry(0.52, 0.07, 0.5);
    const chairBackGeo = new THREE.BoxGeometry(0.52, 0.48, 0.08);

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
      staffEmail: string;
      staffName: string;
      roomName: string;
      appearanceSignature: string;
      isBandung: boolean;
      deskRootGroup: THREE.Group;
      mattressBedGroup: THREE.Group;
      avatarActorGroup: THREE.Group;
      characterGroup: THREE.Group;
      upperBodyGroup: THREE.Group;
      headGroup: THREE.Group;
      leftEyeMesh: THREE.Mesh;
      rightEyeMesh: THREE.Mesh;
      leftPupilMesh: THREE.Mesh;
      rightPupilMesh: THREE.Mesh;
      leftBrowMesh: THREE.Mesh;
      rightBrowMesh: THREE.Mesh;
      steamPuffs: SteamPuffParticle[];
      zzzParticles: ZzzSleepParticle[];
      cigaretteGroup: THREE.Group;
      spoonFoodGroup: THREE.Group;
      chatBubbleSprite: THREE.Sprite;
      chatBubbleMat: THREE.SpriteMaterial;
      nameSprite: THREE.Sprite;
      leftArmGroup: THREE.Group;
      rightArmGroup: THREE.Group;
      leftLegGroup: THREE.Group;
      rightLegGroup: THREE.Group;
      leftKneeGroup: THREE.Group;
      rightKneeGroup: THREE.Group;
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
      walkInWaypoints: Array<{ x: number; z: number }>;
      walkOutWaypoints: Array<{ x: number; z: number }>;
      smokeToWaypoints: Array<{ x: number; z: number }>;
      smokeReturnWaypoints: Array<{ x: number; z: number }>;
      eatingToWaypoints: Array<{ x: number; z: number }>;
      eatingReturnWaypoints: Array<{ x: number; z: number }>;
      activeBreakWaypoints: Array<{ x: number; z: number }>;
      visitToWaypoints: Array<{ x: number; z: number }>;
      visitReturnWaypoints: Array<{ x: number; z: number }>;
      smokeSpotX: number;
      smokeSpotZ: number;
      diningSeatX: number;
      diningSeatZ: number;
      diningFacingAngle: number;
      visitSpotX: number;
      visitSpotZ: number;
      visitPartnerStaffId: string | null;
      syncIndex: number;
      breakBadgeSprite: THREE.Sprite;
      isBeingVisitedForChat: boolean;
      chatVisitorWorldPos: { x: number; z: number } | null;
      breakStatus: BreakModeType;
      activeOutdoorBreakKind: 'none' | 'eating' | 'smoking' | 'returning';
      outdoorBreakProgress: number;
      sleepBreakElapsed: number;
      activeSleepPackUp: boolean;
      sleepPackUpProgress: number;
      spawnProgress: number;
      despawnProgress: number;
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
      scene.remove(existing.mattressBedGroup);
      scene.remove(existing.avatarActorGroup);
      disposeObject3DResources(
        existing.deskRootGroup,
        sharedGeometries,
        sharedMaterials
      );
      disposeObject3DResources(
        existing.mattressBedGroup,
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

      // A. Modern Workstation Desk & Ergonomic Office Chair + Open Laptop
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
      deskTop.position.set(0, 0.56, -0.22);
      deskTop.castShadow = true;
      deskTop.receiveShadow = true;
      deskRootGroup.add(deskTop);

      // Desk Mat Pad under Laptop
      const deskMatPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.012, 0.42),
        laptopKeyboardMat
      );
      deskMatPad.position.set(0, 0.604, -0.15);
      deskRootGroup.add(deskMatPad);

      const leftLeg = new THREE.Mesh(deskLegGeo, deskLegMat);
      leftLeg.position.set(-0.56, 0.27, -0.22);
      leftLeg.castShadow = true;
      deskRootGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(deskLegGeo, deskLegMat);
      rightLeg.position.set(0.56, 0.27, -0.22);
      rightLeg.castShadow = true;
      deskRootGroup.add(rightLeg);

      // OPEN LAPTOP MESH on every spawned desk
      const laptopGroup = new THREE.Group();
      laptopGroup.position.set(0, 0.612, -0.15);
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

      // Ergonomic Office Chair (Calibrated so seated avatar rests directly on top of chairSeat at Z = +0.38!)
      const chairMat = new THREE.MeshStandardMaterial({
        color: shirtColorThree,
        roughness: 0.48,
        metalness: 0.18,
      });
      const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
      chairSeat.position.set(0, 0.3, 0.38);
      chairSeat.castShadow = true;
      deskRootGroup.add(chairSeat);

      const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
      chairBack.position.set(0, 0.56, 0.6);
      chairBack.castShadow = true;
      deskRootGroup.add(chairBack);

      const chairStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.27, 10),
        deskLegMat
      );
      chairStem.position.set(0, 0.155, 0.38);
      deskRootGroup.add(chairStem);

      const chairBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.03, 12),
        deskLegMat
      );
      chairBase.position.set(0, 0.03, 0.38);
      deskRootGroup.add(chairBase);

      scene.add(deskRootGroup);

      // A2. Plush 3D Pocket Mattress Bed (Hidden by default; pops out from avatar's pocket when "Sleeping" break starts!)
      const mattressBedGroup = createPocketMattressBedGroup();
      mattressBedGroup.position.set(x, 0, z);
      mattressBedGroup.visible = false;
      mattressBedGroup.scale.set(0.01, 0.01, 0.01);
      scene.add(mattressBedGroup);

      // B. Walking & Seated Roblox-Style 3D Avatar Actor Group (Seated directly ON the chair cushion at Z = z + 0.38)
      const avatarActorGroup = new THREE.Group();
      const homeX = x;
      const homeZ = z + 0.38;
      const entranceX = buildingSpec.entranceDoor.x;
      const entranceZ = buildingSpec.entranceDoor.z;
      const exitX = buildingSpec.exitDoor.x;
      const exitZ = buildingSpec.exitDoor.z;

      const startWalkIn = isWalkInTarget || isNewlySpawned;
      avatarActorGroup.position.set(
        startWalkIn ? entranceX : homeX,
        startWalkIn ? 0 : -0.035,
        startWalkIn ? entranceZ : homeZ
      );
      // Face the laptop on the desk (-Z direction -> rotation.y = Math.PI)
      avatarActorGroup.rotation.y = Math.PI;
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

      // Build Smooth Rounded Roblox-Style Character
      const robloxBuilt = buildRobloxStylizedCharacter(cfg3D, person.staffId);
      avatarActorGroup.add(robloxBuilt.characterGroup);
      clickableMeshes.push(...robloxBuilt.clickableMeshes);

      const {
        characterGroup,
        upperBodyGroup,
        bodyMat,
        headMat,
        headGroup,
        leftEyeMesh,
        rightEyeMesh,
        leftPupilMesh,
        rightPupilMesh,
        leftBrowMesh,
        rightBrowMesh,
        steamPuffs,
        zzzParticles,
        cigaretteGroup,
        spoonFoodGroup,
        leftArmGroup,
        rightArmGroup,
        leftLegGroup,
        rightLegGroup,
        leftKneeGroup,
        rightKneeGroup,
      } = robloxBuilt;

      // 3D Cartoon Thought / Speech Bubble Sprite (shown above head during inter-room coworker chats)
      const chatBubbleBuilt = createChatBubbleSprite();
      const chatBubbleSprite = chatBubbleBuilt.sprite;
      const chatBubbleMat = chatBubbleBuilt.mat;
      chatBubbleSprite.position.set(0.42, 1.48, 0.14);
      avatarActorGroup.add(chatBubbleSprite);

      // 4. Sims-Like Floating Plumbob Crystal + Persistent Name Tag Sprite
      const plumbobMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.55,
        roughness: 0.2,
      });
      const plumbobMesh = new THREE.Mesh(plumbobGeo, plumbobMat);
      plumbobMesh.position.set(0, 1.56, 0);
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
      nameSprite.position.set(0, 1.96, 0);
      nameSprite.userData = { staffId: person.staffId };
      avatarActorGroup.add(nameSprite);

      const breakBadgeSprite = createBreakBadgeSprite();
      breakBadgeSprite.position.set(0, 2.32, 0);
      avatarActorGroup.add(breakBadgeSprite);

      const appearanceSignature = `${person.name}|${person.role}|${person.roomName}|${cfg3D.gender || ''}|${cfg3D.shirtColor}|${cfg3D.hairStyle}|${cfg3D.hairColor}|${cfg3D.useHijab}|${cfg3D.hijabColor}|${cfg3D.outfitType || 'formal_shirt'}`;

      // Precompute collision-free corridor & doorway waypoints for:
      // 1) Entrance Door -> Desk (`walkInWaypoints`)
      // 2) Desk -> Exit Door (`walkOutWaypoints`)
      // 3) Desk -> Outdoor Smoking Patio & back (`smokeToWaypoints`, `smokeReturnWaypoints`)
      // 4) Desk -> Neighboring Room Zone Visit & back (`visitToWaypoints`, `visitReturnWaypoints`)
      const seedHash = person.staffId
        .split('')
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const smokeOffset = ((seedHash % 5) - 2) * 0.45;
      const smokeSpotX = inBandung ? 30.8 + smokeOffset * 0.6 : 6.4 + smokeOffset;
      const smokeSpotZ = inBandung ? 6.45 : 11.15;

      const jktRooms = VIRTUAL_OFFICE_ROOMS.filter((r) => r.branch === 'JKT');
      const currentRoomIdx = Math.max(
        0,
        jktRooms.findIndex((r) => r.roomName === person.roomName)
      );
      const targetVisitRoom = inBandung
        ? VIRTUAL_OFFICE_ROOMS.find((r) => r.roomName === 'Cabang Bandung') ||
          VIRTUAL_OFFICE_ROOMS[0]
        : jktRooms[(currentRoomIdx + 1 + (seedHash % 3)) % jktRooms.length] ||
          jktRooms[0];

      const visitSpotX = inBandung
        ? 28.0 + (homeX < 28 ? 1.5 : -1.5)
        : targetVisitRoom.floorBounds.centerX + ((seedHash % 3) - 1) * 0.65;
      const visitSpotZ = inBandung
        ? 1.4
        : targetVisitRoom.floorBounds.centerZ + 0.85;

      const walkInWaypoints = buildCorridorWaypoints(
        entranceX,
        entranceZ,
        homeX,
        homeZ,
        inBandung
      );
      const walkOutWaypoints = buildCorridorWaypoints(
        homeX,
        homeZ,
        exitX,
        exitZ,
        inBandung
      );
      const smokeToWaypoints = buildCorridorWaypoints(
        homeX,
        homeZ,
        smokeSpotX,
        smokeSpotZ,
        inBandung
      );
      const smokeReturnWaypoints = [...smokeToWaypoints].reverse();

      const diningSeatSpec = getAssignedDiningSeatSpec(seedHash);
      const diningSeatX = diningSeatSpec.seatX;
      const diningSeatZ = diningSeatSpec.seatZ;
      const diningFacingAngle = diningSeatSpec.facingAngle;

      const eatingToWaypoints = buildCorridorWaypoints(
        homeX,
        homeZ,
        diningSeatX,
        diningSeatZ,
        inBandung
      );
      const eatingReturnWaypoints = [...eatingToWaypoints].reverse();

      const visitToWaypoints = buildCorridorWaypoints(
        homeX,
        homeZ,
        visitSpotX,
        visitSpotZ,
        inBandung
      );
      const visitReturnWaypoints = [...visitToWaypoints].reverse();

      if (startWalkIn) {
        // Hide avatar briefly while the desk & chair pop-up/drop into place first
        avatarActorGroup.visible = false;
      }

      const initialBreak = normalizeBreakMode(person.breakStatus);
      const initialBreakWaypoints =
        initialBreak === 'eating'
          ? eatingToWaypoints
          : initialBreak === 'smoking'
          ? smokeToWaypoints
          : [];

      avatarEntriesMap.set(person.staffId, {
        staffId: person.staffId,
        staffEmail: (person.email || '').trim().toLowerCase(),
        staffName: person.name,
        roomName: person.roomName,
        appearanceSignature,
        isBandung: inBandung,
        deskRootGroup,
        mattressBedGroup,
        avatarActorGroup,
        characterGroup,
        upperBodyGroup,
        headGroup,
        leftEyeMesh,
        rightEyeMesh,
        leftPupilMesh,
        rightPupilMesh,
        leftBrowMesh,
        rightBrowMesh,
        steamPuffs,
        zzzParticles,
        cigaretteGroup,
        spoonFoodGroup,
        chatBubbleSprite,
        chatBubbleMat,
        nameSprite,
        leftArmGroup,
        rightArmGroup,
        leftLegGroup,
        rightLegGroup,
        leftKneeGroup,
        rightKneeGroup,
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
        walkInWaypoints,
        walkOutWaypoints,
        smokeToWaypoints,
        smokeReturnWaypoints,
        eatingToWaypoints,
        eatingReturnWaypoints,
        activeBreakWaypoints: initialBreakWaypoints,
        visitToWaypoints,
        visitReturnWaypoints,
        smokeSpotX,
        smokeSpotZ,
        diningSeatX,
        diningSeatZ,
        diningFacingAngle,
        visitSpotX,
        visitSpotZ,
        visitPartnerStaffId: null,
        syncIndex: 0,
        breakBadgeSprite,
        isBeingVisitedForChat: false,
        chatVisitorWorldPos: null,
        breakStatus: initialBreak,
        activeOutdoorBreakKind:
          initialBreak === 'eating' || initialBreak === 'smoking'
            ? initialBreak
            : 'none',
        outdoorBreakProgress: 0,
        sleepBreakElapsed: 0,
        activeSleepPackUp: false,
        sleepPackUpProgress: 0,
        spawnProgress: isNewlySpawned || startWalkIn ? 0.01 : 1,
        despawnProgress: 0,
        walkMode: isWalkOutTarget
          ? 'walk_out'
          : startWalkIn
          ? 'walk_in'
          : 'idle',
        walkProgress: isWalkOutTarget || startWalkIn ? 0.0 : 1,
        clickableMeshes,
      });
    };

    const applyBreakTransitionToEntry = (
      entry: AvatarEntry,
      nextBreak: BreakModeType,
      announceBanner: boolean = true
    ) => {
      const prevBreak = entry.breakStatus;
      if (prevBreak === nextBreak) return;
      entry.breakStatus = nextBreak;

      // If avatar was still in initial walk_in when user clicked Break, complete desk setup immediately
      if (nextBreak !== 'none' && entry.walkMode === 'walk_in') {
        entry.walkMode = 'idle';
        entry.walkProgress = 1;
        entry.spawnProgress = 1;
        entry.deskRootGroup.scale.set(1, 1, 1);
        entry.deskRootGroup.position.set(entry.homeX, 0, entry.homeZ - 0.38);
        entry.avatarActorGroup.visible = true;
      }

      const curX = entry.avatarActorGroup.position.x;
      const curZ = entry.avatarActorGroup.position.z;

      if (nextBreak === 'eating') {
        entry.sleepBreakElapsed = 0;
        entry.activeSleepPackUp = false;
        entry.sleepPackUpProgress = 0;
        entry.activeOutdoorBreakKind = 'eating';
        entry.outdoorBreakProgress = 0;
        entry.activeBreakWaypoints = buildCorridorWaypoints(
          curX,
          curZ,
          entry.diningSeatX,
          entry.diningSeatZ,
          entry.isBandung
        );
        if (announceBanner) {
          setWalkingBannerText(
            `${entry.staffName} sedang Break Eating · Berdiri & berjalan menuju Ruang Makan (Cafeteria)...`
          );
          setTimeout(() => setWalkingBannerText(null), 4000);
        }
      } else if (nextBreak === 'smoking') {
        entry.sleepBreakElapsed = 0;
        entry.activeSleepPackUp = false;
        entry.sleepPackUpProgress = 0;
        entry.activeOutdoorBreakKind = 'smoking';
        entry.outdoorBreakProgress = 0;
        entry.activeBreakWaypoints = buildCorridorWaypoints(
          curX,
          curZ,
          entry.smokeSpotX,
          entry.smokeSpotZ,
          entry.isBandung
        );
        if (announceBanner) {
          setWalkingBannerText(
            `${entry.staffName} sedang Break Smoking · Berjalan keluar menuju Area Smoking...`
          );
          setTimeout(() => setWalkingBannerText(null), 4000);
        }
      } else if (nextBreak === 'sleeping') {
        entry.sleepBreakElapsed = 0;
        entry.activeSleepPackUp = false;
        entry.sleepPackUpProgress = 0;
        entry.activeOutdoorBreakKind = 'none';
        entry.outdoorBreakProgress = 0;
        entry.activeBreakWaypoints = [];
        entry.avatarActorGroup.position.set(entry.homeX, 0, entry.homeZ);
        if (announceBanner) {
          setWalkingBannerText(
            `${entry.staffName} sedang Break Sleeping · Melempar meja kerja & mengeluarkan kasur empuk dari kantong! Zzz...`
          );
          setTimeout(() => setWalkingBannerText(null), 4000);
        }
      } else {
        // Stop Break ('none'): pack mattress back into pocket + restore desk OR walk back from Ruang Makan / Smoking Area
        if (prevBreak === 'sleeping' && entry.sleepBreakElapsed > 0.3) {
          entry.activeSleepPackUp = true;
          entry.sleepPackUpProgress = 0;
          entry.activeOutdoorBreakKind = 'none';
          entry.outdoorBreakProgress = 0;
          entry.activeBreakWaypoints = [];
        } else {
          const distFromDesk = Math.hypot(
            curX - entry.homeX,
            curZ - entry.homeZ
          );
          if (
            (prevBreak === 'eating' ||
              prevBreak === 'smoking' ||
              entry.activeOutdoorBreakKind !== 'none') &&
            distFromDesk > 0.35
          ) {
            entry.activeOutdoorBreakKind = 'returning';
            entry.outdoorBreakProgress = 0;
            entry.activeBreakWaypoints = buildCorridorWaypoints(
              curX,
              curZ,
              entry.homeX,
              entry.homeZ,
              entry.isBandung
            );
          } else {
            entry.activeOutdoorBreakKind = 'none';
            entry.outdoorBreakProgress = 0;
            entry.activeBreakWaypoints = [];
          }
        }
        if (announceBanner && prevBreak !== 'none') {
          setWalkingBannerText(
            `${entry.staffName} selesai istirahat (Stop Break) & kembali duduk bekerja di mejanya.`
          );
          setTimeout(() => setWalkingBannerText(null), 3500);
        }
      }
    };

    const syncAvatarsInScene = (
      rawStaffList: StaffMemberRecord[],
      opts?: {
        newlyAddedId?: string | null;
        walkInId?: string | null;
        walkOutId?: string | null;
        realtimeSpawnId?: string | null;
      }
    ) => {
      // Group active avatars by their room/zone and compute non-overlapping 2D Grid coordinates
      const byRoom = new Map<string, StaffMemberRecord[]>();
      rawStaffList.forEach((p) => {
        const rm = p.roomName || 'Ruangan Creative/Design';
        const list = byRoom.get(rm) || [];
        list.push(p);
        byRoom.set(rm, list);
      });

      const nextStaffList: StaffMemberRecord[] = rawStaffList.map((p) => {
        const rm = p.roomName || 'Ruangan Creative/Design';
        const roomGroup = byRoom.get(rm) || [p];
        const idxInRoom = Math.max(
          0,
          roomGroup.findIndex((m) => m.staffId === p.staffId)
        );
        return {
          ...p,
          deskCoords: computeRoomGridDeskCoords(
            p.roomName,
            idxInRoom,
            roomGroup.length
          ),
        };
      });

      const nextIds = new Set(nextStaffList.map((p) => p.staffId));

      // 1. Remove & dispose any avatars that clocked out / are no longer active
      Array.from(avatarEntriesMap.keys()).forEach((existingId) => {
        if (!nextIds.has(existingId)) {
          removeAndDisposeAvatarEntry(existingId);
        }
      });

      // 2. Spawn newly checked-in avatars or update grid positions / appearance of existing avatars
      nextStaffList.forEach((person) => {
        const existing = avatarEntriesMap.get(person.staffId);
        const cfg3D = getStaffAvatar3DConfig(person);
        const nextSig = `${person.name}|${person.role}|${person.roomName}|${cfg3D.gender || ''}|${cfg3D.shirtColor}|${cfg3D.hairStyle}|${cfg3D.hairColor}|${cfg3D.useHijab}|${cfg3D.hijabColor}|${cfg3D.outfitType || 'formal_shirt'}`;

        if (!existing) {
          createAndSpawnAvatarEntry(person, opts);
          return;
        }

        if (existing.appearanceSignature !== nextSig) {
          removeAndDisposeAvatarEntry(person.staffId);
          createAndSpawnAvatarEntry(person, opts);
          return;
        }

        existing.staffEmail = (person.email || '').trim().toLowerCase();

        // Update breakStatus dynamically if changed via the Dashboard "Break" / "Stop Break" button
        const nextBreak = normalizeBreakMode(person.breakStatus);
        if (existing.breakStatus !== nextBreak) {
          applyBreakTransitionToEntry(existing, nextBreak, true);
        }

        // Update grid coordinates if room occupancy changed so avatars never overlap
        const nextX = person.deskCoords.x;
        const nextZ = person.deskCoords.z;
        const nextHomeX = nextX;
        const nextHomeZ = nextZ + 0.38;

        if (
          Math.abs(existing.homeX - nextHomeX) > 0.01 ||
          Math.abs(existing.homeZ - nextHomeZ) > 0.01
        ) {
          existing.homeX = nextHomeX;
          existing.homeZ = nextHomeZ;
          existing.deskRootGroup.position.set(nextX, 0, nextZ);
          existing.mattressBedGroup.position.set(nextX, 0, nextZ);
          existing.walkInWaypoints = buildCorridorWaypoints(
            existing.entranceX,
            existing.entranceZ,
            nextHomeX,
            nextHomeZ,
            existing.isBandung
          );
          existing.walkOutWaypoints = buildCorridorWaypoints(
            nextHomeX,
            nextHomeZ,
            existing.exitX,
            existing.exitZ,
            existing.isBandung
          );
          existing.smokeToWaypoints = buildCorridorWaypoints(
            nextHomeX,
            nextHomeZ,
            existing.smokeSpotX,
            existing.smokeSpotZ,
            existing.isBandung
          );
          existing.smokeReturnWaypoints = [...existing.smokeToWaypoints].reverse();
          existing.eatingToWaypoints = buildCorridorWaypoints(
            nextHomeX,
            nextHomeZ,
            existing.diningSeatX,
            existing.diningSeatZ,
            existing.isBandung
          );
          existing.eatingReturnWaypoints = [...existing.eatingToWaypoints].reverse();
          existing.visitToWaypoints = buildCorridorWaypoints(
            nextHomeX,
            nextHomeZ,
            existing.visitSpotX,
            existing.visitSpotZ,
            existing.isBandung
          );
          existing.visitReturnWaypoints = [...existing.visitToWaypoints].reverse();
          if (
            existing.walkMode === 'idle' &&
            existing.breakStatus === 'none' &&
            existing.activeOutdoorBreakKind === 'none'
          ) {
            existing.avatarActorGroup.position.set(nextHomeX, -0.035, nextHomeZ);
          }
        }
      });

      // 3. Pair each avatar with an active coworker in another room (if available) for inter-room Thought/Chat Bubble visits
      // Entries are sorted by a stable key (staffId) so every browser derives the SAME syncIndex & partner pairing
      const allEntries = Array.from(avatarEntriesMap.values()).sort((a, b) =>
        a.staffId < b.staffId ? -1 : a.staffId > b.staffId ? 1 : 0
      );
      allEntries.forEach((entry, eIdx) => {
        entry.syncIndex = eIdx;
        const sameBuildingPeers = allEntries.filter(
          (other) =>
            other.staffId !== entry.staffId &&
            other.isBandung === entry.isBandung
        );
        const diffRoomPeers = sameBuildingPeers.filter(
          (other) => other.roomName !== entry.roomName
        );
        const pool =
          diffRoomPeers.length > 0 ? diffRoomPeers : sameBuildingPeers;

        if (pool.length > 0) {
          const chosenPartner = pool[eIdx % pool.length];
          if (entry.visitPartnerStaffId !== chosenPartner.staffId) {
            entry.visitPartnerStaffId = chosenPartner.staffId;
            const sideOffset = chosenPartner.homeX > 0 ? -0.58 : 0.58;
            entry.visitSpotX = chosenPartner.homeX + sideOffset;
            entry.visitSpotZ = chosenPartner.homeZ + 0.16;
            entry.visitToWaypoints = buildCorridorWaypoints(
              entry.homeX,
              entry.homeZ,
              entry.visitSpotX,
              entry.visitSpotZ,
              entry.isBandung
            );
            entry.visitReturnWaypoints = [...entry.visitToWaypoints].reverse();
          }
        } else {
          entry.visitPartnerStaffId = null;
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

    // Smooth camera focus when an avatar is clicked/selected (or reset to building overview when null)
    let wasFocusedOnAvatar = false;
    focusAvatarCameraFnRef.current = (targetStaffId: string | null) => {
      if (!targetStaffId) {
        if (wasFocusedOnAvatar) {
          wasFocusedOnAvatar = false;
          const activeSpec =
            VIRTUAL_OFFICE_BUILDINGS[
              activeBranchView === 'BANDUNG_BRANCH'
                ? 'BANDUNG_BRANCH'
                : 'JAKARTA_HQ'
            ];
          cameraFlyGoal = {
            pos: new THREE.Vector3(
              activeSpec.cameraPosition.x,
              activeSpec.cameraPosition.y,
              activeSpec.cameraPosition.z
            ),
            target: new THREE.Vector3(
              activeSpec.cameraTarget.x,
              activeSpec.cameraTarget.y,
              activeSpec.cameraTarget.z
            ),
          };
        }
        return;
      }

      const entry = avatarEntriesMap.get(targetStaffId);
      if (!entry) return;
      wasFocusedOnAvatar = true;
      const targetBranch: VirtualOfficeBranchView = entry.isBandung
        ? 'BANDUNG_BRANCH'
        : 'JAKARTA_HQ';
      setActiveBranchView(targetBranch);

      const ax = entry.avatarActorGroup.position.x;
      const az = entry.avatarActorGroup.position.z;
      cameraFlyGoal = {
        pos: new THREE.Vector3(ax + 1.15, 2.75, az + 3.45),
        target: new THREE.Vector3(ax, 1.02, az),
      };
    };

    // Expose Walk-In (Entrance Door -> Desk) & Walk-Out (Desk -> Exit Door -> Disappear) Animation Trigger
    triggerWalkAnimationRef.current = (
      targetStaffId: string,
      mode: 'walk_in' | 'walk_out'
    ) => {
      const entry = avatarEntriesMap.get(targetStaffId);
      if (entry) {
        entry.deskRootGroup.visible = true;
        entry.walkMode = mode;
        entry.walkProgress = 0.0;
        entry.despawnProgress = 0.0;
        if (mode === 'walk_in') {
          entry.spawnProgress = 0.02;
          entry.deskRootGroup.scale.set(0.05, 0.05, 0.05);
          entry.avatarActorGroup.visible = false;
        } else {
          entry.avatarActorGroup.visible = true;
        }
        const bldgLabel = entry.isBandung ? 'Gedung Jawa' : 'Jakarta HQ';
        setWalkingBannerText(
          mode === 'walk_in'
            ? `Meja kerja disiapkan · ${entry.staffName} berjalan masuk dari Entrance Door (${bldgLabel}) melewati lorong menuju mejanya...`
            : `${entry.staffName} berdiri dari kursi, berjalan melewati lorong menuju Exit Door (${bldgLabel}), dan Clock-Out...`
        );
        setTimeout(() => {
          setWalkingBannerText(null);
        }, 3600);
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
      // Deterministic shared clock (epoch-based) => identical avatar cycles on every user's screen
      const elapsed = getSharedAnimationSeconds();

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
      const liveStaffArray = sceneStaffToRenderRef.current;
      const liveCurrentId = currentUserIdRef.current;
      const liveCurrentEmail = currentUserEmailRef.current;
      const liveCurrentBreak = currentUserBreakStatusRef.current;
      const livePersonnelBreaks = realtimeBreakByEmailRef.current;
      const liveAttendanceRows = activeAttendanceByEmailRef.current;

      const cyclePeriod = 34.0;

      // PASS 0: Live real-time `break_status` synchronization for EVERY individual employee & Inter-Room Chat Bubble Partner Pairing
      avatarEntriesMap.forEach((entry) => {
        entry.isBeingVisitedForChat = false;
        entry.chatVisitorWorldPos = null;

        // Read THIS employee's latest break_status directly from Supabase `personnel` & `attendance` inside Three.js render loop
        const matchedStaff = liveStaffArray.find(
          (s) =>
            s.staffId === entry.staffId ||
            (entry.staffEmail &&
              (s.email || '').trim().toLowerCase() === entry.staffEmail)
        );
        const employeeAttRow = entry.staffEmail
          ? liveAttendanceRows[entry.staffEmail]
          : undefined;
        const employeePersonnelBreak = entry.staffEmail
          ? livePersonnelBreaks[entry.staffEmail]
          : undefined;

        let resolvedLiveBreak: BreakModeType = resolveIndividualBreakStatus({
          personnelBreakStatus:
            employeePersonnelBreak ?? matchedStaff?.breakStatus,
          attendanceBreakStatus: employeeAttRow?.break_status,
          fallbackBreakStatus: matchedStaff?.breakStatus ?? entry.breakStatus,
        });

        const isCurrentLoggedInAvatar =
          (liveCurrentId && entry.staffId === liveCurrentId) ||
          (liveCurrentEmail && entry.staffEmail === liveCurrentEmail);
        if (isCurrentLoggedInAvatar && liveCurrentBreak !== undefined) {
          resolvedLiveBreak = normalizeBreakMode(liveCurrentBreak);
        }

        if (entry.breakStatus !== resolvedLiveBreak) {
          applyBreakTransitionToEntry(entry, resolvedLiveBreak, true);
        }

        // Small floating "Break (Eating / Sleeping / Smoking)" badge that follows the name tag
        updateBreakBadgeSprite(entry.breakBadgeSprite, entry.breakStatus);
        entry.breakBadgeSprite.position.set(
          entry.nameSprite.position.x,
          entry.nameSprite.position.y + 0.36,
          entry.nameSprite.position.z
        );
      });

      avatarEntriesMap.forEach((entry) => {
        const sIdx = entry.syncIndex;
        const entryHighlighted = entry.staffId === activeSelectedId;
        const staffTimeOffset =
          sIdx * 11.7 + (entry.staffName.charCodeAt(0) % 11) * 2.3;
        const cycleTime = (elapsed * ANIM_SPEED + staffTimeOffset) % cyclePeriod;

        const isAvailableForAutoVisit =
          entry.walkMode === 'idle' &&
          entry.walkProgress >= 1 &&
          entry.breakStatus === 'none' &&
          entry.activeOutdoorBreakKind === 'none' &&
          !entryHighlighted;

        if (isAvailableForAutoVisit && cycleTime >= 22.5) {
          const roamPhase = (cycleTime - 22.5) / 11.5;
          if (roamPhase >= 0.32 && roamPhase < 0.68) {
            const destPt =
              entry.visitToWaypoints[entry.visitToWaypoints.length - 1];
            if (entry.visitPartnerStaffId) {
              const partner = avatarEntriesMap.get(entry.visitPartnerStaffId);
              if (
                partner &&
                partner.walkMode === 'idle' &&
                partner.walkProgress >= 1 &&
                partner.breakStatus === 'none' &&
                partner.activeOutdoorBreakKind === 'none'
              ) {
                partner.isBeingVisitedForChat = true;
                partner.chatVisitorWorldPos = { x: destPt.x, z: destPt.z };
              }
            }
          }
        }
      });

      // PASS 1: Pose & Animation Execution (Break overrides ALWAYS take priority!)
      avatarEntriesMap.forEach((entry) => {
        const i = entry.syncIndex;
        const isHighlighted = entry.staffId === activeSelectedId;

        // 1. Elastic Desk & Chair Pop-Up / Drop Animation when new user checks in WFO
        if (entry.spawnProgress < 1 && entry.walkMode !== 'exited') {
          entry.spawnProgress = Math.min(1, entry.spawnProgress + dt * 1.9);
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
          entry.deskRootGroup.position.y = (1 - p) * 0.65;
        } else if (
          entry.walkMode !== 'exited' &&
          entry.breakStatus !== 'sleeping' &&
          !entry.activeSleepPackUp
        ) {
          entry.deskRootGroup.position.y = 0;
        }

        // Helper to reset special particle props & joints before applying current mode's pose
        const resetCalmFaceAndProps = () => {
          entry.headMat.color.copy(NORMAL_SKIN_COLOR_THREE);
          entry.leftEyeMesh.scale.set(1, 1, 1);
          entry.rightEyeMesh.scale.set(1, 1, 1);
          entry.leftPupilMesh.visible = true;
          entry.rightPupilMesh.visible = true;
          entry.leftBrowMesh.rotation.z = Math.PI / 2 + 0.08;
          entry.rightBrowMesh.rotation.z = Math.PI / 2 - 0.08;
          entry.leftBrowMesh.position.y = 0.062;
          entry.rightBrowMesh.position.y = 0.062;
          entry.steamPuffs.forEach((puff) => {
            puff.mesh.visible = false;
            puff.mat.opacity = 0;
          });
          entry.zzzParticles.forEach((zzz) => {
            zzz.sprite.visible = false;
            zzz.mat.opacity = 0;
          });
          entry.cigaretteGroup.visible = false;
          entry.spoonFoodGroup.visible = false;
          entry.chatBubbleSprite.visible = false;
          entry.characterGroup.position.set(0, 0, 0);
          entry.characterGroup.rotation.set(0, 0, 0);
          entry.avatarActorGroup.rotation.x = 0;
          entry.avatarActorGroup.rotation.z = 0;
          entry.leftLegGroup.rotation.set(0, 0, 0);
          entry.rightLegGroup.rotation.set(0, 0, 0);
          entry.leftKneeGroup.rotation.set(0, 0, 0);
          entry.rightKneeGroup.rotation.set(0, 0, 0);
          entry.plumbobMesh.position.set(0, 1.56, 0);
          entry.nameSprite.position.set(0, 1.96, 0);
        };

        // Helper to place avatar genuinely SEATED ON TOP OF CHAIR CUSHION (hip ~90° forward, knee ~90° downward)
        const applySeatedChairPose = (
          seatX: number,
          seatZ: number,
          facingY: number,
          bobOffset: number = 0
        ) => {
          entry.avatarActorGroup.position.set(
            seatX,
            -0.035 + bobOffset,
            seatZ
          );
          entry.avatarActorGroup.rotation.y = facingY;
          entry.leftLegGroup.rotation.set(-1.52, 0.06, 0);
          entry.rightLegGroup.rotation.set(-1.52, -0.06, 0);
          entry.leftKneeGroup.rotation.set(1.5, 0, 0);
          entry.rightKneeGroup.rotation.set(1.5, 0, 0);
        };

        // Helper to animate the cartoon 3D Thought / Speech Bubble above the avatar's head
        const showThoughtChatBubble = (phaseOffset: number = 0) => {
          entry.chatBubbleSprite.visible = true;
          const floatWave = Math.sin(elapsed * 5.2 * ANIM_SPEED + phaseOffset);
          entry.chatBubbleSprite.position.set(
            0.42,
            1.48 + floatWave * 0.045,
            0.14
          );
          const pulse = 1 + Math.sin(elapsed * 7.5 * ANIM_SPEED + phaseOffset) * 0.06;
          entry.chatBubbleSprite.scale.set(0.76 * pulse, 0.57 * pulse, 1);
        };

        // Ensure desk + laptop are restored and mattress is hidden whenever NOT in 'sleeping' or 'activeSleepPackUp'
        if (
          entry.breakStatus !== 'sleeping' &&
          !entry.activeSleepPackUp &&
          entry.walkMode !== 'exited'
        ) {
          if (entry.mattressBedGroup.visible) {
            entry.mattressBedGroup.visible = false;
            entry.mattressBedGroup.scale.set(0.01, 0.01, 0.01);
          }
          if (entry.sleepBreakElapsed > 0) {
            entry.sleepBreakElapsed = 0;
            entry.deskRootGroup.visible = true;
            entry.deskRootGroup.position.set(
              entry.homeX,
              0,
              entry.homeZ - 0.38
            );
            entry.deskRootGroup.rotation.set(0, 0, 0);
            entry.deskRootGroup.scale.set(1, 1, 1);
          }
        }

        // ---------------------------------------------------------------------
        // PRIORITY 1: Clock-Out Exit / Despawn
        // ---------------------------------------------------------------------
        if (entry.walkMode === 'exited') {
          entry.avatarActorGroup.visible = false;
          entry.mattressBedGroup.visible = false;
          if (entry.despawnProgress < 1) {
            entry.despawnProgress = Math.min(
              1,
              entry.despawnProgress + dt * 2.4 * ANIM_SPEED
            );
            const dp = entry.despawnProgress;
            const shrink = Math.max(0.01, 1 - dp);
            entry.deskRootGroup.scale.set(shrink, shrink, shrink);
            entry.deskRootGroup.position.y = -dp * 0.45;
            if (entry.despawnProgress >= 1) {
              entry.deskRootGroup.visible = false;
            }
          } else {
            entry.deskRootGroup.visible = false;
          }
        } else if (entry.walkMode === 'walk_out' && entry.walkProgress < 1) {
          resetCalmFaceAndProps();
          entry.avatarActorGroup.visible = true;
          entry.walkProgress = Math.min(
            1,
            entry.walkProgress + dt * 0.62 * ANIM_SPEED
          );
          const w = entry.walkProgress;
          const smoothW = w * w * (3 - 2 * w);
          const sampled = sampleWaypointPolyline(
            entry.walkOutWaypoints,
            smoothW
          );

          const stepPhase = w * Math.PI * 16;
          const stepBob = Math.abs(Math.sin(stepPhase)) * 0.055;
          entry.avatarActorGroup.position.set(sampled.x, stepBob, sampled.z);
          entry.avatarActorGroup.rotation.y = sampled.angle;

          const strideAngle = Math.sin(stepPhase) * 0.52;
          entry.upperBodyGroup.rotation.set(0.04, 0, 0);
          entry.headGroup.rotation.set(0, 0, 0);
          entry.leftArmGroup.rotation.set(strideAngle, 0, -0.06);
          entry.rightArmGroup.rotation.set(-strideAngle, 0, 0.06);
          entry.leftLegGroup.rotation.x = -strideAngle;
          entry.rightLegGroup.rotation.x = strideAngle;
          entry.leftKneeGroup.rotation.x = Math.max(0, strideAngle * 0.55);
          entry.rightKneeGroup.rotation.x = Math.max(0, -strideAngle * 0.55);

          if (entry.walkProgress >= 1) {
            entry.walkMode = 'exited';
            entry.despawnProgress = 0.01;
            entry.avatarActorGroup.position.set(
              entry.exitX,
              0,
              entry.exitZ + 1.5
            );
            entry.avatarActorGroup.visible = false;
            setLastExitedStaffId(entry.staffId);
            setWalkingBannerText(null);
            onWalkOutCompleteRef.current?.(entry.staffId);
          }
        } else if (entry.breakStatus === 'sleeping') {
          // -------------------------------------------------------------------
          // PRIORITY 2A (LIVE BREAK OVERRIDE): "SLEEPING" POCKET-MATTRESS SEQUENCE
          // 1) 0.00s .. 1.55s : Stand up, lift work desk + laptop, and throw it away!
          // 2) 1.55s .. 2.65s : Reach into right pocket -> plush 3D mattress pops out & expands on floor!
          // 3) 2.65s+         : Lie down flat & straight supine (head on pillow, closed eyes, rising "Zzz")!
          // -------------------------------------------------------------------
          resetCalmFaceAndProps();
          entry.avatarActorGroup.visible = true;
          entry.sleepBreakElapsed += dt;
          const tSleep = entry.sleepBreakElapsed;
          const deskBaseX = entry.homeX;
          const deskBaseZ = entry.homeZ - 0.38;
          const pocketWorldX = entry.homeX - 0.18;
          const pocketWorldY = 0.46;
          const pocketWorldZ = entry.homeZ - 0.04;

          if (tSleep < 1.55) {
            // Stage 1: Stand up, lift & throw work desk + laptop
            const p = THREE.MathUtils.clamp(tSleep / 1.55, 0, 1);
            entry.mattressBedGroup.visible = false;
            entry.deskRootGroup.visible = true;

            if (p < 0.34) {
              const liftP = p / 0.34;
              entry.deskRootGroup.position.set(
                deskBaseX,
                liftP * 0.55,
                deskBaseZ
              );
              entry.deskRootGroup.rotation.set(-liftP * 0.35, 0, liftP * 0.18);
              entry.deskRootGroup.scale.set(1, 1, 1);

              entry.avatarActorGroup.position.set(
                entry.homeX,
                0.01,
                entry.homeZ
              );
              entry.avatarActorGroup.rotation.y = Math.PI;
              entry.upperBodyGroup.rotation.set(0.28 * (1 - liftP), 0, 0);
              entry.leftArmGroup.rotation.set(-1.35 - liftP * 1.15, 0, 0.15);
              entry.rightArmGroup.rotation.set(-1.35 - liftP * 1.15, 0, -0.15);
              entry.headGroup.rotation.set(-0.2 * liftP, 0, 0);
            } else {
              const throwP = (p - 0.34) / 0.66;
              const arcY = 0.55 + Math.sin(throwP * Math.PI * 0.85) * 2.45;
              const shrink = Math.max(0.01, 1 - throwP * 0.96);
              entry.deskRootGroup.position.set(
                deskBaseX + throwP * 1.85,
                arcY,
                deskBaseZ - throwP * 1.25
              );
              entry.deskRootGroup.rotation.set(
                -0.35 - throwP * 3.4,
                throwP * 2.2,
                0.18 + throwP * 4.1
              );
              entry.deskRootGroup.scale.set(shrink, shrink, shrink);

              entry.avatarActorGroup.position.set(
                entry.homeX,
                0.01,
                entry.homeZ
              );
              entry.avatarActorGroup.rotation.y = Math.PI;
              entry.upperBodyGroup.rotation.set(-0.22, 0, 0);
              entry.leftArmGroup.rotation.set(-2.75, 0, -0.25);
              entry.rightArmGroup.rotation.set(-2.75, 0, 0.25);
              entry.headGroup.rotation.set(-0.28, 0, 0);
            }
          } else if (tSleep < 2.65) {
            // Stage 2: Reach into pocket -> Pull out 3D Mattress Bed onto the floor!
            entry.deskRootGroup.visible = false;
            entry.avatarActorGroup.position.set(entry.homeX, 0.01, entry.homeZ);
            entry.avatarActorGroup.rotation.y = Math.PI;

            if (tSleep < 1.95) {
              // Hand rummaging inside right pocket
              entry.mattressBedGroup.visible = false;
              const reachP = (tSleep - 1.55) / 0.4;
              const rummage = Math.sin(reachP * Math.PI * 3) * 0.08;
              entry.upperBodyGroup.rotation.set(0.08, -0.18 * reachP, 0.06 * reachP);
              entry.leftArmGroup.rotation.set(0.12, 0, 0.14);
              entry.rightArmGroup.rotation.set(
                0.38 * reachP + rummage,
                -0.25 * reachP,
                -0.28 * reachP
              );
              entry.headGroup.rotation.set(0.24 * reachP, -0.2 * reachP, 0);
            } else {
              // Mattress pops out from pocket, arcs forward, and expands onto floor!
              entry.mattressBedGroup.visible = true;
              const pullP = THREE.MathUtils.clamp((tSleep - 1.95) / 0.7, 0, 1);
              const easeOut = 1 - Math.pow(1 - pullP, 3);
              const elasticScale =
                pullP >= 0.99
                  ? 1
                  : Math.max(
                      0.06,
                      0.06 +
                        0.94 *
                          (Math.pow(2, -9 * pullP) *
                            Math.sin(((pullP * 9 - 0.75) * (2 * Math.PI)) / 3) +
                            1)
                    );

              const bx = THREE.MathUtils.lerp(pocketWorldX, deskBaseX, easeOut);
              const bz = THREE.MathUtils.lerp(pocketWorldZ, deskBaseZ, easeOut);
              const by =
                THREE.MathUtils.lerp(pocketWorldY, 0, easeOut) +
                Math.sin(pullP * Math.PI) * 0.38;

              entry.mattressBedGroup.position.set(bx, by, bz);
              entry.mattressBedGroup.rotation.set(
                (1 - easeOut) * 0.42,
                (1 - easeOut) * -0.32,
                0
              );
              entry.mattressBedGroup.scale.set(
                elasticScale,
                elasticScale,
                elasticScale
              );

              entry.upperBodyGroup.rotation.set(
                THREE.MathUtils.lerp(0.08, -0.06, easeOut),
                THREE.MathUtils.lerp(-0.18, 0, easeOut),
                0
              );
              entry.leftArmGroup.rotation.set(0.12, 0, 0.14);
              entry.rightArmGroup.rotation.set(
                THREE.MathUtils.lerp(0.38, -1.15, easeOut),
                0,
                -0.12
              );
              entry.headGroup.rotation.set(
                THREE.MathUtils.lerp(0.24, 0.12, easeOut),
                0,
                0
              );
            }
          } else {
            // Stage 3: Lie flat & straight supine on top of the plush mattress + pillow, eyes closed + rising "Zzz"!
            entry.deskRootGroup.visible = false;
            entry.mattressBedGroup.visible = true;
            entry.mattressBedGroup.position.set(deskBaseX, 0, deskBaseZ);
            entry.mattressBedGroup.rotation.set(0, 0, 0);
            entry.mattressBedGroup.scale.set(1, 1, 1);

            const lieP = THREE.MathUtils.clamp((tSleep - 2.65) / 0.45, 0, 1);
            const smoothLie = lieP * lieP * (3 - 2 * lieP);

            entry.avatarActorGroup.position.set(
              deskBaseX,
              0,
              THREE.MathUtils.lerp(entry.homeZ, deskBaseZ - 0.49, smoothLie)
            );
            entry.avatarActorGroup.rotation.set(0, Math.PI, 0);

            // Supine rotation (-90° pitch on characterGroup): face & toes point UP (+Y), head centered on white pillow (+Z = deskBaseZ + 0.64), body flush on mattress (Y = 0.21)!
            entry.characterGroup.rotation.set(
              (-Math.PI / 2) * smoothLie,
              0,
              0
            );
            entry.characterGroup.position.set(0, 0.312 * smoothLie, 0);

            const breathe = Math.sin(elapsed * 2.8 * ANIM_SPEED + i) * 0.022;
            entry.upperBodyGroup.rotation.set(breathe * smoothLie, 0, 0);
            entry.leftArmGroup.rotation.set(-0.22 * smoothLie, 0, 0.08);
            entry.rightArmGroup.rotation.set(-0.22 * smoothLie, 0, -0.08);
            entry.leftLegGroup.rotation.set(
              0.03 * smoothLie,
              0,
              -0.03 * smoothLie
            );
            entry.rightLegGroup.rotation.set(
              0.03 * smoothLie,
              0,
              0.03 * smoothLie
            );
            entry.leftKneeGroup.rotation.set(0, 0, 0);
            entry.rightKneeGroup.rotation.set(0, 0, 0);
            entry.headGroup.rotation.set(0.14 * smoothLie, 0, 0);

            // Peaceful closed eyes while asleep on mattress
            const lidScaleY = THREE.MathUtils.lerp(1, 0.14, smoothLie);
            const lidScaleX = THREE.MathUtils.lerp(1, 1.35, smoothLie);
            entry.leftEyeMesh.scale.set(lidScaleX, lidScaleY, 1);
            entry.rightEyeMesh.scale.set(lidScaleX, lidScaleY, 1);
            entry.leftPupilMesh.visible = smoothLie < 0.6;
            entry.rightPupilMesh.visible = smoothLie < 0.6;

            // Keep Plumbob & Name Tag floating upright directly above the sleeping avatar
            entry.plumbobMesh.position.set(
              0,
              THREE.MathUtils.lerp(1.56, 1.05, smoothLie),
              THREE.MathUtils.lerp(0, -0.62, smoothLie)
            );
            entry.nameSprite.position.set(
              0,
              THREE.MathUtils.lerp(1.96, 1.44, smoothLie),
              THREE.MathUtils.lerp(0, -0.62, smoothLie)
            );

            // Gentle "Zzz" sleep particles rising straight upward (+Z in supine headGroup = +Y in world!)
            if (smoothLie > 0.75) {
              const zEnv = (smoothLie - 0.75) / 0.25;
              entry.zzzParticles.forEach((zzz, zIdx) => {
                const u = (elapsed * 0.95 * ANIM_SPEED + zzz.phaseOffset) % 1.0;
                const zFade = Math.sin(u * Math.PI);
                zzz.sprite.visible = true;
                zzz.sprite.position.set(
                  0.08 +
                    Math.sin(elapsed * 2.5 * ANIM_SPEED + zIdx) * 0.03,
                  0.02 + u * 0.12,
                  0.22 + u * 0.52
                );
                const s = (0.11 + u * 0.12) * zEnv;
                zzz.sprite.scale.set(s, s, 1);
                zzz.mat.opacity = zFade * 0.95 * zEnv;
              });
            }
          }
        } else if (entry.activeSleepPackUp) {
          // -------------------------------------------------------------------
          // PRIORITY 2B (STOP BREAK FROM SLEEPING):
          // Avatar wakes & stands up -> Mattress shrinks back into pocket -> Desk + Laptop pop back!
          // -------------------------------------------------------------------
          resetCalmFaceAndProps();
          entry.avatarActorGroup.visible = true;
          entry.sleepPackUpProgress = Math.min(
            1,
            entry.sleepPackUpProgress + dt * 1.1
          );
          const p = entry.sleepPackUpProgress;
          const deskBaseX = entry.homeX;
          const deskBaseZ = entry.homeZ - 0.38;
          const pocketWorldX = entry.homeX - 0.18;
          const pocketWorldY = 0.46;
          const pocketWorldZ = entry.homeZ - 0.04;

          if (p < 0.32) {
            // Wake & stand up from mattress
            const standP = p / 0.32;
            const inv = 1 - standP;
            entry.deskRootGroup.visible = false;
            entry.mattressBedGroup.visible = true;
            entry.mattressBedGroup.position.set(deskBaseX, 0, deskBaseZ);
            entry.mattressBedGroup.scale.set(1, 1, 1);

            entry.avatarActorGroup.position.set(
              deskBaseX,
              0,
              THREE.MathUtils.lerp(deskBaseZ - 0.49, entry.homeZ, standP)
            );
            entry.avatarActorGroup.rotation.set(0, Math.PI, 0);
            entry.characterGroup.rotation.set((-Math.PI / 2) * inv, 0, 0);
            entry.characterGroup.position.set(0, 0.312 * inv, 0);
          } else if (p < 0.76) {
            // Shrink mattress & arc it back into avatar's pocket!
            const packP = (p - 0.32) / 0.44;
            const easeIn = packP * packP;
            entry.deskRootGroup.visible = false;
            entry.mattressBedGroup.visible = true;

            const bx = THREE.MathUtils.lerp(deskBaseX, pocketWorldX, easeIn);
            const bz = THREE.MathUtils.lerp(deskBaseZ, pocketWorldZ, easeIn);
            const by =
              THREE.MathUtils.lerp(0, pocketWorldY, easeIn) +
              Math.sin(packP * Math.PI) * 0.34;
            const s = Math.max(0.04, 1 - easeIn * 0.95);

            entry.mattressBedGroup.position.set(bx, by, bz);
            entry.mattressBedGroup.rotation.set(easeIn * 0.4, easeIn * -0.3, 0);
            entry.mattressBedGroup.scale.set(s, s, s);

            entry.avatarActorGroup.position.set(entry.homeX, 0.01, entry.homeZ);
            entry.avatarActorGroup.rotation.y = Math.PI;
            entry.upperBodyGroup.rotation.set(0.06, -0.15 * easeIn, 0);
            entry.rightArmGroup.rotation.set(
              THREE.MathUtils.lerp(-0.95, 0.35, easeIn),
              -0.2 * easeIn,
              -0.22 * easeIn
            );
          } else {
            // Pop desk + laptop neatly back into position & sit back down
            entry.mattressBedGroup.visible = false;
            entry.deskRootGroup.visible = true;
            const deskPopP = (p - 0.76) / 0.24;
            const dScale = Math.max(0.1, deskPopP);
            entry.deskRootGroup.position.set(
              deskBaseX,
              (1 - deskPopP) * 0.35,
              deskBaseZ
            );
            entry.deskRootGroup.rotation.set(0, 0, 0);
            entry.deskRootGroup.scale.set(dScale, dScale, dScale);
            applySeatedChairPose(entry.homeX, entry.homeZ, Math.PI, 0);
          }

          if (p >= 1) {
            entry.activeSleepPackUp = false;
            entry.sleepPackUpProgress = 0;
            entry.sleepBreakElapsed = 0;
            entry.mattressBedGroup.visible = false;
            entry.deskRootGroup.visible = true;
            entry.deskRootGroup.position.set(deskBaseX, 0, deskBaseZ);
            entry.deskRootGroup.rotation.set(0, 0, 0);
            entry.deskRootGroup.scale.set(1, 1, 1);
          }
        } else if (
          entry.breakStatus === 'eating' ||
          entry.breakStatus === 'smoking' ||
          entry.activeOutdoorBreakKind !== 'none'
        ) {
          // -------------------------------------------------------------------
          // PRIORITY 3 (LIVE BREAK OVERRIDE): "EATING" (RUANG MAKAN) & "SMOKING" (OUTDOOR PATIO)
          // - Immediately stands up from chair and walks along `activeBreakWaypoints` to Ruang Makan or Smoking Area.
          // - When `Stop Break` is clicked (`activeOutdoorBreakKind === 'returning'`), walks back to own chair!
          // -------------------------------------------------------------------
          resetCalmFaceAndProps();
          entry.avatarActorGroup.visible = true;

          if (
            entry.breakStatus === 'eating' &&
            entry.activeOutdoorBreakKind !== 'eating'
          ) {
            entry.activeOutdoorBreakKind = 'eating';
            entry.outdoorBreakProgress = 0;
            entry.activeBreakWaypoints = buildCorridorWaypoints(
              entry.avatarActorGroup.position.x,
              entry.avatarActorGroup.position.z,
              entry.diningSeatX,
              entry.diningSeatZ,
              entry.isBandung
            );
          } else if (
            entry.breakStatus === 'smoking' &&
            entry.activeOutdoorBreakKind !== 'smoking'
          ) {
            entry.activeOutdoorBreakKind = 'smoking';
            entry.outdoorBreakProgress = 0;
            entry.activeBreakWaypoints = buildCorridorWaypoints(
              entry.avatarActorGroup.position.x,
              entry.avatarActorGroup.position.z,
              entry.smokeSpotX,
              entry.smokeSpotZ,
              entry.isBandung
            );
          }

          const activeWaypoints =
            entry.activeBreakWaypoints.length >= 2
              ? entry.activeBreakWaypoints
              : entry.activeOutdoorBreakKind === 'eating'
              ? entry.eatingToWaypoints
              : entry.activeOutdoorBreakKind === 'smoking'
              ? entry.smokeToWaypoints
              : entry.eatingReturnWaypoints;

          const walkSpeed = 0.62 * ANIM_SPEED;
          entry.outdoorBreakProgress = Math.min(
            1,
            entry.outdoorBreakProgress + dt * walkSpeed
          );
          const prog = entry.outdoorBreakProgress;

          if (prog < 0.999) {
            const smoothProg = prog * prog * (3 - 2 * prog);
            const sampled = sampleWaypointPolyline(activeWaypoints, smoothProg);
            const stepPhase = elapsed * 14.5 * ANIM_SPEED;
            const stepBob = Math.abs(Math.sin(stepPhase)) * 0.055;

            entry.avatarActorGroup.position.set(sampled.x, stepBob, sampled.z);
            entry.avatarActorGroup.rotation.y = sampled.angle;

            const stride = Math.sin(stepPhase) * 0.5;
            entry.upperBodyGroup.rotation.set(0.04, 0, 0);
            entry.headGroup.rotation.set(0, 0, 0);
            entry.leftArmGroup.rotation.set(stride, 0, -0.05);
            entry.rightArmGroup.rotation.set(-stride, 0, 0.05);
            entry.leftLegGroup.rotation.x = -stride;
            entry.rightLegGroup.rotation.x = stride;
            entry.leftKneeGroup.rotation.x = Math.max(0, stride * 0.55);
            entry.rightKneeGroup.rotation.x = Math.max(0, -stride * 0.55);
          } else if (entry.activeOutdoorBreakKind === 'returning') {
            // Arrived back at own desk chair after Stop Break!
            entry.activeOutdoorBreakKind = 'none';
            entry.outdoorBreakProgress = 0;
            applySeatedChairPose(entry.homeX, entry.homeZ, Math.PI, 0);
          } else if (entry.activeOutdoorBreakKind === 'eating') {
            // SEATED ON DINING CHAIR IN RUANG MAKAN (Hips ~90° forward, Knees ~90° down, scooping food!)
            const idleBob = Math.sin(elapsed * 2.4 * ANIM_SPEED + i) * 0.008;
            applySeatedChairPose(
              entry.diningSeatX,
              entry.diningSeatZ,
              entry.diningFacingAngle,
              idleBob
            );
            entry.spoonFoodGroup.visible = true;

            const biteWave = Math.sin(elapsed * 5.2 * ANIM_SPEED + i);
            const biteLift = THREE.MathUtils.clamp(
              (biteWave + 0.35) * 0.85,
              0,
              1
            );

            entry.upperBodyGroup.rotation.set(
              0.08 + biteLift * 0.06,
              Math.sin(elapsed * 1.6 * ANIM_SPEED + i) * 0.05,
              0
            );
            entry.leftArmGroup.rotation.set(-0.98, 0.18, 0.14);
            entry.rightArmGroup.rotation.set(
              THREE.MathUtils.lerp(-1.05, -1.78, biteLift),
              THREE.MathUtils.lerp(-0.1, -0.36, biteLift),
              -0.12
            );
            entry.headGroup.rotation.set(
              THREE.MathUtils.lerp(0.12, -0.06, biteLift) +
                Math.sin(elapsed * 9.5 * ANIM_SPEED) * 0.03 * (1 - biteLift),
              Math.sin(elapsed * 1.4 * ANIM_SPEED + i) * 0.08,
              0
            );
          } else {
            // STANDING AT OUTDOOR SMOKING PATIO WITH CIGARETTE & RISING SMOKE PUFFS
            const idleBob = Math.sin(elapsed * 2.4 * ANIM_SPEED + i) * 0.01;
            entry.avatarActorGroup.position.set(
              entry.smokeSpotX,
              0.01 + idleBob,
              entry.smokeSpotZ
            );
            entry.avatarActorGroup.rotation.y = 0;
            entry.cigaretteGroup.visible = true;

            const puffWave = Math.sin(elapsed * 4.5 * ANIM_SPEED + i);
            const armToMouth = THREE.MathUtils.clamp(
              (puffWave + 0.4) * 0.85,
              0,
              1
            );

            entry.upperBodyGroup.rotation.set(-0.04, 0.12, 0);
            entry.leftArmGroup.rotation.set(0.15, 0, 0.18);
            entry.rightArmGroup.rotation.set(
              THREE.MathUtils.lerp(-0.55, -1.72, armToMouth),
              THREE.MathUtils.lerp(0, -0.38, armToMouth),
              -0.12
            );
            entry.headGroup.rotation.set(
              THREE.MathUtils.lerp(0, -0.14, armToMouth),
              0.08,
              0
            );

            entry.steamPuffs.forEach((puff, pIdx) => {
              const u = (elapsed * 1.4 * ANIM_SPEED + puff.phaseOffset) % 1.0;
              const puffFade = Math.sin(u * Math.PI);
              puff.mesh.visible = true;
              puff.mesh.position.set(
                0.06 +
                  u * 0.12 +
                  Math.sin(elapsed * 5 * ANIM_SPEED + pIdx) * 0.02,
                0.06 + u * 0.38,
                0.18 + u * 0.08
              );
              const s = 0.32 + puffFade * 0.65;
              puff.mesh.scale.set(s, s, s);
              puff.mat.opacity = puffFade * 0.68;
            });
          }
        } else if (entry.walkProgress < 1) {
          // -------------------------------------------------------------------
          // PRIORITY 4: Initial Check-In Walk-In (Entrance Door -> Corridor -> Desk Chair)
          // -------------------------------------------------------------------
          resetCalmFaceAndProps();
          if (entry.walkMode === 'walk_in' && entry.spawnProgress < 0.35) {
            entry.avatarActorGroup.visible = false;
          } else {
            entry.avatarActorGroup.visible = true;
            entry.walkProgress = Math.min(
              1,
              entry.walkProgress + dt * 0.62 * ANIM_SPEED
            );
            const w = entry.walkProgress;
            const smoothW = w * w * (3 - 2 * w);
            const sampled = sampleWaypointPolyline(
              entry.walkInWaypoints,
              smoothW
            );

            const stepPhase = w * Math.PI * 16;
            const stepBob =
              Math.abs(Math.sin(stepPhase)) * 0.055 * (1 - w * 0.25);
            entry.avatarActorGroup.position.set(sampled.x, stepBob, sampled.z);

            if (w > 0.92) {
              const turnBlend = (w - 0.92) / 0.08;
              entry.avatarActorGroup.rotation.y = THREE.MathUtils.lerp(
                sampled.angle,
                Math.PI,
                turnBlend
              );
            } else {
              entry.avatarActorGroup.rotation.y = sampled.angle;
            }

            const strideAngle = Math.sin(stepPhase) * 0.52;
            entry.upperBodyGroup.rotation.set(0.04, 0, 0);
            entry.headGroup.rotation.set(0, 0, 0);
            entry.leftArmGroup.rotation.set(strideAngle, 0, -0.06);
            entry.rightArmGroup.rotation.set(-strideAngle, 0, 0.06);
            entry.leftLegGroup.rotation.x = -strideAngle;
            entry.rightLegGroup.rotation.x = strideAngle;
            entry.leftKneeGroup.rotation.x = Math.max(0, strideAngle * 0.55);
            entry.rightKneeGroup.rotation.x = Math.max(0, -strideAngle * 0.55);

            if (entry.walkProgress >= 1) {
              entry.walkMode = 'idle';
            }
          }
        } else if (isHighlighted) {
          // -------------------------------------------------------------------
          // PRIORITY 5: INTERACTIVE CLICK FOCUS MODE (Steps beside chair, stands & waves at camera)
          // -------------------------------------------------------------------
          resetCalmFaceAndProps();
          entry.avatarActorGroup.visible = true;

          const curPos = entry.avatarActorGroup.position;
          const nearHome =
            Math.hypot(curPos.x - entry.homeX, curPos.z - entry.homeZ) < 0.9;
          const standTargetX = nearHome ? entry.homeX + 0.48 : curPos.x;
          const standTargetZ = nearHome ? entry.homeZ + 0.1 : curPos.z;
          const cheerBounce =
            Math.abs(Math.sin(elapsed * 5.2 * ANIM_SPEED)) * 0.032;

          entry.avatarActorGroup.position.x = THREE.MathUtils.lerp(
            curPos.x,
            standTargetX,
            1 - Math.exp(-6 * dt)
          );
          entry.avatarActorGroup.position.z = THREE.MathUtils.lerp(
            curPos.z,
            standTargetZ,
            1 - Math.exp(-6 * dt)
          );
          entry.avatarActorGroup.position.y = 0.01 + cheerBounce;

          const angleToCamera = Math.atan2(
            camera.position.x - entry.avatarActorGroup.position.x,
            camera.position.z - entry.avatarActorGroup.position.z
          );
          entry.avatarActorGroup.rotation.y = angleToCamera;

          const waveSwing = Math.sin(elapsed * 11.5 * ANIM_SPEED) * 0.42;
          entry.upperBodyGroup.rotation.set(
            -0.04,
            Math.sin(elapsed * 3.5 * ANIM_SPEED) * 0.08,
            Math.sin(elapsed * 5.75 * ANIM_SPEED) * 0.04
          );
          entry.leftArmGroup.rotation.set(0.12, 0, 0.16);
          entry.rightArmGroup.rotation.set(-2.65, 0, -0.35 + waveSwing);
          entry.headGroup.rotation.set(
            -0.05 + Math.sin(elapsed * 5.2 * ANIM_SPEED) * 0.04,
            Math.sin(elapsed * 3.2 * ANIM_SPEED) * 0.1,
            Math.sin(elapsed * 5.75 * ANIM_SPEED) * 0.06
          );
        } else if (entry.isBeingVisitedForChat && entry.chatVisitorWorldPos) {
          // -------------------------------------------------------------------
          // PRIORITY 6: COWORKER BEING VISITED AT DESK -> Seated Chat + 3D Thought/Speech Bubble!
          // -------------------------------------------------------------------
          resetCalmFaceAndProps();
          entry.avatarActorGroup.visible = true;
          const idleBob = Math.sin(elapsed * 2.4 * ANIM_SPEED + i * 0.7) * 0.008;
          applySeatedChairPose(entry.homeX, entry.homeZ, Math.PI, idleBob);
          showThoughtChatBubble(Math.PI);

          const dx = entry.chatVisitorWorldPos.x - entry.homeX;
          const turnSign = dx >= 0 ? -0.38 : 0.38;

          entry.upperBodyGroup.rotation.set(
            0.05,
            turnSign + Math.sin(elapsed * 2.2 * ANIM_SPEED) * 0.08,
            0
          );
          entry.leftArmGroup.rotation.set(
            -0.85 + Math.sin(elapsed * 5.2 * ANIM_SPEED + 1) * 0.18,
            0,
            0.14
          );
          entry.rightArmGroup.rotation.set(
            -0.95 + Math.cos(elapsed * 5.2 * ANIM_SPEED + 1) * 0.22,
            0,
            -0.14
          );
          entry.headGroup.rotation.set(
            Math.sin(elapsed * 4.6 * ANIM_SPEED) * 0.07,
            turnSign * 0.9 + Math.sin(elapsed * 2.0 * ANIM_SPEED) * 0.1,
            0
          );
        } else {
          // -------------------------------------------------------------------
          // PRIORITY 7: SEATED WORKSTATION & INTER-ROOM CHAT CYCLE (`0.34x` Speed)
          // -------------------------------------------------------------------
          const staffTimeOffset =
            i * 11.7 + (entry.staffName.charCodeAt(0) % 11) * 2.3;
          const totalStaffTime = elapsed * ANIM_SPEED + staffTimeOffset;
          const cycleTime = totalStaffTime % cyclePeriod;

          let idleBob = Math.sin(elapsed * 2.4 * ANIM_SPEED + i * 0.7) * 0.008;
          entry.avatarActorGroup.visible = true;

          if (cycleTime >= 12.0 && cycleTime < 15.0) {
            // ACTIVITY 2: SEATED STRETCHING OVERHEAD ON CHAIR
            resetCalmFaceAndProps();
            const p = (cycleTime - 12.0) / 3.0;
            const stretchEnv = Math.sin(p * Math.PI);

            applySeatedChairPose(entry.homeX, entry.homeZ, Math.PI, idleBob);

            entry.upperBodyGroup.rotation.x = THREE.MathUtils.lerp(
              0.08,
              -0.22,
              stretchEnv
            );
            entry.upperBodyGroup.rotation.y =
              Math.sin(p * Math.PI * 2) * 0.22 * stretchEnv;
            entry.upperBodyGroup.rotation.z =
              Math.cos(p * Math.PI * 2) * 0.06 * stretchEnv;

            entry.leftArmGroup.rotation.x = THREE.MathUtils.lerp(
              -1.12,
              -2.88,
              stretchEnv
            );
            entry.rightArmGroup.rotation.x = THREE.MathUtils.lerp(
              -1.12,
              -2.88,
              stretchEnv
            );
            entry.leftArmGroup.rotation.z = THREE.MathUtils.lerp(
              0.12,
              -0.26,
              stretchEnv
            );
            entry.rightArmGroup.rotation.z = THREE.MathUtils.lerp(
              -0.12,
              0.26,
              stretchEnv
            );

            entry.headGroup.rotation.x = THREE.MathUtils.lerp(
              0.1,
              -0.24,
              stretchEnv
            );
            entry.headGroup.rotation.y =
              Math.sin(p * Math.PI * 2) * 0.14 * stretchEnv;
            entry.headGroup.rotation.z = 0;
          } else if (cycleTime >= 15.0 && cycleTime < 17.6) {
            // ACTIVITY 3: SEATED COMEDY DESK-SLAP ON CHAIR
            resetCalmFaceAndProps();
            const p = (cycleTime - 15.0) / 2.6;
            const slapEnv = Math.sin(p * Math.PI);
            const slapLeft = Math.abs(Math.sin(elapsed * 19 * ANIM_SPEED + i));
            const slapRight = Math.abs(Math.cos(elapsed * 19 * ANIM_SPEED + i));

            idleBob += slapLeft * 0.022 * slapEnv;
            applySeatedChairPose(entry.homeX, entry.homeZ, Math.PI, idleBob);

            entry.headMat.color
              .copy(NORMAL_SKIN_COLOR_THREE)
              .lerp(ANGRY_RED_SKIN_COLOR_THREE, slapEnv * 0.85);

            entry.leftBrowMesh.rotation.z =
              Math.PI / 2 + 0.08 - 0.42 * slapEnv;
            entry.rightBrowMesh.rotation.z =
              Math.PI / 2 - 0.08 + 0.42 * slapEnv;
            entry.leftBrowMesh.position.y = 0.062 - 0.008 * slapEnv;
            entry.rightBrowMesh.position.y = 0.062 - 0.008 * slapEnv;

            entry.steamPuffs.forEach((puff, pIdx) => {
              const u = (elapsed * 2.1 * ANIM_SPEED + puff.phaseOffset) % 1.0;
              const puffFade = Math.sin(u * Math.PI);
              puff.mesh.visible = true;
              puff.mesh.position.set(
                puff.side * (0.15 + u * 0.13) +
                  Math.sin(elapsed * 9 * ANIM_SPEED + pIdx) * 0.018,
                0.14 + u * 0.36,
                Math.cos(elapsed * 7 * ANIM_SPEED + pIdx) * 0.02
              );
              const puffScale =
                (0.45 + puffFade * 0.95) * (0.4 + slapEnv * 0.7);
              puff.mesh.scale.set(puffScale, puffScale * 0.88, puffScale);
              puff.mat.opacity = puffFade * 0.86 * slapEnv;
            });

            entry.upperBodyGroup.rotation.x = THREE.MathUtils.lerp(
              0.08,
              0.24,
              slapEnv
            );
            entry.upperBodyGroup.rotation.y = 0;
            entry.upperBodyGroup.rotation.z =
              Math.sin(elapsed * 22 * ANIM_SPEED + i) * 0.05 * slapEnv;

            entry.leftArmGroup.rotation.x = -0.75 - slapLeft * 0.65 * slapEnv;
            entry.rightArmGroup.rotation.x = -0.75 - slapRight * 0.65 * slapEnv;
            entry.leftArmGroup.rotation.z = 0.05;
            entry.rightArmGroup.rotation.z = -0.05;

            entry.headGroup.rotation.x = 0.16;
            entry.headGroup.rotation.y =
              Math.sin(elapsed * 20 * ANIM_SPEED + i) * 0.12 * slapEnv;
            entry.headGroup.rotation.z =
              Math.cos(elapsed * 24 * ANIM_SPEED + i) * 0.09 * slapEnv;
          } else if (cycleTime >= 22.5) {
            // ACTIVITY 4: INTER-ROOM COWORKER CHAT VISIT WITH 3D THOUGHT / SPEECH BUBBLE
            resetCalmFaceAndProps();
            const roamPhase = (cycleTime - 22.5) / 11.5; // 0..1
            const toWaypoints = entry.visitToWaypoints;
            const returnWaypoints = entry.visitReturnWaypoints;

            if (roamPhase < 0.32) {
              // Phase A (0.0 .. 0.32): Stand up from chair & walk along corridor to coworker's room
              const u = roamPhase / 0.32;
              const sampled = sampleWaypointPolyline(toWaypoints, u);
              const stepPhase = elapsed * 14.5 * ANIM_SPEED;
              const stepBob = Math.abs(Math.sin(stepPhase)) * 0.055;
              entry.avatarActorGroup.position.set(
                sampled.x,
                stepBob,
                sampled.z
              );
              entry.avatarActorGroup.rotation.y = sampled.angle;

              const stride = Math.sin(stepPhase) * 0.5;
              entry.upperBodyGroup.rotation.set(0.04, 0, 0);
              entry.headGroup.rotation.set(0, 0, 0);
              entry.leftArmGroup.rotation.set(stride, 0, -0.05);
              entry.rightArmGroup.rotation.set(-stride, 0, 0.05);
              entry.leftLegGroup.rotation.x = -stride;
              entry.rightLegGroup.rotation.x = stride;
              entry.leftKneeGroup.rotation.x = Math.max(0, stride * 0.55);
              entry.rightKneeGroup.rotation.x = Math.max(0, -stride * 0.55);
            } else if (roamPhase < 0.68) {
              // Phase B (0.32 .. 0.68): Conversing with coworker + Floating 3D Thought/Speech Bubble!
              const destPt = toWaypoints[toWaypoints.length - 1];
              entry.avatarActorGroup.position.set(
                destPt.x,
                0.01 + idleBob,
                destPt.z
              );
              showThoughtChatBubble(0);

              const partner = entry.visitPartnerStaffId
                ? avatarEntriesMap.get(entry.visitPartnerStaffId)
                : null;
              const baseAngle = partner
                ? Math.atan2(
                    partner.homeX - destPt.x,
                    partner.homeZ - destPt.z
                  )
                : Math.PI;

              entry.avatarActorGroup.rotation.y =
                baseAngle + Math.sin(elapsed * 1.8 * ANIM_SPEED) * 0.16;
              entry.upperBodyGroup.rotation.set(
                0.03,
                Math.sin(elapsed * 2.2 * ANIM_SPEED) * 0.12,
                0
              );
              entry.leftArmGroup.rotation.set(
                -0.55 + Math.sin(elapsed * 5.5 * ANIM_SPEED) * 0.22,
                0,
                0.12
              );
              entry.rightArmGroup.rotation.set(
                -0.65 + Math.cos(elapsed * 5.5 * ANIM_SPEED) * 0.25,
                0,
                -0.12
              );
              entry.headGroup.rotation.set(
                Math.sin(elapsed * 4.8 * ANIM_SPEED) * 0.08,
                Math.sin(elapsed * 2.0 * ANIM_SPEED) * 0.15,
                0
              );
            } else {
              // Phase C (0.68 .. 1.0): Chat bubble hidden -> Walk back along corridor to own chair
              const u = (roamPhase - 0.68) / 0.32;
              const sampled = sampleWaypointPolyline(returnWaypoints, u);
              const stepPhase = elapsed * 14.5 * ANIM_SPEED;
              const stepBob = Math.abs(Math.sin(stepPhase)) * 0.055;
              entry.avatarActorGroup.position.set(
                sampled.x,
                stepBob,
                sampled.z
              );
              entry.avatarActorGroup.rotation.y =
                u > 0.9
                  ? THREE.MathUtils.lerp(
                      sampled.angle,
                      Math.PI,
                      (u - 0.9) / 0.1
                    )
                  : sampled.angle;

              const stride = Math.sin(stepPhase) * 0.5;
              entry.upperBodyGroup.rotation.set(0.04, 0, 0);
              entry.headGroup.rotation.set(0, 0, 0);
              entry.leftArmGroup.rotation.set(stride, 0, -0.05);
              entry.rightArmGroup.rotation.set(-stride, 0, 0.05);
              entry.leftLegGroup.rotation.x = -stride;
              entry.rightLegGroup.rotation.x = stride;
              entry.leftKneeGroup.rotation.x = Math.max(0, stride * 0.55);
              entry.rightKneeGroup.rotation.x = Math.max(0, -stride * 0.55);
            }
          } else {
            // ACTIVITY 1 (DEFAULT): SEATED ON OFFICE CHAIR TYPING ON LAPTOP KEYBOARD
            resetCalmFaceAndProps();
            const typeWaveL =
              Math.sin(elapsed * 17.5 * ANIM_SPEED + i * 1.3) * 0.13;
            const typeWaveR =
              Math.cos(elapsed * 17.5 * ANIM_SPEED + i * 1.3) * 0.13;

            applySeatedChairPose(entry.homeX, entry.homeZ, Math.PI, idleBob);

            entry.upperBodyGroup.rotation.x = 0.08;
            entry.upperBodyGroup.rotation.y = 0;
            entry.upperBodyGroup.rotation.z = 0;

            entry.leftArmGroup.rotation.x = -1.12 + typeWaveL;
            entry.rightArmGroup.rotation.x = -1.12 + typeWaveR;
            entry.leftArmGroup.rotation.z = 0.12;
            entry.rightArmGroup.rotation.z = -0.12;

            entry.headGroup.rotation.x =
              0.1 + Math.sin(elapsed * 4.5 * ANIM_SPEED + i) * 0.045;
            entry.headGroup.rotation.y =
              Math.sin(elapsed * 1.7 * ANIM_SPEED + i * 0.9) * 0.075;
            entry.headGroup.rotation.z = 0;
          }
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
            <span>View Jawa ({bandungWfoCount} WFO)</span>
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
            onClick={handleReset3DCamera}
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
                      AVATAR HIGHLIGHTED · {formatBranchDisplay(highlightedHud.branch)}
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
                  {formatRoomDisplayName(highlightedHud.roomName)}
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

              {highlightedBreakStatus !== 'none' && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Break:</span>
                  </span>
                  <span
                    data-testid="hud-break-status"
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    Break ({formatBreakModeLabel(highlightedBreakStatus)})
                  </span>
                </div>
              )}

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
              2 Gedung 3D (JKT HQ &amp; Jawa) · Klik avatar untuk Live HUD
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
                ({formatBranchDisplay(person.branch)} · {person.checkInTime})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

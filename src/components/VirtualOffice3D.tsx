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
const NORMAL_SKIN_COLOR_THREE = new THREE.Color(0xf7c894);
const ANGRY_RED_SKIN_COLOR_THREE = new THREE.Color(0xef4444);

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

export interface RobloxAvatarBuildResult {
  characterGroup: THREE.Group;
  upperBodyGroup: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
  headGroup: THREE.Group;
  leftBrowMesh: THREE.Mesh;
  rightBrowMesh: THREE.Mesh;
  steamPuffs: SteamPuffParticle[];
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  clickableMeshes: THREE.Object3D[];
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
  // 1. LEFT & RIGHT ROUNDED LEGS (Articulated at Hip Y = 0.44)
  // ---------------------------------------------------------------------------
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.1, 0.44, 0);

    // Smooth Rounded Capsule Leg
    const legMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.082, 0.22, 12, 20),
      pantsMat
    );
    legMesh.position.set(0, -0.19, 0);
    registerClickable(legMesh);
    legPivot.add(legMesh);

    // Rounded Sneaker Shoe
    const shoeMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.052, 0.09, 10, 16),
      shoeMat
    );
    shoeMesh.rotation.x = Math.PI / 2;
    shoeMesh.scale.set(1.35, 1.0, 0.78);
    shoeMesh.position.set(0, -0.385, 0.022);
    registerClickable(shoeMesh);
    legPivot.add(shoeMesh);

    const soleMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.076, 0.022, 18),
      shoeSoleMat
    );
    soleMesh.scale.set(1.0, 1.0, 1.45);
    soleMesh.position.set(0, -0.422, 0.022);
    legPivot.add(soleMesh);

    return legPivot;
  };

  const leftLegGroup = buildLeg(-1);
  const rightLegGroup = buildLeg(1);
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

  let leftBrowMesh!: THREE.Mesh;
  let rightBrowMesh!: THREE.Mesh;

  ([-1, 1] as const).forEach((side) => {
    // Rounded Capsule Eyes
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
  // 4B. CARTOON STEAM PUFF PARTICLES (For Funny Angry Desk-Slap Animation)
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
    leftBrowMesh,
    rightBrowMesh,
    steamPuffs,
    leftArmGroup,
    rightArmGroup,
    leftLegGroup,
    rightLegGroup,
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
    const mergedWithLocal = mergedFromSupabase.map((member) => {
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
    return assignRoomGridCoordinatesToStaffList(mergedWithLocal);
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
      roomName: string;
      appearanceSignature: string;
      isBandung: boolean;
      deskRootGroup: THREE.Group;
      avatarActorGroup: THREE.Group;
      upperBodyGroup: THREE.Group;
      headGroup: THREE.Group;
      leftBrowMesh: THREE.Mesh;
      rightBrowMesh: THREE.Mesh;
      steamPuffs: SteamPuffParticle[];
      leftArmGroup: THREE.Group;
      rightArmGroup: THREE.Group;
      leftLegGroup: THREE.Group;
      rightLegGroup: THREE.Group;
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
      deskTop.position.set(0, 0.6, -0.25);
      deskTop.castShadow = true;
      deskTop.receiveShadow = true;
      deskRootGroup.add(deskTop);

      // Desk Mat Pad under Laptop
      const deskMatPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.012, 0.42),
        laptopKeyboardMat
      );
      deskMatPad.position.set(0, 0.644, -0.24);
      deskRootGroup.add(deskMatPad);

      const leftLeg = new THREE.Mesh(deskLegGeo, deskLegMat);
      leftLeg.position.set(-0.56, 0.29, -0.25);
      leftLeg.castShadow = true;
      deskRootGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(deskLegGeo, deskLegMat);
      rightLeg.position.set(0.56, 0.29, -0.25);
      rightLeg.castShadow = true;
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

      // Ergonomic Office Chair (Seat + Backrest + Pedestal + Base + Armrests)
      const chairMat = new THREE.MeshStandardMaterial({
        color: shirtColorThree,
        roughness: 0.48,
        metalness: 0.18,
      });
      const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
      chairSeat.position.set(0, 0.36, 0.56);
      chairSeat.castShadow = true;
      deskRootGroup.add(chairSeat);

      const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
      chairBack.position.set(0, 0.65, 0.8);
      chairBack.castShadow = true;
      deskRootGroup.add(chairBack);

      const chairStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.32, 10),
        deskLegMat
      );
      chairStem.position.set(0, 0.18, 0.56);
      deskRootGroup.add(chairStem);

      const chairBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.03, 12),
        deskLegMat
      );
      chairBase.position.set(0, 0.03, 0.56);
      deskRootGroup.add(chairBase);

      scene.add(deskRootGroup);

      // B. Walking & Interactive Roblox-Style 3D Avatar Actor Group (Positioned right in front of desk facing laptop)
      const avatarActorGroup = new THREE.Group();
      const homeX = x;
      const homeZ = z + 0.16;
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
        upperBodyGroup,
        bodyMat,
        headMat,
        headGroup,
        leftBrowMesh,
        rightBrowMesh,
        steamPuffs,
        leftArmGroup,
        rightArmGroup,
        leftLegGroup,
        rightLegGroup,
      } = robloxBuilt;

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

      const appearanceSignature = `${person.name}|${person.role}|${person.roomName}|${cfg3D.gender || ''}|${cfg3D.shirtColor}|${cfg3D.hairStyle}|${cfg3D.hairColor}|${cfg3D.useHijab}|${cfg3D.hijabColor}|${cfg3D.outfitType || 'formal_shirt'}`;

      avatarEntriesMap.set(person.staffId, {
        staffId: person.staffId,
        staffName: person.name,
        roomName: person.roomName,
        appearanceSignature,
        isBandung: inBandung,
        deskRootGroup,
        avatarActorGroup,
        upperBodyGroup,
        headGroup,
        leftBrowMesh,
        rightBrowMesh,
        steamPuffs,
        leftArmGroup,
        rightArmGroup,
        leftLegGroup,
        rightLegGroup,
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

        // Update grid coordinates if room occupancy changed so avatars never overlap
        const nextX = person.deskCoords.x;
        const nextZ = person.deskCoords.z;
        const nextHomeX = nextX;
        const nextHomeZ = nextZ + 0.16;

        if (
          Math.abs(existing.homeX - nextHomeX) > 0.01 ||
          Math.abs(existing.homeZ - nextHomeZ) > 0.01
        ) {
          existing.homeX = nextHomeX;
          existing.homeZ = nextHomeZ;
          existing.deskRootGroup.position.set(nextX, 0, nextZ);
          if (existing.walkMode === 'idle') {
            existing.avatarActorGroup.position.set(nextHomeX, 0, nextHomeZ);
          }
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
        const bldgLabel = entry.isBandung ? 'Gedung Jawa' : 'Jakarta HQ';
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
            Math.abs(Math.sin(w * Math.PI * 10)) * 0.14 * (1 - w) + standUpLift;
          entry.avatarActorGroup.position.set(curX, stepBob, curZ);

          // Face the direction of travel while walking, then turn to face laptop (Math.PI) upon arrival
          const travelAngle = Math.atan2(endX - startX, endZ - startZ);
          entry.avatarActorGroup.rotation.y =
            entry.walkMode === 'walk_in'
              ? THREE.MathUtils.lerp(travelAngle, Math.PI, smoothW)
              : travelAngle;

          // Roblox-style alternating arm & leg stride swing during walk
          const strideAngle = Math.sin(w * Math.PI * 10) * 0.55 * (1 - w * 0.5);
          entry.upperBodyGroup.rotation.set(0, 0, 0);
          entry.leftArmGroup.rotation.set(strideAngle, 0, -0.05);
          entry.rightArmGroup.rotation.set(-strideAngle, 0, 0.05);
          entry.leftLegGroup.rotation.x = -strideAngle;
          entry.rightLegGroup.rotation.x = strideAngle;

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
          // -------------------------------------------------------------------
          // WORKSTATION ANIMATION CYCLE (Facing Laptop at rotation.y = Math.PI):
          // 1. Default Mode (0.0s - 10.2s): Typing on Laptop Keyboard + Light Head Nod
          // 2. Stretching Mode (10.2s - 12.8s): Raising both arms overhead & stretching torso
          // 3. Comedy Desk-Slap Mode (12.8s - 15.0s): Playful frustrated drumming/slapping on desk
          // -------------------------------------------------------------------
          const cyclePeriod = 15.0;
          const staffTimeOffset = i * 4.3 + (entry.staffName.charCodeAt(0) % 7) * 0.9;
          const cycleTime = (elapsed + staffTimeOffset) % cyclePeriod;

          let idleBob = Math.sin(elapsed * 2.4 + i * 0.7) * 0.014;
          const highlightLift = isHighlighted ? 0.07 : 0;

          // Always face the laptop screen on the desk (-Z direction -> rotation.y = Math.PI)
          entry.avatarActorGroup.rotation.y = Math.PI;
          entry.leftLegGroup.rotation.x = 0;
          entry.rightLegGroup.rotation.x = 0;

          if (cycleTime >= 10.2 && cycleTime < 12.8) {
            // MODE 2: STRETCHING (MENGGELIAT) — Raise both arms high overhead & arch torso back
            const p = (cycleTime - 10.2) / 2.6;
            const stretchEnv = Math.sin(p * Math.PI); // 0 -> 1 -> 0 smooth bell curve

            // Ensure face color, eyebrows, and steam puffs are in calm state
            entry.headMat.color.copy(NORMAL_SKIN_COLOR_THREE);
            entry.leftBrowMesh.rotation.z = Math.PI / 2 + 0.08;
            entry.rightBrowMesh.rotation.z = Math.PI / 2 - 0.08;
            entry.leftBrowMesh.position.y = 0.062;
            entry.rightBrowMesh.position.y = 0.062;
            entry.steamPuffs.forEach((puff) => {
              puff.mesh.visible = false;
              puff.mat.opacity = 0;
            });

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
          } else if (cycleTime >= 12.8) {
            // MODE 3: EMOSI LUCU / GEMAS MUKUL MEJA — Playful rapid drumming on desk + Red Face + Steam Puffs
            const p = (cycleTime - 12.8) / 2.2;
            const slapEnv = Math.sin(p * Math.PI);
            const slapLeft = Math.abs(Math.sin(elapsed * 19 + i));
            const slapRight = Math.abs(Math.cos(elapsed * 19 + i));

            idleBob += slapLeft * 0.032 * slapEnv;

            // 1. Smoothly interpolate head/face color from normal skin (#F7C894) to angry cartoon red (#EF4444)
            entry.headMat.color
              .copy(NORMAL_SKIN_COLOR_THREE)
              .lerp(ANGRY_RED_SKIN_COLOR_THREE, slapEnv * 0.85);

            // 2. Angle eyebrows inward into a funny angry V-scowl
            entry.leftBrowMesh.rotation.z =
              Math.PI / 2 + 0.08 - 0.42 * slapEnv;
            entry.rightBrowMesh.rotation.z =
              Math.PI / 2 - 0.08 + 0.42 * slapEnv;
            entry.leftBrowMesh.position.y = 0.062 - 0.008 * slapEnv;
            entry.rightBrowMesh.position.y = 0.062 - 0.008 * slapEnv;

            // 3. Spawn & animate rising cartoon steam/smoke puffs from top-left and top-right of head
            entry.steamPuffs.forEach((puff, pIdx) => {
              const u = (elapsed * 2.1 + puff.phaseOffset) % 1.0;
              const puffFade = Math.sin(u * Math.PI);
              puff.mesh.visible = true;
              puff.mesh.position.set(
                puff.side * (0.15 + u * 0.13) +
                  Math.sin(elapsed * 9 + pIdx) * 0.018,
                0.14 + u * 0.36,
                Math.cos(elapsed * 7 + pIdx) * 0.02
              );
              const puffScale = (0.45 + puffFade * 0.95) * (0.4 + slapEnv * 0.7);
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
              Math.sin(elapsed * 22 + i) * 0.05 * slapEnv;

            entry.leftArmGroup.rotation.x =
              -0.75 - slapLeft * 0.65 * slapEnv;
            entry.rightArmGroup.rotation.x =
              -0.75 - slapRight * 0.65 * slapEnv;
            entry.leftArmGroup.rotation.z = 0.05;
            entry.rightArmGroup.rotation.z = -0.05;

            entry.headGroup.rotation.x = 0.16;
            entry.headGroup.rotation.y =
              Math.sin(elapsed * 20 + i) * 0.12 * slapEnv;
            entry.headGroup.rotation.z =
              Math.cos(elapsed * 24 + i) * 0.09 * slapEnv;
          } else {
            // MODE 1 (DEFAULT): NGETIK KERJA DI ATAS KEYBOARD LAPTOP + ANGGUKAN KEPALA RINGAN
            const typeWaveL = Math.sin(elapsed * 17.5 + i * 1.3) * 0.13;
            const typeWaveR = Math.cos(elapsed * 17.5 + i * 1.3) * 0.13;

            // Reset face color, eyebrows, and hide steam puffs in calm default mode
            entry.headMat.color.copy(NORMAL_SKIN_COLOR_THREE);
            entry.leftBrowMesh.rotation.z = Math.PI / 2 + 0.08;
            entry.rightBrowMesh.rotation.z = Math.PI / 2 - 0.08;
            entry.leftBrowMesh.position.y = 0.062;
            entry.rightBrowMesh.position.y = 0.062;
            entry.steamPuffs.forEach((puff) => {
              puff.mesh.visible = false;
              puff.mat.opacity = 0;
            });

            entry.upperBodyGroup.rotation.x = 0.08;
            entry.upperBodyGroup.rotation.y = 0;
            entry.upperBodyGroup.rotation.z = 0;

            entry.leftArmGroup.rotation.x = -1.12 + typeWaveL;
            entry.rightArmGroup.rotation.x = -1.12 + typeWaveR;
            entry.leftArmGroup.rotation.z = 0.12;
            entry.rightArmGroup.rotation.z = -0.12;

            entry.headGroup.rotation.x =
              0.1 + Math.sin(elapsed * 4.5 + i) * 0.045;
            entry.headGroup.rotation.y =
              Math.sin(elapsed * 1.7 + i * 0.9) * 0.075;
            entry.headGroup.rotation.z = 0;
          }

          entry.avatarActorGroup.position.set(
            entry.homeX,
            idleBob + highlightLift,
            entry.homeZ
          );
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

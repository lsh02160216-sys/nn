import * as THREE from 'three';
import { SLICE_COUNT } from '../constants/targets';
import { PotteryProfile } from '../types';

export const RADIAL_SEGMENTS = 54;

/**
 * Creates an initial fresh clay lump on the pottery wheel
 */
export function createInitialProfile(height = 1.9, baseRadius = 0.5): PotteryProfile {
  const outerR: number[] = [];
  const innerR: number[] = [];

  for (let i = 0; i < SLICE_COUNT; i++) {
    const t = i / (SLICE_COUNT - 1);
    // Initial solid clay cylinder/cone ready to be shaped
    const baseW = baseRadius * (1.1 - t * 0.25);
    outerR.push(baseW);

    // Initial small pilot center hole from t=0.25 to top
    if (t < 0.25) {
      innerR.push(0);
    } else {
      const it = (t - 0.25) / 0.75;
      innerR.push(Math.max(0, it * 0.12));
    }
  }

  return {
    slices: SLICE_COUNT,
    height,
    outerR,
    innerR,
  };
}

/**
 * Builds a seamless, double-walled revolution BufferGeometry for the porcelain
 * including the foot rim (굽), outer silhouette, rounded top lip, and hollow inner cavity.
 */
export function buildPotteryGeometry(profile: PotteryProfile): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const { slices, height, outerR, innerR } = profile;
  const segments = RADIAL_SEGMENTS;

  // Profile path definition:
  // 1. Bottom foot center (r=0, y=0)
  // 2. Bottom outer foot ring (r=outerR[0], y=0)
  // 3. Outer wall going up from i=0 to i=slices-1
  // 4. Rounded lip at i=slices-1
  // 5. Inner wall going down from i=slices-1 to inner floor
  // 6. Inner floor center (r=0, y=floorY)

  // Construct 2D profile points [r, y] along cross section:
  const crossSection: { r: number; y: number; isInner: boolean }[] = [];

  // Foot ring detail
  const footR = outerR[0];
  crossSection.push({ r: 0.001, y: 0.02, isInner: false });
  crossSection.push({ r: footR * 0.75, y: 0.02, isInner: false });
  crossSection.push({ r: footR * 0.85, y: 0.0, isInner: false });
  crossSection.push({ r: footR, y: 0.0, isInner: false });

  // Outer wall
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    const y = 0.04 + t * (height - 0.04);
    crossSection.push({ r: outerR[i], y, isInner: false });
  }

  // Rounded lip
  const topIndex = slices - 1;
  const lipOuterR = outerR[topIndex];
  const lipInnerR = Math.min(innerR[topIndex], lipOuterR - 0.035);
  const lipMidR = (lipOuterR + lipInnerR) * 0.5;
  crossSection.push({ r: lipMidR, y: height + 0.018, isInner: false });

  // Inner wall (descending)
  const floorIndex = Math.max(1, Math.floor(slices * 0.12));
  for (let i = slices - 1; i >= floorIndex; i--) {
    const t = i / (slices - 1);
    const y = 0.04 + t * (height - 0.04);
    const r = Math.min(innerR[i], outerR[i] - 0.03);
    crossSection.push({ r: Math.max(0.015, r), y, isInner: true });
  }

  // Inner floor center
  const floorT = floorIndex / (slices - 1);
  const floorY = 0.04 + floorT * (height - 0.04);
  crossSection.push({ r: 0.001, y: floorY, isInner: true });

  const numCross = crossSection.length;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const cavityTotalDepth = Math.max(0.1, height - floorY);

  // Build vertices grid: crossSection.length x (segments + 1)
  for (let c = 0; c < numCross; c++) {
    const { r, y, isInner } = crossSection[c];
    const v = c / (numCross - 1);

    // Compute vertex color:
    // Outer wall: pure clean white/ivory
    // Lip rim: bright highlight
    // Inner wall: natural cavity ambient occlusion gradient (darker deeper down)
    let cr = 0.97;
    let cg = 0.95;
    let cb = 0.92;

    if (isInner) {
      // Cavity depth ratio: 0 at floor, 1 at mouth rim
      const depthRatio = Math.max(0, Math.min(1, (y - floorY) / cavityTotalDepth));
      // Subtle warm charcoal-clay shading inside
      const shade = 0.52 + Math.pow(depthRatio, 0.75) * 0.38;
      cr = 0.95 * shade;
      cg = 0.91 * shade;
      cb = 0.86 * shade;
    } else if (c === slices + 4) {
      // Very top rounded lip rim (전) -> bright crisp contrast highlight
      cr = 1.0;
      cg = 1.0;
      cb = 1.0;
    }

    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const angle = u * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const px = r * cosA;
      const py = y;
      const pz = r * sinA;

      positions.push(px, py, pz);
      normals.push(cosA * (isInner ? -1 : 1), 0, sinA * (isInner ? -1 : 1));
      uvs.push(u, v);
      colors.push(cr, cg, cb);
    }
  }

  // Build quad faces
  for (let c = 0; c < numCross - 1; c++) {
    for (let s = 0; s < segments; s++) {
      const i0 = c * (segments + 1) + s;
      const i1 = i0 + 1;
      const i2 = (c + 1) * (segments + 1) + s;
      const i3 = i2 + 1;

      // Two triangles per quad
      indices.push(i0, i1, i2);
      indices.push(i1, i3, i2);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Updates an existing BufferGeometry's vertex positions, colors, and normals in place
 * for ultra fast, lag-free 60fps wheel sculpting.
 */
export function updatePotteryGeometry(geometry: THREE.BufferGeometry, profile: PotteryProfile): void {
  const { slices, height, outerR, innerR } = profile;
  const segments = RADIAL_SEGMENTS;

  const crossSection: { r: number; y: number; isInner: boolean }[] = [];

  // Foot
  const footR = outerR[0];
  crossSection.push({ r: 0.001, y: 0.02, isInner: false });
  crossSection.push({ r: footR * 0.75, y: 0.02, isInner: false });
  crossSection.push({ r: footR * 0.85, y: 0.0, isInner: false });
  crossSection.push({ r: footR, y: 0.0, isInner: false });

  // Outer wall
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    const y = 0.04 + t * (height - 0.04);
    crossSection.push({ r: outerR[i], y, isInner: false });
  }

  // Lip
  const topIndex = slices - 1;
  const lipOuterR = outerR[topIndex];
  const lipInnerR = Math.min(innerR[topIndex], lipOuterR - 0.035);
  const lipMidR = (lipOuterR + lipInnerR) * 0.5;
  crossSection.push({ r: lipMidR, y: height + 0.018, isInner: false });

  // Inner wall
  const floorIndex = Math.max(1, Math.floor(slices * 0.12));
  for (let i = slices - 1; i >= floorIndex; i--) {
    const t = i / (slices - 1);
    const y = 0.04 + t * (height - 0.04);
    const r = Math.min(innerR[i], outerR[i] - 0.03);
    crossSection.push({ r: Math.max(0.015, r), y, isInner: true });
  }

  // Floor center
  const floorT = floorIndex / (slices - 1);
  const floorY = 0.04 + floorT * (height - 0.04);
  crossSection.push({ r: 0.001, y: floorY, isInner: true });

  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
  if (!posAttr) return;

  const numCross = crossSection.length;
  const cavityTotalDepth = Math.max(0.1, height - floorY);
  let idx = 0;

  for (let c = 0; c < numCross; c++) {
    const { r, y, isInner } = crossSection[c];

    let cr = 0.97;
    let cg = 0.95;
    let cb = 0.92;

    if (isInner) {
      const depthRatio = Math.max(0, Math.min(1, (y - floorY) / cavityTotalDepth));
      const shade = 0.52 + Math.pow(depthRatio, 0.75) * 0.38;
      cr = 0.95 * shade;
      cg = 0.91 * shade;
      cb = 0.86 * shade;
    } else if (c === slices + 4) {
      cr = 1.0;
      cg = 1.0;
      cb = 1.0;
    }

    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const angle = u * Math.PI * 2;
      const px = r * Math.cos(angle);
      const py = y;
      const pz = r * Math.sin(angle);

      posAttr.setXYZ(idx, px, py, pz);
      if (colorAttr) {
        colorAttr.setXYZ(idx, cr, cg, cb);
      }
      idx++;
    }
  }

  posAttr.needsUpdate = true;
  if (colorAttr) colorAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Deforms outer profile at a given normalized height t with radius delta
 */
export function deformOuterProfile(
  profile: PotteryProfile,
  tTarget: number,
  deltaR: number,
  sigma = 0.13,
  speedFactor = 1.0
): void {
  const slices = profile.slices;
  const effectiveDelta = deltaR * speedFactor;

  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    const dist = t - tTarget;
    const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma));

    if (gaussian > 0.01) {
      // Primary displacement
      let newR = profile.outerR[i] + effectiveDelta * gaussian;

      // Clamping limits
      newR = Math.max(0.2, Math.min(1.35, newR));
      profile.outerR[i] = newR;

      // Ensure inner cavity is at least wall thickness away
      if (profile.innerR[i] >= newR - 0.04) {
        profile.innerR[i] = Math.max(0, newR - 0.04);
      }
    }
  }

  // Natural clay smoothing filter pass
  smoothProfile(profile.outerR);
}

/**
 * Deforms inner cavity profile (hollowing out or widening mouth in top view)
 */
export function deformInnerProfile(
  profile: PotteryProfile,
  tTarget: number,
  deltaR: number,
  sigma = 0.15,
  speedFactor = 1.0
): void {
  const slices = profile.slices;
  const effectiveDelta = deltaR * speedFactor;

  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    // Cavity only affects above bottom foot
    if (t < 0.1) continue;

    const dist = t - tTarget;
    const gaussian = Math.exp(-(dist * dist) / (2 * sigma * sigma));

    if (gaussian > 0.01) {
      const maxInner = profile.outerR[i] - 0.04; // minimum wall thickness
      let newInner = profile.innerR[i] + effectiveDelta * gaussian;
      newInner = Math.max(0.01, Math.min(maxInner, newInner));
      profile.innerR[i] = newInner;

      // If pushing inner wall hard against outer wall, slightly push outer wall out too!
      if (profile.innerR[i] > profile.outerR[i] - 0.05) {
        profile.outerR[i] = Math.min(1.35, profile.innerR[i] + 0.05);
      }
    }
  }

  smoothProfile(profile.innerR);
}

/**
 * 1D smoothing filter to prevent sharp jagged tears and simulate wet plastic clay
 */
function smoothProfile(radii: number[]): void {
  const n = radii.length;
  const temp = [...radii];
  for (let i = 1; i < n - 1; i++) {
    // 3-point smoothing
    radii[i] = temp[i - 1] * 0.22 + temp[i] * 0.56 + temp[i + 1] * 0.22;
  }
}

/**
 * Calculate silhouette similarity score (0..100) between current profile and target
 */
export function calculateSilhouetteMatch(
  currentProfile: PotteryProfile,
  targetProfile: number[],
  tolerance = 0.12
): { score: number; maxDiff: number; avgDiff: number } {
  let totalDiff = 0;
  let maxDiff = 0;
  const n = currentProfile.slices;

  for (let i = 0; i < n; i++) {
    const curR = currentProfile.outerR[i];
    const tgtR = targetProfile[i];
    const diff = Math.abs(curR - tgtR);
    totalDiff += diff;
    if (diff > maxDiff) maxDiff = diff;
  }

  const avgDiff = totalDiff / n;
  // Normalized score: within tolerance gives high score, larger diff drops score
  // If avgDiff is 0 -> 100%, if avgDiff is 0.04 -> ~92%, if avgDiff is 0.15 -> ~50%
  const normalizedErr = avgDiff / Math.max(0.06, tolerance);
  const score = Math.max(5, Math.min(100, Math.round(100 * Math.exp(-normalizedErr * 0.75))));

  return { score, maxDiff, avgDiff };
}

/**
 * Returns real-time dimensional metrics for HUD display
 */
export function getPotteryMetrics(profile: PotteryProfile): {
  mouthDiameterCm: number;
  rimThicknessMm: number;
  cavityDepthPct: number;
  heightCm: number;
} {
  const topIndex = profile.slices - 1;
  const outerR = profile.outerR[topIndex];
  const innerR = profile.innerR[topIndex];
  const thickness = Math.max(0.003, outerR - innerR);

  const floorIndex = Math.max(1, Math.floor(profile.slices * 0.12));
  const floorT = floorIndex / (profile.slices - 1);
  const floorY = 0.04 + floorT * (profile.height - 0.04);
  const depth = profile.height - floorY;
  const depthPct = Math.min(100, Math.round((depth / profile.height) * 100));

  return {
    mouthDiameterCm: Math.round(outerR * 2 * 18 * 10) / 10,
    rimThicknessMm: Math.round(thickness * 18 * 10 * 10) / 10,
    cavityDepthPct: depthPct,
    heightCm: Math.round(profile.height * 18 * 10) / 10,
  };
}

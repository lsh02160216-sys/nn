import * as THREE from 'three';

/**
 * Procedural texture generator for wet porcelain stone clay (물레 위 젖은 청송 도석 백토)
 */
export function createClayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm ivory-white clay base
  ctx.fillStyle = '#f4ede2';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle concentric wheel rotation lines
  for (let y = 0; y < 512; y += 4) {
    const alpha = 0.03 + Math.sin(y * 0.4) * 0.02;
    ctx.fillStyle = `rgba(180, 165, 148, ${alpha})`;
    ctx.fillRect(0, y, 512, 2);
  }

  // Crushed porcelain stone (도석) fine mineral specks
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 1.2 + 0.3;
    const isDark = Math.random() > 0.6;
    ctx.fillStyle = isDark
      ? `rgba(130, 115, 100, ${Math.random() * 0.08})`
      : `rgba(255, 255, 255, ${Math.random() * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural texture for wood pottery wheel (물레 나무 질감)
 */
export function createWheelWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep aged Zelkova/pine wood base
  ctx.fillStyle = '#3a271d';
  ctx.fillRect(0, 0, 512, 512);

  // Radial wood grain rings
  const cx = 256;
  const cy = 256;
  for (let r = 8; r < 360; r += 4 + Math.random() * 5) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(32, 20, 14, ${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 1.5 + Math.random() * 2;
    ctx.stroke();
  }

  // Soft wood fiber noise
  for (let i = 0; i < 2000; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 250;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    ctx.fillStyle = `rgba(90, 60, 40, ${Math.random() * 0.1})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural glazed porcelain texture for fired result
 */
export function createGlazeTexture(score = 90): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Pure snow-white warm tone of Cheongsong stone porcelain
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle soft glaze clouding
  const gradient = ctx.createRadialGradient(512, 512, 100, 512, 512, 600);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(0.5, 'rgba(245, 240, 232, 0.2)');
  gradient.addColorStop(1, 'rgba(235, 228, 218, 0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // If score is high (masterpiece), exquisite subtle hairline crackle (빙렬)
  if (score >= 70) {
    ctx.strokeStyle = 'rgba(180, 170, 155, 0.07)';
    ctx.lineWidth = 0.8;
    for (let c = 0; c < 30; c++) {
      let x = Math.random() * 1024;
      let y = Math.random() * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += (Math.random() - 0.5) * 90;
        y += (Math.random() - 0.5) * 90;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Material for wet clay on the spinning wheel
 */
export function createClayMaterial(isSoftwareGl: boolean): THREE.MeshStandardMaterial {
  const clayTex = createClayTexture();
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: isSoftwareGl ? 0.45 : 0.32, // wet sheen
    metalness: 0.04,
    map: clayTex,
    bumpMap: clayTex,
    bumpScale: 0.003,
    side: THREE.DoubleSide,
  });
}

/**
 * Material for fired finished white porcelain
 */
export function createFiredPorcelainMaterial(
  isSoftwareGl: boolean,
  gradeScore = 90
): THREE.MeshPhysicalMaterial {
  const glazeTex = createGlazeTexture(gradeScore);
  return new THREE.MeshPhysicalMaterial({
    color: 0xfdfbf7,
    roughness: isSoftwareGl ? 0.15 : 0.07,
    metalness: 0.02,
    clearcoat: isSoftwareGl ? 0.7 : 1.0,
    clearcoatRoughness: 0.06,
    transmission: 0,
    ior: 1.52,
    reflectivity: 0.85,
    map: glazeTex,
    side: THREE.DoubleSide,
  });
}

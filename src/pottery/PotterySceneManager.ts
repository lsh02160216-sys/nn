import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraViewMode, PotteryProfile, TargetPorcelain } from '../types';
import {
  buildPotteryGeometry,
  calculateSilhouetteMatch,
  createInitialProfile,
  deformInnerProfile,
  deformOuterProfile,
  getPotteryMetrics,
  updatePotteryGeometry,
} from './potteryGeometry';
import {
  createClayMaterial,
  createFiredPorcelainMaterial,
  createWheelWoodTexture,
} from './potteryMaterials';
import { playClayFrictionSound, setWheelSpeedPitch } from '../utils/audio';

export interface SceneOptions {
  onScoreUpdate: (score: number, avgDiff: number) => void;
  onPointerStateChange: (isInteracting: boolean) => void;
  onMetricsUpdate?: (metrics: {
    mouthDiameterCm: number;
    rimThicknessMm: number;
    cavityDepthPct: number;
    heightCm: number;
  }) => void;
}

export class PotterySceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private isSoftwareGl: boolean;
  private animationFrameId = 0;
  private lastTime = 0;

  // Scene objects
  private wheelGroup: THREE.Group;
  private wheelPlate: THREE.Mesh;
  private potteryMesh: THREE.Mesh;
  private dashedGuideGroup: THREE.Group;
  private rimGuideGroup: THREE.Group;
  private outerRimLine: THREE.LineLoop;
  private innerRimLine: THREE.LineLoop;
  private floorDepthLine: THREE.LineLoop;
  private kilnGroup: THREE.Group;
  private pedestalMesh: THREE.Mesh;
  private clayParticles: THREE.Points;

  // Lights
  private interiorLight: THREE.SpotLight;

  // Materials
  private clayMaterial: THREE.MeshStandardMaterial;
  private firedMaterial: THREE.MeshPhysicalMaterial | null = null;
  private wheelMaterial: THREE.MeshStandardMaterial;

  // State
  private profile: PotteryProfile;
  private target: TargetPorcelain;
  private viewMode: CameraViewMode = 'side';
  private zoomLevel = 1.0; // 0.65 (zoomed out) to 1.55 (zoomed in)
  private isCutaway = false;
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

  private targetCamPos = new THREE.Vector3(0, 1.45, 4.4);
  private targetCamLookAt = new THREE.Vector3(0, 0.95, 0);
  private currentLookAt = new THREE.Vector3(0, 0.95, 0);

  private wheelSpeed = 1.0; // 0 = stopped, 1 = normal, 1.8 = fast
  private wheelRotation = 0;

  // Mode: 'shaping' | 'kiln' | 'result'
  private mode: 'shaping' | 'kiln' | 'result' = 'shaping';
  private kilnHeatGlow = 0; // 0..1

  // Raycasting & Interaction
  private raycaster = new THREE.Raycaster();
  private mousePos = new THREE.Vector2();
  private isPointerDown = false;
  private lastPointerY = 0;
  private lastPointerX = 0;
  private interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Z=0 plane
  private topPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.8);

  private options: SceneOptions;

  constructor(container: HTMLElement, target: TargetPorcelain, options: SceneOptions) {
    this.container = container;
    this.target = target;
    this.options = options;
    this.profile = createInitialProfile(target.height, target.baseRadius);

    // Detect Software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;

    this.container.appendChild(this.renderer.domElement);

    // Scene & Camera - FOV 38° for comfortable framing
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x181513);
    this.scene.fog = new THREE.FogExp2(0x181513, 0.07);

    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    this.camera.position.copy(this.targetCamPos);

    // PMREM Room Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Setup Lighting & Interior Light
    this.interiorLight = new THREE.SpotLight(0xffedd5, 0.6, 7, Math.PI / 3, 0.35, 1);
    this.interiorLight.position.set(0, 3.4, 0.4);
    this.interiorLight.target.position.set(0, 0.6, 0);
    this.scene.add(this.interiorLight);
    this.scene.add(this.interiorLight.target);
    this.setupLighting();

    // Materials
    this.clayMaterial = createClayMaterial(this.isSoftwareGl);
    const wheelWoodTex = createWheelWoodTexture();
    this.wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d271a,
      roughness: 0.6,
      metalness: 0.1,
      map: wheelWoodTex,
    });

    // Create 3D Meshes
    this.wheelGroup = new THREE.Group();
    this.wheelPlate = this.createWheelMesh();
    this.wheelGroup.add(this.wheelPlate);
    this.scene.add(this.wheelGroup);

    // Pottery Mesh
    const potteryGeo = buildPotteryGeometry(this.profile);
    this.potteryMesh = new THREE.Mesh(potteryGeo, this.clayMaterial);
    this.potteryMesh.castShadow = !this.isSoftwareGl;
    this.potteryMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.potteryMesh);

    // Contact Ground Shadow
    this.createContactShadow();

    // Workshop Environment Props
    this.createWorkshopProps();

    // Dashed Target Guide
    this.dashedGuideGroup = new THREE.Group();
    this.updateTargetSilhouetteGuide(target);
    this.scene.add(this.dashedGuideGroup);

    // Rim & Interior Cavity Visual Guides
    const { group, outerLine, innerLine, floorLine } = this.createRimGuides();
    this.rimGuideGroup = group;
    this.outerRimLine = outerLine;
    this.innerRimLine = innerLine;
    this.floorDepthLine = floorLine;
    this.rimGuideGroup.visible = false;
    this.scene.add(this.rimGuideGroup);

    // Kiln Visuals Group
    this.kilnGroup = this.createKilnVisuals();
    this.kilnGroup.visible = false;
    this.scene.add(this.kilnGroup);

    // Exhibition Pedestal
    this.pedestalMesh = this.createPedestal();
    this.pedestalMesh.visible = false;
    this.scene.add(this.pedestalMesh);

    // Clay splash/droplets particles
    this.clayParticles = this.createClayParticles();
    this.scene.add(this.clayParticles);

    // Attach Event Handlers
    this.bindEvents();

    // Initial metrics & score check
    this.evaluateMatch();
    this.updateRimGuides();

    // Start render loop
    this.resize();
    this.lastTime = performance.now();
    this.tick();
  }

  private setupLighting() {
    // Key warm directional light
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.3);
    keyLight.position.set(3, 4.8, 3.8);
    keyLight.castShadow = !this.isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -2.5;
      keyLight.shadow.camera.right = 2.5;
      keyLight.shadow.camera.top = 3.5;
      keyLight.shadow.camera.bottom = -1;
    }
    this.scene.add(keyLight);

    // Cool fill light (Hemisphere)
    const hemiLight = new THREE.HemisphereLight(0x8da1b9, 0x2e2520, 1.15);
    this.scene.add(hemiLight);

    // Rim light from back
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rimLight.position.set(-3, 3, -3);
    this.scene.add(rimLight);
  }

  private createWheelMesh(): THREE.Mesh {
    const discGeo = new THREE.CylinderGeometry(1.2, 1.25, 0.08, 64);
    const disc = new THREE.Mesh(discGeo, this.wheelMaterial);
    disc.position.y = -0.04;
    disc.receiveShadow = !this.isSoftwareGl;

    // Brass edge rim ring
    const rimGeo = new THREE.TorusGeometry(1.22, 0.015, 12, 64);
    rimGeo.rotateX(Math.PI / 2);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc8a664,
      metalness: 0.85,
      roughness: 0.28,
    });
    const brassRim = new THREE.Mesh(rimGeo, brassMat);
    brassRim.position.y = -0.03;
    disc.add(brassRim);

    // Center pivot point
    const pivotGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 24);
    const pivot = new THREE.Mesh(pivotGeo, brassMat);
    pivot.position.y = 0.02;
    disc.add(pivot);

    return disc;
  }

  private createContactShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.081;
    this.scene.add(shadowMesh);
  }

  private createWorkshopProps() {
    const standGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.4, 32);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x221711,
      roughness: 0.85,
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = -0.28;
    this.scene.add(stand);

    const floorGeo = new THREE.CylinderGeometry(4.4, 4.6, 0.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1d1713,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.48;
    this.scene.add(floor);

    // Water bowl
    const bowlGroup = new THREE.Group();
    bowlGroup.position.set(1.5, -0.04, 0.4);

    const bowlGeo = new THREE.CylinderGeometry(0.24, 0.16, 0.14, 24, 1, true);
    const bowlMat = new THREE.MeshStandardMaterial({ color: 0x4a3c31, roughness: 0.5 });
    const bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
    bowlGroup.add(bowlMesh);

    const waterGeo = new THREE.CircleGeometry(0.22, 24);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x7aa3b0,
      roughness: 0.1,
      metalness: 0.1,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.04;
    bowlGroup.add(water);

    const ribGeo = new THREE.BoxGeometry(0.04, 0.015, 0.28);
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xb58852, roughness: 0.4 });
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.set(0.18, 0.06, 0.1);
    rib.rotation.y = 0.5;
    bowlGroup.add(rib);

    this.scene.add(bowlGroup);
  }

  private createDashedRing(radius: number, y: number, color = 0x4ade80): THREE.LineSegments {
    const segments = 48;
    const geometry = new THREE.BufferGeometry();
    const points: number[] = [];

    for (let i = 0; i < segments; i += 2) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      points.push(radius * Math.cos(a1), y, radius * Math.sin(a1));
      points.push(radius * Math.cos(a2), y, radius * Math.sin(a2));
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.65,
      linewidth: 2,
    });

    return new THREE.LineSegments(geometry, material);
  }

  /**
   * Builds distinct guide rings for mouth rim and cavity floor
   */
  private createRimGuides(): {
    group: THREE.Group;
    outerLine: THREE.LineLoop;
    innerLine: THREE.LineLoop;
    floorLine: THREE.LineLoop;
  } {
    const group = new THREE.Group();
    const segments = 64;

    const makeCircleGeo = () => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
      }
      return new THREE.BufferGeometry().setFromPoints(pts);
    };

    // Outer rim: warm gold outline
    const outerMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      linewidth: 2,
      depthTest: true,
    });
    const outerLine = new THREE.LineLoop(makeCircleGeo(), outerMat);
    group.add(outerLine);

    // Inner rim: crisp cyan outline
    const innerMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      depthTest: true,
    });
    const innerLine = new THREE.LineLoop(makeCircleGeo(), innerMat);
    group.add(innerLine);

    // Floor depth circle: subtle celadon
    const floorMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.7,
      linewidth: 1.5,
    });
    const floorLine = new THREE.LineLoop(makeCircleGeo(), floorMat);
    group.add(floorLine);

    return { group, outerLine, innerLine, floorLine };
  }

  /**
   * Updates the rim & cavity guide circle transforms to match current clay profile
   */
  private updateRimGuides() {
    if (!this.rimGuideGroup) return;

    const topIdx = this.profile.slices - 1;
    const outerR = this.profile.outerR[topIdx];
    const innerR = Math.min(this.profile.innerR[topIdx], outerR - 0.035);
    const rimY = this.profile.height + 0.02;

    this.outerRimLine.position.set(0, rimY, 0);
    this.outerRimLine.scale.set(outerR, 1, outerR);

    this.innerRimLine.position.set(0, rimY, 0);
    this.innerRimLine.scale.set(innerR, 1, innerR);

    const floorIndex = Math.max(1, Math.floor(this.profile.slices * 0.12));
    const floorT = floorIndex / (this.profile.slices - 1);
    const floorY = 0.04 + floorT * (this.profile.height - 0.04);
    const floorR = Math.max(0.04, this.profile.innerR[floorIndex]);

    this.floorDepthLine.position.set(0, floorY + 0.01, 0);
    this.floorDepthLine.scale.set(floorR, 1, floorR);

    if (this.options.onMetricsUpdate) {
      this.options.onMetricsUpdate(getPotteryMetrics(this.profile));
    }
  }

  public updateTargetSilhouetteGuide(target: TargetPorcelain) {
    this.target = target;
    while (this.dashedGuideGroup.children.length > 0) {
      const obj = this.dashedGuideGroup.children[0] as THREE.LineSegments;
      obj.geometry?.dispose();
      (obj.material as THREE.Material)?.dispose();
      this.dashedGuideGroup.remove(obj);
    }

    const ringSamples = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 47];
    ringSamples.forEach((sliceIdx) => {
      const t = sliceIdx / (target.profileR.length - 1);
      const y = 0.04 + t * (target.height - 0.04);
      const r = target.profileR[sliceIdx];
      const ring = this.createDashedRing(r, y, 0x6ee7b7);
      this.dashedGuideGroup.add(ring);
    });

    const curvePointsLeft: THREE.Vector3[] = [];
    const curvePointsRight: THREE.Vector3[] = [];

    for (let i = 0; i < target.profileR.length; i++) {
      const t = i / (target.profileR.length - 1);
      const y = 0.04 + t * (target.height - 0.04);
      const r = target.profileR[i];
      curvePointsRight.push(new THREE.Vector3(r, y, 0));
      curvePointsLeft.push(new THREE.Vector3(-r, y, 0));
    }

    const leftGeo = new THREE.BufferGeometry().setFromPoints(curvePointsLeft);
    const rightGeo = new THREE.BufferGeometry().setFromPoints(curvePointsRight);

    const lineMat = new THREE.LineDashedMaterial({
      color: 0x34d399,
      dashSize: 0.06,
      gapSize: 0.04,
      linewidth: 2,
    });

    const leftLine = new THREE.Line(leftGeo, lineMat);
    leftLine.computeLineDistances();
    const rightLine = new THREE.Line(rightGeo, lineMat);
    rightLine.computeLineDistances();

    this.dashedGuideGroup.add(leftLine);
    this.dashedGuideGroup.add(rightLine);

    this.evaluateMatch();
  }

  public setGuideVisible(visible: boolean) {
    this.dashedGuideGroup.visible = visible;
  }

  private createKilnVisuals(): THREE.Group {
    const group = new THREE.Group();

    const saggarGeo = new THREE.CylinderGeometry(1.6, 1.5, 3.2, 32, 1, true);
    const saggarMat = new THREE.MeshStandardMaterial({
      color: 0x3a1d12,
      roughness: 0.9,
      side: THREE.BackSide,
    });
    const saggar = new THREE.Mesh(saggarGeo, saggarMat);
    saggar.position.y = 1.4;
    group.add(saggar);

    const emberGeo = new THREE.CircleGeometry(1.4, 32);
    emberGeo.rotateX(-Math.PI / 2);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.y = -0.05;
    group.add(ember);

    return group;
  }

  private createPedestal(): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(1.1, 1.15, 0.5, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.25,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.25;
    return mesh;
  }

  private createClayParticles(): THREE.Points {
    const particleCount = 60;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xf3ede3,
      size: 0.03,
      transparent: true,
      opacity: 0,
    });
    return new THREE.Points(geo, mat);
  }

  /**
   * Bind Pointer, Wheel Zoom, & Resize Events
   */
  private bindEvents() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.isPointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.options.onPointerStateChange(true);
      this.handlePointerInteraction(e);
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;
      this.handlePointerInteraction(e);
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
      if (this.isPointerDown) {
        this.isPointerDown = false;
        this.options.onPointerStateChange(false);
      }
    });

    window.addEventListener('pointercancel', () => {
      this.isPointerDown = false;
      this.options.onPointerStateChange(false);
    });

    // Mouse wheel zoom
    dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const delta = e.deltaY * 0.001;
        this.setZoom(this.zoomLevel + delta);
      },
      { passive: false }
    );

    // Touch pinch zoom
    let initialTouchDist = 0;
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialTouchDist = Math.hypot(dx, dy);
      }
    });

    dom.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2 && initialTouchDist > 0) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDist = Math.hypot(dx, dy);
          const ratio = initialTouchDist / currentDist;
          this.setZoom(this.zoomLevel * (1 + (ratio - 1) * 0.3));
          initialTouchDist = currentDist;
        }
      },
      { passive: false }
    );

    window.addEventListener('resize', () => this.resize());
  }

  private handlePointerInteraction(e: PointerEvent) {
    if (this.mode !== 'shaping') return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mousePos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mousePos, this.camera);

    const deltaX = (e.clientX - this.lastPointerX) / rect.width;
    const deltaY = (e.clientY - this.lastPointerY) / rect.height;

    if (this.viewMode === 'side') {
      const hitPoint = new THREE.Vector3();
      const hasHit = this.raycaster.ray.intersectPlane(this.interactionPlane, hitPoint);

      if (hasHit) {
        const h = this.profile.height;
        const clampedY = Math.max(0.04, Math.min(h, hitPoint.y));
        const t = (clampedY - 0.04) / (h - 0.04);
        const pointerR = Math.abs(hitPoint.x);

        const sliceIndex = Math.min(
          this.profile.slices - 1,
          Math.max(0, Math.floor(t * (this.profile.slices - 1)))
        );
        const currentR = this.profile.outerR[sliceIndex];

        const diffR = pointerR - currentR;
        const dragInfluence = deltaX * 1.8;
        const pushPullDelta = Math.sign(diffR) * Math.min(0.04, Math.abs(diffR)) * 0.35 + dragInfluence;

        deformOuterProfile(this.profile, t, pushPullDelta, 0.14, 0.85);
        updatePotteryGeometry(this.potteryMesh.geometry, this.profile);
        this.updateRimGuides();

        playClayFrictionSound(Math.min(1, Math.abs(pushPullDelta) * 25));
        this.evaluateMatch();
      }
    } else {
      // Top view: sculpt inner cavity and rim
      this.topPlane.constant = -this.profile.height;
      const hitPoint = new THREE.Vector3();
      const hasHit = this.raycaster.ray.intersectPlane(this.topPlane, hitPoint);

      if (hasHit) {
        const dragR = (deltaX * Math.sign(hitPoint.x) + deltaY * -Math.sign(hitPoint.z)) * 1.5;

        deformInnerProfile(this.profile, 0.88, dragR, 0.22, 1.0);
        updatePotteryGeometry(this.potteryMesh.geometry, this.profile);
        this.updateRimGuides();

        playClayFrictionSound(0.6);
        this.evaluateMatch();
      }
    }
  }

  public setViewMode(mode: CameraViewMode) {
    this.viewMode = mode;
    this.updateCameraTarget();

    if (mode === 'top') {
      this.interiorLight.intensity = 2.6;
      this.rimGuideGroup.visible = true;
    } else {
      this.interiorLight.intensity = 0.6;
      this.rimGuideGroup.visible = this.isCutaway;
    }
  }

  public getViewMode(): CameraViewMode {
    return this.viewMode;
  }

  public toggleViewMode(): CameraViewMode {
    const nextMode = this.viewMode === 'side' ? 'top' : 'side';
    this.setViewMode(nextMode);
    return nextMode;
  }

  public setZoom(level: number) {
    this.zoomLevel = Math.max(0.65, Math.min(1.55, level));
    this.updateCameraTarget();
  }

  public zoomIn() {
    this.setZoom(this.zoomLevel - 0.12);
  }

  public zoomOut() {
    this.setZoom(this.zoomLevel + 0.12);
  }

  public getZoom(): number {
    return this.zoomLevel;
  }

  public setCutaway(enabled: boolean) {
    this.isCutaway = enabled;
    this.clayMaterial.clippingPlanes = enabled ? [this.clipPlane] : [];
    this.clayMaterial.clipShadows = true;
    this.clayMaterial.needsUpdate = true;
    if (this.viewMode === 'side') {
      this.rimGuideGroup.visible = enabled;
    }
  }

  public toggleCutaway(): boolean {
    const next = !this.isCutaway;
    this.setCutaway(next);
    return next;
  }

  public getCutaway(): boolean {
    return this.isCutaway;
  }

  private updateCameraTarget() {
    if (this.mode === 'shaping') {
      if (this.viewMode === 'side') {
        // Generous distance 4.4 * zoomLevel ensures whole pottery + wheel is completely visible
        this.targetCamPos.set(0, 1.45, 4.4 * this.zoomLevel);
        this.targetCamLookAt.set(0, 0.95, 0);
      } else {
        // Top view: comfortable 58° angle directly into opening
        this.targetCamPos.set(0, 2.9, 1.75 * this.zoomLevel);
        this.targetCamLookAt.set(0, 0.85, 0);
      }
    } else if (this.mode === 'kiln') {
      this.targetCamPos.set(0, 1.4, 4.0 * this.zoomLevel);
      this.targetCamLookAt.set(0, 0.9, 0);
    } else if (this.mode === 'result') {
      this.targetCamPos.set(0, 1.35, 4.1 * this.zoomLevel);
      this.targetCamLookAt.set(0, 0.85, 0);
    }
  }

  public resetClay() {
    this.profile = createInitialProfile(this.target.height, this.target.baseRadius);
    updatePotteryGeometry(this.potteryMesh.geometry, this.profile);
    this.updateRimGuides();
    this.evaluateMatch();
  }

  public setWheelSpeed(speed: number) {
    this.wheelSpeed = speed;
    setWheelSpeedPitch(speed);
  }

  public getProfile(): PotteryProfile {
    return this.profile;
  }

  public evaluateMatch(): { score: number; maxDiff: number; avgDiff: number } {
    const result = calculateSilhouetteMatch(this.profile, this.target.profileR, this.target.tolerance);
    this.options.onScoreUpdate(result.score, result.avgDiff);

    this.dashedGuideGroup.children.forEach((child) => {
      const line = child as THREE.LineSegments;
      if (line.material && 'color' in line.material) {
        if (result.score >= 85) {
          (line.material as THREE.LineBasicMaterial).color.setHex(0x10b981);
        } else if (result.score >= 65) {
          (line.material as THREE.LineBasicMaterial).color.setHex(0xf59e0b);
        } else {
          (line.material as THREE.LineBasicMaterial).color.setHex(0x6ee7b7);
        }
      }
    });

    return result;
  }

  public enterKilnMode() {
    this.mode = 'kiln';
    this.dashedGuideGroup.visible = false;
    this.rimGuideGroup.visible = false;
    this.kilnGroup.visible = true;
    this.updateCameraTarget();
    this.scene.background = new THREE.Color(0x0c0806);
    this.scene.fog = new THREE.FogExp2(0x0c0806, 0.12);
  }

  public updateKilnVisuals(temp: number, _targetMin: number, _targetMax: number) {
    if (this.mode !== 'kiln') return;
    const norm = Math.max(0, Math.min(1, (temp - 300) / 1000));
    this.kilnHeatGlow = norm;

    if (temp < 700) {
      this.clayMaterial.color.setHex(0xf5eee3);
      this.clayMaterial.emissive.setRGB(0, 0, 0);
    } else if (temp < 1050) {
      const glow = (temp - 700) / 350;
      this.clayMaterial.emissive.setRGB(glow * 0.7, glow * 0.15, 0);
    } else if (temp < 1250) {
      const glow = (temp - 1050) / 200;
      this.clayMaterial.emissive.setRGB(0.7 + glow * 0.25, 0.2 + glow * 0.35, glow * 0.1);
    } else {
      this.clayMaterial.emissive.setRGB(0.9, 0.75, 0.5);
    }
  }

  public enterResultMode(totalScore = 90) {
    this.mode = 'result';
    this.kilnGroup.visible = false;
    this.dashedGuideGroup.visible = false;
    this.rimGuideGroup.visible = false;
    this.wheelGroup.visible = false;
    this.pedestalMesh.visible = true;

    this.firedMaterial = createFiredPorcelainMaterial(this.isSoftwareGl, totalScore);
    this.potteryMesh.material = this.firedMaterial;
    this.potteryMesh.position.y = 0;

    this.updateCameraTarget();
    this.scene.background = new THREE.Color(0x121010);
    this.scene.fog = new THREE.FogExp2(0x121010, 0.09);
  }

  public restartShaping(newTarget: TargetPorcelain) {
    this.mode = 'shaping';
    this.target = newTarget;
    this.kilnGroup.visible = false;
    this.pedestalMesh.visible = false;
    this.wheelGroup.visible = true;
    this.dashedGuideGroup.visible = true;

    this.potteryMesh.material = this.clayMaterial;
    this.clayMaterial.emissive.setRGB(0, 0, 0);
    this.clayMaterial.color.setHex(0xffffff);

    this.profile = createInitialProfile(newTarget.height, newTarget.baseRadius);
    updatePotteryGeometry(this.potteryMesh.geometry, this.profile);
    this.updateTargetSilhouetteGuide(newTarget);
    this.updateRimGuides();

    this.setViewMode('side');
    this.scene.background = new THREE.Color(0x181513);
    this.scene.fog = new THREE.FogExp2(0x181513, 0.07);
  }

  public captureSnapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public resize() {
    if (!this.container) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private tick = () => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.targetCamPos.x, 5.0, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.targetCamPos.y, 5.0, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.targetCamPos.z, 5.0, dt);

    this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, this.targetCamLookAt.x, 5.0, dt);
    this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, this.targetCamLookAt.y, 5.0, dt);
    this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, this.targetCamLookAt.z, 5.0, dt);
    this.camera.lookAt(this.currentLookAt);

    if (this.mode === 'shaping') {
      const rotSpeed = this.wheelSpeed * 3.2 * dt;
      this.wheelRotation += rotSpeed;
      this.wheelPlate.rotation.y = this.wheelRotation;
      this.potteryMesh.rotation.y = this.wheelRotation;
    } else if (this.mode === 'result') {
      this.potteryMesh.rotation.y += 0.45 * dt;
    } else if (this.mode === 'kiln') {
      this.potteryMesh.rotation.y += 0.25 * dt;
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  public dispose() {
    cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}

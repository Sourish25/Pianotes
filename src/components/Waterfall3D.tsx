import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { NoteEvent, HandType } from '../types';
import { detectChord } from '../utils/chordDetector';
import { triggerHaptic } from '../utils/haptics';
import { Camera, Eye, Compass } from 'lucide-react';
import {
  NOTE_FALL_SPEED,
  STRIKE_Z,
  VISIBLE_WINDOW,
  KEY_MIN_MIDI,
  KEY_MAX_MIDI,
  getNoteX,
  isBlackKey,
  calculateNoteBloom,
  shouldEmitTrailingEmbers,
  getOctaveMarkerData,
  calculateKeybedUnderglow,
  calculateRippleWave,
  OCTAVE_PITCHES,
} from '../utils/visualizer3DMath';

export type CameraPreset = 'grand' | 'pianist' | 'topdown' | 'cinematic';

interface Waterfall3DProps {
  notes: NoteEvent[];
  currentTime: number;
  isPlaying: boolean;
  activeHand: HandType;
  userPlayedKeys?: number[];
  speed?: number;
  isDualView?: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  onUserPlayKey?: (pitch: number, velocity?: number) => void;
  onUserReleaseKey?: (pitch: number) => void;
  transportControls?: React.ReactNode;
}

// Low-Overhead Pre-Allocated Particle Pool (Zero GC Allocation Churn)
interface PooledParticle {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
}

// Low-Overhead Pre-Allocated Shockwave Pool
interface PooledShockwave {
  active: boolean;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxRadius: number;
}

// Low-Overhead Pre-Allocated Floor Ripple Pool
interface PooledFloorRipple {
  active: boolean;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxRadius: number;
  initialX: number;
  initialZ: number;
}

// Pre-allocated static Color instances for zero GC churn in render loop
const COLOR_LEFT_EMBER = new THREE.Color(0xd8b4fe);
const COLOR_RIGHT_EMBER = new THREE.Color(0xfef08a);

export const Waterfall3D: React.FC<Waterfall3DProps> = ({
  notes,
  currentTime,
  activeHand,
  userPlayedKeys = [],
  isDualView = false,
  isZenMode = false,
  onToggleZenMode,
  onUserPlayKey,
  onUserReleaseKey,
  transportControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeChordName, setActiveChordName] = useState<string | null>(null);
  const [activeNotesList, setActiveNotesList] = useState<number[]>([]);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('grand');

  // 3D Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const keyMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const keyBaseYRef = useRef<Map<number, number>>(new Map());
  const noteGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const particlePointsRef = useRef<THREE.Points | null>(null);
  const strikeLineMeshRef = useRef<THREE.Mesh | null>(null);
  const starsPointsRef = useRef<THREE.Points | null>(null);
  const violetLightRef = useRef<THREE.PointLight | null>(null);
  const amberLightRef = useRef<THREE.PointLight | null>(null);
  const keyImpactLightRef = useRef<THREE.PointLight | null>(null);

  // Audio-Reactive Keybed Underglow Refs
  const keybedUnderglowLightRef = useRef<THREE.PointLight | null>(null);
  const keybedUnderglowMeshRef = useRef<THREE.Mesh | null>(null);
  const keybedApertureMeshRef = useRef<THREE.Mesh | null>(null);

  // Octave Marker Plaques Ref (C1 - C7)
  const octavePlaquesRef = useRef<Map<number, THREE.Mesh>>(new Map());

  // Object Pools Refs
  const particlePoolRef = useRef<PooledParticle[]>([]);
  const shockwavesPoolRef = useRef<PooledShockwave[]>([]);
  const ripplesPoolRef = useRef<PooledFloorRipple[]>([]);

  // Direct 3D Tactile Piano Touch Tracking (PointerId -> MIDI Pitch)
  const onUserPlayKeyRef = useRef(onUserPlayKey);
  const onUserReleaseKeyRef = useRef(onUserReleaseKey);
  const active3DPointersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    onUserPlayKeyRef.current = onUserPlayKey;
  }, [onUserPlayKey]);

  useEffect(() => {
    onUserReleaseKeyRef.current = onUserReleaseKey;
  }, [onUserReleaseKey]);

  // Synchronous refs for 60fps render loop to avoid effect re-allocations
  const currentTimeRef = useRef(currentTime);
  const notesRef = useRef(notes);
  const activeHandRef = useRef(activeHand);
  const userPlayedKeysRef = useRef(userPlayedKeys);
  const isDualViewRef = useRef(isDualView);
  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);

  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
  }, [cameraPreset]);

  const onToggleZenModeRef = useRef(onToggleZenMode);
  useEffect(() => {
    onToggleZenModeRef.current = onToggleZenMode;
  }, [onToggleZenMode]);

  useEffect(() => {
    isDualViewRef.current = isDualView;
  }, [isDualView]);

  // Camera Orbit / Drag Interaction State
  const cameraAngleRef = useRef({ yaw: 0, pitch: 0, zoom: 1.0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Filter notes based on active hand
  const filteredNotes = useMemo(() => {
    if (activeHand === 'both') return notes;
    return notes.filter((n) => n.hand === activeHand);
  }, [notes, activeHand]);

  const filteredNotesRef = useRef(filteredNotes);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    activeHandRef.current = activeHand;
  }, [activeHand]);

  useEffect(() => {
    userPlayedKeysRef.current = userPlayedKeys;
  }, [userPlayedKeys]);

  useEffect(() => {
    filteredNotesRef.current = filteredNotes;
  }, [filteredNotes]);

  // Clear note meshes when song or hand filter changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    noteGroupsRef.current.forEach((group) => {
      scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    noteGroupsRef.current.clear();
  }, [notes, activeHand]);

  // Initialize Three.js Scene ONCE on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040407);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    const aspect = width / height;
    const fovRad = (48 * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);
    const targetKeyboardSpan = 0.93;
    const requiredDist = 28 / (targetKeyboardSpan * aspect * tanHalfFov);
    const initialCamZ = isDualViewRef.current
      ? (aspect < 1.85 ? 22 : 20)
      : requiredDist * Math.cos((17 * Math.PI) / 180) + 3.4;
    const initialCamY = isDualViewRef.current
      ? (aspect < 1.85 ? 18 : 16)
      : requiredDist * Math.sin((17 * Math.PI) / 180) + 2.5;
    camera.position.set(0, initialCamY, initialCamZ);

    if (isDualViewRef.current) {
      camera.lookAt(0, aspect < 1.85 ? 7.5 : 6.0, -10);
    } else {
      camera.lookAt(0, aspect < 1.75 ? 13.5 : 11.2, -18);
    }
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Exponential Cosmic Fog to seamlessly blend distant waterfall runway into infinite space
    scene.fog = new THREE.FogExp2(0x040407, 0.007);

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0x28203d, 2.8);
    scene.add(ambientLight);

    // Directional Key Light
    const keyLight = new THREE.DirectionalLight(0xfff8ed, 3.2);
    keyLight.position.set(12, 34, 22);
    scene.add(keyLight);

    // Dynamic Violet Rim Light (Left Hand)
    const violetLight = new THREE.PointLight(0xa855f7, 3.5, 65);
    violetLight.position.set(-18, 9, 3);
    scene.add(violetLight);
    violetLightRef.current = violetLight;

    // Dynamic Amber Rim Light (Right Hand)
    const amberLight = new THREE.PointLight(0xf59e0b, 3.5, 65);
    amberLight.position.set(18, 9, 3);
    scene.add(amberLight);
    amberLightRef.current = amberLight;

    // Dynamic Center Key Impact Specular Bounce Light
    const keyImpactLight = new THREE.PointLight(0xa855f7, 0.6, 52);
    keyImpactLight.position.set(0, 2.6, STRIKE_Z + 1.2);
    scene.add(keyImpactLight);
    keyImpactLightRef.current = keyImpactLight;

    // Audio-Reactive Keybed Underglow Light (Illuminates beneath depressed keys)
    const keybedUnderglowLight = new THREE.PointLight(0xa855f7, 0.0, 18);
    keybedUnderglowLight.position.set(0, -0.32, STRIKE_Z + 3.4);
    scene.add(keybedUnderglowLight);
    keybedUnderglowLightRef.current = keybedUnderglowLight;

    // Ground High-Gloss Lacquered Obsidian Mirror Runway Plane
    const bedGeo = new THREE.PlaneGeometry(94, 140);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x06070f,
      roughness: 0.12,
      metalness: 0.90,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.set(0, -0.62, -35);
    scene.add(bedMesh);

    // Keybed Underglow Diffuse Floor Reflector Strip (Beneath Keys)
    const underglowGeo = new THREE.PlaneGeometry(56.8, 6.4);
    const underglowMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
    underglowMesh.rotation.x = -Math.PI / 2;
    underglowMesh.position.set(0, -0.42, STRIKE_Z + 3.4);
    scene.add(underglowMesh);
    keybedUnderglowMeshRef.current = underglowMesh;

    // Keybed Front Gap Aperture Glow Ribbon (Between keys and front stretcher rail)
    const apertureGeo = new THREE.BoxGeometry(56.8, 0.08, 0.14);
    const apertureMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const apertureMesh = new THREE.Mesh(apertureGeo, apertureMat);
    apertureMesh.position.set(0, -0.16, STRIKE_Z + 6.8);
    scene.add(apertureMesh);
    keybedApertureMeshRef.current = apertureMesh;

    // Cosmic Starfield & Nebula Dust Cloud (850 twinkling stars)
    const starCount = 850;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 130;
      starPositions[i * 3 + 1] = Math.random() * 48 + 1.5;
      starPositions[i * 3 + 2] = -Math.random() * 95 - 12;

      const tint = Math.random();
      if (tint < 0.45) {
        starColors[i * 3] = 0.8;
        starColors[i * 3 + 1] = 0.6;
        starColors[i * 3 + 2] = 1.0;
      } else if (tint < 0.75) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.82;
        starColors[i * 3 + 2] = 0.45;
      } else {
        starColors[i * 3] = 0.9;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);
    starsPointsRef.current = starPoints;

    // Horizon Cosmic Nebula Cloud Plane with Soft Radial Falloff (Zero Hard Edges)
    const nebulaCanvas = document.createElement('canvas');
    nebulaCanvas.width = 512;
    nebulaCanvas.height = 256;
    const nctx = nebulaCanvas.getContext('2d');
    if (nctx) {
      const grad = nctx.createRadialGradient(256, 128, 20, 256, 128, 240);
      grad.addColorStop(0, 'rgba(88, 28, 135, 0.42)');
      grad.addColorStop(0.35, 'rgba(49, 16, 82, 0.28)');
      grad.addColorStop(0.7, 'rgba(24, 10, 48, 0.10)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      nctx.fillStyle = grad;
      nctx.fillRect(0, 0, 512, 256);
    }
    const nebulaTex = new THREE.CanvasTexture(nebulaCanvas);

    const nebulaGeo = new THREE.PlaneGeometry(280, 110);
    const nebulaMat = new THREE.MeshBasicMaterial({
      map: nebulaTex,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
    nebulaMesh.position.set(0, 24, -95);
    scene.add(nebulaMesh);

    // Octave Neon Guide Lane Dividers (C1, C2, C3, C4, C5, C6, C7)
    const laneGroup = new THREE.Group();
    const laneGeo = new THREE.BoxGeometry(0.04, 0.02, 75);
    const laneMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
    });

    OCTAVE_PITCHES.forEach((midi) => {
      const laneMesh = new THREE.Mesh(laneGeo, laneMat);
      const posX = getNoteX(midi) - 0.31;
      laneMesh.position.set(posX, 0.02, -37.5);
      laneGroup.add(laneMesh);
    });
    scene.add(laneGroup);

    // Glowing Laser Strike Line
    const strikeGeo = new THREE.BoxGeometry(56, 0.22, 0.38);
    const strikeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
    });
    const strikeLine = new THREE.Mesh(strikeGeo, strikeMat);
    strikeLine.position.set(0, 0.1, STRIKE_Z);
    scene.add(strikeLine);
    strikeLineMeshRef.current = strikeLine;

    // Strike Line Halo Neon Glow Ribbon
    const glowGeo = new THREE.PlaneGeometry(58, 2.6);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.set(0, 0.06, STRIKE_Z + 0.9);
    scene.add(glowMesh);

    // Steinway Crimson Red Damper Felt Ribbon kissing the mirror fallboard base
    const feltGeo = new THREE.BoxGeometry(56, 0.22, 0.32);
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // rich crimson damper felt
      roughness: 0.90,
      metalness: 0.05,
    });
    const feltRail = new THREE.Mesh(feltGeo, feltMat);
    feltRail.position.set(0, 0.52, STRIKE_Z + 0.12);
    scene.add(feltRail);

    // Steinway Obsidian Lacquer Fallboard Mirror (Reflecting cascading notes and strike flashes)
    const fallboardGeo = new THREE.BoxGeometry(56.8, 3.8, 0.5);
    const fallboardMat = new THREE.MeshStandardMaterial({
      color: 0x07080f,
      roughness: 0.12,
      metalness: 0.86,
    });
    const fallboardMesh = new THREE.Mesh(fallboardGeo, fallboardMat);
    fallboardMesh.position.set(0, 1.9, STRIKE_Z + 0.1);
    scene.add(fallboardMesh);

    // Steinway-Style Gold Embossed Center Crest Line
    const crestGeo = new THREE.BoxGeometry(4.8, 0.08, 0.06);
    const crestMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.95,
      emissive: 0x785614,
      emissiveIntensity: 0.45,
    });
    const crestMesh = new THREE.Mesh(crestGeo, crestMat);
    crestMesh.position.set(0, 2.8, STRIKE_Z + 0.36);
    scene.add(crestMesh);

    // Octave Marker Brass Plaques (C1 through C7) on Fallboard Base
    const octaveGroup = new THREE.Group();
    const octavePlaqueGeo = new THREE.PlaneGeometry(1.25, 0.46);
    const plaqueTexturesToDispose: THREE.Texture[] = [];

    const createOctaveTexture = (label: string, roman: string, isMiddleC: boolean): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep brushed gold brass plate background
        const grad = ctx.createLinearGradient(0, 0, 256, 128);
        grad.addColorStop(0, '#1c160c');
        grad.addColorStop(0.5, '#2e2311');
        grad.addColorStop(1, '#18120a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(6, 6, 244, 116, 14);
        ctx.fill();

        // Polished Gold Brass Bevel Border
        ctx.lineWidth = isMiddleC ? 5 : 3.5;
        ctx.strokeStyle = isMiddleC ? '#fef08a' : '#d4af37';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Octave Name (e.g. C4)
        ctx.font = 'bold 44px "Cinzel", "Times New Roman", serif';
        ctx.fillStyle = isMiddleC ? '#ffffff' : '#fef08a';
        ctx.shadowColor = 'rgba(212, 175, 55, 0.75)';
        ctx.shadowBlur = isMiddleC ? 12 : 6;
        ctx.fillText(label, 128, isMiddleC ? 46 : 50);

        // Roman Numeral (e.g. IV)
        ctx.font = 'bold 26px "Cinzel", "Times New Roman", serif';
        ctx.fillStyle = isMiddleC ? '#fef08a' : '#d4af37';
        ctx.shadowBlur = 4;
        ctx.fillText(roman, 128, isMiddleC ? 90 : 92);

        if (isMiddleC) {
          // Middle C Gold Diamond Jewel Crest
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(128, 12);
          ctx.lineTo(134, 18);
          ctx.lineTo(128, 24);
          ctx.lineTo(122, 18);
          ctx.closePath();
          ctx.fill();
        }
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      plaqueTexturesToDispose.push(tex);
      return tex;
    };

    OCTAVE_PITCHES.forEach((pitch) => {
      const data = getOctaveMarkerData(pitch);
      if (!data) return;
      const plaqueTex = createOctaveTexture(data.label, data.roman, data.isMiddleC);
      const plaqueMat = new THREE.MeshStandardMaterial({
        map: plaqueTex,
        roughness: 0.22,
        metalness: 0.92,
        emissive: 0x5a3f08,
        emissiveIntensity: 0.35,
        transparent: true,
      });
      const plaqueMesh = new THREE.Mesh(octavePlaqueGeo, plaqueMat);
      plaqueMesh.position.set(data.posX, 0.95, STRIKE_Z + 0.36);
      octaveGroup.add(plaqueMesh);
      octavePlaquesRef.current.set(pitch, plaqueMesh);
    });
    scene.add(octaveGroup);

    // Luxury Piano Cheek Blocks (Flanking A0 and C8)
    const cheekGeo = new THREE.BoxGeometry(1.3, 1.5, 7.2);
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0x0e0f14,
      roughness: 0.18,
      metalness: 0.75,
    });

    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(getNoteX(21) - 1.05, 0.65, STRIKE_Z + 3.4);
    scene.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(getNoteX(108) + 1.05, 0.65, STRIKE_Z + 3.4);
    scene.add(rightCheek);

    // Gold Brass Accent Inlays on Cheek Blocks
    const brassGeo = new THREE.BoxGeometry(0.12, 1.4, 7.1);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // polished gold brass
      roughness: 0.28,
      metalness: 0.92,
    });

    const leftBrass = new THREE.Mesh(brassGeo, brassMat);
    leftBrass.position.set(getNoteX(21) - 0.35, 0.65, STRIKE_Z + 3.4);
    scene.add(leftBrass);

    const rightBrass = new THREE.Mesh(brassGeo, brassMat);
    rightBrass.position.set(getNoteX(108) + 0.35, 0.65, STRIKE_Z + 3.4);
    scene.add(rightBrass);

    // Polished Obsidian Front Stretcher Rail (Piano Keybed Apron)
    const frontRailGeo = new THREE.BoxGeometry(57.2, 0.75, 0.45);
    const frontRailMat = new THREE.MeshStandardMaterial({
      color: 0x080910,
      roughness: 0.14,
      metalness: 0.85,
    });
    const frontRailMesh = new THREE.Mesh(frontRailGeo, frontRailMat);
    frontRailMesh.position.set(0, -0.25, STRIKE_Z + 7.0);
    scene.add(frontRailMesh);

    // Front Gold Brass Bevel Accent Line
    const frontBrassGeo = new THREE.BoxGeometry(56.8, 0.06, 0.06);
    const frontBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.95,
      emissive: 0x654710,
      emissiveIntensity: 0.35,
    });
    const frontBrassMesh = new THREE.Mesh(frontBrassGeo, frontBrassMat);
    frontBrassMesh.position.set(0, 0.12, STRIKE_Z + 6.82);
    scene.add(frontBrassMesh);

    // Build 3D Piano Keys on the Strike Plane with Beveled Mechanical Fulcrum
    const keyGroup = new THREE.Group();
    scene.add(keyGroup);

    for (let midi = KEY_MIN_MIDI; midi <= KEY_MAX_MIDI; midi++) {
      const black = isBlackKey(midi);
      const kWidth = black ? 0.42 : 0.58;
      const length = black ? 4.2 : 6.8;
      const height = black ? 0.85 : 0.7;
      const zOffset = black ? -1.2 : 0;
      const yOffset = black ? 0.3 : 0;

      const keyGeo = new THREE.BoxGeometry(kWidth, height, length);
      const keyMat = new THREE.MeshStandardMaterial({
        color: black ? 0x141416 : 0xf4f4f7,
        roughness: black ? 0.32 : 0.14,
        metalness: black ? 0.35 : 0.08,
      });

      const keyMesh = new THREE.Mesh(keyGeo, keyMat);
      keyMesh.userData = { pitch: midi };
      const posX = getNoteX(midi);
      keyMesh.position.set(posX, yOffset, STRIKE_Z + 3.4 + zOffset);
      keyGroup.add(keyMesh);

      keyMeshesRef.current.set(midi, keyMesh);
      keyBaseYRef.current.set(midi, yOffset);
    }
    const keyMeshesList = Array.from(keyMeshesRef.current.values());

    // Pre-Allocated Particle Pool (Zero GC Churn)
    const MAX_PARTICLES = 900;
    const particlePool: PooledParticle[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particlePool.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        life: 0,
        maxLife: 1.0,
      });
    }
    particlePoolRef.current = particlePool;

    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(MAX_PARTICLES * 3);
    const particleColors = new Float32Array(MAX_PARTICLES * 3);

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
    });

    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);
    particlePointsRef.current = particlePoints;

    let particlePoolIndex = 0;
    const spawnParticle = (
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      color: THREE.Color,
      maxLife: number
    ) => {
      const pool = particlePoolRef.current;
      const poolLen = pool.length;
      for (let i = 0; i < poolLen; i++) {
        const idx = (particlePoolIndex + i) % poolLen;
        const p = pool[idx];
        if (!p.active) {
          p.active = true;
          p.position.set(x, y, z);
          p.velocity.set(vx, vy, vz);
          p.color.copy(color);
          p.life = 0;
          p.maxLife = maxLife;
          particlePoolIndex = (idx + 1) % poolLen;
          return;
        }
      }
    };

    // Pre-Allocated Strike Shockwave Pool (Zero GC Churn)
    const MAX_SHOCKWAVES = 24;
    const shockwaveGeo = new THREE.RingGeometry(0.25, 0.45, 24);
    shockwaveGeo.rotateX(-Math.PI / 2);
    const shockwavesPool: PooledShockwave[] = [];

    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const sMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const sMesh = new THREE.Mesh(shockwaveGeo, sMat);
      sMesh.visible = false;
      scene.add(sMesh);
      shockwavesPool.push({
        active: false,
        mesh: sMesh,
        material: sMat,
        life: 0,
        maxLife: 0.38,
        maxRadius: 2.4,
      });
    }
    shockwavesPoolRef.current = shockwavesPool;

    const spawnShockwave = (x: number, isLeftHand: boolean) => {
      const pool = shockwavesPoolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const s = pool[i];
        if (!s.active) {
          s.active = true;
          s.life = 0;
          s.mesh.position.set(x, 0.12, STRIKE_Z);
          s.material.color.setHex(isLeftHand ? 0xc084fc : 0xfde047);
          s.material.opacity = 0.85;
          s.mesh.scale.set(0.3, 0.3, 1);
          s.mesh.visible = true;
          return;
        }
      }
    };

    // Pre-Allocated Runway Reflective Floor Splash Ripple Pool (Zero GC Churn)
    const MAX_RIPPLES = 24;
    const rippleGeo = new THREE.RingGeometry(0.20, 0.40, 32);
    rippleGeo.rotateX(-Math.PI / 2);
    const ripplesPool: PooledFloorRipple[] = [];

    for (let i = 0; i < MAX_RIPPLES; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(rippleGeo, rMat);
      rMesh.visible = false;
      scene.add(rMesh);
      ripplesPool.push({
        active: false,
        mesh: rMesh,
        material: rMat,
        life: 0,
        maxLife: 0.55,
        maxRadius: 3.6,
        initialX: 0,
        initialZ: 0,
      });
    }
    ripplesPoolRef.current = ripplesPool;

    const spawnFloorRipple = (x: number, isLeftHand: boolean) => {
      const pool = ripplesPoolRef.current;
      for (let i = 0; i < pool.length; i++) {
        const r = pool[i];
        if (!r.active) {
          r.active = true;
          r.life = 0;
          r.initialX = x;
          r.initialZ = STRIKE_Z;
          r.mesh.position.set(x, -0.60, STRIKE_Z);
          r.material.color.setHex(isLeftHand ? 0xc084fc : 0xfde047);
          r.material.opacity = 0.75;
          r.mesh.scale.set(0.3, 0.3, 1);
          r.mesh.visible = true;
          return;
        }
      }
    };

    // Double-Tap on Canvas Gesture Detection (for instant Immersive Zen Mode toggle)
    let lastTapTime = 0;
    let lastTapPos = { x: 0, y: 0 };
    const TAP_THRESHOLD_MS = 320;
    const TAP_DISTANCE_THRESHOLD = 25; // px

    // 3D Key Raycasting & Camera Orbit Interaction System
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    const getRaycastKeyPitch = (e: PointerEvent): { pitch: number; velocity: number } | null => {
      if (!containerRef.current || !cameraRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouseNDC.set(ndcX, ndcY);
      raycaster.setFromCamera(mouseNDC, cameraRef.current);

      const hits = raycaster.intersectObjects(keyMeshesList, false);
      if (hits.length > 0) {
        const hit = hits[0];
        const pitch = hit.object.userData.pitch as number;
        if (typeof pitch === 'number') {
          // Dynamic vertical touch velocity calculation (front lip = forte 0.90, back root = piano 0.50)
          const hitZ = hit.point.z;
          const normalizedZ = Math.max(0, Math.min(1, (hitZ - STRIKE_Z) / 6.8));
          const velocity = Math.max(0.45, Math.min(0.95, 0.50 + normalizedZ * 0.40));
          return { pitch, velocity };
        }
      }
      return null;
    };

    // Pointer Down: Raycast against 3D Piano Keys or Begin Camera Orbit Drag
    const handlePointerDown = (e: PointerEvent) => {
      const keyHit = getRaycastKeyPitch(e);
      if (keyHit) {
        // Direct tactile 3D piano strike!
        active3DPointersRef.current.set(e.pointerId, keyHit.pitch);
        if (onUserPlayKeyRef.current) {
          onUserPlayKeyRef.current(keyHit.pitch, keyHit.velocity);
        }
        triggerHaptic('light');

        // Immediate visual shockwave & floor ripple on the struck 3D key
        const posX = getNoteX(keyHit.pitch);
        const isLeft = keyHit.pitch < 60;
        spawnShockwave(posX, isLeft);
        spawnFloorRipple(posX, isLeft);

        // Tactile strike particles and rising embers
        const sparkColor = isLeft ? COLOR_LEFT_EMBER : COLOR_RIGHT_EMBER;
        for (let i = 0; i < 4; i++) {
          spawnParticle(
            posX + (Math.random() - 0.5) * 0.4,
            0.6,
            STRIKE_Z + (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 5.0,
            Math.random() * 6.0 + 2.5,
            (Math.random() - 0.5) * 5.0,
            sparkColor,
            0.45 + Math.random() * 0.3
          );
        }
        if (keyHit.velocity >= 0.70) {
          spawnParticle(
            posX,
            0.75,
            STRIKE_Z + 0.1,
            (Math.random() - 0.5) * 2.0,
            Math.random() * 5.0 + 3.0,
            Math.random() * 2.0 - 1.0,
            sparkColor,
            0.42 + Math.random() * 0.25
          );
        }
        return; // Intercept event: do NOT start camera orbit drag!
      }

      // No key hit: begin camera drag orbit
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    // Pointer Move: Multi-Touch 3D Glissando or Camera Orbit Rotation
    const handlePointerMove = (e: PointerEvent) => {
      if (active3DPointersRef.current.has(e.pointerId)) {
        // Active finger on 3D keyboard: check for 3D glissando!
        const currentPitch = active3DPointersRef.current.get(e.pointerId)!;
        const keyHit = getRaycastKeyPitch(e);
        if (keyHit) {
          if (keyHit.pitch !== currentPitch) {
            // Slid onto a different 3D key: seamless 3D glissando
            if (onUserReleaseKeyRef.current) {
              onUserReleaseKeyRef.current(currentPitch);
            }
            active3DPointersRef.current.set(e.pointerId, keyHit.pitch);
            if (onUserPlayKeyRef.current) {
              onUserPlayKeyRef.current(keyHit.pitch, keyHit.velocity);
            }
            triggerHaptic('light');
            const posX = getNoteX(keyHit.pitch);
            const isLeft = keyHit.pitch < 60;
            spawnShockwave(posX, isLeft);
            spawnFloorRipple(posX, isLeft);

            const sparkColor = isLeft ? COLOR_LEFT_EMBER : COLOR_RIGHT_EMBER;
            for (let i = 0; i < 3; i++) {
              spawnParticle(
                posX + (Math.random() - 0.5) * 0.3,
                0.6,
                STRIKE_Z + (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 4.0,
                Math.random() * 5.0 + 2.0,
                (Math.random() - 0.5) * 4.0,
                sparkColor,
                0.40 + Math.random() * 0.2
              );
            }
          }
        } else {
          // Finger slid off keybed
          if (onUserReleaseKeyRef.current) {
            onUserReleaseKeyRef.current(currentPitch);
          }
          active3DPointersRef.current.delete(e.pointerId);
        }
        return;
      }

      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.yaw += dx * 0.005;
      cameraAngleRef.current.pitch = Math.max(-0.25, Math.min(0.35, cameraAngleRef.current.pitch + dy * 0.004));
    };

    // Pointer Up: Release Struck 3D Key or Finalize Camera Orbit & Double-Tap
    const handlePointerUp = (e: PointerEvent) => {
      if (active3DPointersRef.current.has(e.pointerId)) {
        const pitch = active3DPointersRef.current.get(e.pointerId)!;
        if (onUserReleaseKeyRef.current) {
          onUserReleaseKeyRef.current(pitch);
        }
        active3DPointersRef.current.delete(e.pointerId);
        return;
      }

      isDraggingRef.current = false;

      const target = e.target as HTMLElement | null;
      if (container.contains(target)) {
        const now = performance.now();
        const timeDiff = now - lastTapTime;
        const dx = Math.abs(e.clientX - lastTapPos.x);
        const dy = Math.abs(e.clientY - lastTapPos.y);

        if (timeDiff < TAP_THRESHOLD_MS && dx < TAP_DISTANCE_THRESHOLD && dy < TAP_DISTANCE_THRESHOLD) {
          if (onToggleZenModeRef.current) {
            triggerHaptic('medium');
            onToggleZenModeRef.current();
          }
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          lastTapPos = { x: e.clientX, y: e.clientY };
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.0012;
      cameraAngleRef.current.zoom = Math.max(0.65, Math.min(1.8, cameraAngleRef.current.zoom + delta));
    };

    const handleDblClick = () => {
      cameraAngleRef.current = { yaw: 0, pitch: 0, zoom: 1.0 };
      if (onToggleZenModeRef.current) {
        triggerHaptic('medium');
        onToggleZenModeRef.current();
      }
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('dblclick', handleDblClick);

    // Window & Container Resize Handling (reacts to both browser window and view mode transitions)
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // Continuous 60/120fps Render Loop
    let animId: number;
    let lastChordUpdate = 0;

    // Reusable buffers to guarantee zero GC heap churn in the 60/120fps render loop
    const activeStrikingPitches: number[] = [];
    const activePitchHands = new Map<number, 'left' | 'right'>();
    const activeDepressions: { pitch: number; depth: number }[] = [];

    const animate = (timestamp: number) => {
      animId = requestAnimationFrame(animate);

      const curTime = currentTimeRef.current;
      activeStrikingPitches.length = 0;
      activePitchHands.clear();
      activeDepressions.length = 0;

      // Update Falling Luminous Crystal Notes with Velocity-Sensitive Bloom
      const notesToRender = filteredNotesRef.current;
      notesToRender.forEach((note) => {
        const timeUntilStrike = note.startTime - curTime;
        const timeSinceEnd = curTime - (note.startTime + note.duration);

        if (timeUntilStrike <= VISIBLE_WINDOW && timeSinceEnd <= 0.25) {
          let group = noteGroupsRef.current.get(note.id);
          const isLeftHand = note.hand === 'left';
          const noteLength = Math.max(0.7, note.duration * NOTE_FALL_SPEED);
          const vel = typeof note.velocity === 'number' ? note.velocity : 0.75;
          const isStriking = curTime >= note.startTime && curTime <= note.startTime + note.duration;
          const bloom = calculateNoteBloom(vel, isStriking);

          if (!group) {
            group = new THREE.Group();
            const width = isBlackKey(note.pitch) ? 0.44 : 0.56;

            // 1. Crystal Note Body Mesh (Refractive Crystal Depth)
            const bodyGeo = new THREE.BoxGeometry(width, 0.38, 1);
            const color = isLeftHand ? 0xa855f7 : 0xf59e0b;
            const emissiveColor = isLeftHand ? 0x9333ea : 0xd97706;

            const bodyMat = new THREE.MeshStandardMaterial({
              color,
              emissive: emissiveColor,
              emissiveIntensity: bloom.emissiveIntensity,
              roughness: bloom.roughness,
              metalness: 0.42,
              transparent: true,
              opacity: bloom.opacity,
            });

            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.name = 'body';
            group.add(bodyMesh);

            // 2. Luminous Leading Strike Cap (Hot Neon Front Lip)
            const capGeo = new THREE.BoxGeometry(width + 0.04, 0.44, 0.3);
            const capMat = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: Math.min(1.0, 0.88 + vel * 0.12),
            });
            const capMesh = new THREE.Mesh(capGeo, capMat);
            capMesh.name = 'cap';
            group.add(capMesh);

            scene.add(group);
            noteGroupsRef.current.set(note.id, group);
          }

          // Scale and position note group
          const bodyMesh = group.getObjectByName('body') as THREE.Mesh;
          const capMesh = group.getObjectByName('cap') as THREE.Mesh;

          if (bodyMesh) {
            bodyMesh.scale.set(1, 1, noteLength);
            const bMat = bodyMesh.material as THREE.MeshStandardMaterial;
            bMat.emissiveIntensity = bloom.emissiveIntensity;
            bMat.opacity = bloom.opacity;
            bMat.roughness = bloom.roughness;
          }
          if (capMesh) {
            capMesh.position.set(0, 0.02, noteLength / 2 - 0.15);
            const cMat = capMesh.material as THREE.MeshBasicMaterial;
            // Hot radiant bloom on strike cap driven by strikeCapIntensity
            cMat.opacity = Math.min(1.0, isStriking ? 1.0 : 0.80 + vel * 0.18);
            if (isStriking) {
              cMat.color.setRGB(1.0, 1.0, 1.0);
            } else {
              cMat.color.setRGB(0.92, 0.94, 1.0);
            }
          }

          const posX = getNoteX(note.pitch);
          const posZ = STRIKE_Z - timeUntilStrike * NOTE_FALL_SPEED - noteLength / 2;
          group.position.set(posX, 0.5, posZ);

          // Glowing Trailing Edge Embers & Particle Wakes on Fast/Forte Falling Notes
          if (timeUntilStrike > 0 && shouldEmitTrailingEmbers(vel, Math.random())) {
            const trailingZ = posZ - noteLength / 2;
            const emberColor = isLeftHand ? COLOR_LEFT_EMBER : COLOR_RIGHT_EMBER;
            spawnParticle(
              posX + (Math.random() - 0.5) * 0.35,
              0.45,
              trailingZ,
              (Math.random() - 0.5) * 1.2,
              Math.random() * 1.4 + 0.8,
              -Math.random() * 2.0 - 0.6,
              emberColor,
              0.36 + Math.random() * 0.24
            );
          }

          // Check if actively striking the line
          if (isStriking) {
            activeStrikingPitches.push(note.pitch);
            activePitchHands.set(note.pitch, note.hand);

            // Cosmic particle burst, rising embers & floor splash ripples
            if (Math.random() < 0.45) {
              const sparkColor = isLeftHand ? COLOR_LEFT_EMBER : COLOR_RIGHT_EMBER;
              spawnParticle(
                posX + (Math.random() - 0.5) * 0.4,
                0.6,
                STRIKE_Z + (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 5.5,
                Math.random() * 7.0 + 3.0,
                (Math.random() - 0.5) * 5.5,
                sparkColor,
                0.48 + Math.random() * 0.32
              );

              // High-Velocity Strike Trailing Embers arching upward over fallboard mirror
              if (vel >= 0.75) {
                spawnParticle(
                  posX + (Math.random() - 0.5) * 0.3,
                  0.75,
                  STRIKE_Z + 0.1,
                  (Math.random() - 0.5) * 2.4,
                  Math.random() * 5.2 + 3.8,
                  Math.random() * 2.0 - 1.0,
                  sparkColor,
                  0.44 + Math.random() * 0.3
                );
              }

              // Spawn Expanding Neon Shockwave Ring on Strike Line
              spawnShockwave(posX, isLeftHand);

              // Spawn Reflective Runway Floor Splash Ripple Ring
              spawnFloorRipple(posX, isLeftHand);
            }
          }
        } else {
          // Dispose group outside view window
          const group = noteGroupsRef.current.get(note.id);
          if (group) {
            scene.remove(group);
            group.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                  child.material.forEach((m) => m.dispose());
                } else {
                  child.material.dispose();
                }
              }
            });
            noteGroupsRef.current.delete(note.id);
          }
        }
      });

      // Include user-played keys and direct 3D touched keys in keyboard lighting
      const userKeys = userPlayedKeysRef.current;
      userKeys.forEach((p) => {
        if (!activeStrikingPitches.includes(p)) {
          activeStrikingPitches.push(p);
          activePitchHands.set(p, p < 60 ? 'left' : 'right');
        }
      });

      active3DPointersRef.current.forEach((p) => {
        if (!activeStrikingPitches.includes(p)) {
          activeStrikingPitches.push(p);
          activePitchHands.set(p, p < 60 ? 'left' : 'right');
        }
      });

      // Update 3D Piano Key Depressions, Mechanical Fulcrum Tilting, and Audio-Reactive Underglow
      keyMeshesRef.current.forEach((keyMesh, midi) => {
        const isDepressed = activeStrikingPitches.includes(midi);
        const baseY = keyBaseYRef.current.get(midi) || 0;
        const targetY = isDepressed ? baseY - 0.35 : baseY;
        const targetRotX = isDepressed ? 0.08 : 0; // Fulcrum mechanical downward tilt
        const lerpFactor = isDepressed ? 0.48 : 0.36; // Snappy attack, damped physical hammer recoil

        keyMesh.position.y += (targetY - keyMesh.position.y) * lerpFactor;
        keyMesh.rotation.x += (targetRotX - keyMesh.rotation.x) * lerpFactor;

        const currentDepression = Math.max(0, (baseY - keyMesh.position.y) / 0.35);
        if (currentDepression > 0.04) {
          activeDepressions.push({ pitch: midi, depth: currentDepression });
        }

        const mat = keyMesh.material as THREE.MeshStandardMaterial;
        if (isDepressed) {
          const hand = activePitchHands.get(midi) || (midi < 60 ? 'left' : 'right');
          mat.emissive.setHex(hand === 'left' ? 0xa855f7 : 0xf59e0b);
          mat.emissiveIntensity = 1.15;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0.0;
        }
      });

      // Dynamic Concert Rim Light Intensities
      let leftStrikes = 0;
      let rightStrikes = 0;
      activeStrikingPitches.forEach((p) => {
        const hand = activePitchHands.get(p) || (p < 60 ? 'left' : 'right');
        if (hand === 'left') leftStrikes++;
        else rightStrikes++;
      });

      if (violetLightRef.current) {
        const targetV = 3.5 + Math.min(6, leftStrikes * 1.4);
        violetLightRef.current.intensity += (targetV - violetLightRef.current.intensity) * 0.18;
      }
      if (amberLightRef.current) {
        const targetA = 3.5 + Math.min(6, rightStrikes * 1.4);
        amberLightRef.current.intensity += (targetA - amberLightRef.current.intensity) * 0.18;
      }

      // Dynamic Center Key Impact Specular Bounce Light Tracking Active Chords
      if (keyImpactLightRef.current) {
        if (activeStrikingPitches.length > 0) {
          const avgActiveX =
            activeStrikingPitches.reduce((acc, p) => acc + getNoteX(p), 0) / activeStrikingPitches.length;
          keyImpactLightRef.current.position.x += (avgActiveX - keyImpactLightRef.current.position.x) * 0.22;
          const targetColor = leftStrikes >= rightStrikes ? 0xa855f7 : 0xf59e0b;
          keyImpactLightRef.current.color.setHex(targetColor);
          const targetIntensity = 2.0 + Math.min(5.5, activeStrikingPitches.length * 1.1);
          keyImpactLightRef.current.intensity += (targetIntensity - keyImpactLightRef.current.intensity) * 0.25;
        } else {
          keyImpactLightRef.current.intensity += (0.4 - keyImpactLightRef.current.intensity) * 0.1;
        }
      }

      // Audio-Reactive Keybed Underglow Illumination (Gap beneath depressed keys)
      const underglowMetrics = calculateKeybedUnderglow(activeDepressions);
      const dominantHandColor = leftStrikes >= rightStrikes ? 0xa855f7 : 0xf59e0b;

      if (keybedUnderglowLightRef.current) {
        keybedUnderglowLightRef.current.color.setHex(dominantHandColor);
        keybedUnderglowLightRef.current.position.x +=
          (underglowMetrics.avgX - keybedUnderglowLightRef.current.position.x) * 0.24;
        keybedUnderglowLightRef.current.intensity +=
          (underglowMetrics.intensity - keybedUnderglowLightRef.current.intensity) * 0.22;
      }

      if (keybedUnderglowMeshRef.current) {
        const uMat = keybedUnderglowMeshRef.current.material as THREE.MeshBasicMaterial;
        uMat.color.setHex(dominantHandColor);
        const targetUnderglowOpacity = Math.min(0.68, underglowMetrics.intensity * 0.16);
        uMat.opacity += (targetUnderglowOpacity - uMat.opacity) * 0.24;
      }

      if (keybedApertureMeshRef.current) {
        const aMat = keybedApertureMeshRef.current.material as THREE.MeshBasicMaterial;
        aMat.color.setHex(dominantHandColor);
        const targetApertureOpacity = Math.min(0.85, underglowMetrics.intensity * 0.20);
        aMat.opacity += (targetApertureOpacity - aMat.opacity) * 0.25;
      }

      // Octave Marker Brass Plaques Dynamic Luminescence
      octavePlaquesRef.current.forEach((mesh, pitch) => {
        const pMat = mesh.material as THREE.MeshStandardMaterial;
        const isOctaveActive = activeStrikingPitches.includes(pitch);
        const targetEmissive = isOctaveActive ? 1.25 : 0.35;
        pMat.emissiveIntensity += (targetEmissive - pMat.emissiveIntensity) * 0.20;
      });

      // Update Shockwaves from Pre-Allocated Pool
      const shockwaves = shockwavesPoolRef.current;
      for (let i = 0; i < shockwaves.length; i++) {
        const s = shockwaves[i];
        if (!s.active) continue;
        s.life += 0.016;
        const progress = s.life / s.maxLife;

        if (progress >= 1.0) {
          s.active = false;
          s.mesh.visible = false;
          continue;
        }

        const scale = 0.3 + (s.maxRadius - 0.3) * progress;
        s.mesh.scale.set(scale, scale, 1);
        s.material.opacity = (1 - progress) * 0.85;
      }

      // Update Runway Reflective Floor Splash Ripples from Pre-Allocated Pool
      const ripples = ripplesPoolRef.current;
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i];
        if (!r.active) continue;
        r.life += 0.016;
        if (r.life >= r.maxLife) {
          r.active = false;
          r.mesh.visible = false;
          continue;
        }

        const wave = calculateRippleWave(r.life, r.maxLife, r.maxRadius);
        r.mesh.scale.set(wave.radius, wave.radius * 1.35, 1);
        r.mesh.position.set(r.initialX, -0.60, r.initialZ + wave.zOffset);
        r.material.opacity = wave.opacity;
      }

      // Update Cosmic Particles from Pre-Allocated Pool (Zero Allocation Churn)
      const particlePoints = particlePointsRef.current;
      if (particlePoints) {
        const posAttr = particlePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = particlePoints.geometry.getAttribute('color') as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        const colArray = colAttr.array as Float32Array;

        const delta = 0.016;
        let activeCount = 0;
        const pool = particlePoolRef.current;

        for (let i = 0; i < pool.length; i++) {
          const p = pool[i];
          if (!p.active) continue;
          p.life += delta;

          if (p.life >= p.maxLife) {
            p.active = false;
            continue;
          }

          p.position.x += p.velocity.x * delta;
          p.position.y += p.velocity.y * delta;
          p.position.z += p.velocity.z * delta;
          p.velocity.y -= 9.8 * delta;

          const idx = activeCount * 3;
          posArray[idx] = p.position.x;
          posArray[idx + 1] = p.position.y;
          posArray[idx + 2] = p.position.z;

          const fade = 1 - p.life / p.maxLife;
          colArray[idx] = p.color.r * fade;
          colArray[idx + 1] = p.color.g * fade;
          colArray[idx + 2] = p.color.b * fade;

          activeCount++;
          if (activeCount >= MAX_PARTICLES) break;
        }

        for (let i = activeCount * 3; i < posArray.length; i++) {
          posArray[i] = 0;
          colArray[i] = 0;
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      // Dynamic Starfield Twinkle Drift
      if (starsPointsRef.current) {
        starsPointsRef.current.rotation.y = Math.sin(curTime * 0.04) * 0.012;
      }

      // Dynamic Chord Detection & Active Octave framing (throttled to ~10Hz)
      if (timestamp - lastChordUpdate > 90) {
        lastChordUpdate = timestamp;
        if (activeStrikingPitches.length > 0) {
          const chord = detectChord(activeStrikingPitches);
          setActiveChordName(chord ? chord.name : null);
          setActiveNotesList(activeStrikingPitches);
        } else {
          setActiveChordName(null);
          setActiveNotesList([]);
        }
      }

      // Smooth Camera Positioning & Preset Navigation
      const avgX =
        activeStrikingPitches.length > 0
          ? activeStrikingPitches.reduce((acc, p) => acc + getNoteX(p), 0) / activeStrikingPitches.length
          : 0;

      const aspect = camera.aspect;
      const isTabletRatio = aspect < 1.85;
      const preset = cameraPresetRef.current;

      // Aspect-ratio responsive distance so 88 keys span 92-94% of horizontal width across any Android screen
      const soloCamZ = requiredDist * Math.cos((17 * Math.PI) / 180) + 3.4;
      const soloCamY = requiredDist * Math.sin((17 * Math.PI) / 180) + 2.5;

      let baseCamX = 0;
      let baseCamY = soloCamY;
      let baseCamZ = soloCamZ;
      let baseLookAtX = 0;
      let baseLookAtY = 7.5;
      let baseLookAtZ = -12;

      if (preset === 'pianist') {
        // First-Person Performer Seat View looking down keybed
        baseCamX = isDualViewRef.current ? 0 : avgX * 0.12;
        baseCamY = isDualViewRef.current ? 6.5 : 4.8;
        baseCamZ = isDualViewRef.current ? 14 : 12.0;
        baseLookAtX = baseCamX * 0.3;
        baseLookAtY = isDualViewRef.current ? 2.0 : 1.2;
        baseLookAtZ = -18;
      } else if (preset === 'topdown') {
        // Modern Top-Down Horizon Arcade View
        baseCamX = 0;
        baseCamY = isDualViewRef.current ? 28 : 34;
        baseCamZ = isDualViewRef.current ? 14 : 12;
        baseLookAtX = 0;
        baseLookAtY = 0;
        baseLookAtZ = -6;
      } else if (preset === 'cinematic') {
        // Floating Lissajous Glider View
        const swayX = Math.sin(curTime * 0.45) * 2.8;
        const swayY = Math.cos(curTime * 0.35) * 1.2;
        baseCamX = isDualViewRef.current ? 0 : swayX;
        baseCamY = (isDualViewRef.current ? 16 : soloCamY) + swayY;
        baseCamZ = isDualViewRef.current ? 20 : soloCamZ;
        baseLookAtX = isDualViewRef.current ? 0 : swayX * 0.25;
        baseLookAtY = isDualViewRef.current ? 6.5 : 7.2;
        baseLookAtZ = -12;
      } else {
        // Default 'grand' Perspective
        baseCamX = isDualViewRef.current ? 0 : avgX * 0.15 + cameraAngleRef.current.yaw * 16;
        baseCamY = isDualViewRef.current
          ? (isTabletRatio ? 18 : 16)
          : soloCamY;
        baseCamZ = isDualViewRef.current
          ? (isTabletRatio ? 22 : 20)
          : soloCamZ;
        baseLookAtX = isDualViewRef.current ? 0 : baseCamX * 0.25;
        baseLookAtY = isDualViewRef.current
          ? (isTabletRatio ? 7.5 : 6.0)
          : (aspect < 1.75 ? 13.5 : 11.2);
        baseLookAtZ = isDualViewRef.current ? -10 : -18;
      }

      const targetCamX = baseCamX;
      const targetCamY = (baseCamY + cameraAngleRef.current.pitch * 12) * cameraAngleRef.current.zoom;
      const targetCamZ = baseCamZ * cameraAngleRef.current.zoom;

      camera.position.x += (targetCamX - camera.position.x) * 0.08;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.lookAt(baseLookAtX, baseLookAtY, baseLookAtZ);

      // Pulse Strike Line Neon Glow
      if (strikeLineMeshRef.current) {
        const mat = strikeLineMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.88 + Math.sin(curTime * 8) * 0.1;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const noteGroups = noteGroupsRef.current;
    const activePointers = active3DPointersRef.current;
    const octavePlaques = octavePlaquesRef.current;
    const keyMeshes = keyMeshesRef.current;
    const keyBaseY = keyBaseYRef.current;
    const domElement = renderer.domElement;

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      activePointers.forEach((pitch) => {
        if (onUserReleaseKeyRef.current) {
          onUserReleaseKeyRef.current(pitch);
        }
      });
      activePointers.clear();

      noteGroups.forEach((group) => {
        scene.remove(group);
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });
      noteGroups.clear();

      // Dispose Shockwaves Pool
      shockwavesPool.forEach((s) => {
        scene.remove(s.mesh);
        s.material.dispose();
      });
      shockwavesPoolRef.current = [];
      shockwaveGeo.dispose();

      // Dispose Floor Ripples Pool
      ripplesPool.forEach((r) => {
        scene.remove(r.mesh);
        r.material.dispose();
      });
      ripplesPoolRef.current = [];
      rippleGeo.dispose();

      // Dispose Octave Plaques
      octavePlaques.forEach((mesh) => {
        scene.remove(mesh);
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      octavePlaques.clear();
      octavePlaqueGeo.dispose();
      plaqueTexturesToDispose.forEach((tex) => tex.dispose());

      // Dispose all 88 Piano Key meshes, geometries, and materials
      keyMeshes.forEach((mesh) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      keyMeshes.clear();
      keyBaseY.clear();

      // Dispose static scene geometries, textures, and materials to prevent WebGL GPU leaks
      const staticDisposables: { dispose: () => void }[] = [
        bedGeo, bedMat,
        underglowGeo, underglowMat,
        apertureGeo, apertureMat,
        starGeo, starMat,
        nebulaTex, nebulaGeo, nebulaMat,
        laneGeo, laneMat,
        strikeGeo, strikeMat,
        glowGeo, glowMat,
        feltGeo, feltMat,
        fallboardGeo, fallboardMat,
        crestGeo, crestMat,
        cheekGeo, cheekMat,
        brassGeo, brassMat,
        frontRailGeo, frontRailMat,
        frontBrassGeo, frontBrassMat,
        particleGeo, particleMat,
      ];
      staticDisposables.forEach((item) => {
        try {
          item.dispose();
        } catch {
          // ignore
        }
      });

      scene.clear();

      if (domElement && domElement.parentNode === container) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#040407]">
      {/* Three.js 3D WebGL Canvas with Drag Orbit */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        title="Click and drag to orbit 3D camera angle"
      />

      {/* Floating Chord Badge positioned safely below top header with safe area padding */}
      {activeChordName && (
        <div
          className="floating-chord-badge"
          style={{
            top: isZenMode ? '16px' : '64px',
            left: 'max(16px, env(safe-area-inset-left, 16px))',
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse" />
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">
            {activeChordName}
          </span>
          <div className="flex gap-1 ml-2">
            {activeNotesList.slice(0, 4).map((p) => (
              <span
                key={p}
                className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 text-purple-200 border border-white/10"
              >
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][p % 12]}
                {Math.floor(p / 12) - 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Interactive 3D Camera Controls & Angles Selector */}
      <div
        className="absolute flex items-center gap-1.5 z-30 pointer-events-auto"
        style={{
          top: isZenMode ? '12px' : '64px',
          right: 'max(16px, env(safe-area-inset-right, 16px))',
        }}
      >
        {/* Preset Selector Pill */}
        <div className="flex items-center p-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md shadow-lg text-[10px] font-medium">
          <button
            onClick={() => {
              triggerHaptic('light');
              setCameraPreset('grand');
            }}
            className={`px-2 py-0.5 rounded-full transition-all ${
              cameraPreset === 'grand'
                ? 'bg-purple-600 text-white font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Grand Perspective 3D"
          >
            Grand
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setCameraPreset('pianist');
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
              cameraPreset === 'pianist'
                ? 'bg-purple-600 text-white font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Pianist First-Person POV"
          >
            <Eye className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">POV</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setCameraPreset('topdown');
            }}
            className={`px-2 py-0.5 rounded-full transition-all ${
              cameraPreset === 'topdown'
                ? 'bg-purple-600 text-white font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Top-Down Horizon"
          >
            Top-Down
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setCameraPreset('cinematic');
            }}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
              cameraPreset === 'cinematic'
                ? 'bg-purple-600 text-white font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Cinematic Orbit Glider"
          >
            <Compass className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Orbit</span>
          </button>
        </div>

        {/* Orbit / Zoom Reset Pill */}
        <button
          onClick={() => {
            triggerHaptic('light');
            cameraAngleRef.current = { yaw: 0, pitch: 0, zoom: 1.0 };
            setCameraPreset('grand');
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-zinc-400 hover:text-white bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-md shadow-md transition-all active:scale-95"
          title="Reset camera orientation and zoom"
        >
          <Camera className="w-3 h-3 text-purple-400" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Docked 3D Transport Controls in Solo 3D Mode */}
      {transportControls && !isZenMode && (
        <div
          className="absolute z-30 pointer-events-auto transition-all duration-300"
          style={{
            left: 'max(16px, env(safe-area-inset-left, 16px))',
            bottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
          }}
        >
          {transportControls}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { NoteEvent, HandType } from '../types';
import { detectChord } from '../utils/chordDetector';
import { triggerHaptic } from '../utils/haptics';
import { Camera, Eye, Compass } from 'lucide-react';

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

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: THREE.Vector2;
  life: number;
  maxLife: number;
}

interface Shockwave {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxRadius: number;
}

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
  const particlesRef = useRef<Particle[]>([]);
  const particlePointsRef = useRef<THREE.Points | null>(null);
  const strikeLineMeshRef = useRef<THREE.Mesh | null>(null);
  const starsPointsRef = useRef<THREE.Points | null>(null);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const violetLightRef = useRef<THREE.PointLight | null>(null);
  const amberLightRef = useRef<THREE.PointLight | null>(null);
  const keyImpactLightRef = useRef<THREE.PointLight | null>(null);

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

  // Time & strike constants
  const NOTE_FALL_SPEED = 14; // units per second
  const STRIKE_Z = 0; // Strike line Z position
  const VISIBLE_WINDOW = 5.5; // Look ahead in seconds (extended majestic concert vista)
  const KEY_MIN_MIDI = 21; // A0
  const KEY_MAX_MIDI = 108; // C8

  // Helper to determine key X coordinate
  const getNoteX = (pitch: number): number => {
    return (pitch - 64.5) * 0.62;
  };

  const isBlackKey = (pitch: number) => [1, 3, 6, 8, 10].includes(pitch % 12);

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
    scene.fog = new THREE.FogExp2(0x040407, 0.013);
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
        // Violet star
        starColors[i * 3] = 0.8;
        starColors[i * 3 + 1] = 0.6;
        starColors[i * 3 + 2] = 1.0;
      } else if (tint < 0.75) {
        // Warm gold star
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.82;
        starColors[i * 3 + 2] = 0.45;
      } else {
        // Diamond cyan/white star
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

    [24, 36, 48, 60, 72, 84, 96].forEach((midi) => {
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

    // Particle Burst System Setup (Sparks & Fireworks)
    const maxParticles = 900;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(maxParticles * 3);
    const particleColors = new Float32Array(maxParticles * 3);

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

    // Shockwave Ring Shared Geometry & Material Template
    const shockwaveGeo = new THREE.RingGeometry(0.25, 0.45, 24);
    shockwaveGeo.rotateX(-Math.PI / 2);

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

      const keyMeshes = Array.from(keyMeshesRef.current.values());
      const hits = raycaster.intersectObjects(keyMeshes, false);
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

        // Immediate visual shockwave on the struck 3D key
        const posX = getNoteX(keyHit.pitch);
        const isLeft = keyHit.pitch < 60;
        if (shockwavesRef.current.length < 24) {
          const sMat = new THREE.MeshBasicMaterial({
            color: isLeft ? 0xc084fc : 0xfde047,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          });
          const sMesh = new THREE.Mesh(shockwaveGeo, sMat);
          sMesh.position.set(posX, 0.12, STRIKE_Z);
          scene.add(sMesh);
          shockwavesRef.current.push({
            mesh: sMesh,
            life: 0,
            maxLife: 0.38,
            maxRadius: 2.2,
          });
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

    const animate = (timestamp: number) => {
      animId = requestAnimationFrame(animate);

      const curTime = currentTimeRef.current;
      const activeStrikingPitches: number[] = [];
      const activePitchHands = new Map<number, 'left' | 'right'>();

      // Update Falling Luminous Crystal Notes with Leading Strike Caps
      const notesToRender = filteredNotesRef.current;
      notesToRender.forEach((note) => {
        const timeUntilStrike = note.startTime - curTime;
        const timeSinceEnd = curTime - (note.startTime + note.duration);

        if (timeUntilStrike <= VISIBLE_WINDOW && timeSinceEnd <= 0.25) {
          let group = noteGroupsRef.current.get(note.id);
          const isLeftHand = note.hand === 'left';
          const noteLength = Math.max(0.7, note.duration * NOTE_FALL_SPEED);

          if (!group) {
            group = new THREE.Group();
            const width = isBlackKey(note.pitch) ? 0.44 : 0.56;

            // 1. Crystal Note Body Mesh
            const bodyGeo = new THREE.BoxGeometry(width, 0.38, 1);
            const color = isLeftHand ? 0xa855f7 : 0xf59e0b;
            const emissiveColor = isLeftHand ? 0x9333ea : 0xd97706;

            const bodyMat = new THREE.MeshStandardMaterial({
              color,
              emissive: emissiveColor,
              emissiveIntensity: 0.65,
              roughness: 0.12,
              metalness: 0.42,
              transparent: true,
              opacity: 0.94,
            });

            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.name = 'body';
            group.add(bodyMesh);

            // 2. Luminous Leading Strike Cap (Hot Neon Front Lip)
            const capGeo = new THREE.BoxGeometry(width + 0.04, 0.44, 0.3);
            const capMat = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.96,
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
          }
          if (capMesh) {
            // Position cap right at the leading strike face of the note
            capMesh.position.set(0, 0.02, noteLength / 2 - 0.15);
          }

          const posX = getNoteX(note.pitch);
          const posZ = STRIKE_Z - timeUntilStrike * NOTE_FALL_SPEED - noteLength / 2;
          group.position.set(posX, 0.5, posZ);

          // Check if actively striking the line
          const isStriking = curTime >= note.startTime && curTime <= note.startTime + note.duration;
          if (isStriking) {
            activeStrikingPitches.push(note.pitch);
            activePitchHands.set(note.pitch, note.hand);

            if (bodyMesh) {
              const bMat = bodyMesh.material as THREE.MeshStandardMaterial;
              bMat.emissiveIntensity = 1.6; // Radiant strike bloom
            }

            // Cosmic particle burst & shockwaves
            if (Math.random() < 0.45) {
              const sparkColor = isLeftHand ? new THREE.Color(0xd8b4fe) : new THREE.Color(0xfef08a);
              particlesRef.current.push({
                position: new THREE.Vector3(
                  posX + (Math.random() - 0.5) * 0.4,
                  0.6,
                  STRIKE_Z + (Math.random() - 0.5) * 0.3
                ),
                velocity: new THREE.Vector3(
                  (Math.random() - 0.5) * 5.5,
                  Math.random() * 7.0 + 3.0,
                  (Math.random() - 0.5) * 5.5
                ),
                color: sparkColor,
                size: new THREE.Vector2(0.4, 0.4),
                life: 0,
                maxLife: 0.48 + Math.random() * 0.32,
              });

              // Spawn Expanding Neon Shockwave Ring on Strike Line
              if (shockwavesRef.current.length < 24) {
                const sMat = new THREE.MeshBasicMaterial({
                  color: isLeftHand ? 0xc084fc : 0xfde047,
                  transparent: true,
                  opacity: 0.85,
                  side: THREE.DoubleSide,
                  blending: THREE.AdditiveBlending,
                });
                const sMesh = new THREE.Mesh(shockwaveGeo, sMat);
                sMesh.position.set(posX, 0.12, STRIKE_Z);
                scene.add(sMesh);
                shockwavesRef.current.push({
                  mesh: sMesh,
                  life: 0,
                  maxLife: 0.38,
                  maxRadius: 2.4,
                });
              }
            }
          } else {
            if (bodyMesh) {
              const bMat = bodyMesh.material as THREE.MeshStandardMaterial;
              bMat.emissiveIntensity = 0.65;
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

      // Update 3D Piano Key Depressions, Mechanical Fulcrum Tilting, and Illumination
      keyMeshesRef.current.forEach((keyMesh, midi) => {
        const isDepressed = activeStrikingPitches.includes(midi);
        const baseY = keyBaseYRef.current.get(midi) || 0;
        const targetY = isDepressed ? baseY - 0.35 : baseY;
        const targetRotX = isDepressed ? 0.08 : 0; // Fulcrum mechanical downward tilt
        const lerpFactor = isDepressed ? 0.48 : 0.36; // Snappy attack, damped physical hammer recoil

        keyMesh.position.y += (targetY - keyMesh.position.y) * lerpFactor;
        keyMesh.rotation.x += (targetRotX - keyMesh.rotation.x) * lerpFactor;

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

      // Update Shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const s = shockwavesRef.current[i];
        s.life += 0.016;
        const progress = s.life / s.maxLife;

        if (progress >= 1.0) {
          scene.remove(s.mesh);
          (s.mesh.material as THREE.Material).dispose();
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        const scale = 0.3 + (s.maxRadius - 0.3) * progress;
        s.mesh.scale.set(scale, scale, 1);
        const mat = s.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - progress) * 0.85;
      }

      // Update Cosmic Particles
      const particlePoints = particlePointsRef.current;
      if (particlePoints) {
        const posAttr = particlePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = particlePoints.geometry.getAttribute('color') as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        const colArray = colAttr.array as Float32Array;

        const delta = 0.016;
        let activeCount = 0;

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life += delta;

          if (p.life >= p.maxLife) {
            particlesRef.current.splice(i, 1);
            continue;
          }

          p.position.addScaledVector(p.velocity, delta);
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
          if (activeCount >= maxParticles) break;
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
      const fovRad = (48 * Math.PI) / 180;
      const tanHalfFov = Math.tan(fovRad / 2);
      const targetKeyboardSpan = 0.93; // 93% width utilization
      const requiredDist = 28 / (targetKeyboardSpan * aspect * tanHalfFov);
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
    const shockwaves = shockwavesRef.current;
    const activePointers = active3DPointersRef.current;
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

      shockwaves.forEach((s) => {
        scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
      });
      shockwaves.length = 0;

      shockwaveGeo.dispose();

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

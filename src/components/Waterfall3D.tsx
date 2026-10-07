import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { NoteEvent, HandType } from '../types';
import { detectChord } from '../utils/chordDetector';
import { triggerHaptic } from '../utils/haptics';
import { Camera } from 'lucide-react';

interface Waterfall3DProps {
  notes: NoteEvent[];
  currentTime: number;
  isPlaying: boolean;
  activeHand: HandType;
  userPlayedKeys?: number[];
  speed?: number; // visual waterfall speed
  isDualView?: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: THREE.Vector2;
  life: number;
  maxLife: number;
}

export const Waterfall3D: React.FC<Waterfall3DProps> = ({
  notes,
  currentTime,
  activeHand,
  userPlayedKeys = [],
  isDualView = false,
  isZenMode = false,
  onToggleZenMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeChordName, setActiveChordName] = useState<string | null>(null);
  const [activeNotesList, setActiveNotesList] = useState<number[]>([]);

  // 3D Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const keyMeshesRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const keyBaseYRef = useRef<Map<number, number>>(new Map());
  const noteMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const particlePointsRef = useRef<THREE.Points | null>(null);
  const strikeLineMeshRef = useRef<THREE.Mesh | null>(null);

  // Synchronous refs for 60fps render loop to avoid effect re-allocations
  const currentTimeRef = useRef(currentTime);
  const notesRef = useRef(notes);
  const activeHandRef = useRef(activeHand);
  const userPlayedKeysRef = useRef(userPlayedKeys);
  const isDualViewRef = useRef(isDualView);

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
  const VISIBLE_WINDOW = 4.5; // Look ahead in seconds
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
    noteMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    noteMeshesRef.current.clear();
  }, [notes, activeHand]);

  // Initialize Three.js Scene ONCE on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    const initialCamY = isDualViewRef.current ? 22 : 14.5;
    const initialCamZ = isDualViewRef.current ? 28 : 21.5;
    camera.position.set(0, initialCamY, initialCamZ);
    if (isDualViewRef.current) {
      camera.lookAt(0, -1, -12);
    } else {
      camera.lookAt(0, 1.0, -6);
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
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient and Directional Lighting
    const ambientLight = new THREE.AmbientLight(0x221c35, 2.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(10, 30, 20);
    scene.add(keyLight);

    // Violet atmospheric rim light (Left Hand)
    const violetLight = new THREE.PointLight(0xa855f7, 4.5, 55);
    violetLight.position.set(-18, 8, 4);
    scene.add(violetLight);

    // Amber atmospheric rim light (Right Hand)
    const amberLight = new THREE.PointLight(0xf59e0b, 4.5, 55);
    amberLight.position.set(18, 8, 4);
    scene.add(amberLight);

    // Ground reflective piano bed plane
    const bedGeo = new THREE.PlaneGeometry(75, 85);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x07080f,
      roughness: 0.25,
      metalness: 0.85,
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.set(0, -0.6, -25);
    scene.add(bedMesh);

    // Glowing Laser Strike Line
    const strikeGeo = new THREE.BoxGeometry(56, 0.2, 0.35);
    const strikeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const strikeLine = new THREE.Mesh(strikeGeo, strikeMat);
    strikeLine.position.set(0, 0.1, STRIKE_Z);
    scene.add(strikeLine);
    strikeLineMeshRef.current = strikeLine;

    // Strike line halo neon glow ribbon
    const glowGeo = new THREE.PlaneGeometry(58, 2.4);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.set(0, 0.05, STRIKE_Z + 0.8);
    scene.add(glowMesh);

    // Build 3D Piano Keys on the Strike Plane
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
        color: black ? 0x141416 : 0xf2f2f4,
        roughness: black ? 0.35 : 0.15,
        metalness: black ? 0.4 : 0.1,
      });

      const keyMesh = new THREE.Mesh(keyGeo, keyMat);
      const posX = getNoteX(midi);
      keyMesh.position.set(posX, yOffset, STRIKE_Z + 3.4 + zOffset);
      keyGroup.add(keyMesh);

      keyMeshesRef.current.set(midi, keyMesh);
      keyBaseYRef.current.set(midi, yOffset);
    }

    // Particle Burst System Setup
    const maxParticles = 600;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(maxParticles * 3);
    const particleColors = new Float32Array(maxParticles * 3);

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);
    particlePointsRef.current = particlePoints;

    // Double-Tap on Canvas Gesture Detection (for instant Immersive Zen Mode toggle)
    let lastTapTime = 0;
    let lastTapPos = { x: 0, y: 0 };
    const TAP_THRESHOLD_MS = 320;
    const TAP_DISTANCE_THRESHOLD = 25; // px

    // Pointer Drag Rotation & Double-Tap Handlers
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.yaw += dx * 0.005;
      cameraAngleRef.current.pitch = Math.max(-0.25, Math.min(0.35, cameraAngleRef.current.pitch + dy * 0.004));
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;

      // Check if tap was on the 3D waterfall canvas container
      const target = e.target as HTMLElement | null;
      if (container.contains(target)) {
        const now = performance.now();
        const timeDiff = now - lastTapTime;
        const dx = Math.abs(e.clientX - lastTapPos.x);
        const dy = Math.abs(e.clientY - lastTapPos.y);

        if (timeDiff < TAP_THRESHOLD_MS && dx < TAP_DISTANCE_THRESHOLD && dy < TAP_DISTANCE_THRESHOLD) {
          // Double-tap gesture on canvas confirmed!
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
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('dblclick', handleDblClick);

    // Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Continuous 60fps Render Loop
    let animId: number;
    let lastChordUpdate = 0;

    const animate = (timestamp: number) => {
      animId = requestAnimationFrame(animate);

      const curTime = currentTimeRef.current;
      const activeStrikingPitches: number[] = [];
      const activePitchHands = new Map<number, 'left' | 'right'>();

      // Update Falling Notes
      const notesToRender = filteredNotesRef.current;
      notesToRender.forEach((note) => {
        const timeUntilStrike = note.startTime - curTime;
        const timeSinceEnd = curTime - (note.startTime + note.duration);

        if (timeUntilStrike <= VISIBLE_WINDOW && timeSinceEnd <= 0.25) {
          let mesh = noteMeshesRef.current.get(note.id);
          const isLeftHand = note.hand === 'left';
          const noteLength = Math.max(0.65, note.duration * NOTE_FALL_SPEED);

          if (!mesh) {
            const width = isBlackKey(note.pitch) ? 0.44 : 0.56;
            const geo = new THREE.BoxGeometry(width, 0.42, 1);
            const color = isLeftHand ? 0xa855f7 : 0xf59e0b;
            const emissiveColor = isLeftHand ? 0x9333ea : 0xd97706;

            const mat = new THREE.MeshStandardMaterial({
              color,
              emissive: emissiveColor,
              emissiveIntensity: 0.65,
              roughness: 0.15,
              metalness: 0.35,
            });

            mesh = new THREE.Mesh(geo, mat);
            scene.add(mesh);
            noteMeshesRef.current.set(note.id, mesh);
          }

          mesh.scale.set(1, 1, noteLength);
          const posX = getNoteX(note.pitch);
          const posZ = STRIKE_Z - timeUntilStrike * NOTE_FALL_SPEED - noteLength / 2;
          mesh.position.set(posX, 0.5, posZ);

          // Check if actively striking the line
          const isStriking = curTime >= note.startTime && curTime <= note.startTime + note.duration;
          if (isStriking) {
            activeStrikingPitches.push(note.pitch);
            activePitchHands.set(note.pitch, note.hand);

            // Cosmic particle burst
            if (Math.random() < 0.4) {
              const sparkColor = isLeftHand ? new THREE.Color(0xd8b4fe) : new THREE.Color(0xfef08a);
              particlesRef.current.push({
                position: new THREE.Vector3(
                  posX + (Math.random() - 0.5) * 0.4,
                  0.6,
                  STRIKE_Z + (Math.random() - 0.5) * 0.3
                ),
                velocity: new THREE.Vector3(
                  (Math.random() - 0.5) * 5.0,
                  Math.random() * 6.5 + 2.5,
                  (Math.random() - 0.5) * 5.0
                ),
                color: sparkColor,
                size: new THREE.Vector2(0.35, 0.35),
                life: 0,
                maxLife: 0.45 + Math.random() * 0.3,
              });
            }
          }
        } else {
          // Dispose mesh outside view window
          const mesh = noteMeshesRef.current.get(note.id);
          if (mesh) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
            noteMeshesRef.current.delete(note.id);
          }
        }
      });

      // Include user-played keys in keyboard lighting
      const userKeys = userPlayedKeysRef.current;
      userKeys.forEach((p) => {
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

        keyMesh.position.y += (targetY - keyMesh.position.y) * 0.42;
        keyMesh.rotation.x += (targetRotX - keyMesh.rotation.x) * 0.42;

        const mat = keyMesh.material as THREE.MeshStandardMaterial;
        if (isDepressed) {
          const hand = activePitchHands.get(midi) || (midi < 60 ? 'left' : 'right');
          mat.emissive.setHex(hand === 'left' ? 0xa855f7 : 0xf59e0b);
          mat.emissiveIntensity = 0.95;
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0.0;
        }
      });

      // Update Particle System
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

      // Smooth camera position with user drag angle and subtle focus towards active notes
      const avgX =
        activeStrikingPitches.length > 0
          ? activeStrikingPitches.reduce((acc, p) => acc + getNoteX(p), 0) / activeStrikingPitches.length
          : 0;

      // Freeze dynamic camera sway in Dual View to keep 3D notes permanently aligned with 2D piano keys below
      const targetCamX = isDualViewRef.current
        ? 0
        : avgX * 0.2 + cameraAngleRef.current.yaw * 16;
      const targetCamY = isDualViewRef.current
        ? (22 + cameraAngleRef.current.pitch * 14) * cameraAngleRef.current.zoom
        : (14.5 + cameraAngleRef.current.pitch * 12) * cameraAngleRef.current.zoom;
      const targetCamZ = (isDualViewRef.current ? 28 : 21.5) * cameraAngleRef.current.zoom;

      camera.position.x += (targetCamX - camera.position.x) * (isDualViewRef.current ? 0.2 : 0.08);
      camera.position.y += (targetCamY - camera.position.y) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      if (isDualViewRef.current) {
        camera.lookAt(0, -1, -12);
      } else {
        camera.lookAt(targetCamX * 0.25, 1.0, -6);
      }

      // Pulse strike line neon glow
      if (strikeLineMeshRef.current) {
        const mat = strikeLineMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.85 + Math.sin(curTime * 8) * 0.12;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const noteMeshes = noteMeshesRef.current;
    const domElement = renderer.domElement;

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('resize', handleResize);

      noteMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      noteMeshes.clear();

      if (domElement && domElement.parentNode === container) {
        container.removeChild(domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#050508]">
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

      {/* Subtle 3D Camera Orbit & Zoom Reset Pill */}
      <div
        className="absolute flex items-center gap-2 z-30 pointer-events-auto"
        style={{
          top: isZenMode ? '12px' : '64px',
          right: 'max(16px, env(safe-area-inset-right, 16px))',
        }}
      >
        <button
          onClick={() => {
            cameraAngleRef.current = { yaw: 0, pitch: 0, zoom: 1.0 };
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-400 hover:text-white bg-black/40 hover:bg-black/60 border border-white/10 backdrop-blur-md shadow-md transition-all active:scale-95"
          title="Reset camera orbit and zoom (or double-click canvas)"
        >
          <Camera className="w-3 h-3 text-purple-400" />
          <span className="hidden sm:inline">Reset 3D</span>
        </button>
      </div>
    </div>
  );
};

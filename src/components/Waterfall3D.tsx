import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { NoteEvent, HandType } from '../types';
import { detectChord } from '../utils/chordDetector';

interface Waterfall3DProps {
  notes: NoteEvent[];
  currentTime: number;
  isPlaying: boolean;
  activeHand: HandType;
  onKeyTrigger?: (midi: number) => void;
  speed?: number; // visual waterfall speed
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
  onKeyTrigger,
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

  // Time & strike constants
  const NOTE_FALL_SPEED = 14; // units per second
  const STRIKE_Z = 0; // Strike line Z position
  const VISIBLE_WINDOW = 4.5; // Look ahead in seconds
  const KEY_MIN_MIDI = 21; // A0
  const KEY_MAX_MIDI = 108; // C8

  // Helper to determine key X coordinate
  // Mapping 88 keys across a standardized X axis
  const getNoteX = (pitch: number): number => {
    // Normalizing pitch 21 to 108 into range approx -26 to +26
    return (pitch - 64.5) * 0.62;
  };

  const isBlackKey = (pitch: number) => [1, 3, 6, 8, 10].includes(pitch % 12);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    // Subtle atmospheric dark fog
    scene.fog = new THREE.FogExp2(0x050508, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    // Dynamic perspective viewing angle: elevated and looking down towards the strike line
    camera.position.set(0, 22, 28);
    camera.lookAt(0, -1, -12);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
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
    const violetLight = new THREE.PointLight(0xa855f7, 4.0, 50);
    violetLight.position.set(-18, 8, 4);
    scene.add(violetLight);

    // Amber atmospheric rim light (Right Hand)
    const amberLight = new THREE.PointLight(0xf59e0b, 4.0, 50);
    amberLight.position.set(18, 8, 4);
    scene.add(amberLight);

    // Ground reflective piano bed plane
    const bedGeo = new THREE.PlaneGeometry(70, 80);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x07080f,
      roughness: 0.25,
      metalness: 0.8,
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
    const glowGeo = new THREE.PlaneGeometry(58, 2.2);
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
      const width = black ? 0.42 : 0.58;
      const length = black ? 4.2 : 6.8;
      const height = black ? 0.85 : 0.7;
      const zOffset = black ? -1.2 : 0;
      const yOffset = black ? 0.3 : 0;

      const keyGeo = new THREE.BoxGeometry(width, height, length);
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
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);
    particlePointsRef.current = particlePoints;

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

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Filter notes based on active hand
  const filteredNotes = useMemo(() => {
    if (activeHand === 'both') return notes;
    return notes.filter((n) => n.hand === activeHand);
  }, [notes, activeHand]);

  // Main Render & Physics Simulation Loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!scene || !camera || !renderer) return;

      const activeStrikingPitches: number[] = [];

      // Update Falling Notes
      filteredNotes.forEach((note) => {
        const timeUntilStrike = note.startTime - currentTime;
        const timeSinceEnd = currentTime - (note.startTime + note.duration);

        // Check if note is visible inside our waterfall window
        if (timeUntilStrike <= VISIBLE_WINDOW && timeSinceEnd <= 0.2) {
          let mesh = noteMeshesRef.current.get(note.id);
          const isLeftHand = note.hand === 'left';
          const noteLength = Math.max(0.6, note.duration * NOTE_FALL_SPEED);

          if (!mesh) {
            // Note bar 3D pill geometry with rounded edges
            const width = isBlackKey(note.pitch) ? 0.44 : 0.56;
            const geo = new THREE.BoxGeometry(width, 0.4, 1);
            // Violet for Left Hand, Warm Amber for Right Hand
            const color = isLeftHand ? 0xa855f7 : 0xf59e0b;
            const emissiveColor = isLeftHand ? 0x9333ea : 0xd97706;

            const mat = new THREE.MeshStandardMaterial({
              color: color,
              emissive: emissiveColor,
              emissiveIntensity: 0.65,
              roughness: 0.15,
              metalness: 0.3,
            });

            mesh = new THREE.Mesh(geo, mat);
            scene.add(mesh);
            noteMeshesRef.current.set(note.id, mesh);
          }

          // Scale length to note duration
          mesh.scale.set(1, 1, noteLength);

          // Position: X mapped to key, Z approaching strike line from negative Z (distance)
          const posX = getNoteX(note.pitch);
          const posZ = STRIKE_Z - timeUntilStrike * NOTE_FALL_SPEED - noteLength / 2;
          const posY = 0.5;

          mesh.position.set(posX, posY, posZ);

          // Check if actively striking the line
          const isStriking = currentTime >= note.startTime && currentTime <= note.startTime + note.duration;
          if (isStriking) {
            activeStrikingPitches.push(note.pitch);
            if (onKeyTrigger) onKeyTrigger(note.pitch);

            // Trigger cosmic particle burst
            if (Math.random() < 0.35) {
              const sparkColor = isLeftHand ? new THREE.Color(0xd8b4fe) : new THREE.Color(0xfef08a);
              particlesRef.current.push({
                position: new THREE.Vector3(posX + (Math.random() - 0.5) * 0.4, 0.6, STRIKE_Z + (Math.random() - 0.5) * 0.3),
                velocity: new THREE.Vector3(
                  (Math.random() - 0.5) * 4.5,
                  Math.random() * 6.5 + 2,
                  (Math.random() - 0.5) * 4.5
                ),
                color: sparkColor,
                size: new THREE.Vector2(0.3, 0.3),
                life: 0,
                maxLife: 0.45 + Math.random() * 0.3,
              });
            }
          }
        } else {
          // Dispose mesh if past window
          const mesh = noteMeshesRef.current.get(note.id);
          if (mesh) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
            noteMeshesRef.current.delete(note.id);
          }
        }
      });

      // Update 3D Piano Key Depressions and LED status
      keyMeshesRef.current.forEach((keyMesh, midi) => {
        const isDepressed = activeStrikingPitches.includes(midi);
        const baseY = keyBaseYRef.current.get(midi) || 0;
        const targetY = isDepressed ? baseY - 0.38 : baseY;

        // Smooth spring physics interpolation
        keyMesh.position.y += (targetY - keyMesh.position.y) * 0.35;

        // Key illumination when depressed
        const mat = keyMesh.material as THREE.MeshStandardMaterial;
        if (isDepressed) {
          const isLh = notes.find(n => n.pitch === midi && n.startTime <= currentTime && n.startTime + n.duration >= currentTime)?.hand === 'left';
          mat.emissive.setHex(isLh ? 0xa855f7 : 0xf59e0b);
          mat.emissiveIntensity = 0.9;
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

        const delta = 0.016; // approx 60fps delta
        let activeCount = 0;

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life += delta;

          if (p.life >= p.maxLife) {
            particlesRef.current.splice(i, 1);
            continue;
          }

          // Physics integration: velocity + gravity
          p.position.addScaledVector(p.velocity, delta);
          p.velocity.y -= 9.8 * delta; // gravity

          const idx = activeCount * 3;
          posArray[idx] = p.position.x;
          posArray[idx + 1] = p.position.y;
          posArray[idx + 2] = p.position.z;

          const fade = 1 - p.life / p.maxLife;
          colArray[idx] = p.color.r * fade;
          colArray[idx + 1] = p.color.g * fade;
          colArray[idx + 2] = p.color.b * fade;

          activeCount++;
          if (activeCount >= 600) break;
        }

        // Hide remaining vertices
        for (let i = activeCount * 3; i < posArray.length; i++) {
          posArray[i] = 0;
          colArray[i] = 0;
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      // Dynamic Chord Detection & Active Octave framing
      if (activeStrikingPitches.length > 0) {
        const chord = detectChord(activeStrikingPitches);
        setActiveChordName(chord ? chord.name : null);
        setActiveNotesList(activeStrikingPitches);

        // Smooth camera subtle dynamic focus towards average active note X
        const avgX = activeStrikingPitches.reduce((acc, p) => acc + getNoteX(p), 0) / activeStrikingPitches.length;
        camera.position.x += (avgX * 0.25 - camera.position.x) * 0.04;
      } else {
        setActiveChordName(null);
        setActiveNotesList([]);
        camera.position.x += (0 - camera.position.x) * 0.04;
      }

      // Pulse strike line neon glow
      if (strikeLineMeshRef.current) {
        const mat = strikeLineMeshRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.85 + Math.sin(currentTime * 8) * 0.12;
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const noteMeshes = noteMeshesRef.current;
    return () => {
      cancelAnimationFrame(animId);
      // Clean up note meshes on unmount
      noteMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      noteMeshes.clear();
    };
  }, [filteredNotes, currentTime, onKeyTrigger, notes]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#050508]">
      {/* Three.js 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Chord Badge over Strike Line */}
      {activeChordName && (
        <div
          className="floating-chord-badge"
          style={{
            top: '32%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
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

      {/* Hand Legend Pill (Violet / Amber) */}
      <div className="absolute top-6 left-6 flex items-center gap-3 z-30 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#120f24]/80 border border-purple-500/30 backdrop-blur-md shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
          <span className="text-xs font-semibold text-purple-200">Left Hand (Violet)</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e1708]/80 border border-amber-500/30 backdrop-blur-md shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          <span className="text-xs font-semibold text-amber-200">Right Hand (Amber)</span>
        </div>
      </div>
    </div>
  );
};

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.ts';
import {
  FRETBOARD_CONFIG,
  getFretCenterPosition,
  getFretXPosition,
  getStringYPosition,
  STRING_VISUALS,
} from './types.ts';

export interface FretboardSceneProps {
  className?: string;
}

/**
 * Cena 3D Principal Estilo Rocksmith.
 * Exibe o braço de violão 3D autêntico com 15 trastes, 6 cordas coloridas neon,
 * marcadores de madrepérola, túnel da Highway com as notas se aproximando,
 * alvo iluminado na nota ativa e partículas de impacto.
 */
export function FretboardScene({
  className = 'absolute inset-0 w-full h-full',
}: FretboardSceneProps) {
  return (
    <div className={`relative ${className} pointer-events-none select-none overflow-hidden bg-[#07090e]`}>
      <Canvas
        camera={{
          position: [0.2, 2.6, 7.8],
          fov: 46,
          near: 0.1,
          far: 60,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#080a11']} />
        <fog attach="fog" args={['#080a11', 14, 38]} />

        {/* Controlador cinemático de câmera */}
        <SceneController />

        {/* Iluminação de Estúdio / Palco Rocksmith */}
        <ambientLight intensity={0.65} />
        <directionalLight
          position={[0, 9, 8]}
          intensity={1.6}
          color="#ffffff"
        />
        {/* Luzes laterais de recorte neon */}
        <pointLight position={[-9, 3.5, 2]} intensity={2.2} color="#06b6d4" distance={20} />
        <pointLight position={[9, 3.5, 2]} intensity={2.2} color="#ec4899" distance={20} />
        <pointLight position={[0, -2, 4]} intensity={1.0} color="#3b82f6" distance={15} />

        {/* Pista 3D (Highway) em profundidade */}
        <HighwayGrid />

        {/* Braço do Violão 3D, trastes e inlays */}
        <FretboardBody />

        {/* 6 Cordas com cores do Rocksmith e física de vibração */}
        <GuitarStrings />

        {/* Fila 3D de notas da lição se aproximando do braço */}
        <LessonHighwayNotes />

        {/* Alvo Luminoso na nota ativa atual */}
        <ActiveTargetIndicator />

        {/* Efeito de partículas e flashes de impacto */}
        <HitEffectsManager />
      </Canvas>
    </div>
  );
}

/**
 * Positions and aims the camera with a slight dynamic lean towards the active fret zone.
 */
function SceneController() {
  useFrame(({ camera }) => {
    // Subtle lookAt target centered right at the fretboard strike zone
    camera.lookAt(new THREE.Vector3(0.2, 0.1, -0.6));
  });
  return null;
}

/**
 * 3D Highway Grid extending deep into the background (Z < 0).
 */
function HighwayGrid() {
  const { totalFrets, neckLength } = FRETBOARD_CONFIG;
  const highwayDepth = 28.0;

  // Longitudinal guidelines corresponding to each fret column
  const fretLines = useMemo(() => {
    const lines: number[] = [];
    for (let f = 0; f <= totalFrets; f++) {
      lines.push(getFretXPosition(f, totalFrets, neckLength));
    }
    return lines;
  }, [totalFrets, neckLength]);

  return (
    <group position={[0, -0.05, -highwayDepth / 2]}>
      {/* Highway Ground Plane with subtle dark gradient reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[neckLength + 2.0, highwayDepth]} />
        <meshStandardMaterial
          color="#070b14"
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Vertical Fret Guidelines extending down the highway */}
      {fretLines.map((xPos, idx) => (
        <mesh
          key={`grid-line-${idx}`}
          position={[xPos, 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.02, highwayDepth]} />
          <meshBasicMaterial
            color="#334155"
            transparent
            opacity={0.35}
          />
        </mesh>
      ))}

      {/* Lateral Beat/Measure Lines moving with depth */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`beat-bar-${i}`}
          position={[0, 0.02, (i - 3.5) * 3.5]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[neckLength, 0.03]} />
          <meshBasicMaterial
            color="#475569"
            transparent
            opacity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 3D Fretboard Wood Neck, Frets, Nut, and Pearl Inlay Dots.
 */
function FretboardBody() {
  const { totalFrets, neckLength, neckWidth, neckThickness, singleDotFrets, doubleDotFrets } =
    FRETBOARD_CONFIG;

  // Fret bar positions
  const fretXPositions = useMemo(() => {
    const list: number[] = [];
    for (let f = 1; f <= totalFrets; f++) {
      list.push(getFretXPosition(f, totalFrets, neckLength));
    }
    return list;
  }, [totalFrets, neckLength]);

  // Nut position (Fret 0)
  const nutX = getFretXPosition(0, totalFrets, neckLength);

  return (
    <group position={[0, 0, 0]}>
      {/* Main Rosewood Neck Plank */}
      <mesh
        position={[0, -neckThickness / 2, 0]}
        receiveShadow
      >
        <boxGeometry args={[neckLength + 0.8, neckWidth, neckThickness]} />
        <meshStandardMaterial
          color="#1e1814"
          roughness={0.65}
          metalness={0.15}
        />
      </mesh>

      {/* White/Cream Neck Edge Binding */}
      <mesh position={[0, neckWidth / 2 + 0.03, -neckThickness / 2]}>
        <boxGeometry args={[neckLength + 0.8, 0.06, neckThickness]} />
        <meshStandardMaterial
          color="#fef3c7"
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, -neckWidth / 2 - 0.03, -neckThickness / 2]}>
        <boxGeometry args={[neckLength + 0.8, 0.06, neckThickness]} />
        <meshStandardMaterial
          color="#fef3c7"
          roughness={0.4}
        />
      </mesh>

      {/* Nut (Pestana) at Fret 0 */}
      <mesh position={[nutX, 0, 0]}>
        <boxGeometry args={[0.12, neckWidth + 0.02, 0.14]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Metallic Nickel Fret Bars (Trastes 1 to 12) */}
      {fretXPositions.map((xPos, idx) => (
        <mesh
          key={`fret-bar-${idx + 1}`}
          position={[xPos, 0, 0]}
        >
          <cylinderGeometry args={[0.028, 0.028, neckWidth, 16]} />
          <meshStandardMaterial
            color="#e2e8f0"
            metalness={0.92}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Pearl Dot Inlays on Single Dot Frets (3, 5, 7, 9) */}
      {singleDotFrets.map((fretNum) => {
        const xPos = getFretCenterPosition(fretNum, totalFrets, neckLength);
        return (
          <mesh
            key={`dot-${fretNum}`}
            position={[xPos, 0, 0.005]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.14, 0.14, 0.02, 24]} />
            <meshStandardMaterial
              color="#f1f5f9"
              roughness={0.2}
              metalness={0.6}
            />
          </mesh>
        );
      })}

      {/* Double Pearl Inlays on Fret 12 */}
      {doubleDotFrets.map((fretNum) => {
        const xPos = getFretCenterPosition(fretNum, totalFrets, neckLength);
        return (
          <group
            key={`double-dots-${fretNum}`}
            position={[xPos, 0, 0.005]}
          >
            <mesh
              position={[0, 0.52, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
              <meshStandardMaterial
                color="#f1f5f9"
                roughness={0.2}
                metalness={0.6}
              />
            </mesh>
            <mesh
              position={[0, -0.52, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
              <meshStandardMaterial
                color="#f1f5f9"
                roughness={0.2}
                metalness={0.6}
              />
            </mesh>
          </group>
        );
      })}

      {/* Fret Numbers printed on the fretboard edge for quick reference */}
      <FretNumberLabels
        totalFrets={totalFrets}
        neckLength={neckLength}
        neckWidth={neckWidth}
      />

      {/* Luminous Strike Line Plane right across the strings at Z = 0 */}
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[neckLength + 0.4, neckWidth + 0.1, 0.015]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Displays fret reference numbers (3, 5, 7, 9, 12) along the bottom edge of the neck.
 */
function FretNumberLabels({
  totalFrets,
  neckLength,
  neckWidth,
}: {
  totalFrets: number;
  neckLength: number;
  neckWidth: number;
}) {
  const displayFrets = [1, 3, 5, 7, 9, 12];

  // Procedural number textures for the edge
  const textures = useMemo(() => {
    const map = new Map<number, THREE.CanvasTexture>();
    for (const f of displayFrets) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.toString(), 32, 34);
      }
      const tex = new THREE.CanvasTexture(canvas);
      map.set(f, tex);
    }
    return map;
  }, []);

  return (
    <group position={[0, -neckWidth / 2 - 0.22, 0.02]}>
      {displayFrets.map((fret) => {
        const x = getFretCenterPosition(fret, totalFrets, neckLength);
        const tex = textures.get(fret);
        return (
          <mesh
            key={`fret-label-${fret}`}
            position={[x, 0, 0]}
          >
            <planeGeometry args={[0.36, 0.36]} />
            <meshBasicMaterial
              map={tex}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * 6 Vibrating Guitar Strings in Canonical Rocksmith Colors:
 * String 6 (E2): Red (#ef4444)
 * String 5 (A2): Yellow (#eab308)
 * String 4 (D3): Blue (#3b82f6)
 * String 3 (G3): Orange (#f97316)
 * String 2 (B3): Green (#22c55e)
/**
 * 6 Vibrating Guitar Strings in Canonical Rocksmith Colors:
 * String 6 (E2): Red (#ef4444)
 * String 5 (A2): Yellow (#eab308)
 * String 4 (D3): Blue (#3b82f6)
 * String 3 (G3): Orange (#f97316)
 * String 2 (B3): Green (#22c55e)
 * String 1 (E4): Purple (#a855f7)
 */
function GuitarStrings() {
  const { neckLength } = FRETBOARD_CONFIG;
  const lastFeedback = useGameStore((s) => s.lastFeedback);
  const currentNote = useGameStore((s) => s.getCurrentNote());
  const [vibratingString, setVibratingString] = useState<{ index: number; time: number } | null>(null);

  // Trigger vibration when hit occurs
  useEffect(() => {
    if (lastFeedback && currentNote) {
      setVibratingString({ index: currentNote.stringIndex, time: performance.now() });
    }
  }, [lastFeedback]);

  const stringIndices = [6, 5, 4, 3, 2, 1];

  return (
    <group position={[0, 0, 0.08]}>
      {stringIndices.map((idx) => {
        const config = STRING_VISUALS[idx];
        const posY = getStringYPosition(idx);
        const isVibrating = vibratingString?.index === idx;
        const hitTimestamp = isVibrating ? vibratingString.time : 0;

        return (
          <SingleVibratingString
            key={`string-${idx}`}
            config={config}
            length={neckLength + 0.8}
            posY={posY}
            hitTimestamp={hitTimestamp}
          />
        );
      })}
    </group>
  );
}

interface SingleStringProps {
  config: (typeof STRING_VISUALS)[number];
  length: number;
  posY: number;
  hitTimestamp: number;
}

function SingleVibratingString({ config, length, posY, hitTimestamp }: SingleStringProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;

    if (hitTimestamp > 0) {
      const elapsed = (performance.now() - hitTimestamp) / 1000;
      if (elapsed < 0.45) {
        const decay = Math.exp(-elapsed * 9.0);
        const wobble = Math.sin(elapsed * 75) * 0.07 * decay;
        meshRef.current.position.y = posY + wobble;
        meshRef.current.scale.y = 1.0 + Math.abs(wobble) * 2.0;

        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.emissiveIntensity = 1.8 + decay * 2.5;
        }
        return;
      }
    }

    meshRef.current.position.y = posY;
    meshRef.current.scale.y = 1.0;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      mat.emissiveIntensity = 0.85;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, posY, 0]}
      rotation={[0, 0, Math.PI / 2]}
    >
      <cylinderGeometry args={[config.thickness, config.thickness, length, 16]} />
      <meshStandardMaterial
        color={config.color}
        emissive={config.color}
        emissiveIntensity={0.85}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

/**
 * 3D Falling Highway Notes for the current lesson.
 * Displays the current note right at the strike line and upcoming notes traveling down the tunnel.
 */
function LessonHighwayNotes() {
  const { currentLesson, currentNoteIndex } = useGameStore();
  if (!currentLesson || !currentLesson.notes.length) return null;

  const notes = currentLesson.notes;
  // Show active note + next 6 notes
  const visibleIndices: number[] = [];
  for (let i = currentNoteIndex; i < Math.min(notes.length, currentNoteIndex + 7); i++) {
    visibleIndices.push(i);
  }

  return (
    <group>
      {visibleIndices.map((idx) => {
        const note = notes[idx];
        const offsetIndex = idx - currentNoteIndex;
        // Distance in Z tunnel: offsetIndex * 3.6 units back
        const targetZ = -offsetIndex * 3.6;

        return (
          <HighwayNoteBlock
            key={`${note.id}-${idx}`}
            note={note}
            targetZ={targetZ}
            isCurrent={offsetIndex === 0}
          />
        );
      })}
    </group>
  );
}

interface HighwayNoteBlockProps {
  note: { stringIndex: number; fret: number; noteName: string; octave: number; durationBeats?: number };
  targetZ: number;
  isCurrent: boolean;
}

function HighwayNoteBlock({ note, targetZ, isCurrent }: HighwayNoteBlockProps) {
  const groupRef = useRef<THREE.Group>(null);
  const visual = STRING_VISUALS[note.stringIndex] ?? STRING_VISUALS[6];
  const color = visual.color;
  const posX = getFretCenterPosition(note.fret);
  const posY = getStringYPosition(note.stringIndex);
  const isOpenString = note.fret === 0;

  // Smooth slide animation towards targetZ
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.z = THREE.MathUtils.damp(
      groupRef.current.position.z,
      targetZ,
      12,
      delta
    );
  });

  return (
    <group
      ref={groupRef}
      position={[posX, posY, targetZ - 1.5]}
    >
      {isOpenString ? (
        // Open String: Luminous glowing rectangular hoop
        <group>
          <mesh>
            <boxGeometry args={[0.56, 0.28, 0.2]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isCurrent ? 2.5 : 1.4}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          <mesh>
            <boxGeometry args={[0.42, 0.16, 0.24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ) : (
        // Fretted Note: 3D block with fret number badge
        <group>
          <mesh castShadow>
            <boxGeometry args={[0.62, 0.3, 0.26]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isCurrent ? 2.2 : 1.2}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>

          {/* White core strip */}
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[0.58, 0.04, 0.24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Fret number plate */}
          <mesh position={[0, 0, 0.14]}>
            <planeGeometry args={[0.45, 0.24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Luminous ring spotlight that highlights the exact target fret and string on the fretboard.
 */
function ActiveTargetIndicator() {
  const currentNote = useGameStore((s) => s.getCurrentNote());
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const pulse = 1 + Math.sin(clock.getElapsedTime() * 7) * 0.14;
    ringRef.current.scale.set(pulse, pulse, 1);
  });

  if (!currentNote) return null;

  const posX = getFretCenterPosition(currentNote.fret);
  const posY = getStringYPosition(currentNote.stringIndex);
  const visual = STRING_VISUALS[currentNote.stringIndex] ?? STRING_VISUALS[6];

  return (
    <group position={[posX, posY, 0.1]}>
      {/* Outer pulsing ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.22, 0.32, 32]} />
        <meshBasicMaterial
          color={visual.color}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner bright flare */}
      <mesh>
        <circleGeometry args={[0.16, 24]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Dynamic spot light casting glow onto the fretboard wood */}
      <pointLight
        position={[0, 0, 0.4]}
        color={visual.color}
        intensity={2.5}
        distance={2.5}
      />
    </group>
  );
}

/**
 * Particle sparks and shockwave burst when a note is struck accurately.
 */
function HitEffectsManager() {
  const lastFeedback = useGameStore((s) => s.lastFeedback);
  const currentNote = useGameStore((s) => s.getCurrentNote());
  const [activeShockwave, setActiveShockwave] = useState<{ x: number; y: number; color: string; time: number } | null>(null);

  useEffect(() => {
    if (lastFeedback && currentNote && lastFeedback.quality !== 'miss') {
      const posX = getFretCenterPosition(currentNote.fret);
      const posY = getStringYPosition(currentNote.stringIndex);
      const visual = STRING_VISUALS[currentNote.stringIndex] ?? STRING_VISUALS[6];
      setActiveShockwave({
        x: posX,
        y: posY,
        color: visual.color,
        time: performance.now(),
      });
    }
  }, [lastFeedback]);

  if (!activeShockwave) return null;

  return (
    <ShockwaveEffect
      data={activeShockwave}
      onComplete={() => setActiveShockwave(null)}
    />
  );
}

function ShockwaveEffect({
  data,
  onComplete,
}: {
  data: { x: number; y: number; color: string; time: number };
  onComplete: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (performance.now() - data.time) / 1000;
    const progress = elapsed / 0.4;

    if (progress >= 1.0) {
      onComplete();
      return;
    }

    const scale = THREE.MathUtils.lerp(0.2, 2.2, Math.pow(progress, 0.6));
    meshRef.current.scale.set(scale, scale, 1);

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (mat) {
      mat.opacity = Math.max(0, 1.0 - progress);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[data.x, data.y, 0.12]}
    >
      <ringGeometry args={[0.4, 0.55, 32]} />
      <meshBasicMaterial
        color={data.color}
        transparent
        opacity={1.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

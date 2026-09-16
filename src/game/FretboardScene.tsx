import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { HighwayNotes } from './HighwayNotes.tsx';
import { HitFeedback } from './HitFeedback.tsx';
import {
  FRETBOARD_CONFIG,
  getFretCenterPosition,
  getFretXPosition,
  getStringYPosition,
  STRING_VISUALS,
  type HitFeedbackItem,
  type LessonNote,
} from './types.ts';

export interface FretboardSceneProps {
  notes: readonly LessonNote[];
  currentTime: number;
  processedNoteIds: ReadonlySet<string>;
  hitFeedbacks: HitFeedbackItem[];
  vibratingStrings?: Record<number, number>; // stringIndex -> vibration timestamp
  onHitExpired?: (id: string) => void;
  className?: string;
}

/**
 * Main 3D Rocksmith Fretboard Canvas Scene.
 * Features an angled cinematic camera, authentic 6-string fretboard with inlays,
 * highway guide grid, vibrating strings, notes, and visual hit feedback.
 */
export function FretboardScene({
  notes,
  currentTime,
  processedNoteIds,
  hitFeedbacks,
  vibratingStrings = {},
  onHitExpired,
  className = 'w-full h-full min-h-[480px]',
}: FretboardSceneProps) {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{
          position: [0.5, 4.4, 7.2],
          fov: 48,
          near: 0.1,
          far: 80,
        }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* Cinematic Scene Rig & Camera Setup */}
        <SceneController />

        {/* Ambient & Stage Lights */}
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[5, 12, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight
          position={[-6, 4, 3]}
          intensity={0.8}
          color="#38bdf8"
        />
        <pointLight
          position={[6, 4, 3]}
          intensity={0.8}
          color="#f43f5e"
        />

        {/* 3D Highway Perspective Grid */}
        <HighwayGrid />

        {/* 3D Guitar Fretboard, Frets & Inlays */}
        <FretboardBody />

        {/* 6 Canonically Colored Strings with Dynamic Vibration */}
        <GuitarStrings vibratingStrings={vibratingStrings} />

        {/* Descending 3D Highway Notes */}
        <HighwayNotes
          notes={notes}
          currentTime={currentTime}
          processedNoteIds={processedNoteIds}
        />

        {/* Particle and Shockwave Hit Feedback */}
        <HitFeedback
          items={hitFeedbacks}
          onItemExpired={onHitExpired}
        />
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
 * String 1 (E4): Purple (#a855f7)
 */
function GuitarStrings({
  vibratingStrings,
}: {
  vibratingStrings: Record<number, number>;
}) {
  const { neckLength } = FRETBOARD_CONFIG;
  const stringIndices = [6, 5, 4, 3, 2, 1];

  return (
    <group position={[0, 0, 0.08]}>
      {stringIndices.map((idx) => {
        const config = STRING_VISUALS[idx];
        const posY = getStringYPosition(idx);
        const hitTimestamp = vibratingStrings[idx] ?? 0;

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

    // Check string vibration decay
    if (hitTimestamp > 0) {
      const elapsed = (performance.now() - hitTimestamp) / 1000;
      if (elapsed < 0.45) {
        // High frequency sine wobble decaying exponentially
        const decay = Math.exp(-elapsed * 9.0);
        const wobble = Math.sin(elapsed * 75) * 0.07 * decay;
        meshRef.current.position.y = posY + wobble;
        meshRef.current.scale.y = 1.0 + Math.abs(wobble) * 2.0;

        // Enhance emissive glow when vibrating
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.emissiveIntensity = 1.6 + decay * 2.5;
        }
        return;
      }
    }

    // Default resting state
    meshRef.current.position.y = posY;
    meshRef.current.scale.y = 1.0;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      mat.emissiveIntensity = 0.7;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, posY, 0]}
      rotation={[0, 0, Math.PI / 2]}
    >
      <cylinderGeometry args={[config.thickness, config.thickness, length, 12]} />
      <meshStandardMaterial
        color={config.color}
        emissive={config.color}
        emissiveIntensity={0.7}
        metalness={0.85}
        roughness={0.25}
      />
    </mesh>
  );
}

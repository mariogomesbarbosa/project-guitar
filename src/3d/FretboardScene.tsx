import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore.ts';
import { GUITAR_STRING_STYLES } from '../lessons/types.ts';

// Fret spacing using guitar mathematics (scale length / rule of 17.817)
const FRET_COUNT = 15;
const SCALE_LENGTH = 32;

function calculateFretPositions(count: number): number[] {
  const positions: number[] = [0]; // Nut position
  let currentPos = 0;
  let remainingScale = SCALE_LENGTH;
  for (let i = 1; i <= count; i++) {
    const fretDist = remainingScale / 17.817;
    currentPos += fretDist;
    remainingScale -= fretDist;
    positions.push(currentPos);
  }
  return positions;
}

const FRET_POSITIONS = calculateFretPositions(FRET_COUNT);

// Fretboard 3D Mesh Component
const FretboardMesh: React.FC = () => {
  const { currentNoteIndex, currentLesson, lastFeedback } = useGameStore();
  const currentNote = currentLesson?.notes[currentNoteIndex] || null;

  // Board dimensions
  const nutWidth = 2.4;
  const bridgeWidth = 3.2;
  const boardLength = FRET_POSITIONS[FRET_COUNT];

  // Strings X offsets across the width
  const getStringX = (stringIdx: number, zPos: number) => {
    // stringIdx: 1 (High E) to 6 (Low E)
    const factor = (stringIdx - 1) / 5; // 0 to 1
    const widthAtZ = THREE.MathUtils.lerp(nutWidth, bridgeWidth, zPos / boardLength);
    return THREE.MathUtils.lerp(-widthAtZ / 2 + 0.2, widthAtZ / 2 - 0.2, factor);
  };

  // Target Note position
  const targetFret = currentNote?.fret ?? 0;
  const targetString = currentNote?.stringIndex ?? 6;

  const targetZ = useMemo(() => {
    if (targetFret === 0) return 0.2; // Right at nut
    const prevFretZ = FRET_POSITIONS[targetFret - 1];
    const currFretZ = FRET_POSITIONS[targetFret];
    return (prevFretZ + currFretZ) / 2;
  }, [targetFret]);

  const targetX = getStringX(targetString, targetZ);
  const targetStyle = GUITAR_STRING_STYLES.find((s) => s.index === targetString);

  // Animated target ring
  const targetRingRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (targetRingRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 8) * 0.15;
      targetRingRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={[0, -0.2, 0]}>
      {/* Wood Neck / Fretboard */}
      <mesh position={[0, -0.15, boardLength / 2]} receiveShadow>
        <boxGeometry args={[bridgeWidth + 0.2, 0.2, boardLength + 1]} />
        <meshStandardMaterial
          color="#181512"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Nut (Traste zero / pestana) */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[nutWidth + 0.1, 0.16, 0.12]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Metal Frets */}
      {FRET_POSITIONS.slice(1).map((z, idx) => {
        const fretNum = idx + 1;
        const width = THREE.MathUtils.lerp(nutWidth, bridgeWidth, z / boardLength);
        return (
          <group key={fretNum} position={[0, 0.02, z]}>
            {/* Metal fret wire */}
            <mesh>
              <boxGeometry args={[width, 0.04, 0.05]} />
              <meshStandardMaterial
                color="#cbd5e1"
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
          </group>
        );
      })}

      {/* Position Inlays (Dot markers on frets 3, 5, 7, 9, 12) */}
      {[3, 5, 7, 9].map((fret) => {
        const prev = FRET_POSITIONS[fret - 1];
        const curr = FRET_POSITIONS[fret];
        const midZ = (prev + curr) / 2;
        return (
          <mesh key={fret} position={[0, 0.01, midZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.09, 24]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        );
      })}

      {/* 12th Fret Double Dot */}
      {(() => {
        const midZ = (FRET_POSITIONS[11] + FRET_POSITIONS[12]) / 2;
        return (
          <group key="12th-double" position={[0, 0.01, midZ]}>
            <mesh position={[-0.4, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.07, 24]} />
              <meshBasicMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[0.4, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.07, 24]} />
              <meshBasicMaterial color="#94a3b8" />
            </mesh>
          </group>
        );
      })()}

      {/* Guitar Strings (1 to 6) */}
      {GUITAR_STRING_STYLES.map((str) => {
        const isTarget = currentNote?.stringIndex === str.index;
        const thickness = 0.015 + (str.index - 1) * 0.007; // 1st thinnest, 6th thickest
        const startX = getStringX(str.index, 0);
        const endX = getStringX(str.index, boardLength);

        // String points
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(startX, 0.06, 0),
          new THREE.Vector3(endX, 0.06, boardLength)
        );

        return (
          <group key={str.index}>
            {/* Tube string */}
            <mesh>
              <tubeGeometry args={[curve, 20, thickness, 8, false]} />
              <meshStandardMaterial
                color={isTarget ? str.colorHex : '#71717a'}
                emissive={isTarget ? str.colorHex : '#18181b'}
                emissiveIntensity={isTarget ? 1.8 : 0.2}
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
          </group>
        );
      })}

      {/* Target Hit Marker on the fretboard */}
      {currentNote && (
        <group position={[targetX, 0.08, targetZ]}>
          <mesh
            ref={targetRingRef}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.18, 0.26, 32]} />
            <meshBasicMaterial
              color={targetStyle?.colorHex || '#3b82f6'}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Glowing central indicator */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.14, 32]} />
            <meshBasicMaterial
              color={targetStyle?.colorHex || '#ffffff'}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}

      {/* Hit feedback flash effect */}
      {lastFeedback && Date.now() - lastFeedback.timestamp < 350 && (
        <pointLight
          position={[targetX, 0.5, targetZ]}
          color={
            lastFeedback.quality === 'perfect'
              ? '#10b981'
              : lastFeedback.quality === 'good'
              ? '#3b82f6'
              : '#ef4444'
          }
          intensity={8}
          distance={4}
        />
      )}
    </group>
  );
};

export const FretboardScene: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{
          position: [0, 3.2, -2.2],
          rotation: [-0.65, 0, 0],
          fov: 52,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#090a0f' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[0, 8, 4]} intensity={1.5} castShadow />
        <pointLight position={[0, 3, 2]} intensity={1.2} />

        <FretboardMesh />
      </Canvas>
    </div>
  );
};

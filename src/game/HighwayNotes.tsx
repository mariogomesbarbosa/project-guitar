import { useMemo } from 'react';
import * as THREE from 'three';
import {
  FRETBOARD_CONFIG,
  getFretCenterPosition,
  getStringYPosition,
  STRING_VISUALS,
  type LessonNote,
} from './types.ts';

interface HighwayNotesProps {
  notes: readonly LessonNote[];
  currentTime: number;
  processedNoteIds: ReadonlySet<string>;
}

// Procedural badge textures for fret numbers (1 to 15)
const BADGE_TEXTURE_CACHE = new Map<number, THREE.CanvasTexture>();

function getFretBadgeTexture(fret: number, colorHex: string): THREE.CanvasTexture {
  const cacheKey = fret * 10000000 + parseInt(colorHex.replace('#', ''), 16);
  if (BADGE_TEXTURE_CACHE.has(cacheKey)) {
    return BADGE_TEXTURE_CACHE.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);

    // Background pill/circle with border
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fill();

    ctx.lineWidth = 8;
    ctx.strokeStyle = colorHex;
    ctx.stroke();

    // Inner glowing rim
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Number text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fret.toString(), 64, 66);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  BADGE_TEXTURE_CACHE.set(cacheKey, texture);
  return texture;
}

/**
 * Renders descending notes advancing smoothly towards the fretboard strike line.
 * Optimized with time-window culling for constant 60 FPS performance.
 */
export function HighwayNotes({ notes, currentTime, processedNoteIds }: HighwayNotesProps) {
  const { noteSpeed, spawnAheadSeconds } = FRETBOARD_CONFIG;

  // Active notes within the visible highway window:
  // From slightly past hit window (-0.25s) up to spawnAheadSeconds in the future.
  const visibleNotes = useMemo(() => {
    const minTime = currentTime - 0.25;
    const maxTime = currentTime + spawnAheadSeconds;

    return notes.filter((n) => {
      // If already processed and past strike, skip
      if (processedNoteIds.has(n.id) && n.timeSeconds < currentTime - 0.05) {
        return false;
      }
      return n.timeSeconds >= minTime && n.timeSeconds <= maxTime;
    });
  }, [notes, currentTime, processedNoteIds, spawnAheadSeconds]);

  return (
    <group>
      {visibleNotes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          currentTime={currentTime}
          noteSpeed={noteSpeed}
        />
      ))}
    </group>
  );
}

interface NoteItemProps {
  note: LessonNote;
  currentTime: number;
  noteSpeed: number;
}

function NoteItem({ note, currentTime, noteSpeed }: NoteItemProps) {
  const visual = STRING_VISUALS[note.stringIndex] ?? STRING_VISUALS[6];
  const color = visual.color;

  const posX = getFretCenterPosition(note.fret);
  const posY = getStringYPosition(note.stringIndex);
  // Z position: 0 is the strike line right above the fretboard.
  // When note.timeSeconds > currentTime, Z < 0 (in depth traveling forward)
  const posZ = -(note.timeSeconds - currentTime) * noteSpeed;

  const isOpenString = note.fret === 0;
  const sustainDuration = note.duration ?? 0;
  const sustainLength = sustainDuration * noteSpeed;

  // Badge texture for fret number
  const badgeTexture = useMemo(() => {
    if (isOpenString) return null;
    return getFretBadgeTexture(note.fret, color);
  }, [note.fret, isOpenString, color]);

  return (
    <group position={[posX, posY, posZ]}>
      {isOpenString ? (
        // Open string note representation: Distinct hollow neon ring/frame
        <group>
          {/* Outer rectangular glowing frame */}
          <mesh>
            <boxGeometry args={[0.54, 0.28, 0.18]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={1.8}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>

          {/* Inner core accent */}
          <mesh>
            <boxGeometry args={[0.42, 0.16, 0.2]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ) : (
        // Fretted note representation: 3D Rocksmith block with fret number badge
        <group>
          {/* Main 3D Note Block */}
          <mesh castShadow>
            <boxGeometry args={[0.58, 0.28, 0.24]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={1.4}
              roughness={0.25}
              metalness={0.75}
            />
          </mesh>

          {/* Front Beveled Face Plate */}
          <mesh position={[0, 0, 0.13]}>
            <planeGeometry args={[0.54, 0.24]} />
            <meshBasicMaterial
              map={badgeTexture}
              transparent
              opacity={0.96}
            />
          </mesh>

          {/* Top Edge Glow Strip */}
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[0.56, 0.04, 0.22]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      )}

      {/* Sustain Tail Ribbon if duration > 0 */}
      {sustainLength > 0.1 && (
        <mesh position={[0, 0, -sustainLength / 2]}>
          <boxGeometry args={[0.18, 0.06, sustainLength]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.9}
            transparent
            opacity={0.65}
            roughness={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

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
    <div className={`relative ${className} pointer-events-none select-none overflow-hidden bg-[#06080d]`}>
      <Canvas
        camera={{
          position: [-5.2, 2.4, 7.6],
          fov: 44,
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

        {/* Controlador cinemático de câmera alinhado dinamicamente às notas ativas */}
        <SceneController />

        {/* Iluminação frontal e de palco distribuída ao longo de todo o braço */}
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[-4, 6, 8]}
          intensity={1.8}
          color="#ffffff"
        />
        <directionalLight
          position={[2, 6, 8]}
          intensity={1.2}
          color="#ffffff"
        />
        {/* Luz direta sobre o início do braço e trastes cromados */}
        <directionalLight
          position={[-4, 2, 10]}
          intensity={1.2}
          color="#e0e7ff"
        />
        {/* Luzes laterais de recorte neon */}
        <pointLight position={[-9, 3.5, 2]} intensity={2.5} color="#06b6d4" distance={25} />
        <pointLight position={[9, 3.5, 2]} intensity={2.5} color="#ec4899" distance={25} />
        <pointLight position={[-3, -2, 4]} intensity={1.2} color="#3b82f6" distance={15} />

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
 * Controlador de Câmera Inteligente e Adaptativo Estilo Rocksmith.
 * - Analisa uma janela móvel composta pela nota ativa e as próximas 4 a 5 notas.
 * - Centraliza a câmera no espaço médio entre essas notas com margem de segurança.
 * - Aplica Zoom Out dinâmico (afastando em Z e elevando em Y) quando há grandes saltos de traste na janela.
 * - Transições ultra-suaves com amortecimento exponencial e zona morta (deadzone) para evitar solavancos.
 */
function SceneController() {
  const currentLesson = useGameStore((s) => s.currentLesson);
  const currentNoteIndex = useGameStore((s) => s.currentNoteIndex);
  const currentNote = useGameStore((s) => s.getCurrentNote());

  // Alvos desejados filtrados pela zona morta (deadzone)
  const desiredXRef = useRef(-5.2);
  const desiredYRef = useRef(2.4);
  const desiredZRef = useRef(7.5);

  // Posições e orientações atuais interpoladas suavemente
  const currentCamPosRef = useRef(new THREE.Vector3(-5.2, 2.4, 7.5));
  const currentLookAtRef = useRef(new THREE.Vector3(-5.2, -0.15, -1.2));

  useFrame(({ camera }, delta) => {
    // 1. Obter janela das próximas 4 a 5 notas
    const notes = currentLesson?.notes;
    let windowFrets: number[] = [];

    if (notes && notes.length > 0) {
      const startIdx = Math.max(0, currentNoteIndex);
      const endIdx = Math.min(notes.length, startIdx + 5);
      const upcomingSlice = notes.slice(startIdx, endIdx);
      windowFrets = upcomingSlice.map((n) => n.fret);
    }

    if (windowFrets.length === 0) {
      windowFrets = [currentNote ? currentNote.fret : 0];
    }

    // 2. Calcular limites espaciais X (bounding box) da janela de notas
    const xPositions = windowFrets.map((fret) => getFretCenterPosition(fret));
    const minX = Math.min(...xPositions);
    const maxX = Math.max(...xPositions);
    const span = maxX - minX;
    const centerX = (minX + maxX) / 2;

    // 3. Centralização com margem de conforto
    // Deslocamento leve para a direita (+1.3) para dar espaço de leitura das notas se aproximando
    let targetX = centerX + 1.3;

    // Se houver corda solta / pestana na janela (minX próximo a -7.4),
    // limitar targetX em no máximo -4.6 para que a casa 0 nunca saia da tela
    if (minX <= -7.0) {
      targetX = Math.min(targetX, -4.6);
    }
    // Clampar limites físicos do braço (-5.2 nas casas graves até 0.0 na casa 12)
    targetX = THREE.MathUtils.clamp(targetX, -5.2, 0.0);

    // 4. Zoom out adaptativo para grandes distâncias de trastes
    const baseZ = 7.5;
    const baseY = 2.4;
    let targetZ = baseZ;
    let targetY = baseY;

    // Se a distância entre a menor e maior casa na janela for grande (> 3.5 unidades)
    if (span > 3.5) {
      const extraDistance = Math.min((span - 3.5) * 0.65, 3.2);
      targetZ = baseZ + extraDistance;
      targetY = baseY + extraDistance * 0.28;
    }

    // 5. Filtro de Zona Morta (Deadzone) para eliminar micro-tremores
    if (Math.abs(targetX - desiredXRef.current) > 0.3) {
      desiredXRef.current = targetX;
    }
    if (Math.abs(targetZ - desiredZRef.current) > 0.35) {
      desiredZRef.current = targetZ;
      desiredYRef.current = targetY;
    }

    // 6. Amortecimento cinemático contínuo ultra-suave (fator 2.4 para movimento orgânico)
    const smoothFactor = 2.4;
    currentCamPosRef.current.x = THREE.MathUtils.damp(
      currentCamPosRef.current.x,
      desiredXRef.current,
      smoothFactor,
      delta
    );
    currentCamPosRef.current.y = THREE.MathUtils.damp(
      currentCamPosRef.current.y,
      desiredYRef.current,
      smoothFactor * 0.9,
      delta
    );
    currentCamPosRef.current.z = THREE.MathUtils.damp(
      currentCamPosRef.current.z,
      desiredZRef.current,
      smoothFactor * 0.9,
      delta
    );

    camera.position.copy(currentCamPosRef.current);

    // LookAt também interpola suavemente acompanhando a câmera
    currentLookAtRef.current.x = THREE.MathUtils.damp(
      currentLookAtRef.current.x,
      currentCamPosRef.current.x,
      smoothFactor,
      delta
    );
    camera.lookAt(currentLookAtRef.current);
  });

  return null;
}

/**
 * 3D Highway Grid extending deep into the background (Z < 0).
 */
function HighwayGrid() {
  const { totalFrets, neckLength, neckWidth } = FRETBOARD_CONFIG;
  const highwayDepth = 28.0;
  const floorY = -neckWidth / 2 - 0.15; // Positioned safely below all 6 strings and the fretboard

  // Longitudinal guidelines corresponding to each fret column
  const fretLines = useMemo(() => {
    const lines: number[] = [];
    for (let f = 0; f <= totalFrets; f++) {
      lines.push(getFretXPosition(f, totalFrets, neckLength));
    }
    return lines;
  }, [totalFrets, neckLength]);

  const stringIndices = [6, 5, 4, 3, 2, 1];

  return (
    <group>
      {/* Highway Ground Plane with subtle dark reflection beneath the neck */}
      <group position={[0, floorY, -highwayDepth / 2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[neckLength + 2.0, highwayDepth]} />
          <meshStandardMaterial
            color="#050811"
            roughness={0.3}
            metalness={0.7}
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
              color="#38bdf8"
              transparent
              opacity={0.25}
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
            <planeGeometry args={[neckLength, 0.025]} />
            <meshBasicMaterial
              color="#64748b"
              transparent
              opacity={0.25}
            />
          </mesh>
        ))}
      </group>

      {/* Faint string laser guide ribbons running through the 3D highway tunnel */}
      {stringIndices.map((idx) => {
        const posY = getStringYPosition(idx);
        const visual = STRING_VISUALS[idx];
        return (
          <mesh
            key={`string-guide-${idx}`}
            position={[0, posY, -highwayDepth / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[neckLength, 0.008]} />
            <meshBasicMaterial
              color={visual.color}
              transparent
              opacity={0.16}
            />
          </mesh>
        );
      })}
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
      {/* Madeira Nobre do Braço Translúcida Estilo Rocksmith - Face frontal exatamente em Z = 0 */}
      <mesh
        position={[0, 0, -neckThickness / 2]}
        renderOrder={10}
      >
        <boxGeometry args={[neckLength + 0.8, neckWidth, neckThickness]} />
        <meshStandardMaterial
          color="#0e131f"
          roughness={0.25}
          metalness={0.2}
          transparent
          opacity={0.32}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Friso Lateral Superior (Binding) Translúcido */}
      <mesh
        position={[0, neckWidth / 2 + 0.02, -neckThickness / 2]}
        renderOrder={10}
      >
        <boxGeometry args={[neckLength + 0.8, 0.04, neckThickness]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      {/* Friso Lateral Inferior (Binding) Translúcido */}
      <mesh
        position={[0, -neckWidth / 2 - 0.02, -neckThickness / 2]}
        renderOrder={10}
      >
        <boxGeometry args={[neckLength + 0.8, 0.04, neckThickness]} />
        <meshStandardMaterial
          color="#94a3b8"
          roughness={0.3}
          metalness={0.4}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      {/* Pestana (Nut) no Traste 0 em osso sintético */}
      <mesh position={[nutX, 0, 0.06]} renderOrder={10}>
        <boxGeometry args={[0.12, neckWidth + 0.02, 0.14]} />
        <meshStandardMaterial
          color="#f8fafc"
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      {/* Trastes Metálicos Cromados de Níquel (Trastes 1 a 12) - Em Z = 0.035, saltando da madeira */}
      {fretXPositions.map((xPos, idx) => (
        <mesh
          key={`fret-bar-${idx + 1}`}
          position={[xPos, 0, 0.035]}
          renderOrder={12}
        >
          <cylinderGeometry args={[0.028, 0.028, neckWidth, 16]} />
          <meshStandardMaterial
            color="#f8fafc"
            metalness={0.96}
            roughness={0.12}
            emissive="#94a3b8"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* Inlays de Madrepérola nas casas 3, 5, 7, 9 - Translúcidos para não ocultar notas */}
      {singleDotFrets.map((fretNum) => {
        const xPos = getFretCenterPosition(fretNum, totalFrets, neckLength);
        return (
          <mesh
            key={`dot-${fretNum}`}
            position={[xPos, 0, 0.008]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={11}
          >
            <cylinderGeometry args={[0.13, 0.13, 0.015, 24]} />
            <meshStandardMaterial
              color="#cbd5e1"
              roughness={0.2}
              metalness={0.5}
              transparent
              opacity={0.45}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* Inlay Duplo de Madrepérola na Casa 12 */}
      {doubleDotFrets.map((fretNum) => {
        const xPos = getFretCenterPosition(fretNum, totalFrets, neckLength);
        return (
          <group
            key={`double-dots-${fretNum}`}
            position={[xPos, 0, 0.008]}
          >
            <mesh
              position={[0, 0.52, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={11}
            >
              <cylinderGeometry args={[0.11, 0.11, 0.015, 24]} />
              <meshStandardMaterial
                color="#cbd5e1"
                roughness={0.2}
                metalness={0.5}
                transparent
                opacity={0.45}
                depthWrite={false}
              />
            </mesh>
            <mesh
              position={[0, -0.52, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={11}
            >
              <cylinderGeometry args={[0.11, 0.11, 0.015, 24]} />
              <meshStandardMaterial
                color="#cbd5e1"
                roughness={0.2}
                metalness={0.5}
                transparent
                opacity={0.45}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Números das casas desenhados ao longo da borda inferior do braço */}
      <FretNumberLabels
        totalFrets={totalFrets}
        neckLength={neckLength}
        neckWidth={neckWidth}
      />

      {/* Linha laser de ataque sobre a pestana/strike point */}
      <mesh position={[nutX, 0, 0.08]}>
        <boxGeometry args={[0.04, neckWidth + 0.1, 0.02]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.8}
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
  const displayFrets = [0, 1, 3, 5, 7, 9, 12];

  // Procedural number textures for the edge
  const textures = useMemo(() => {
    const map = new Map<number, THREE.CanvasTexture>();
    for (const f of displayFrets) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = f === 0 ? '#38bdf8' : '#94a3b8';
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
 * Supports both Guided mode (static queue) and Realtime mode (continuous flow at lesson BPM).
 */
function LessonHighwayNotes() {
  const { currentLesson, currentNoteIndex, playMode, playbackTime } = useGameStore();
  if (!currentLesson || !currentLesson.notes.length) return null;

  const notes = currentLesson.notes;
  const bpm = currentLesson.bpm || 75;
  const noteSpeed = 7.5;

  // Realtime Flow Mode: notes advance continuously down the 3D tunnel based on time
  if (playMode === 'realtime') {
    const minTime = playbackTime - 0.4;
    const maxTime = playbackTime + 4.2;

    const visibleNotes = notes
      .map((note, idx) => ({
        note,
        idx,
        timeSeconds: (note.beat * 60) / bpm,
      }))
      .filter((n) => n.timeSeconds >= minTime && n.timeSeconds <= maxTime);

    return (
      <group>
        {visibleNotes.map(({ note, idx, timeSeconds }) => {
          const targetZ = -(timeSeconds - playbackTime) * noteSpeed;
          const isCurrent = idx === currentNoteIndex;

          return (
            <HighwayNoteBlock
              key={`${note.id}-${idx}`}
              note={note}
              targetZ={targetZ}
              isCurrent={isCurrent}
              isRealtime={true}
            />
          );
        })}
      </group>
    );
  }

  // Guided Mode: static spacing based on note index queue, waiting for player
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
            isRealtime={false}
          />
        );
      })}
    </group>
  );
}

const noteFretTextureCache = new Map<number, THREE.CanvasTexture>();

function getNoteFretTexture(fret: number): THREE.CanvasTexture {
  if (noteFretTextureCache.has(fret)) {
    return noteFretTextureCache.get(fret)!;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fret.toString(), 32, 34);
  }
  const tex = new THREE.CanvasTexture(canvas);
  noteFretTextureCache.set(fret, tex);
  return tex;
}

interface HighwayNoteBlockProps {
  note: { stringIndex: number; fret: number; noteName: string; octave: number; durationBeats?: number };
  targetZ: number;
  isCurrent: boolean;
  isRealtime: boolean;
}

function HighwayNoteBlock({ note, targetZ, isCurrent, isRealtime }: HighwayNoteBlockProps) {
  const groupRef = useRef<THREE.Group>(null);
  const visual = STRING_VISUALS[note.stringIndex] ?? STRING_VISUALS[6];
  const color = visual.color;
  const posX = getFretCenterPosition(note.fret);
  const posY = getStringYPosition(note.stringIndex);
  const isOpenString = note.fret === 0;
  const fretTex = useMemo(() => (!isOpenString ? getNoteFretTexture(note.fret) : null), [note.fret, isOpenString]);

  // Realtime: direct sync per frame. Guided: smooth damp interpolation
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (isRealtime) {
      groupRef.current.position.z = targetZ;
    } else {
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        targetZ,
        14,
        delta
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={[posX, posY, targetZ]}
    >
      {isOpenString ? (
        // Open String: Luminous glowing rectangular hoop
        <group renderOrder={5}>
          <mesh renderOrder={5}>
            <boxGeometry args={[0.56, 0.28, 0.2]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isCurrent ? 2.5 : 1.4}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          <mesh renderOrder={5}>
            <boxGeometry args={[0.42, 0.16, 0.24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ) : (
        // Fretted Note: 3D block with printed fret number badge
        <group renderOrder={5}>
          <mesh castShadow renderOrder={5}>
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
          <mesh position={[0, 0.13, 0]} renderOrder={5}>
            <boxGeometry args={[0.58, 0.04, 0.24]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* Fret number plate with number */}
          <mesh position={[0, 0, 0.14]} renderOrder={6}>
            <planeGeometry args={[0.42, 0.22]} />
            {fretTex ? (
              <meshBasicMaterial map={fretTex} />
            ) : (
              <meshBasicMaterial color="#ffffff" />
            )}
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

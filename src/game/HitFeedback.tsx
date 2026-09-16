import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { HitFeedbackItem } from './types.ts';

interface HitParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

interface HitShockwave {
  pos: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  opacity: number;
  maxScale: number;
  life: number;
}

interface HitFeedbackProps {
  items: HitFeedbackItem[];
  onItemExpired?: (id: string) => void;
}

/**
 * 3D Hit Feedback System.
 * Renders dynamic particle sparks, glowing expanding shockwaves,
 * and point flashes when a note is struck accurately.
 */
export function HitFeedback({ items, onItemExpired }: HitFeedbackProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const shockwavesRef = useRef<THREE.Group>(null);

  // Active transient particles
  const particlesRef = useRef<HitParticle[]>([]);
  const shockwavesListRef = useRef<HitShockwave[]>([]);
  const processedItemIdsRef = useRef<Set<string>>(new Set());

  // Reusable particle geometry buffers
  const MAX_PARTICLES = 240;
  const positionsArray = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const colorsArray = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const sizesArray = useMemo(() => new Float32Array(MAX_PARTICLES), []);

  // Soft round particle texture generated procedurally
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.85)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.25)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }, []);

  useFrame((_, delta) => {
    const now = performance.now();

    // Check for newly triggered hit items
    for (const item of items) {
      if (!processedItemIdsRef.current.has(item.id)) {
        processedItemIdsRef.current.add(item.id);

        const baseColor = new THREE.Color(item.color);
        const hitPos = new THREE.Vector3(...item.position);
        const particleCount = item.judgment === 'perfect' ? 24 : 14;

        // Spawn spark explosion
        for (let i = 0; i < particleCount; i++) {
          if (particlesRef.current.length >= MAX_PARTICLES) {
            particlesRef.current.shift();
          }

          // Random spherical burst with forward bias
          const theta = Math.random() * Math.PI * 2;
          const phi = (Math.random() - 0.5) * Math.PI;
          const speed = (item.judgment === 'perfect' ? 3.5 : 2.5) * (0.6 + Math.random() * 0.8);

          const vel = new THREE.Vector3(
            Math.cos(theta) * Math.cos(phi) * speed * 0.7,
            Math.sin(phi) * speed * 0.8,
            (Math.sin(theta) * Math.cos(phi) + 0.4) * speed
          );

          particlesRef.current.push({
            pos: hitPos.clone(),
            vel,
            color: baseColor.clone().offsetHSL((Math.random() - 0.5) * 0.05, 0, 0.2),
            size: (item.judgment === 'perfect' ? 0.35 : 0.25) * (0.8 + Math.random() * 0.6),
            life: 0,
            maxLife: item.judgment === 'perfect' ? 0.55 : 0.4,
          });
        }

        // Spawn expanding shockwave ring
        shockwavesListRef.current.push({
          pos: hitPos.clone(),
          color: item.judgment === 'perfect' ? new THREE.Color('#38bdf8') : baseColor.clone(),
          scale: 0.1,
          opacity: 1.0,
          maxScale: item.judgment === 'perfect' ? 1.6 : 1.1,
          life: 0,
        });
      }

      // Check item expiration
      if (now - item.createdAt >= item.duration * 1000) {
        onItemExpired?.(item.id);
      }
    }

    // Update particles
    let activeParticlesCount = 0;
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      p.pos.addScaledVector(p.vel, delta);
      // Slight drag
      p.vel.multiplyScalar(0.92);

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;

      const idx = activeParticlesCount * 3;
      positionsArray[idx] = p.pos.x;
      positionsArray[idx + 1] = p.pos.y;
      positionsArray[idx + 2] = p.pos.z;

      colorsArray[idx] = p.color.r * alpha;
      colorsArray[idx + 1] = p.color.g * alpha;
      colorsArray[idx + 2] = p.color.b * alpha;

      sizesArray[activeParticlesCount] = p.size * (1 - progress * 0.4);
      activeParticlesCount++;
    }

    // Fill remaining buffer with zero
    for (let i = activeParticlesCount; i < MAX_PARTICLES; i++) {
      sizesArray[i] = 0;
    }

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
      geo.setDrawRange(0, activeParticlesCount);
    }

    // Update Shockwaves
    for (let i = shockwavesListRef.current.length - 1; i >= 0; i--) {
      const sw = shockwavesListRef.current[i];
      sw.life += delta;
      const progress = sw.life / 0.35;

      if (progress >= 1.0) {
        shockwavesListRef.current.splice(i, 1);
        continue;
      }

      sw.scale = THREE.MathUtils.lerp(0.1, sw.maxScale, Math.pow(progress, 0.5));
      sw.opacity = Math.max(0, 1.0 - progress);
    }
  });

  return (
    <group>
      {/* Dynamic Spark Particle System */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positionsArray, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colorsArray, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizesArray, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.25}
          map={particleTexture}
          vertexColors
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Shockwave Rings Group */}
      <group ref={shockwavesRef}>
        {shockwavesListRef.current.map((sw, idx) => (
          <mesh
            key={`sw-${idx}-${sw.pos.x.toFixed(2)}`}
            position={[sw.pos.x, sw.pos.y, sw.pos.z + 0.05]}
            scale={[sw.scale, sw.scale, 1]}
          >
            <ringGeometry args={[0.7, 0.9, 32]} />
            <meshBasicMaterial
              color={sw.color}
              transparent
              opacity={sw.opacity * 0.8}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Floating 3D Judgments */}
      {items.map((item) => (
        <FloatingJudgment
          key={item.id}
          item={item}
        />
      ))}
    </group>
  );
}

/**
 * Floating judgment text & halo badge over the struck fret.
 */
function FloatingJudgment({ item }: { item: HitFeedbackItem }) {
  const meshRef = useRef<THREE.Group>(null);
  const isPerfect = item.judgment === 'perfect';

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (performance.now() - item.createdAt) / 1000;
    const progress = Math.min(1.0, elapsed / item.duration);

    // Float upward and fade out
    meshRef.current.position.y = item.position[1] + 0.3 + progress * 0.6;
    meshRef.current.position.z = item.position[2] + 0.15 + progress * 0.2;

    const scale = THREE.MathUtils.lerp(1.2, 0.9, progress);
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group
      ref={meshRef}
      position={[item.position[0], item.position[1] + 0.25, item.position[2] + 0.1]}
    >
      {/* Glowing Impact Diamond Halo */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.36, 0.36]} />
        <meshBasicMaterial
          color={isPerfect ? '#38bdf8' : '#4ade80'}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

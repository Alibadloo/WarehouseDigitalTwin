import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { ShelfData } from '../../types';

interface Props {
  shelf: ShelfData;
  position: [number, number, number];
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (shelf: ShelfData) => void;
}

function occupancyColor(pct: number, highlighted: boolean, selected: boolean): string {
  if (selected) return '#f0abfc';
  if (highlighted) return '#fbbf24';
  if (pct === 0) return '#374151';
  if (pct < 30) return '#1e40af';
  if (pct < 60) return '#15803d';
  if (pct < 90) return '#b45309';
  return '#b91c1c';
}

const SHELF_W = 0.85;
const SHELF_D = 0.85;
const SHELF_H = 2.4;

export default function ShelfMesh({ shelf, position, isSelected, isHighlighted, onClick }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const fillH = Math.max(0.05, (shelf.occupancyPct / 100) * (SHELF_H - 0.1));

  useFrame(() => {
    if (!meshRef.current) return;
    const target = isSelected ? 1.15 : hovered ? 1.07 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
  });

  const color = occupancyColor(shelf.occupancyPct, isHighlighted, isSelected);
  const emissive = isSelected ? '#9d174d' : isHighlighted ? '#92400e' : hovered ? '#1e3a5f' : '#000000';

  return (
    <group position={position}>
      {/* shelf frame */}
      <mesh
        ref={meshRef}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={(e) => { e.stopPropagation(); onClick(shelf); }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[SHELF_W, SHELF_H, SHELF_D]} />
        <meshStandardMaterial
          color="#1f2937"
          emissive={emissive}
          emissiveIntensity={0.1}
          transparent
          opacity={0.35}
          roughness={0.8}
        />
      </mesh>

      {/* fill level bar */}
      <mesh position={[0, -SHELF_H / 2 + fillH / 2, 0]}>
        <boxGeometry args={[SHELF_W - 0.06, fillH, SHELF_D - 0.06]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || isHighlighted ? 0.4 : 0.15}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* shelf code label */}
      <Text
        position={[0, SHELF_H / 2 + 0.28, 0]}
        fontSize={0.22}
        color={isSelected ? '#f0abfc' : isHighlighted ? '#fbbf24' : '#e5e7eb'}
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
      >
        {shelf.code}
      </Text>

      {/* occupancy % label */}
      <Text
        position={[0, SHELF_H / 2 + 0.05, 0]}
        fontSize={0.16}
        color={isSelected ? '#f0abfc' : '#9ca3af'}
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
      >
        {shelf.currentCount > 0 ? `${shelf.currentCount} / ${shelf.maxCapacity}` : 'EMPTY'}
      </Text>
    </group>
  );
}

import { Text } from '@react-three/drei';

const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  A: [-12, 0.01, 0],
  B: [0, 0.01, 0],
  C: [12, 0.01, 0],
};

export default function WarehouseFloor() {
  return (
    <group>
      {/* main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.21, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#111827" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* grid lines */}
      <gridHelper args={[60, 30, '#1f2937', '#1f2937']} position={[0, -1.2, 0]} />

      {/* zone floor tiles */}
      {Object.entries(ZONE_POSITIONS).map(([zone, [x, y, z]]) => (
        <group key={zone}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]} receiveShadow>
            <planeGeometry args={[9, 18]} />
            <meshStandardMaterial color="#1a2535" roughness={0.85} />
          </mesh>
          <Text
            position={[x, -1.1, -10]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={2}
            color="#374151"
            anchorX="center"
            anchorY="middle"
          >
            ZONE {zone}
          </Text>
        </group>
      ))}

      {/* aisle markers */}
      {[-6, 6].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.19, 0]}>
          <planeGeometry args={[0.15, 18]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* wall back */}
      <mesh position={[0, 4, -20]} receiveShadow>
        <planeGeometry args={[60, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={1} />
      </mesh>
    </group>
  );
}

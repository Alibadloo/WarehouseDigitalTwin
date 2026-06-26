import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { useAppSelector, useAppDispatch, fetchShelfDetail, selectShelf } from '../../store/store';
import ShelfMesh from './ShelfMesh';
import WarehouseFloor from './WarehouseFloor';
import type { ShelfData } from '../../types';

// Returns [x, y, z] center position for a shelf in the 3D scene.
// 3 zones at x = -12, 0, 12 with aisles between them.
// 5 rows along Z: -8, -4.5, 0, 4.5, 9
// 4 columns within each zone: -1.5, -0.5, 0.5, 1.5 (relative)
function shelfPosition(shelf: ShelfData): [number, number, number] {
  const zoneX = shelf.zone === 'A' ? -12 : shelf.zone === 'B' ? 0 : 12;
  const colOffset = (shelf.column - 2.5) * 1.5;
  const rowZ = (shelf.row - 3) * 4.5;
  return [zoneX + colOffset, 0, rowZ];
}

export default function WarehouseScene() {
  const dispatch = useAppDispatch();
  const shelves = useAppSelector((s) => s.warehouse.shelves);
  const selected = useAppSelector((s) => s.warehouse.selectedShelf);
  const highlighted = useAppSelector((s) => s.warehouse.highlightedShelves);
  const filter = useAppSelector((s) => s.warehouse.filter);

  const filteredShelves = useMemo(() => {
    return shelves.filter((s) => {
      if (filter === 'empty') return s.currentCount === 0;
      if (filter === 'full') return s.occupancyPct >= 90;
      if (filter === 'warning') return s.occupancyPct >= 70 && s.occupancyPct < 90;
      return true;
    });
  }, [shelves, filter]);

  const handleClick = (shelf: ShelfData) => {
    if (selected?.id === shelf.id) {
      dispatch(selectShelf(null));
    } else {
      dispatch(fetchShelfDetail(shelf.id) as any);
    }
  };

  return (
    <Canvas
      shadows
      camera={{ position: [0, 22, 32], fov: 42 }}
      style={{ background: '#070d1a' }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[15, 25, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-12, 8, 0]} intensity={0.4} color="#3b82f6" />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#8b5cf6" />
      <pointLight position={[12, 8, 0]} intensity={0.4} color="#06b6d4" />

      <Stars radius={80} depth={40} count={3000} factor={3} fade />

      <Suspense fallback={null}>
        <Environment preset="night" />
        <WarehouseFloor />
        {filteredShelves.map((shelf) => (
          <ShelfMesh
            key={shelf.id}
            shelf={shelf}
            position={shelfPosition(shelf)}
            isSelected={selected?.id === shelf.id}
            isHighlighted={highlighted.includes(shelf.code)}
            onClick={handleClick}
          />
        ))}
      </Suspense>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={8}
        maxDistance={55}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

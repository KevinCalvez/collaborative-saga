import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface DiceProps {
  value: number;
  position: [number, number, number];
  isRolling: boolean;
}

const Dice = ({ value, position, isRolling }: DiceProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (isRolling && meshRef.current) {
      // Animation de lancer
      const targetRotation = {
        x: Math.random() * Math.PI * 4,
        y: Math.random() * Math.PI * 4,
        z: Math.random() * Math.PI * 4,
      };
      setRotation(targetRotation);
    }
  }, [isRolling, value]);

  useFrame(() => {
    if (meshRef.current && isRolling) {
      meshRef.current.rotation.x += 0.1;
      meshRef.current.rotation.y += 0.15;
      meshRef.current.rotation.z += 0.08;
    }
  });

  // Positions des faces du dé (opposées: 1-6, 2-5, 3-4)
  const faceRotations: { [key: number]: [number, number, number] } = {
    1: [0, 0, 0],           // Face avant
    6: [0, Math.PI, 0],     // Face arrière
    2: [0, -Math.PI / 2, 0], // Face droite
    5: [0, Math.PI / 2, 0],  // Face gauche
    3: [-Math.PI / 2, 0, 0], // Face haut
    4: [Math.PI / 2, 0, 0],  // Face bas
  };

  useEffect(() => {
    if (!isRolling && meshRef.current) {
      // Orienter le dé pour afficher la face gagnante
      const [rx, ry, rz] = faceRotations[value] || [0, 0, 0];
      meshRef.current.rotation.set(rx, ry, rz);
    }
  }, [isRolling, value]);

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial 
        color="#f59e0b" 
        roughness={0.3}
        metalness={0.1}
      />
      
      {/* Points sur chaque face */}
      {[1, 2, 3, 4, 5, 6].map((face) => {
        const [rx, ry, rz] = faceRotations[face];
        const dotPositions = getDotPositions(face);
        
        return dotPositions.map((pos, idx) => (
          <mesh
            key={`${face}-${idx}`}
            position={pos}
            rotation={[rx, ry, rz]}
          >
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        ));
      })}
    </mesh>
  );
};

// Positions des points sur chaque face
const getDotPositions = (face: number): [number, number, number][] => {
  const offset = 0.76; // Distance du centre
  const mid = 0.4;     // Position intermédiaire
  
  const positions: { [key: number]: [number, number, number][] } = {
    1: [[0, 0, offset]],
    2: [[-mid, mid, offset], [mid, -mid, offset]],
    3: [[-mid, mid, offset], [0, 0, offset], [mid, -mid, offset]],
    4: [[-mid, mid, offset], [mid, mid, offset], [-mid, -mid, offset], [mid, -mid, offset]],
    5: [[-mid, mid, offset], [mid, mid, offset], [0, 0, offset], [-mid, -mid, offset], [mid, -mid, offset]],
    6: [[-mid, mid, offset], [0, mid, offset], [mid, mid, offset], [-mid, -mid, offset], [0, -mid, offset], [mid, -mid, offset]],
  };
  
  return positions[face] || [];
};

interface Dice3DProps {
  rolls: number[];
  isRolling: boolean;
}

export const Dice3D = ({ rolls, isRolling }: Dice3DProps) => {
  const spacing = 2;
  
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden bg-gradient-to-br from-background via-card to-background border border-border">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 45 }}
        shadows
      >
        <ambientLight intensity={0.5} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
        />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        
        {rolls.map((value, index) => {
          const x = (index - (rolls.length - 1) / 2) * spacing;
          return (
            <Dice
              key={index}
              value={value}
              position={[x, 0, 0]}
              isRolling={isRolling}
            />
          );
        })}
        
        {/* Surface */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};

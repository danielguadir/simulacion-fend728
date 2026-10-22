"use client";

import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

export type DiscCount = 4 | 6;

type Props = {
  assembled: boolean;
  visible?: boolean;
  discCount: DiscCount;
  driveSpeed: number; // m/s signed speed for spinning discs
  spinWheels?: boolean;
  blueprintMode: boolean;
  showCotas: boolean;
};

/**
  * Modular 3D Agricultural Rear Ballast & Short Disc Gang (4 or 6 discs)
  * Attaches to the Fendt 728 Vario Gen7.1 Category III Rear 3-Point Linkage (x = +2.758 m).
  */
export default function RearDiscAttachment3D({
  assembled,
  visible = true,
  discCount,
  driveSpeed,
  spinWheels = false,
  blueprintMode,
  showCotas,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const discAxleRef = useRef<THREE.Group>(null);

  // Target X position: when assembled, docks right onto the rear linkage at x = 2.74 m.
  // When disassembled, rests 1.35 m further back (x = 4.09 m) with dashed coupling guide lines.
  const targetX = assembled ? 2.74 : 4.09;
  const targetY = assembled ? 0.62 : 0.46;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        targetX,
        Math.min(1, delta * 5.5)
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        targetY,
        Math.min(1, delta * 5.5)
      );
    }
    const effectiveSpeed = driveSpeed !== 0 ? driveSpeed : spinWheels ? 0.55 : 0;
    if (discAxleRef.current && assembled && Math.abs(effectiveSpeed) > 0.01) {
      // Forward motion is towards -X, so rolling rotation around +Z is counter-clockwise (+Z)
      discAxleRef.current.rotation.z += delta * effectiveSpeed * 3.2;
    }
  });

  // Scalable gang width based on 4 or 6 discs
  const frameWidth = discCount === 6 ? 2.15 : 1.55;
  const discPositions =
    discCount === 6
      ? [-0.88, -0.53, -0.18, 0.18, 0.53, 0.88]
      : [-0.6, -0.2, 0.2, 0.6];

  const frameColor = blueprintMode ? "#1f5e3b" : "#3a6f24";
  const ballastColor = blueprintMode ? "#173c31" : "#262e30";
  const steelColor = blueprintMode ? "#389e77" : "#9aa8a6";
  const discColor = blueprintMode ? "#266348" : "#444e50";

  return (
    <group visible={visible}>
      {/* Dashed 3-Point Hitch Coupling Guide Lines when Disassembled */}
      {!assembled && visible && (
        <group>
          {/* Left Lower Link Guide */}
          <Line
            points={[
              [2.68, 0.86, -0.32],
              [3.95, 0.58, -0.32],
            ]}
            color="#ffd166"
            lineWidth={1.8}
            dashed
            dashSize={0.1}
            gapSize={0.07}
          />
          {/* Right Lower Link Guide */}
          <Line
            points={[
              [2.68, 0.86, 0.32],
              [3.95, 0.58, 0.32],
            ]}
            color="#ffd166"
            lineWidth={1.8}
            dashed
            dashSize={0.1}
            gapSize={0.07}
          />
          {/* Top Link Guide */}
          <Line
            points={[
              [2.55, 1.32, 0],
              [3.95, 1.05, 0],
            ]}
            color="#a8f176"
            lineWidth={1.8}
            dashed
            dashSize={0.1}
            gapSize={0.07}
          />
        </group>
      )}

      <group ref={groupRef} position={[targetX, targetY, 0]}>
        {/* 1. 3-POINT HITCH A-FRAME MAST (Torreta Tripuntal Cat. III) */}
        <group position={[0.12, 0.22, 0]}>
          {/* Crossbar connecting to lower link hooks */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.88, 16]} />
            <meshStandardMaterial color={steelColor} metalness={0.75} roughness={0.25} wireframe={blueprintMode} />
          </mesh>
          {/* Left & Right Mast Struts */}
          {[-0.28, 0.28].map((z, idx) => (
            <mesh key={idx} position={[0.05, 0.24, z * 0.6]} rotation={[0, 0, 0.15]} castShadow>
              <boxGeometry args={[0.08, 0.54, 0.06]} />
              <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.3} wireframe={blueprintMode} />
            </mesh>
          ))}
          {/* Top Link Pin clevis */}
          <mesh position={[0.05, 0.48, 0]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.24]} />
            <meshStandardMaterial color="#d13b27" roughness={0.35} metalness={0.5} wireframe={blueprintMode} />
          </mesh>
        </group>

        {/* 2. CENTRAL BALLAST WEIGHT BLOCK (Lastre modular trasero) */}
        <mesh position={[0.42, 0.16, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.34, 0.96]} />
          <meshStandardMaterial
            color={ballastColor}
            roughness={0.65}
            metalness={0.45}
            wireframe={blueprintMode}
          />
        </mesh>

        {/* Transverse Main Carrier Beam (Bastidor transversal escalable 4 o 6 discos) */}
        <mesh position={[0.68, 0.16, 0]} castShadow>
          <boxGeometry args={[0.16, 0.16, frameWidth]} />
          <meshStandardMaterial
            color={frameColor}
            roughness={0.38}
            metalness={0.3}
            wireframe={blueprintMode}
          />
        </mesh>

        {/* Side Bearing Hanger Arms */}
        {[-frameWidth / 2 + 0.08, frameWidth / 2 - 0.08].map((z, idx) => (
          <mesh key={idx} position={[0.82, -0.04, z]} rotation={[0, 0, -0.45]} castShadow>
            <boxGeometry args={[0.42, 0.09, 0.07]} />
            <meshStandardMaterial color={frameColor} roughness={0.4} wireframe={blueprintMode} />
          </mesh>
        ))}

        {/* 3. ROTATING AGRICULTURAL DISC GANG (4 or 6 Concave Notched Discs) */}
        <group ref={discAxleRef} position={[0.95, -0.18, 0]}>
          {/* Central Hexagonal/Round Gang Shaft */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.042, 0.042, frameWidth - 0.06, 20]} />
            <meshStandardMaterial color={steelColor} metalness={0.8} roughness={0.2} wireframe={blueprintMode} />
          </mesh>

          {/* Individual Agricultural Discs (4 or 6) */}
          {discPositions.map((zPos, i) => (
            <group key={i} position={[0, 0, zPos]} rotation={[0, 0.14 * (i % 2 === 0 ? 1 : -1), 0]}>
              {/* Disc blade */}
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.29, 0.25, 0.022, 28]} />
                <meshStandardMaterial
                  color={discColor}
                  metalness={0.7}
                  roughness={0.32}
                  wireframe={blueprintMode}
                />
              </mesh>
              {/* Red hub flange */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.085, 0.085, 0.05, 16]} />
                <meshStandardMaterial color="#d13b27" metalness={0.5} roughness={0.35} />
              </mesh>
              {/* Peripheral notches visual markers */}
              {[0, 1, 2, 3, 4, 5].map((n) => {
                const a = (n / 6) * Math.PI * 2;
                return (
                  <mesh
                    key={n}
                    position={[Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0]}
                    rotation={[0, 0, a]}
                  >
                    <boxGeometry args={[0.04, 0.025, 0.028]} />
                    <meshStandardMaterial color="#8d9b99" metalness={0.8} roughness={0.2} />
                  </mesh>
                );
              })}
            </group>
          ))}
        </group>

        {/* 3D Minimalist Tag for the Rear Disc Ballast Attachment */}
        <Html
          position={[0.68, 0.72, 0]}
          center
          zIndexRange={[20, 0]}
          style={{
            display: showCotas && visible ? "block" : "none",
            pointerEvents: showCotas && visible ? "auto" : "none",
          }}
        >
          <div className="dim-pill-3d">
            <span className="dim-pill-title">
              {assembled ? "ENSAMBLADO EN TRIPUNTAL CAT. III" : "DESENSAMBLADO (LISTO PARA ACOPLAR)"}
            </span>
            <strong style={{ color: assembled ? "#a8f176" : "#ffd166" }}>
              Lastre + {discCount} Discos ({discCount === 6 ? "2,15 m · 950 kg" : "1,55 m · 680 kg"})
            </strong>
          </div>
        </Html>
      </group>
    </group>
  );
}

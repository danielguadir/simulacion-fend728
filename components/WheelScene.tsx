"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Grid, Html, Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { TireSpec } from "@/lib/specs";
import { asNumber, tireGeometry } from "@/lib/specs";

type Props = {
  spec: TireSpec;
  pressure: number;
  spin: boolean;
  wireframe: boolean;
  showCotas?: boolean;
};

function WheelCotasOverlay({ spec, visible = true }: { spec: TireSpec; visible?: boolean }) {
  const info = tireGeometry(spec);
  const radius = info.nominalRadiusM;
  const rim = info.rimMm / 2000;
  const width = spec.widthMm / 1000;

  const yCenter = radius * 0.97;
  const yBottom = yCenter - radius;
  const yTop = yCenter + radius;
  const yRimBottom = yCenter - rim;
  const yRimTop = yCenter + rim;

  const xLeft = -radius - 0.25;
  const xRight = radius + 0.22;
  const zFront = width / 2 + 0.08;

  const orangeMain = "#ff8533";
  const orangeRim = "#ffb703";
  const orangeProfile = "#fb5607";
  const cyanWidth = "#5ce1e6";

  return (
    <group visible={visible}>
      {/* 1. Diámetro exterior estimado */}
      <Line
        points={[
          [xLeft, yBottom, zFront],
          [xLeft, yTop, zFront],
        ]}
        color={orangeMain}
        lineWidth={2.2}
      />
      <Line
        points={[
          [0, yBottom, zFront],
          [xLeft, yBottom, zFront],
        ]}
        color={orangeMain}
        lineWidth={1}
        dashed
        dashSize={0.07}
        gapSize={0.05}
      />
      <Line
        points={[
          [0, yTop, zFront],
          [xLeft, yTop, zFront],
        ]}
        color={orangeMain}
        lineWidth={1}
        dashed
        dashSize={0.07}
        gapSize={0.05}
      />
      <Html
        position={[xLeft - 0.16, yCenter, zFront]}
        center
        zIndexRange={[20, 0]}
        style={{ display: visible ? "block" : "none", pointerEvents: "none" }}
      >
        <div className="dim-pill-3d">
          <span className="dim-pill-title">Diámetro exterior est.</span>
          <strong style={{ color: orangeMain }}>≈ {asNumber(info.nominalDiameterMm, 0)} mm</strong>
        </div>
      </Html>

      {/* 2. Diámetro de llanta (aro) */}
      <Line
        points={[
          [xRight, yRimBottom, zFront],
          [xRight, yRimTop, zFront],
        ]}
        color={orangeRim}
        lineWidth={2.0}
      />
      <Line
        points={[
          [0, yRimBottom, zFront],
          [xRight, yRimBottom, zFront],
        ]}
        color={orangeRim}
        lineWidth={1}
        dashed
        dashSize={0.07}
        gapSize={0.05}
      />
      <Line
        points={[
          [0, yRimTop, zFront],
          [xRight, yRimTop, zFront],
        ]}
        color={orangeRim}
        lineWidth={1}
        dashed
        dashSize={0.07}
        gapSize={0.05}
      />
      <Html
        position={[xRight + 0.18, yCenter, zFront]}
        center
        zIndexRange={[20, 0]}
        style={{ display: visible ? "block" : "none", pointerEvents: "none" }}
      >
        <div className="dim-pill-3d">
          <span className="dim-pill-title">Diámetro llanta ({spec.rimInches} pulg)</span>
          <strong style={{ color: orangeRim }}>{asNumber(info.rimMm, 1)} mm</strong>
        </div>
      </Html>

      {/* 3. Altura nominal del perfil */}
      <Line
        points={[
          [xRight * 0.68, yRimTop, zFront + 0.04],
          [xRight * 0.68, yTop, zFront + 0.04],
        ]}
        color={orangeProfile}
        lineWidth={2.2}
      />
      <Html
        position={[xRight * 0.68 + 0.18, (yRimTop + yTop) / 2, zFront + 0.04]}
        center
        zIndexRange={[20, 0]}
        style={{ display: visible ? "block" : "none", pointerEvents: "none" }}
      >
        <div className="dim-pill-3d">
          <span className="dim-pill-title">Altura perfil ({spec.aspect}%)</span>
          <strong style={{ color: orangeProfile }}>{asNumber(info.sidewallMm, 1)} mm</strong>
        </div>
      </Html>

      {/* 4. Anchura nominal */}
      <Line
        points={[
          [0, yBottom + 0.02, -width / 2],
          [0, yBottom + 0.02, width / 2],
        ]}
        color={cyanWidth}
        lineWidth={2.2}
      />
      <Html
        position={[0, yBottom - 0.1, 0]}
        center
        zIndexRange={[20, 0]}
        style={{ display: visible ? "block" : "none", pointerEvents: "none" }}
      >
        <div className="dim-pill-3d">
          <span className="dim-pill-title">Anchura nominal</span>
          <strong style={{ color: cyanWidth }}>{spec.widthMm} mm</strong>
        </div>
      </Html>
    </group>
  );
}

function WheelMesh({ spec, pressure, spin, wireframe }: Props) {
  const wheel = useRef<THREE.Group>(null);
  const info = tireGeometry(spec);
  const radius = info.nominalRadiusM;
  const rim = info.rimMm / 2000;
  const width = spec.widthMm / 1000;
  const tube = (radius - rim) / 2;
  const centerR = rim + tube;
  const lugs = useMemo(() => {
    const out: { angle: number; z: number; id: string }[] = [];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 28; i++)
        out.push({
          angle: (i / 28) * Math.PI * 2 + (row ? Math.PI / 28 : 0),
          z: row ? width * 0.235 : -width * 0.235,
          id: `${row}-${i}`,
        });
    }
    return out;
  }, [width]);

  useFrame((_, delta) => {
    if (spin && wheel.current) wheel.current.rotation.z -= delta * 0.42;
  });

  const pressureDistortion = Math.max(0, (1.4 - pressure) / 1.0) * 0.06;
  return (
    <group position={[0, radius * 0.97, 0]}>
      <group ref={wheel}>
        <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius - pressureDistortion, radius - pressureDistortion, width, 96, 1]} />
          <meshStandardMaterial color="#191e20" roughness={0.96} wireframe={wireframe} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`side-${side}`} castShadow receiveShadow position={[0, 0, side * width * 0.49]}>
            <torusGeometry args={[centerR, tube, 16, 100]} />
            <meshStandardMaterial color="#242a2b" roughness={0.98} wireframe={wireframe} />
          </mesh>
        ))}
        {lugs.map(({ angle, z, id }) => (
          <group
            key={id}
            position={[
              (radius - pressureDistortion + 0.012) * Math.cos(angle),
              (radius - pressureDistortion + 0.012) * Math.sin(angle),
              z,
            ]}
            rotation={[0, 0, angle - Math.PI / 2]}
          >
            <mesh castShadow>
              <boxGeometry args={[0.11, 0.055, width * 0.43]} />
              <meshStandardMaterial color="#383e3c" roughness={1} wireframe={wireframe} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group key={`rim-${side}`} position={[0, 0, side * (width / 2 + 0.028)]}>
            <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[rim * 0.95, rim * 0.95, 0.06, 64]} />
              <meshStandardMaterial color="#cf432d" metalness={0.62} roughness={0.3} wireframe={wireframe} />
            </mesh>
            <mesh position={[0, 0, side * 0.042]}>
              <torusGeometry args={[rim * 0.79, 0.018, 9, 64]} />
              <meshStandardMaterial color="#f27753" metalness={0.5} roughness={0.28} wireframe={wireframe} />
            </mesh>
            {[...Array(8)].map((_, index) => {
              const a = (index / 8) * Math.PI * 2;
              return (
                <mesh key={index} position={[Math.cos(a) * rim * 0.66, Math.sin(a) * rim * 0.66, side * 0.055]}>
                  <circleGeometry args={[0.022, 18]} />
                  <meshStandardMaterial color="#252e31" metalness={0.2} roughness={0.5} />
                </mesh>
              );
            })}
            <mesh position={[0, 0, side * 0.062]}>
              <cylinderGeometry args={[rim * 0.23, rim * 0.23, 0.065, 32]} />
              <meshStandardMaterial color="#666f6d" metalness={0.78} roughness={0.24} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight castShadow position={[5, 9, 7]} intensity={3.0} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 4, -6]} intensity={1.4} color="#b8e9c1" />
      <hemisphereLight intensity={0.7} groundColor="#21312b" />
    </>
  );
}

export default function WheelScene(props: Props) {
  const radius = tireGeometry(props.spec).nominalRadiusM;
  const showCotas = props.showCotas ?? true;
  return (
    <Canvas
      shadows
      dpr={[1, 1.7]}
      camera={{ position: [1.8, 1.35, 3.6], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <color attach="background" args={["#101b1b"]} />
      <fog attach="fog" args={["#101b1b", 7, 13]} />
      <SceneLights />
      <WheelMesh {...props} />
      <WheelCotasOverlay spec={props.spec} visible={showCotas} />
      <Grid
        args={[8, 8]}
        position={[0, -0.024, 0]}
        cellColor="#263a34"
        sectionColor="#3c6345"
        cellThickness={0.5}
        sectionThickness={0.8}
        infiniteGrid
        fadeDistance={9}
        fadeStrength={1.6}
      />
      <ContactShadows position={[0, -0.021, 0]} opacity={0.6} scale={4} blur={2.5} far={1.8} resolution={256} />
      <OrbitControls
        enablePan={false}
        minDistance={2.0}
        maxDistance={6.2}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 1.9}
        target={[0, radius * 0.97, 0]}
      />
    </Canvas>
  );
}

"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DimensionId, Variant } from "@/lib/specs";
import { asNumber, tireFor, tireGeometry, tractorDimensions } from "@/lib/specs";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import RearDiscAttachment3D, { DiscCount } from "@/components/RearDiscAttachment3D";
import TractorTerrain3D, { TerrainMode } from "@/components/TractorTerrain3D";
import TractorCabinInterior3D from "@/components/TractorCabinInterior3D";
import TractorHoodDetails3D from "@/components/TractorHoodDetails3D";

export type CameraViewMode =
  | "iso"
  | "side"
  | "front"
  | "clearance"
  | "tires"
  | "frontTire"
  | "rearTire"
  | "implement";

export type SelectedDimState = DimensionId | "all" | "none";
export type TurnSignalState = "off" | "left" | "right" | "hazard";

type Props = {
  viewMode: CameraViewMode;
  selectedDim: SelectedDimState;
  onSelectDim: (dim: SelectedDimState) => void;
  showFendtGuide: boolean;
  blueprintMode: boolean;
  spinWheels: boolean;
  tireVariant: Variant;
  showTireCotas: boolean;
  onSelectTireAxle?: (axle: "front" | "rear") => void;
  // New interactive systems
  engineOn: boolean;
  lightsOn: boolean;
  turnSignal: TurnSignalState;
  driveSpeed: number; // positive = forward, negative = reverse
  steerAngle: number; // radians: positive = left, negative = right
  rearDiscAssembled: boolean;
  rearDiscHidden?: boolean;
  discCount: DiscCount;
  terrainMode?: TerrainMode;
  dayMode?: boolean;
  plowingActive?: boolean;
};

// Exact official dimensions in meters (1 unit = 1 meter)
const L_TOTAL = tractorDimensions.totalLengthMm / 1000; // 5.516 m
const WHEELBASE = tractorDimensions.wheelbaseMm / 1000; // 2.900 m
const W_TOTAL_STD = tractorDimensions.totalWidthStandardMm / 1000; // 2.650 m
const H_CABIN = tractorDimensions.heightWithoutGuideMm / 1000; // 3.280 m
const H_GUIDE = tractorDimensions.heightWithGuideMm / 1000; // 3.332 m
const CLEARANCE = tractorDimensions.maxGroundClearanceMm / 1000; // 0.570 m

const X_FRONT_TIP = -L_TOTAL / 2; // -2.758
const X_REAR_TIP = L_TOTAL / 2; // +2.758
const X_FRONT_AXLE = -1.48;
const X_REAR_AXLE = X_FRONT_AXLE + WHEELBASE; // +1.42

function CameraRig({ viewMode }: { viewMode: CameraViewMode }) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const targetConfig = useMemo(() => {
    switch (viewMode) {
      case "side":
        return {
          pos: new THREE.Vector3(0.0, 1.85, 8.8),
          lookAt: new THREE.Vector3(0.0, 1.55, 0),
        };
      case "front":
        return {
          pos: new THREE.Vector3(-8.2, 1.75, 0.0),
          lookAt: new THREE.Vector3(0.0, 1.5, 0),
        };
      case "clearance":
        return {
          pos: new THREE.Vector3(-4.4, 0.72, 4.6),
          lookAt: new THREE.Vector3(-0.2, 0.65, 0),
        };
      case "tires":
        return {
          pos: new THREE.Vector3(-0.1, 1.45, 6.9),
          lookAt: new THREE.Vector3(-0.05, 1.0, 1.0),
        };
      case "frontTire":
        return {
          pos: new THREE.Vector3(-1.55, 1.05, 4.2),
          lookAt: new THREE.Vector3(X_FRONT_AXLE, 0.8, 1.05),
        };
      case "rearTire":
        return {
          pos: new THREE.Vector3(1.45, 1.25, 4.6),
          lookAt: new THREE.Vector3(X_REAR_AXLE, 1.02, 1.05),
        };
      case "implement":
        return {
          pos: new THREE.Vector3(6.2, 2.35, 4.8),
          lookAt: new THREE.Vector3(2.9, 0.85, 0),
        };
      case "iso":
      default:
        return {
          pos: new THREE.Vector3(-6.2, 3.6, 6.8),
          lookAt: new THREE.Vector3(0.0, 1.45, 0),
        };
    }
  }, [viewMode]);

  const lastMode = useRef<CameraViewMode>(viewMode);
  const transitionFrames = useRef(0);

  if (lastMode.current !== viewMode) {
    lastMode.current = viewMode;
    transitionFrames.current = 45;
  }

  useFrame(() => {
    if (transitionFrames.current > 0) {
      camera.position.lerp(targetConfig.pos, 0.12);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetConfig.lookAt, 0.14);
        controlsRef.current.update();
      }
      transitionFrames.current -= 1;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      minDistance={2.2}
      maxDistance={16}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI / 2 - 0.01}
      target={[0, 1.45, 0]}
    />
  );
}

function SchematicWheel({
  radius,
  width,
  rimRadius,
  blueprintMode,
  spinWheels,
  driveSpeed,
  steerAngle = 0,
  highlighted,
}: {
  radius: number;
  width: number;
  rimRadius: number;
  blueprintMode: boolean;
  spinWheels: boolean;
  driveSpeed: number;
  steerAngle?: number;
  highlighted?: boolean;
}) {
  const steerGroupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);

  const lugs = useMemo(() => {
    const arr: { angle: number; zOffset: number }[] = [];
    const count = 20;
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < count; i++) {
        arr.push({
          angle: (i / count) * Math.PI * 2 + (row ? Math.PI / count : 0),
          zOffset: row ? width * 0.24 : -width * 0.24,
        });
      }
    }
    return arr;
  }, [width]);

  useFrame((_, delta) => {
    if (steerGroupRef.current) {
      steerGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        steerGroupRef.current.rotation.y,
        steerAngle,
        Math.min(1, delta * 9)
      );
    }
    if (spinGroupRef.current) {
      const effectiveSpeed = driveSpeed !== 0 ? driveSpeed : spinWheels ? 0.55 : 0;
      // Forward motion is towards -X, so rotation around +Z is counter-clockwise
      spinGroupRef.current.rotation.z += (effectiveSpeed / radius) * delta * 1.35;
    }
  });

  const tireColor = blueprintMode ? "#123229" : highlighted ? "#232b2d" : "#1c2224";
  const rimColor = blueprintMode ? "#266348" : "#d13b27";

  return (
    <group ref={steerGroupRef}>
      <group ref={spinGroupRef}>
        <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius, radius, width, 48]} />
          <meshStandardMaterial
            color={tireColor}
            roughness={0.9}
            wireframe={blueprintMode}
            transparent={blueprintMode}
            opacity={blueprintMode ? 0.65 : 1}
          />
        </mesh>

        {[-1, 1].map((side) => (
          <mesh key={side} position={[0, 0, side * (width * 0.48)]}>
            <torusGeometry args={[(radius + rimRadius) / 2, (radius - rimRadius) / 2, 14, 48]} />
            <meshStandardMaterial color={tireColor} roughness={0.92} wireframe={blueprintMode} />
          </mesh>
        ))}

        {!blueprintMode &&
          lugs.map((lug, idx) => (
            <mesh
              key={idx}
              position={[
                (radius + 0.01) * Math.cos(lug.angle),
                (radius + 0.01) * Math.sin(lug.angle),
                lug.zOffset,
              ]}
              rotation={[0, 0, lug.angle - Math.PI / 2]}
              castShadow
            >
              <boxGeometry args={[0.09, 0.04, width * 0.42]} />
              <meshStandardMaterial color="#2a3132" roughness={0.95} />
            </mesh>
          ))}

        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[rimRadius, rimRadius, width + 0.03, 36]} />
          <meshStandardMaterial
            color={rimColor}
            metalness={0.5}
            roughness={0.35}
            wireframe={blueprintMode}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[rimRadius * 0.34, rimRadius * 0.34, width + 0.06, 24]} />
          <meshStandardMaterial color="#2a3033" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** Exhaust Smoke Particles when Engine is ON */
function ExhaustPlume({ engineOn, driveSpeed }: { engineOn: boolean; driveSpeed: number }) {
  const p1 = useRef<THREE.Mesh>(null);
  const p2 = useRef<THREE.Mesh>(null);
  const p3 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!engineOn) return;
    const t = clock.getElapsedTime() * (1.5 + Math.abs(driveSpeed) * 0.8);
    [p1, p2, p3].forEach((ref, idx) => {
      if (!ref.current) return;
      const phase = (t + idx * 0.33) % 1;
      ref.current.position.y = 3.12 + phase * 0.55;
      ref.current.position.x = -0.12 + phase * 0.18;
      const s = 0.04 + phase * 0.09;
      ref.current.scale.set(s, s, s);
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - phase) * 0.32;
    });
  });

  if (!engineOn) return null;

  return (
    <group position={[0, 0, -0.84]}>
      {[p1, p2, p3].map((ref, i) => (
        <mesh key={i} ref={ref} position={[-0.12, 3.15, 0]}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color="#c8dad3" transparent opacity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function TractorModel({
  showFendtGuide,
  blueprintMode,
  spinWheels,
  rFront,
  wFront,
  rimFront,
  rRear,
  wRear,
  rimRear,
  zFrontCenter,
  zRearCenter,
  showTireCotas,
  engineOn,
  lightsOn,
  turnSignal,
  driveSpeed,
  steerAngle,
}: {
  showFendtGuide: boolean;
  blueprintMode: boolean;
  spinWheels: boolean;
  rFront: number;
  wFront: number;
  rimFront: number;
  rRear: number;
  wRear: number;
  rimRear: number;
  zFrontCenter: number;
  zRearCenter: number;
  showTireCotas: boolean;
  engineOn: boolean;
  lightsOn: boolean;
  turnSignal: TurnSignalState;
  driveSpeed: number;
  steerAngle: number;
}) {
  const tractorYawRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const [blinkOn, setBlinkOn] = useState(false);

  const fendtGreen = blueprintMode ? "#1f5e3b" : "#4e8d2a";
  const chassisDark = blueprintMode ? "#173c31" : "#22292a";
  const cabinRoofWhite = blueprintMode ? "#3b7a57" : "#ebefec";

  const hoodShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.22, 1.05);
    s.lineTo(-2.12, 1.78);
    s.quadraticCurveTo(-1.55, 2.02, -0.35, 2.12);
    s.lineTo(-0.35, 1.05);
    s.closePath();
    return s;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBlinkOn((v) => !v);
    }, 340);
    return () => window.clearInterval(timer);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (tractorYawRef.current) {
      tractorYawRef.current.rotation.y = THREE.MathUtils.lerp(
        tractorYawRef.current.rotation.y,
        steerAngle * 0.22,
        0.12
      );
    }
    // Subtle engine vibration & driving suspension pitch/roll
    if (bodyGroupRef.current) {
      const idleVib = engineOn ? Math.sin(t * 42) * 0.0025 : 0;
      const moveBob = Math.abs(driveSpeed) > 0.05 ? Math.sin(t * 9) * 0.008 : 0;
      bodyGroupRef.current.position.y = idleVib + moveBob;
      bodyGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        bodyGroupRef.current.rotation.z,
        driveSpeed * 0.006,
        0.1
      );
      bodyGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        bodyGroupRef.current.rotation.x,
        -steerAngle * Math.abs(driveSpeed) * 0.012,
        0.1
      );
    }
  });

  const leftSignalActive = (turnSignal === "left" || turnSignal === "hazard") && blinkOn;
  const rightSignalActive = (turnSignal === "right" || turnSignal === "hazard") && blinkOn;

  return (
    <group ref={tractorYawRef}>
      <group ref={bodyGroupRef}>
        {/* 1. CHASSIS & POWERTRAIN BLOCK */}
        <mesh position={[0.0, CLEARANCE + 0.31, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.15, 0.62, 0.88]} />
          <meshStandardMaterial
            color={chassisDark}
            roughness={0.7}
            metalness={0.4}
            wireframe={blueprintMode}
          />
        </mesh>

        {/* Front Axle Beam */}
        <mesh position={[X_FRONT_AXLE, rFront, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, zFrontCenter * 2, 24]} />
          <meshStandardMaterial color={chassisDark} metalness={0.6} roughness={0.4} wireframe={blueprintMode} />
        </mesh>
        <mesh position={[X_FRONT_AXLE, CLEARANCE + 0.14, 0]} castShadow>
          <boxGeometry args={[0.46, 0.28, 1.1]} />
          <meshStandardMaterial color="#2c3537" metalness={0.5} roughness={0.5} wireframe={blueprintMode} />
        </mesh>

        {/* Rear Axle Housing */}
        <mesh position={[X_REAR_AXLE, rRear, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, zRearCenter * 2, 24]} />
          <meshStandardMaterial color={chassisDark} metalness={0.6} roughness={0.4} wireframe={blueprintMode} />
        </mesh>

        {/* 2. FRONT LINKAGE */}
        <group position={[-2.42, 0.86, 0]}>
          <mesh position={[0.12, 0.08, 0]} castShadow>
            <boxGeometry args={[0.48, 0.42, 0.64]} />
            <meshStandardMaterial color={chassisDark} metalness={0.6} roughness={0.4} wireframe={blueprintMode} />
          </mesh>
          {[-0.26, 0.26].map((z, i) => (
            <mesh key={i} position={[-0.16, -0.08, z]} rotation={[0, 0, 0.12]} castShadow>
              <boxGeometry args={[0.36, 0.09, 0.07]} />
              <meshStandardMaterial color="#374042" metalness={0.65} roughness={0.35} wireframe={blueprintMode} />
            </mesh>
          ))}
          <mesh position={[-0.08, 0.28, 0]} rotation={[0, 0, -0.25]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.42, 12]} />
            <meshStandardMaterial color="#8fa09e" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>

        {/* 3. REAR LINKAGE */}
        <group position={[2.42, 0.95, 0]}>
          <mesh position={[-0.14, 0.12, 0]} castShadow>
            <boxGeometry args={[0.5, 0.58, 0.78]} />
            <meshStandardMaterial color={chassisDark} metalness={0.6} roughness={0.4} wireframe={blueprintMode} />
          </mesh>
          {[-0.32, 0.32].map((z, i) => (
            <mesh key={i} position={[0.16, -0.08, z]} rotation={[0, 0, -0.1]} castShadow>
              <boxGeometry args={[0.36, 0.1, 0.08]} />
              <meshStandardMaterial color="#374042" metalness={0.65} roughness={0.35} wireframe={blueprintMode} />
            </mesh>
          ))}
        </group>

        {/* 4. SLOPED FENDT 728 HOOD */}
        <mesh position={[0, 0, -0.46]} castShadow receiveShadow>
          <extrudeGeometry
            args={[
              hoodShape,
              { depth: 0.92, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3 },
            ]}
          />
          <meshStandardMaterial
            color={fendtGreen}
            roughness={0.32}
            metalness={0.22}
            wireframe={blueprintMode}
            transparent={blueprintMode}
            opacity={blueprintMode ? 0.55 : 1}
          />
        </mesh>

        {/* Front Grille + Hood Headlights */}
        <mesh position={[-2.19, 1.45, 0]} rotation={[0, 0, -0.14]}>
          <boxGeometry args={[0.08, 0.64, 0.78]} />
          <meshStandardMaterial color="#181d1e" roughness={0.6} metalness={0.4} />
        </mesh>

        {/* Front Hood LED Headlights (Left & Right) */}
        {[-0.27, 0.27].map((z, idx) => (
          <mesh key={`hood-led-${idx}`} position={[-2.21, 1.66, z]} rotation={[0, 0, -0.14]}>
            <boxGeometry args={[0.04, 0.11, 0.18]} />
            <meshStandardMaterial
              color={lightsOn ? "#ffffff" : "#4b5a58"}
              emissive={lightsOn ? "#e0f7ff" : "#000000"}
              emissiveIntensity={lightsOn ? 3.2 : 0}
            />
          </mesh>
        ))}

        {/* COMPONENTES DETALLADOS DEL CAPÓ Y MOTOR (MARCA "FENDT 728 VARIO", SISTEMA CAS CON VENTILADOR, BRANQUIAS LATERALES, PARRILLA Y TANQUES) */}
        <TractorHoodDetails3D
          engineOn={engineOn}
          lightsOn={lightsOn}
          blueprintMode={blueprintMode}
        />

        {/* Volumetric Light Cones & Ground Illumination when Lights are ON */}
        {lightsOn && (
          <group>
            {/* Front Hood Light Beams */}
            {[-0.28, 0.28].map((z, i) => (
              <mesh
                key={`beam-hood-${i}`}
                position={[-3.85, 0.92, z * 1.4]}
                rotation={[0, 0, -Math.PI / 2 - 0.34]}
              >
                <coneGeometry args={[0.95, 3.4, 24, 1, true]} />
                <meshBasicMaterial
                  color="#d8f3ff"
                  transparent
                  opacity={0.13}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            ))}

            {/* Cabin Top Roof Work Light Beams */}
            {[-0.45, 0.45].map((z, i) => (
              <mesh
                key={`beam-roof-${i}`}
                position={[-2.4, 1.65, z * 1.5]}
                rotation={[0, 0, -Math.PI / 2 - 0.52]}
              >
                <coneGeometry args={[1.35, 5.2, 24, 1, true]} />
                <meshBasicMaterial
                  color="#e6f9ff"
                  transparent
                  opacity={0.09}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            ))}

            <pointLight position={[-2.8, 1.6, 0]} intensity={6} distance={9} color="#dff6ff" />
            <pointLight position={[-0.5, 3.35, 0]} intensity={5} distance={11} color="#ffffff" />
            <pointLight position={[2.8, 2.8, 0]} intensity={3.5} distance={7} color="#ff5533" />
          </group>
        )}

        {/* 5. VISIOPLUS CABIN */}
        <group>
          <mesh position={[0.88, 1.38, 0]} castShadow>
            <boxGeometry args={[1.76, 0.36, 1.46]} />
            <meshStandardMaterial color={chassisDark} roughness={0.7} wireframe={blueprintMode} />
          </mesh>

          <mesh position={[0.88, 2.38, 0]} castShadow>
            <boxGeometry args={[1.62, 1.64, 1.42]} />
            <meshPhysicalMaterial
              color={blueprintMode ? "#39d98a" : "#78a89a"}
              transparent
              opacity={blueprintMode ? 0.18 : 0.34}
              roughness={0.12}
              metalness={0.1}
              transmission={0.4}
            />
          </mesh>

          {[
            [0.08, -0.7],
            [0.08, 0.7],
            [1.68, -0.7],
            [1.68, 0.7],
          ].map(([x, z], idx) => (
            <mesh key={idx} position={[x, 2.38, z]} castShadow>
              <boxGeometry args={[0.075, 1.66, 0.075]} />
              <meshStandardMaterial color="#1b2223" roughness={0.5} wireframe={blueprintMode} />
            </mesh>
          ))}

          {/* INTERIOR DETALLADO DE CABINA FENDTONE (SILLA, VOLANTE GIRATORIO, 3 PANTALLAS, CONSOLA Y PALANCA VARIO + ANTENA DE TECHO) */}
          <TractorCabinInterior3D
            steerAngle={steerAngle}
            driveSpeed={driveSpeed}
            engineOn={engineOn}
            blueprintMode={blueprintMode}
            cabinRoofHeight={H_CABIN}
          />

          {/* Guardabarros Traseros Paramétricos (Elevados sobre 2*rRear para que la llanta NUNCA tape ni obstruya el guardabarro) */}
          {[-1, 1].map((side, idx) => {
            const isLeft = side === 1;
            const zFender = side * zRearCenter;
            const fenderWidth = Math.max(0.58, wRear + 0.06);
            const topY = rRear * 2 + 0.11; // Siempre 11 cm por encima de la cima del neumático trasero
            const blinkerActive = isLeft ? leftSignalActive : rightSignalActive;
            return (
              <group key={idx}>
                {/* Arco superior principal del guardabarro trasero */}
                <mesh position={[X_REAR_AXLE, topY, zFender]} castShadow receiveShadow>
                  <boxGeometry args={[1.18, 0.085, fenderWidth]} />
                  <meshStandardMaterial color={fendtGreen} roughness={0.35} wireframe={blueprintMode} />
                </mesh>

                {/* Falda delantera inclinada del guardabarro */}
                <mesh
                  position={[X_REAR_AXLE - 0.68, topY - 0.19, zFender]}
                  rotation={[0, 0, 0.52]}
                  castShadow
                >
                  <boxGeometry args={[0.46, 0.075, fenderWidth]} />
                  <meshStandardMaterial color={fendtGreen} roughness={0.35} wireframe={blueprintMode} />
                </mesh>

                {/* Falda trasera inclinada del guardabarro con faldón negro inferior */}
                <mesh
                  position={[X_REAR_AXLE + 0.68, topY - 0.19, zFender]}
                  rotation={[0, 0, -0.52]}
                  castShadow
                >
                  <boxGeometry args={[0.48, 0.08, fenderWidth]} />
                  <meshStandardMaterial color={fendtGreen} roughness={0.35} wireframe={blueprintMode} />
                </mesh>

                {/* Rear Red Tail Light (sobre la falda trasera elevada) */}
                <mesh position={[X_REAR_AXLE + 0.86, topY - 0.25, zFender]}>
                  <boxGeometry args={[0.055, 0.085, 0.18]} />
                  <meshStandardMaterial
                    color={lightsOn ? "#ff2a2a" : "#4a1c1c"}
                    emissive={lightsOn ? "#ff1e00" : "#000000"}
                    emissiveIntensity={lightsOn ? 2.6 : 0}
                  />
                </mesh>

                {/* Rear Turn Signal Indicator (Amber) */}
                <mesh position={[X_REAR_AXLE + 0.86, topY - 0.25, zFender + (isLeft ? 0.18 : -0.18)]}>
                  <boxGeometry args={[0.06, 0.09, 0.14]} />
                  <meshStandardMaterial
                    color={blinkerActive ? "#ffaa00" : "#4a3510"}
                    emissive={blinkerActive ? "#ff9500" : "#000000"}
                    emissiveIntensity={blinkerActive ? 4.2 : 0}
                  />
                </mesh>
              </group>
            );
          })}

          <group position={[0.18, 1.02, 0.94]}>
            {[0, 0.22, 0.44, 0.66].map((y, idx) => (
              <mesh key={idx} position={[0, y - 0.25, 0]} castShadow>
                <boxGeometry args={[0.34, 0.04, 0.22]} />
                <meshStandardMaterial color="#232a2c" metalness={0.5} roughness={0.6} />
              </mesh>
            ))}
          </group>

          <group position={[-0.12, 2.25, -0.84]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.085, 0.095, 1.52, 20]} />
              <meshStandardMaterial color="#1e2426" metalness={0.6} roughness={0.4} wireframe={blueprintMode} />
            </mesh>
            <mesh position={[0, 0.82, 0]} rotation={[0, 0, 0.35]}>
              <cylinderGeometry args={[0.065, 0.08, 0.22, 16]} />
              <meshStandardMaterial color="#1e2426" metalness={0.6} roughness={0.4} />
            </mesh>
          </group>

          {/* Side Mirrors + Front/Side Turn Signal Blinkers */}
          {[-1, 1].map((side) => {
            const isLeft = side === 1;
            const blinkerActive = isLeft ? leftSignalActive : rightSignalActive;
            return (
              <group key={side} position={[0.12, 2.68, side * 0.98]}>
                <mesh>
                  <boxGeometry args={[0.1, 0.38, 0.18]} />
                  <meshStandardMaterial color="#191f20" roughness={0.5} />
                </mesh>
                {/* Mirror Amber Turn Signal LED */}
                <mesh position={[-0.06, -0.12, side * 0.06]}>
                  <boxGeometry args={[0.08, 0.08, 0.14]} />
                  <meshStandardMaterial
                    color={blinkerActive ? "#ffaa00" : "#443214"}
                    emissive={blinkerActive ? "#ff9500" : "#000000"}
                    emissiveIntensity={blinkerActive ? 4.5 : 0}
                  />
                </mesh>
                {blinkerActive && (
                  <pointLight position={[-0.15, -0.12, side * 0.2]} intensity={3.5} distance={3.5} color="#ff9900" />
                )}
              </group>
            );
          })}

          {/* Cabin White Roof Cap */}
          <mesh position={[0.88, H_CABIN - 0.06, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.72, 0.12, 1.48]} />
            <meshStandardMaterial
              color={cabinRoofWhite}
              roughness={0.35}
              metalness={0.15}
              wireframe={blueprintMode}
            />
          </mesh>

          {/* Front & Rear Upper Roof Work Lights (4 front + 2 rear LEDs) */}
          {[-0.48, -0.22, 0.22, 0.48].map((z, i) => (
            <mesh key={`roof-front-led-${i}`} position={[0.01, H_CABIN - 0.05, z]}>
              <boxGeometry args={[0.04, 0.07, 0.12]} />
              <meshStandardMaterial
                color={lightsOn ? "#ffffff" : "#3a4543"}
                emissive={lightsOn ? "#ffffff" : "#000000"}
                emissiveIntensity={lightsOn ? 3.8 : 0}
              />
            </mesh>
          ))}
          {[-0.42, 0.42].map((z, i) => (
            <mesh key={`roof-rear-led-${i}`} position={[1.75, H_CABIN - 0.05, z]}>
              <boxGeometry args={[0.04, 0.07, 0.12]} />
              <meshStandardMaterial
                color={lightsOn ? "#ffffff" : "#3a4543"}
                emissive={lightsOn ? "#fff4d6" : "#000000"}
                emissiveIntensity={lightsOn ? 2.8 : 0}
              />
            </mesh>
          ))}

          {/* FENDT GUIDE GNSS MODULE & AMBER BEACONS */}
          {showFendtGuide && (
            <group>
              <mesh position={[0.38, H_CABIN + 0.026, 0]} castShadow>
                <boxGeometry args={[0.42, 0.052, 0.46]} />
                <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.2} />
              </mesh>
              {[-0.66, 0.66].map((z, idx) => (
                <group key={idx} position={[1.45, H_CABIN + 0.026, z]}>
                  <mesh>
                    <cylinderGeometry args={[0.045, 0.05, 0.052, 16]} />
                    <meshStandardMaterial
                      color="#ff9f1c"
                      emissive="#ff8800"
                      emissiveIntensity={engineOn || lightsOn ? (blinkOn ? 3.5 : 0.7) : 0.4}
                      roughness={0.2}
                    />
                  </mesh>
                </group>
              ))}
            </group>
          )}
        </group>

        <ExhaustPlume engineOn={engineOn} driveSpeed={driveSpeed} />
      </group>

      {/* 7. FOUR DYNAMICALLY SCALED & STEERABLE WHEELS + FRONT PIVOTING MUDGUARDS */}
      {[-1, 1].map((side) => (
        <group key={`front-${side}`} position={[X_FRONT_AXLE, rFront, side * zFrontCenter]}>
          <SchematicWheel
            radius={rFront}
            width={wFront}
            rimRadius={rimFront}
            blueprintMode={blueprintMode}
            spinWheels={spinWheels}
            driveSpeed={driveSpeed}
            steerAngle={steerAngle}
            highlighted={showTireCotas && side === 1}
          />
          {/* Guardabarro delantero pivotante (siempre elevado por encima de rFront para no obstruir la llanta) */}
          <group rotation={[0, steerAngle, 0]}>
            <mesh position={[0.04, rFront + 0.075, 0]} rotation={[0, 0, -0.06]} castShadow>
              <boxGeometry args={[0.92, 0.045, wFront + 0.05]} />
              <meshStandardMaterial color="#1c2224" roughness={0.65} wireframe={blueprintMode} />
            </mesh>
            <mesh position={[0.48, rFront - 0.08, 0]} rotation={[0, 0, -0.55]} castShadow>
              <boxGeometry args={[0.38, 0.04, wFront + 0.05]} />
              <meshStandardMaterial color="#1c2224" roughness={0.65} wireframe={blueprintMode} />
            </mesh>
          </group>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`rear-${side}`} position={[X_REAR_AXLE, rRear, side * zRearCenter]}>
          <SchematicWheel
            radius={rRear}
            width={wRear}
            rimRadius={rimRear}
            blueprintMode={blueprintMode}
            spinWheels={spinWheels}
            driveSpeed={driveSpeed}
            steerAngle={0}
            highlighted={showTireCotas && side === 1}
          />
        </group>
      ))}
    </group>
  );
}

function DimensionLine3D({
  id,
  start,
  end,
  extStartFrom,
  extEndFrom,
  label,
  valueMm,
  subValue,
  color,
  selectedDim,
  onSelectDim,
  labelOffset = [0, 0, 0],
  forceHide = false,
}: {
  id: DimensionId;
  start: [number, number, number];
  end: [number, number, number];
  extStartFrom?: [number, number, number];
  extEndFrom?: [number, number, number];
  label: string;
  valueMm: string;
  subValue: string;
  color: string;
  selectedDim: SelectedDimState;
  onSelectDim: (dim: SelectedDimState) => void;
  labelOffset?: [number, number, number];
  forceHide?: boolean;
}) {
  const isHidden = selectedDim === "none" || forceHide;
  const isSelected = selectedDim === id;
  const isVisible = !isHidden && (selectedDim === "all" || isSelected);
  const dimOpacity = isHidden ? 0 : selectedDim === "all" ? 0.92 : isSelected ? 1 : 0.18;

  const midPoint: [number, number, number] = [
    (start[0] + end[0]) / 2 + labelOffset[0],
    (start[1] + end[1]) / 2 + labelOffset[1],
    (start[2] + end[2]) / 2 + labelOffset[2],
  ];

  return (
    <group visible={!isHidden}>
      <Line
        points={[start, end]}
        color={color}
        lineWidth={isSelected ? 3.2 : 2.0}
        transparent
        opacity={dimOpacity}
      />

      {extStartFrom && (
        <Line
          points={[extStartFrom, start]}
          color={color}
          lineWidth={1.1}
          dashed
          dashSize={0.12}
          gapSize={0.08}
          transparent
          opacity={dimOpacity * 0.75}
        />
      )}
      {extEndFrom && (
        <Line
          points={[extEndFrom, end]}
          color={color}
          lineWidth={1.1}
          dashed
          dashSize={0.12}
          gapSize={0.08}
          transparent
          opacity={dimOpacity * 0.75}
        />
      )}

      {[start, end].map((pt, i) => (
        <mesh key={i} position={pt}>
          <sphereGeometry args={[isSelected ? 0.042 : 0.028, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={dimOpacity} />
        </mesh>
      ))}

      <Html
        position={midPoint}
        center
        zIndexRange={[20, 0]}
        style={{
          display: isVisible ? "block" : "none",
          pointerEvents: isVisible ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectDim(isSelected ? "all" : id);
          }}
          className={`dim-pill-3d ${isSelected ? "selected" : ""}`}
        >
          <span className="dim-pill-title">{label}</span>
          <strong style={{ color }}>
            {valueMm} <small>{subValue}</small>
          </strong>
        </button>
      </Html>
    </group>
  );
}

function TireDimensions3DOverlay({
  visible,
  tireVariant,
  rFront,
  wFront,
  rimFront,
  rRear,
  wRear,
  rimRear,
  zFrontCenter,
  zRearCenter,
  onSelectTireAxle,
}: {
  visible: boolean;
  tireVariant: Variant;
  rFront: number;
  wFront: number;
  rimFront: number;
  rRear: number;
  wRear: number;
  rimRear: number;
  zFrontCenter: number;
  zRearCenter: number;
  onSelectTireAxle?: (axle: "front" | "rear") => void;
}) {
  const frontSpec = tireFor("front", tireVariant);
  const rearSpec = tireFor("rear", tireVariant);
  const frontGeom = tireGeometry(frontSpec);
  const rearGeom = tireGeometry(rearSpec);

  const zFrontOuter = zFrontCenter + wFront / 2;
  const zFrontInner = zFrontCenter - wFront / 2;
  const zRearOuter = zRearCenter + wRear / 2;
  const zRearInner = zRearCenter - wRear / 2;

  const orangeMain = "#ff8533";
  const orangeRim = "#ffb703";
  const orangeProfile = "#fb5607";
  const cyanWidth = "#5ce1e6";

  const htmlStyle: React.CSSProperties = {
    display: visible ? "block" : "none",
    pointerEvents: visible ? "auto" : "none",
  };

  const renderWheelCotas = (
    axle: "front" | "rear",
    xAxle: number,
    radius: number,
    rimRadius: number,
    zInner: number,
    zOuter: number,
    specKey: string,
    widthMm: number,
    rimInches: number,
    rimMm: number,
    sidewallMm: number,
    diameterMm: number
  ) => {
    const zPlane = zOuter + 0.18;
    const xDiam = xAxle - radius - 0.22;
    const xRim = xAxle + radius + 0.18;
    const xProfile = xAxle + 0.05;

    return (
      <group key={axle} visible={visible}>
        <Html position={[xAxle, radius * 2 + 0.24, zOuter]} center zIndexRange={[25, 0]} style={htmlStyle}>
          <button type="button" onClick={() => onSelectTireAxle?.(axle)} className="dim-pill-3d">
            <span className="dim-pill-title">
              {axle === "front" ? "DEL." : "TRAS."} ({tireVariant === "standard" ? "EST." : "OP. 1"})
            </span>
            <strong style={{ color: "#a8f176" }}>{specKey}</strong>
          </button>
        </Html>

        <Line
          points={[
            [xDiam, 0, zPlane],
            [xDiam, radius * 2, zPlane],
          ]}
          color={orangeMain}
          lineWidth={2.2}
        />
        <Line
          points={[
            [xAxle, 0, zOuter],
            [xDiam, 0, zPlane],
          ]}
          color={orangeMain}
          lineWidth={1}
          dashed
          dashSize={0.08}
          gapSize={0.06}
        />
        <Line
          points={[
            [xAxle, radius * 2, zOuter],
            [xDiam, radius * 2, zPlane],
          ]}
          color={orangeMain}
          lineWidth={1}
          dashed
          dashSize={0.08}
          gapSize={0.06}
        />
        <Html position={[xDiam - 0.16, radius, zPlane]} center zIndexRange={[25, 0]} style={htmlStyle}>
          <div className="dim-pill-3d">
            <span className="dim-pill-title">Ø exterior est.</span>
            <strong style={{ color: orangeMain }}>≈ {asNumber(diameterMm, 0)} mm</strong>
          </div>
        </Html>

        <Line
          points={[
            [xRim, radius - rimRadius, zPlane],
            [xRim, radius + rimRadius, zPlane],
          ]}
          color={orangeRim}
          lineWidth={2.0}
        />
        <Line
          points={[
            [xAxle, radius - rimRadius, zOuter],
            [xRim, radius - rimRadius, zPlane],
          ]}
          color={orangeRim}
          lineWidth={1}
          dashed
          dashSize={0.07}
          gapSize={0.05}
        />
        <Line
          points={[
            [xAxle, radius + rimRadius, zOuter],
            [xRim, radius + rimRadius, zPlane],
          ]}
          color={orangeRim}
          lineWidth={1}
          dashed
          dashSize={0.07}
          gapSize={0.05}
        />
        <Html position={[xRim + 0.16, radius, zPlane]} center zIndexRange={[25, 0]} style={htmlStyle}>
          <div className="dim-pill-3d">
            <span className="dim-pill-title">Ø llanta ({rimInches}&quot;)</span>
            <strong style={{ color: orangeRim }}>{asNumber(rimMm, 1)} mm</strong>
          </div>
        </Html>

        <Line
          points={[
            [xProfile, radius + rimRadius, zPlane + 0.04],
            [xProfile, radius * 2, zPlane + 0.04],
          ]}
          color={orangeProfile}
          lineWidth={2.2}
        />
        <Html position={[xProfile + 0.18, radius + rimRadius + (radius - rimRadius) / 2, zPlane + 0.04]} center zIndexRange={[25, 0]} style={htmlStyle}>
          <div className="dim-pill-3d">
            <span className="dim-pill-title">Perfil</span>
            <strong style={{ color: orangeProfile }}>{asNumber(sidewallMm, 1)} mm</strong>
          </div>
        </Html>

        <Line
          points={[
            [xAxle, 0.03, zInner],
            [xAxle, 0.03, zOuter],
          ]}
          color={cyanWidth}
          lineWidth={2.2}
        />
        <Html position={[xAxle, -0.09, (zInner + zOuter) / 2 + 0.12]} center zIndexRange={[25, 0]} style={htmlStyle}>
          <div className="dim-pill-3d">
            <span className="dim-pill-title">Anchura</span>
            <strong style={{ color: cyanWidth }}>{widthMm} mm</strong>
          </div>
        </Html>
      </group>
    );
  };

  return (
    <group visible={visible}>
      {renderWheelCotas(
        "front",
        X_FRONT_AXLE,
        rFront,
        rimFront,
        zFrontInner,
        zFrontOuter,
        frontSpec.key,
        frontSpec.widthMm,
        frontSpec.rimInches,
        frontGeom.rimMm,
        frontGeom.sidewallMm,
        frontGeom.nominalDiameterMm
      )}
      {renderWheelCotas(
        "rear",
        X_REAR_AXLE,
        rRear,
        rimRear,
        zRearInner,
        zRearOuter,
        rearSpec.key,
        rearSpec.widthMm,
        rearSpec.rimInches,
        rearGeom.rimMm,
        rearGeom.sidewallMm,
        rearGeom.nominalDiameterMm
      )}
    </group>
  );
}

function AllDimensionsOverlay({
  selectedDim,
  onSelectDim,
  showFendtGuide,
  zOuter,
  rFront,
  rRear,
}: {
  selectedDim: SelectedDimState;
  onSelectDim: (dim: SelectedDimState) => void;
  showFendtGuide: boolean;
  zOuter: number;
  rFront: number;
  rRear: number;
}) {
  const zSidePlane = zOuter + 0.55;

  return (
    <group visible={selectedDim !== "none"}>
      <DimensionLine3D
        id="length"
        start={[X_FRONT_TIP, 0.04, zSidePlane + 0.45]}
        end={[X_REAR_TIP, 0.04, zSidePlane + 0.45]}
        extStartFrom={[X_FRONT_TIP, 0.85, 0]}
        extEndFrom={[X_REAR_TIP, 0.95, 0]}
        label="Longitud total"
        valueMm="5.516 mm"
        subValue="(5,516 m)"
        color="#a8f176"
        selectedDim={selectedDim}
        onSelectDim={onSelectDim}
        labelOffset={[0, -0.05, 0]}
      />

      <DimensionLine3D
        id="wheelbase"
        start={[X_FRONT_AXLE, 0.32, zSidePlane]}
        end={[X_REAR_AXLE, 0.32, zSidePlane]}
        extStartFrom={[X_FRONT_AXLE, rFront, zOuter]}
        extEndFrom={[X_REAR_AXLE, rRear, zOuter]}
        label="Batalla (entre ejes)"
        valueMm="2.900 mm"
        subValue="(2,900 m)"
        color="#5ce1e6"
        selectedDim={selectedDim}
        onSelectDim={onSelectDim}
        labelOffset={[0, 0.08, 0]}
      />

      <DimensionLine3D
        id="heightNoGuide"
        start={[2.95, 0, 0.45]}
        end={[2.95, H_CABIN, 0.45]}
        extStartFrom={[1.6, 0, 0.45]}
        extEndFrom={[1.68, H_CABIN, 0.45]}
        label="Altura sin Fendt Guide"
        valueMm="3.280 mm"
        subValue="(3,280 m)"
        color="#ffd166"
        selectedDim={selectedDim}
        onSelectDim={onSelectDim}
        labelOffset={[0.35, -0.25, 0]}
      />

      <DimensionLine3D
        id="heightWithGuide"
        start={[3.45, 0, -0.45]}
        end={[3.45, H_GUIDE, -0.45]}
        extStartFrom={[1.6, 0, -0.45]}
        extEndFrom={[1.45, H_GUIDE, -0.45]}
        label="Altura con Fendt Guide"
        valueMm="3.332 mm"
        subValue="(3,332 m)"
        color="#ff9f1c"
        selectedDim={selectedDim}
        onSelectDim={onSelectDim}
        labelOffset={[0.38, 0.35, 0]}
        forceHide={!showFendtGuide}
      />

      <DimensionLine3D
        id="width"
        start={[X_FRONT_TIP - 0.52, 0.05, -zOuter]}
        end={[X_FRONT_TIP - 0.52, 0.05, zOuter]}
        extStartFrom={[X_FRONT_AXLE, 0.05, -zOuter]}
        extEndFrom={[X_FRONT_AXLE, 0.05, zOuter]}
        label="Anchura total estándar"
        valueMm="2.650 mm"
        subValue="(2,65 m)"
        color="#c084fc"
        selectedDim={selectedDim}
        onSelectDim={onSelectDim}
        labelOffset={[-0.25, 0.08, 0]}
      />

      <DimensionLine3D
        id="clearance"
        start={[X_FRONT_AXLE - 0.55, 0, 0]}
        end={[X_FRONT_AXLE - 0.55, CLEARANCE, 0]}
        extStartFrom={[X_FRONT_AXLE, 0, 0]}
        extEndFrom={[X_FRONT_AXLE, CLEARANCE, 0]}
        label="Despeje máx. suelo"
        valueMm="570 mm"
        subValue="(0,570 m)"
        color="#ff6b6b"
        selectedDim={selectedDim}
        onSelectDim={onSelectDim}
        labelOffset={[-0.38, 0.04, 0.55]}
      />

      {(selectedDim === "clearance" || selectedDim === "all") && (
        <mesh position={[0, CLEARANCE, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, 1.55]} />
          <meshBasicMaterial
            color="#ff6b6b"
            transparent
            opacity={selectedDim === "clearance" ? 0.24 : 0.07}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

export default function TractorSchematic3D({
  viewMode,
  selectedDim,
  onSelectDim,
  showFendtGuide,
  blueprintMode,
  spinWheels,
  tireVariant,
  showTireCotas,
  onSelectTireAxle,
  engineOn,
  lightsOn,
  turnSignal,
  driveSpeed,
  steerAngle,
  rearDiscAssembled,
  rearDiscHidden = false,
  discCount,
  terrainMode = "grid",
  dayMode = true,
  plowingActive = false,
}: Props) {
  const frontSpec = useMemo(() => tireFor("front", tireVariant), [tireVariant]);
  const rearSpec = useMemo(() => tireFor("rear", tireVariant), [tireVariant]);
  const frontGeom = useMemo(() => tireGeometry(frontSpec), [frontSpec]);
  const rearGeom = useMemo(() => tireGeometry(rearSpec), [rearSpec]);

  const rFront = frontGeom.nominalRadiusM;
  const wFront = frontSpec.widthMm / 1000;
  const rimFront = frontGeom.rimMm / 2000;

  const rRear = rearGeom.nominalRadiusM;
  const wRear = rearSpec.widthMm / 1000;
  const rimRear = rearGeom.rimMm / 2000;

  const zOuter = W_TOTAL_STD / 2;
  const zRearCenter = zOuter - wRear / 2;
  const zFrontCenter = zOuter - wFront / 2 - 0.02;

  const sceneBgColor = blueprintMode
    ? "#081715"
    : dayMode
    ? terrainMode === "pasture"
      ? "#cbe4f5"
      : terrainMode === "road"
      ? "#d5e6f2"
      : "#d4e4dc"
    : terrainMode === "pasture"
    ? "#0f1e14"
    : terrainMode === "road"
    ? "#141a18"
    : "#0e1918";

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [-6.2, 3.6, 6.8], fov: 36 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={[sceneBgColor]} />
      <fog attach="fog" args={[sceneBgColor, dayMode ? 14 : 11, dayMode ? 29 : 24]} />

      <ambientLight intensity={dayMode ? 1.75 : lightsOn ? 0.85 : 1.15} />
      <directionalLight
        castShadow
        position={[-7, 11, 8]}
        intensity={dayMode ? 3.2 : lightsOn ? 2.1 : 2.8}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[6, 5, -7]}
        intensity={dayMode ? 1.65 : 1.2}
        color={dayMode ? "#fff7e0" : "#b7f0c0"}
      />
      <hemisphereLight
        intensity={dayMode ? 1.15 : 0.65}
        color={dayMode ? "#ffffff" : "#d8f3dc"}
        groundColor={dayMode ? "#6a8e72" : "#1c2d27"}
      />

      <TractorModel
        showFendtGuide={showFendtGuide}
        blueprintMode={blueprintMode}
        spinWheels={spinWheels}
        rFront={rFront}
        wFront={wFront}
        rimFront={rimFront}
        rRear={rRear}
        wRear={wRear}
        rimRear={rimRear}
        zFrontCenter={zFrontCenter}
        zRearCenter={zRearCenter}
        showTireCotas={showTireCotas}
        engineOn={engineOn}
        lightsOn={lightsOn}
        turnSignal={turnSignal}
        driveSpeed={driveSpeed}
        steerAngle={steerAngle}
      />

      {/* Modular Rear Ballast & 4/6 Disc Attachment */}
      <RearDiscAttachment3D
        assembled={rearDiscAssembled}
        visible={!rearDiscHidden}
        discCount={discCount}
        driveSpeed={driveSpeed}
        spinWheels={spinWheels}
        blueprintMode={blueprintMode}
        showCotas={selectedDim !== "none" || showTireCotas}
      />

      <AllDimensionsOverlay
        selectedDim={selectedDim}
        onSelectDim={onSelectDim}
        showFendtGuide={showFendtGuide}
        zOuter={zOuter}
        rFront={rFront}
        rRear={rRear}
      />

      <TireDimensions3DOverlay
        visible={showTireCotas}
        tireVariant={tireVariant}
        rFront={rFront}
        wFront={wFront}
        rimFront={rimFront}
        rRear={rRear}
        wRear={wRear}
        rimRear={rimRear}
        zFrontCenter={zFrontCenter}
        zRearCenter={zRearCenter}
        onSelectTireAxle={onSelectTireAxle}
      />

      <TractorTerrain3D
        terrainMode={terrainMode}
        blueprintMode={blueprintMode}
        dayMode={dayMode}
        driveSpeed={driveSpeed}
        steerAngle={steerAngle}
        spinWheels={spinWheels}
        frontAxleX={X_FRONT_AXLE}
        plowingActive={plowingActive && rearDiscAssembled && !rearDiscHidden}
        discCount={discCount}
      />

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.55}
        scale={12}
        blur={2.2}
        far={2.5}
        resolution={256}
      />

      <CameraRig viewMode={viewMode} />
    </Canvas>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type Props = {
  steerAngle: number;
  driveSpeed: number;
  engineOn: boolean;
  blueprintMode: boolean;
  cabinRoofHeight: number;
};

/**
 * Modular & Scalable Cabin Interior + Roof Antenna Component for Fendt 728 Vario Gen7.1 (VisioPlus Cabin)
 * Includes:
 * 1. Fendt Evolution Pneumatic Operator Seat (suspension base, cushion, high backrest, headrest, left armrest)
 * 2. Steering Column & Dynamic Steering Wheel (rotates in real time with steerAngle + spinner knob)
 * 3. FendtONE Digital Displays (10" dashboard cluster + 12" armrest terminal + 12" secondary terminal)
 * 4. FendtONE Right Multifunction Armrest Console & Vario Joystick / Lever (tilts with driveSpeed)
 * 5. Small Roof Telemetry / RTK Whip Antenna on top of the cabin roof
 */
export default function TractorCabinInterior3D({
  steerAngle,
  driveSpeed,
  engineOn,
  blueprintMode,
  cabinRoofHeight,
}: Props) {
  const steeringWheelRef = useRef<THREE.Group>(null);
  const varioLeverRef = useRef<THREE.Group>(null);

  useFrame(() => {
    // Rotate steering wheel proportionally to front wheel steering angle
    if (steeringWheelRef.current) {
      steeringWheelRef.current.rotation.y = THREE.MathUtils.lerp(
        steeringWheelRef.current.rotation.y,
        steerAngle * 2.6,
        0.18
      );
    }
    // Tilt the Fendt Vario multifunction joystick forward/backward based on driveSpeed
    if (varioLeverRef.current) {
      const targetTilt = driveSpeed > 0.05 ? -0.24 : driveSpeed < -0.05 ? 0.2 : 0;
      varioLeverRef.current.rotation.z = THREE.MathUtils.lerp(
        varioLeverRef.current.rotation.z,
        targetTilt,
        0.18
      );
    }
  });

  const screenGlow = engineOn ? "#18e09c" : "#163028";
  const screenBg = engineOn ? "#0b2420" : "#101718";

  return (
    <group>
      {/* ==================== 1. SILLA DEL OPERADOR (FENDT EVOLUTION SEAT) ==================== */}
      <group position={[1.02, 1.56, 0]}>
        {/* Fuelle de suspensión neumática inferior */}
        <mesh position={[0, 0.14, 0]} castShadow>
          <boxGeometry args={[0.38, 0.26, 0.38]} />
          <meshStandardMaterial color="#181d1f" roughness={0.85} wireframe={blueprintMode} />
        </mesh>

        {/* Cojín ergonómico del asiento */}
        <mesh position={[-0.02, 0.31, 0]} rotation={[0, 0, -0.05]} castShadow>
          <boxGeometry args={[0.5, 0.11, 0.5]} />
          <meshStandardMaterial color="#252d30" roughness={0.65} wireframe={blueprintMode} />
        </mesh>

        {/* Bordes laterales del cojín */}
        {[-0.22, 0.22].map((zSide, i) => (
          <mesh key={`seat-bolster-${i}`} position={[-0.02, 0.35, zSide]} rotation={[0, 0, -0.05]}>
            <boxGeometry args={[0.46, 0.06, 0.07]} />
            <meshStandardMaterial color="#313b3f" roughness={0.6} wireframe={blueprintMode} />
          </mesh>
        ))}

        {/* Respaldo alto ergonómico */}
        <mesh position={[0.2, 0.68, 0]} rotation={[0, 0, 0.14]} castShadow>
          <boxGeometry args={[0.11, 0.68, 0.46]} />
          <meshStandardMaterial color="#252d30" roughness={0.65} wireframe={blueprintMode} />
        </mesh>

        {/* Cabecero superior con detalle verde Fendt */}
        <mesh position={[0.26, 1.08, 0]} rotation={[0, 0, 0.1]} castShadow>
          <boxGeometry args={[0.09, 0.2, 0.3]} />
          <meshStandardMaterial color="#1d2427" roughness={0.6} wireframe={blueprintMode} />
        </mesh>
        <mesh position={[0.21, 1.08, 0]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.015, 0.05, 0.22]} />
          <meshStandardMaterial color="#4e8d2a" roughness={0.4} />
        </mesh>

        {/* Apoyabrazos izquierdo abatible */}
        <mesh position={[0.02, 0.54, 0.27]} rotation={[0, 0, -0.04]} castShadow>
          <boxGeometry args={[0.38, 0.06, 0.07]} />
          <meshStandardMaterial color="#1e2528" roughness={0.6} wireframe={blueprintMode} />
        </mesh>
      </group>

      {/* ==================== 2. COLUMNA DE DIRECCIÓN, PANTALLA 10" Y VOLANTE ==================== */}
      <group position={[0.36, 1.56, 0]}>
        {/* Pedales inferiores (freno / acelerador) */}
        {[-0.14, 0.0, 0.16].map((zPedal, idx) => (
          <mesh key={`pedal-${idx}`} position={[-0.08, 0.14, zPedal]} rotation={[0, 0, 0.45]}>
            <boxGeometry args={[0.12, 0.03, 0.06]} />
            <meshStandardMaterial color="#191f21" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}

        {/* Columna de dirección inclinada */}
        <mesh position={[0.04, 0.36, 0]} rotation={[0, 0, -0.42]} castShadow>
          <cylinderGeometry args={[0.065, 0.085, 0.62, 16]} />
          <meshStandardMaterial color="#1d2326" roughness={0.6} wireframe={blueprintMode} />
        </mesh>

        {/* Pantalla digital 10" FendtONE en el salpicadero */}
        <group position={[-0.02, 0.62, 0]} rotation={[0, 0, -0.52]}>
          <mesh castShadow>
            <boxGeometry args={[0.04, 0.19, 0.29]} />
            <meshStandardMaterial color="#121719" roughness={0.4} />
          </mesh>
          {/* Cristal activo de la pantalla 10" */}
          <mesh position={[0.022, 0, 0]}>
            <boxGeometry args={[0.006, 0.16, 0.26]} />
            <meshStandardMaterial
              color={screenBg}
              emissive={engineOn ? "#0e6b50" : "#000000"}
              emissiveIntensity={engineOn ? 1.6 : 0}
              roughness={0.2}
            />
          </mesh>
          {/* Barras de telemetría simuladas en el cluster */}
          {engineOn && (
            <group position={[0.026, 0, 0]}>
              <mesh position={[0, 0.04, 0]}>
                <boxGeometry args={[0.004, 0.025, 0.2]} />
                <meshBasicMaterial color={screenGlow} />
              </mesh>
              <mesh position={[0, -0.02, -0.05]}>
                <boxGeometry args={[0.004, 0.05, 0.09]} />
                <meshBasicMaterial color="#5ce1e6" />
              </mesh>
              <mesh position={[0, -0.02, 0.06]}>
                <boxGeometry args={[0.004, 0.05, 0.08]} />
                <meshBasicMaterial color="#a8f176" />
              </mesh>
            </group>
          )}
        </group>

        {/* Grupo del Volante giratorio (rota con steerAngle) */}
        <group position={[0.17, 0.68, 0]} rotation={[0, 0, -1.02]}>
          <group ref={steeringWheelRef}>
            {/* Aro exterior del volante (Torus) */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.19, 0.022, 14, 32]} />
              <meshStandardMaterial color="#161b1d" roughness={0.45} wireframe={blueprintMode} />
            </mesh>
            {/* Cubo central del volante con insignia Fendt */}
            <mesh>
              <cylinderGeometry args={[0.055, 0.06, 0.045, 18]} />
              <meshStandardMaterial color="#262e31" metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <cylinderGeometry args={[0.032, 0.032, 0.008, 16]} />
              <meshStandardMaterial color="#4e8d2a" roughness={0.3} />
            </mesh>
            {/* 3 Radios del volante */}
            {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, i) => (
              <mesh
                key={`spoke-${i}`}
                position={[Math.cos(ang) * 0.09, 0, Math.sin(ang) * 0.09]}
                rotation={[0, -ang, 0]}
              >
                <boxGeometry args={[0.16, 0.018, 0.028]} />
                <meshStandardMaterial color="#2b3438" metalness={0.5} roughness={0.4} />
              </mesh>
            ))}
            {/* Pomo giratorio agrícola (Steering knob) */}
            <mesh position={[0.15, 0.038, 0.1]}>
              <cylinderGeometry args={[0.024, 0.018, 0.055, 12]} />
              <meshStandardMaterial color="#4e8d2a" roughness={0.35} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ==================== 3. CONSOLA LATERAL FENDTONE, PALANCA VARIO Y PANTALLAS 12" ==================== */}
      {/* Ubicada a la derecha del operador (Z negativo porque el tractor mira hacia -X) */}
      <group position={[0.88, 1.56, -0.34]}>
        {/* Cuerpo de la consola multifunción derecha */}
        <mesh position={[0, 0.46, 0]} castShadow>
          <boxGeometry args={[0.66, 0.22, 0.24]} />
          <meshStandardMaterial color="#1f2629" roughness={0.6} wireframe={blueprintMode} />
        </mesh>

        {/* Superficie superior del reposabrazos FendtONE */}
        <mesh position={[-0.02, 0.58, 0.01]} castShadow>
          <boxGeometry args={[0.68, 0.05, 0.26]} />
          <meshStandardMaterial color="#2c3539" roughness={0.5} wireframe={blueprintMode} />
        </mesh>

        {/* Botonera codificada por colores Fendt (naranja motor, azul hidráulico, amarillo TDF, verde enganche) */}
        {[
          { x: -0.14, z: -0.05, col: "#ff9f1c" },
          { x: -0.08, z: -0.05, col: "#38bdf8" },
          { x: -0.02, z: -0.05, col: "#38bdf8" },
          { x: 0.04, z: -0.05, col: "#facc15" },
          { x: 0.1, z: -0.05, col: "#4ade80" },
        ].map((btn, i) => (
          <mesh key={`console-btn-${i}`} position={[btn.x, 0.612, btn.z]}>
            <boxGeometry args={[0.038, 0.018, 0.045]} />
            <meshStandardMaterial
              color={btn.col}
              emissive={engineOn ? btn.col : "#000000"}
              emissiveIntensity={engineOn ? 0.9 : 0}
            />
          </mesh>
        ))}

        {/* PALANCA MULTIFUNCIÓN VARIO (Joystick principal que se inclina con driveSpeed) */}
        <group position={[-0.22, 0.6, 0.04]} ref={varioLeverRef}>
          {/* Fuelle de goma de la palanca */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.032, 0.045, 0.04, 12]} />
            <meshStandardMaterial color="#14181a" roughness={0.9} />
          </mesh>
          {/* Mango ergonómico inclinado de la palanca Vario */}
          <mesh position={[-0.01, 0.11, 0]} rotation={[0, 0, 0.18]} castShadow>
            <boxGeometry args={[0.065, 0.16, 0.06]} />
            <meshStandardMaterial color="#232b2e" roughness={0.45} />
          </mesh>
          {/* Botones iluminados en la cabeza de la palanca Vario */}
          <mesh position={[-0.045, 0.14, 0]}>
            <boxGeometry args={[0.012, 0.06, 0.04]} />
            <meshStandardMaterial
              color="#ff9f1c"
              emissive={engineOn ? "#ff8800" : "#000000"}
              emissiveIntensity={engineOn ? 1.4 : 0}
            />
          </mesh>
        </group>

        {/* Joystick cruzado auxiliar 3L (al lado de la palanca Vario) */}
        <group position={[-0.1, 0.6, 0.05]}>
          <mesh position={[0, 0.075, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.016, 0.13, 12]} />
            <meshStandardMaterial color="#1b2225" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.028, 12, 12]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.35} />
          </mesh>
        </group>

        {/* PANTALLA TÁCTIL PRINCIPAL DE 12" EN EL REPOSABRAZOS FENDTONE */}
        <group position={[-0.36, 0.78, -0.02]} rotation={[0, 0.32, -0.25]}>
          {/* Brazo soporte metálico */}
          <mesh position={[0.06, -0.1, 0]} rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.018, 0.018, 0.18, 10]} />
            <meshStandardMaterial color="#181e20" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Carcasa de la terminal 12" */}
          <mesh castShadow>
            <boxGeometry args={[0.035, 0.24, 0.34]} />
            <meshStandardMaterial color="#14191b" roughness={0.35} />
          </mesh>
          {/* Panel LCD iluminado */}
          <mesh position={[0.02, 0, 0]}>
            <boxGeometry args={[0.006, 0.21, 0.31]} />
            <meshStandardMaterial
              color={screenBg}
              emissive={engineOn ? "#125c42" : "#000000"}
              emissiveIntensity={engineOn ? 1.85 : 0}
              roughness={0.18}
            />
          </mesh>
          {/* Widgets gráficos en la pantalla 12" */}
          {engineOn && (
            <group position={[0.025, 0, 0]}>
              {/* Mapa GPS Fendt Guide en mitad izquierda */}
              <mesh position={[0, 0.01, -0.07]}>
                <boxGeometry args={[0.004, 0.15, 0.13]} />
                <meshBasicMaterial color="#2dd4bf" />
              </mesh>
              {/* Estado de tractor y tripuntal en mitad derecha */}
              <mesh position={[0, 0.04, 0.07]}>
                <boxGeometry args={[0.004, 0.07, 0.12]} />
                <meshBasicMaterial color="#a3e635" />
              </mesh>
              <mesh position={[0, -0.04, 0.07]}>
                <boxGeometry args={[0.004, 0.06, 0.12]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* SEGUNDA PANTALLA TÁCTIL DE 12" EN EL TECHO / PILAR DERECHO */}
      <group position={[0.45, 2.78, -0.56]} rotation={[0.18, 0.42, 0.15]}>
        <mesh castShadow>
          <boxGeometry args={[0.035, 0.21, 0.3]} />
          <meshStandardMaterial color="#14191b" roughness={0.4} />
        </mesh>
        <mesh position={[0.02, 0, 0]}>
          <boxGeometry args={[0.006, 0.18, 0.27]} />
          <meshStandardMaterial
            color={screenBg}
            emissive={engineOn ? "#0d4b6e" : "#000000"}
            emissiveIntensity={engineOn ? 1.6 : 0}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* ==================== 4. ANTENA PEQUEÑA EN EL TECHO DE LA CABINA ==================== */}
      <group position={[1.18, cabinRoofHeight, -0.44]}>
        {/* Base circular negra de la antena */}
        <mesh position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.045, 0.05, 14]} />
          <meshStandardMaterial color="#151a1c" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Resorte inferior amortiguador */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.05, 10]} />
          <meshStandardMaterial color="#2f393d" metalness={0.75} roughness={0.3} />
        </mesh>
        {/* Mástil látigo fino inclinado hacia atrás */}
        <mesh position={[0.055, 0.25, 0]} rotation={[0, 0, -0.28]} castShadow>
          <cylinderGeometry args={[0.005, 0.011, 0.36, 10]} />
          <meshStandardMaterial color="#1e2528" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Punta esférica receptora */}
        <mesh position={[0.105, 0.425, 0]}>
          <sphereGeometry args={[0.014, 10, 10]} />
          <meshStandardMaterial
            color="#4e8d2a"
            emissive={engineOn ? "#68b653" : "#000000"}
            emissiveIntensity={engineOn ? 1.2 : 0}
          />
        </mesh>
      </group>
    </group>
  );
}

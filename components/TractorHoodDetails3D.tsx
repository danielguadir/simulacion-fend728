"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  engineOn: boolean;
  lightsOn: boolean;
  blueprintMode: boolean;
};

/**
 * Modular & Scalable 3D Hood & Engine Bay Components for Fendt 728 Vario Gen7.1
 * Includes:
 * 1. 3D Side Badges & Chrome Lettering Plates ("FENDT 728 VARIO") on Left and Right sides of the hood
 * 2. Front Grille Emblem ("FENDT"), Horizontal Grille Louvers, Chrome Surround & Front Nose Camera
 * 3. Concentric Air System (CAS) Top Hood Intake Vent + Spinning Cooling Fan when engineOn
 * 4. Side Aerodynamic Gill Vents (AGCO Power CORE75 cooling louvers) & Sculpted Hood Ribs
 * 5. Signature Fendt Gen7 LED DRL Strips + Dual Bi-LED Projector Lenses + Lower Work Lamps
 * 6. Side Fuel + AdBlue (Blue Cap) Tank & Thermal Shield Cladding on the Exhaust/SCR Module
 */
export default function TractorHoodDetails3D({
  engineOn,
  lightsOn,
  blueprintMode,
}: Props) {
  const casFanRef = useRef<THREE.Group>(null);

  // Create crisp high-DPI CanvasTextures for the 3D "FENDT 728 VARIO" side hood badges & front emblem
  const { sideBadgeTexture, frontBadgeTexture } = useMemo(() => {
    if (typeof document === "undefined") {
      return { sideBadgeTexture: null, frontBadgeTexture: null };
    }

    // 1. Side Hood Decal Texture: "FENDT 728" + "VARIO" red accent
    const sideCanvas = document.createElement("canvas");
    sideCanvas.width = 1024;
    sideCanvas.height = 256;
    const sctx = sideCanvas.getContext("2d");
    if (sctx) {
      // Metallic dark anthracite background strip with silver border
      sctx.fillStyle = "#182022";
      sctx.fillRect(0, 0, 1024, 256);

      // Top & bottom brushed silver trim lines
      sctx.fillStyle = "#d9e4e0";
      sctx.fillRect(0, 0, 1024, 14);
      sctx.fillRect(0, 242, 1024, 14);

      // Red Vario accent stripe
      sctx.fillStyle = "#e1251b";
      sctx.fillRect(680, 192, 310, 22);

      // "FENDT" bold industrial typography
      sctx.font = "900 132px Arial, Helvetica, sans-serif";
      sctx.fillStyle = "#ffffff";
      sctx.letterSpacing = "4px";
      sctx.fillText("FENDT", 38, 168);

      // "728" silver-mint model number
      sctx.font = "900 136px Arial, Helvetica, sans-serif";
      sctx.fillStyle = "#b8f594";
      sctx.fillText("728", 555, 168);

      // "VARIO" sub-badge
      sctx.font = "800 36px Arial, Helvetica, sans-serif";
      sctx.fillStyle = "#f1f5f9";
      sctx.fillText("VARIO GEN 7.1", 685, 232);
    }
    const sideTex = new THREE.CanvasTexture(sideCanvas);
    sideTex.anisotropy = 8;
    sideTex.needsUpdate = true;

    // 2. Front Grille Center Emblem: "FENDT"
    const frontCanvas = document.createElement("canvas");
    frontCanvas.width = 512;
    frontCanvas.height = 160;
    const fctx = frontCanvas.getContext("2d");
    if (fctx) {
      fctx.fillStyle = "#14191b";
      fctx.fillRect(0, 0, 512, 160);
      fctx.strokeStyle = "#d8e2df";
      fctx.lineWidth = 10;
      fctx.strokeRect(8, 8, 496, 144);

      fctx.font = "900 96px Arial, Helvetica, sans-serif";
      fctx.fillStyle = "#ffffff";
      fctx.textAlign = "center";
      fctx.textBaseline = "middle";
      fctx.fillText("FENDT", 256, 84);
    }
    const frontTex = new THREE.CanvasTexture(frontCanvas);
    frontTex.anisotropy = 8;
    frontTex.needsUpdate = true;

    return { sideBadgeTexture: sideTex, frontBadgeTexture: frontTex };
  }, []);

  // Spin the Concentric Air System (CAS) top hood cooling fan when the engine is running
  useFrame((_, delta) => {
    if (casFanRef.current && engineOn) {
      casFanRef.current.rotation.y += delta * 14.0;
    }
  });

  return (
    <group>
      {/* ==================== 1. PLACAS 3D Y MARCA "FENDT 728 VARIO" EN AMBOS COSTADOS DEL CAPÓ ==================== */}
      {/* Lado Izquierdo (Z = +0.504) y Lado Derecho (Z = -0.504) siguiendo la caída del capó */}
      {[-1, 1].map((side) => {
        const isLeft = side === 1;
        const zSide = side * 0.504;
        return (
          <group
            key={`hood-side-brand-${side}`}
            position={[-1.22, 1.66, zSide]}
            rotation={[0, isLeft ? 0 : Math.PI, isLeft ? -0.14 : 0.14]}
          >
            {/* Base en relieve metálico de la placa lateral */}
            <mesh castShadow>
              <boxGeometry args={[1.28, 0.23, 0.018]} />
              <meshStandardMaterial
                color="#1c2426"
                metalness={0.65}
                roughness={0.3}
                wireframe={blueprintMode}
              />
            </mesh>

            {/* Superficie con el logotipo "FENDT 728 VARIO GEN 7.1" */}
            <mesh position={[0, 0, 0.011]}>
              <planeGeometry args={[1.24, 0.21]} />
              <meshStandardMaterial
                map={sideBadgeTexture ?? undefined}
                color="#ffffff"
                metalness={0.25}
                roughness={0.3}
                emissive={lightsOn ? "#1b3320" : "#000000"}
                emissiveIntensity={lightsOn ? 0.35 : 0}
              />
            </mesh>

            {/* Moldura cromada inferior a lo largo del capó */}
            <mesh position={[0.02, -0.135, 0.006]}>
              <boxGeometry args={[1.36, 0.022, 0.022]} />
              <meshStandardMaterial color="#d4dfdc" metalness={0.85} roughness={0.18} />
            </mesh>
          </group>
        );
      })}

      {/* ==================== 2. BRANQUIAS LATERALES DE REFRIGERACIÓN (SIDE GILL VENTS) ==================== */}
      {[-1, 1].map((side) => {
        const zVent = side * 0.502;
        return (
          <group key={`hood-gills-${side}`}>
            {/* Panel negro de extracción térmica del motor CORE75 */}
            <mesh position={[-1.68, 1.38, zVent]} rotation={[0, 0, -0.14]}>
              <boxGeometry args={[0.62, 0.22, 0.016]} />
              <meshStandardMaterial color="#14191b" roughness={0.75} metalness={0.3} />
            </mesh>

            {/* 5 Aletas / branquias diagonales en relieve */}
            {[-0.22, -0.11, 0.0, 0.11, 0.22].map((dx, idx) => (
              <mesh
                key={`gill-fin-${idx}`}
                position={[-1.68 + dx, 1.38 + dx * 0.14, side * 0.51]}
                rotation={[0, 0, -0.45]}
              >
                <boxGeometry args={[0.032, 0.19, 0.015]} />
                <meshStandardMaterial color="#2c3639" metalness={0.6} roughness={0.35} />
              </mesh>
            ))}

            {/* Nervadura aerodinámica superior del capó */}
            <mesh position={[-1.25, 1.88, side * 0.43]} rotation={[0, 0, -0.15]} castShadow>
              <boxGeometry args={[1.45, 0.035, 0.06]} />
              <meshStandardMaterial color="#3d7520" roughness={0.32} metalness={0.25} wireframe={blueprintMode} />
            </mesh>
          </group>
        );
      })}

      {/* ==================== 3. SISTEMA CONCENTRIC AIR SYSTEM (CAS) EN LA PARTE SUPERIOR DEL CAPÓ ==================== */}
      <group position={[-1.58, 1.93, 0]} rotation={[0, 0, -0.16]}>
        {/* Marco rectangular de rejilla superior en el capó */}
        <mesh castShadow>
          <boxGeometry args={[0.68, 0.04, 0.56]} />
          <meshStandardMaterial color="#171d1f" roughness={0.6} metalness={0.4} wireframe={blueprintMode} />
        </mesh>

        {/* Anillo circular del extractor/ventilador CAS */}
        <mesh position={[0, 0.022, 0]}>
          <cylinderGeometry args={[0.22, 0.24, 0.025, 24]} />
          <meshStandardMaterial color="#273134" metalness={0.65} roughness={0.35} />
        </mesh>

        {/* Rotor de aspas del ventilador CAS (gira cuando engineOn = true) */}
        <group position={[0, 0.018, 0]} ref={casFanRef}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh
              key={`cas-blade-${i}`}
              rotation={[0, (i * Math.PI) / 3, 0.25]}
            >
              <boxGeometry args={[0.38, 0.008, 0.045]} />
              <meshStandardMaterial color="#59686d" metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[0.055, 0.055, 0.03, 16]} />
            <meshStandardMaterial color="#4e8d2a" roughness={0.3} />
          </mesh>
        </group>

        {/* Nervio central longitudinal sobre el capó */}
        <mesh position={[0.58, 0.025, 0]}>
          <boxGeometry args={[0.65, 0.028, 0.12]} />
          <meshStandardMaterial color="#20282a" roughness={0.5} metalness={0.4} />
        </mesh>
      </group>

      {/* ==================== 4. PARRILLA FRONTAL DETALLADA, EMBLEMA "FENDT", FAROS BI-LED Y CÁMARA ==================== */}
      <group position={[-2.21, 1.45, 0]} rotation={[0, 0, -0.14]}>
        {/* Marco cromado perimetral de la calandra frontal */}
        <mesh position={[-0.01, 0, 0]}>
          <boxGeometry args={[0.03, 0.66, 0.82]} />
          <meshStandardMaterial color="#9eaeab" metalness={0.75} roughness={0.25} wireframe={blueprintMode} />
        </mesh>

        {/* Fondo negro de la malla frontal */}
        <mesh position={[-0.022, 0, 0]}>
          <boxGeometry args={[0.025, 0.61, 0.76]} />
          <meshStandardMaterial color="#121618" roughness={0.75} metalness={0.3} />
        </mesh>

        {/* 7 Lamas horizontales de la calandra frontal */}
        {[-0.24, -0.16, -0.08, 0.0, 0.08, 0.16, 0.24].map((yLouver, idx) => (
          <mesh key={`front-louver-${idx}`} position={[-0.036, yLouver, 0]}>
            <boxGeometry args={[0.018, 0.018, 0.7]} />
            <meshStandardMaterial color="#2a3336" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}

        {/* Placa central frontal con el emblema "FENDT" */}
        <mesh position={[-0.045, 0.05, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.32, 0.1]} />
          <meshStandardMaterial
            map={frontBadgeTexture ?? undefined}
            metalness={0.3}
            roughness={0.25}
          />
        </mesh>

        {/* Cámara frontal integrada en el morro (Fendt Visio frontal) */}
        <group position={[-0.048, -0.06, 0]}>
          <mesh>
            <boxGeometry args={[0.03, 0.055, 0.065]} />
            <meshStandardMaterial color="#1d2426" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-0.016, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.01, 14]} />
            <meshStandardMaterial color="#0b1f2e" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>

        {/* Firma lumínica LED diurna (DRL) + Lentes de Proyector Bi-LED Superiores */}
        {[-1, 1].map((side) => {
          const zLamp = side * 0.27;
          return (
            <group key={`front-lamp-cluster-${side}`}>
              {/* Tira DRL superior estilo Fendt Gen7 */}
              <mesh position={[-0.044, 0.27, zLamp]}>
                <boxGeometry args={[0.018, 0.025, 0.21]} />
                <meshStandardMaterial
                  color={lightsOn || engineOn ? "#ffffff" : "#4b5a58"}
                  emissive={lightsOn || engineOn ? "#ccf2ff" : "#000000"}
                  emissiveIntensity={lightsOn ? 3.8 : engineOn ? 1.8 : 0}
                />
              </mesh>

              {/* Lentes gemelos de proyector Bi-LED */}
              {[-0.05, 0.05].map((dz, lIdx) => (
                <mesh
                  key={`projector-${lIdx}`}
                  position={[-0.044, 0.2, zLamp + dz]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.036, 0.036, 0.02, 16]} />
                  <meshStandardMaterial
                    color={lightsOn ? "#ffffff" : "#3a4648"}
                    emissive={lightsOn ? "#dff7ff" : "#000000"}
                    emissiveIntensity={lightsOn ? 3.5 : 0}
                  />
                </mesh>
              ))}

              {/* Faros auxiliares de trabajo inferiores en la parrilla */}
              <mesh position={[-0.042, -0.21, side * 0.25]}>
                <boxGeometry args={[0.02, 0.065, 0.13]} />
                <meshStandardMaterial
                  color={lightsOn ? "#fffbe6" : "#3a4244"}
                  emissive={lightsOn ? "#ffe89e" : "#000000"}
                  emissiveIntensity={lightsOn ? 2.8 : 0}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ==================== 5. COMPONENTES EXTERNOS BAJO EL CAPÓ (TANQUE COMBUSTIBLE + ADBLUE Y PREFILTRO) ==================== */}
      {/* Depósito lateral izquierdo de Diésel + AdBlue (tapa azul) delante de los peldaños */}
      <group position={[-0.48, 1.04, 0.64]}>
        <mesh castShadow>
          <boxGeometry args={[0.68, 0.44, 0.36]} />
          <meshStandardMaterial color="#1f2628" roughness={0.65} metalness={0.3} wireframe={blueprintMode} />
        </mesh>
        {/* Tapa negra de Diésel */}
        <mesh position={[-0.18, 0.24, 0.06]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.04, 14]} />
          <meshStandardMaterial color="#141819" roughness={0.5} />
        </mesh>
        {/* Tapa azul oficial de AdBlue (DEF) */}
        <mesh position={[0.08, 0.24, 0.06]} rotation={[0.3, 0, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.04, 14]} />
          <meshStandardMaterial color="#1d70b8" roughness={0.35} metalness={0.2} />
        </mesh>
      </group>

      {/* Escudo térmico perforado sobre el módulo catalizador SCR (lado derecho bajo el escape) */}
      <group position={[-0.36, 1.15, -0.66]}>
        <mesh castShadow>
          <boxGeometry args={[0.62, 0.42, 0.34]} />
          <meshStandardMaterial color="#3c474a" metalness={0.7} roughness={0.35} wireframe={blueprintMode} />
        </mesh>
        <mesh position={[0, 0.04, -0.175]}>
          <boxGeometry args={[0.52, 0.28, 0.015]} />
          <meshStandardMaterial color="#6e7d80" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>

      {/* Tomas hidráulicas frontales codificadas por colores (junto al tercer punto delantero) */}
      <group position={[-2.24, 1.02, 0]}>
        {[
          { z: -0.14, col: "#ef4444" },
          { z: -0.08, col: "#3b82f6" },
          { z: 0.08, col: "#eab308" },
          { z: 0.14, col: "#22c55e" },
        ].map((port, idx) => (
          <mesh key={`front-hyd-${idx}`} position={[0, 0, port.z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.05, 10]} />
            <meshStandardMaterial color={port.col} roughness={0.3} metalness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

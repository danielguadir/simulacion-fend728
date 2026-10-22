"use client";

import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export type TerrainMode = "grid" | "road" | "pasture";

type Props = {
  terrainMode: TerrainMode;
  blueprintMode: boolean;
  dayMode?: boolean;
  driveSpeed: number;
  steerAngle: number;
  spinWheels: boolean;
  frontAxleX: number;
};

/**
 * Scalable & Maintainable 3D Agricultural Environment & Terrain System
 * Supports 3 modes:
 * - "grid": Technical CAD checkered floor ("Piso en cuadritos")
 * - "road": Rural agricultural track/road with tire ruts, shoulders, dashes & wooden posts ("Camino")
 * - "pasture": Green agricultural pasture with 3D forage plants, crop rows & soil furrows ("Potrero con plantas")
 */
export default function TractorTerrain3D({
  terrainMode,
  blueprintMode,
  dayMode = true,
  driveSpeed,
  steerAngle,
  spinWheels,
  frontAxleX,
}: Props) {
  const yawGroupRef = useRef<THREE.Group>(null);
  const scrollGroupRef = useRef<THREE.Group>(null);

  // 1. Precompute alternating 1m x 1m checkered floor tiles (period = 2.0m, divides 4.0m)
  const checkerTiles = useMemo(() => {
    const tiles: [number, number][] = [];
    for (let ix = -12; ix < 12; ix++) {
      for (let iz = -12; iz < 12; iz++) {
        if ((ix + iz) % 2 === 0) {
          tiles.push([ix + 0.5, iz + 0.5]);
        }
      }
    }
    return tiles;
  }, []);

  // 2. Precompute periodic Road Elements (period = 4.0m in X and Z so wrapping modulo 4.0m is 100% seamless)
  const roadFeatures = useMemo(() => {
    const dashes: number[] = [];
    const posts: { x: number; z: number }[] = [];
    const stones: { x: number; z: number; s: number }[] = [];

    for (let ix = -16; ix <= 16; ix += 2) {
      dashes.push(ix);
    }

    // Repeat every 4m along X and every 8m/12m in Z
    for (let ix = -16; ix <= 16; ix += 4) {
      posts.push({ x: ix, z: -2.65 });
      posts.push({ x: ix, z: 2.65 });
      // Outer secondary posts for wide turns
      posts.push({ x: ix + 2, z: -6.65 });
      posts.push({ x: ix + 2, z: 6.65 });
    }

    // Deterministic gravel/stone accents along the road shoulders (period 4.0m)
    for (let gx = -16; gx < 16; gx += 4) {
      for (let gz = -12; gz < 12; gz += 4) {
        stones.push({ x: gx + 0.8, z: gz + 1.9, s: 0.06 });
        stones.push({ x: gx + 2.3, z: gz - 1.9, s: 0.05 });
        stones.push({ x: gx + 3.4, z: gz + 2.2, s: 0.07 });
      }
    }

    return { dashes, posts, stones };
  }, []);

  // 3. Precompute periodic 3D Plants & Forage tufts for Pasture Mode (strictly periodic every 4.0m in X and Z)
  const pasturePlants = useMemo(() => {
    // Base offsets inside a single 4m x 4m cell (avoiding exact tire center lines slightly for realism while keeping full field coverage)
    const cellOffsets: { dx: number; dz: number; scale: number; rot: number; type: "crop" | "bush" | "flower" }[] = [
      { dx: 0.4, dz: 0.45, scale: 0.95, rot: 0.3, type: "crop" },
      { dx: 1.35, dz: 0.9, scale: 1.15, rot: 1.1, type: "bush" },
      { dx: 2.25, dz: 0.35, scale: 0.88, rot: 2.0, type: "crop" },
      { dx: 3.3, dz: 0.85, scale: 1.05, rot: 0.7, type: "flower" },
      { dx: 0.75, dz: 1.75, scale: 1.2, rot: 1.6, type: "bush" },
      { dx: 1.85, dz: 1.55, scale: 0.9, rot: 2.5, type: "crop" },
      { dx: 2.9, dz: 1.8, scale: 1.1, rot: 0.4, type: "flower" },
      { dx: 3.7, dz: 1.4, scale: 0.85, rot: 1.9, type: "crop" },
      { dx: 0.35, dz: 2.65, scale: 1.08, rot: 0.8, type: "flower" },
      { dx: 1.45, dz: 2.85, scale: 0.92, rot: 2.2, type: "crop" },
      { dx: 2.55, dz: 2.45, scale: 1.18, rot: 1.3, type: "bush" },
      { dx: 3.45, dz: 2.95, scale: 0.96, rot: 2.8, type: "crop" },
      { dx: 0.9, dz: 3.55, scale: 1.12, rot: 0.5, type: "bush" },
      { dx: 2.1, dz: 3.65, scale: 0.86, rot: 1.7, type: "flower" },
      { dx: 3.15, dz: 3.4, scale: 1.02, rot: 2.4, type: "crop" },
    ];

    const instances: {
      x: number;
      z: number;
      scale: number;
      rot: number;
      type: "crop" | "bush" | "flower";
    }[] = [];

    for (let cx = -16; cx < 16; cx += 4) {
      for (let cz = -16; cz < 16; cz += 4) {
        for (const item of cellOffsets) {
          instances.push({
            x: cx + item.dx,
            z: cz + item.dz,
            scale: item.scale,
            rot: item.rot,
            type: item.type,
          });
        }
      }
    }
    return instances;
  }, []);

  // Curved steering trajectory arcs in front of the front wheels when turning left/right
  const steerArcs = useMemo(() => {
    if (Math.abs(steerAngle) < 0.04) return null;
    const sign = Math.sign(steerAngle);
    const leftPts: [number, number, number][] = [];
    const rightPts: [number, number, number][] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const dist = t * 4.2;
      const curveZ = sign * (t * t) * 1.65;
      leftPts.push([frontAxleX - dist, 0.018, -1.05 + curveZ]);
      rightPts.push([frontAxleX - dist, 0.018, 1.05 + curveZ]);
    }
    return { leftPts, rightPts };
  }, [frontAxleX, steerAngle]);

  useFrame((_, delta) => {
    const effectiveSpeed = driveSpeed !== 0 ? driveSpeed : spinWheels ? 0.55 : 0;
    const turnMotion =
      Math.abs(effectiveSpeed) > 0.02
        ? effectiveSpeed
        : Math.abs(steerAngle) > 0.05
        ? 0.95
        : 0;

    if (yawGroupRef.current && Math.abs(steerAngle) > 0.01 && Math.abs(turnMotion) > 0.01) {
      yawGroupRef.current.rotation.y -= steerAngle * turnMotion * delta * 0.95;
    }

    if (scrollGroupRef.current && (Math.abs(effectiveSpeed) > 0.01 || Math.abs(turnMotion) > 0.01)) {
      const linearV = Math.abs(effectiveSpeed) > 0.01 ? effectiveSpeed : turnMotion * 0.7;
      const dWorldX = linearV * delta * 1.85;
      const dWorldZ = -steerAngle * linearV * delta * 1.15;

      const psi = yawGroupRef.current ? yawGroupRef.current.rotation.y : 0;
      const cosP = Math.cos(psi);
      const sinP = Math.sin(psi);

      const dx = dWorldX * cosP - dWorldZ * sinP;
      const dz = dWorldX * sinP + dWorldZ * cosP;

      const nextX = scrollGroupRef.current.position.x + dx;
      const nextZ = scrollGroupRef.current.position.z + dz;

      // Wrap seamlessly modulo 4.0m (exact period of grid, road posts, and pasture plants)
      scrollGroupRef.current.position.x = ((((nextX + 2.0) % 4.0) + 4.0) % 4.0) - 2.0;
      scrollGroupRef.current.position.z = ((((nextZ + 2.0) % 4.0) + 4.0) % 4.0) - 2.0;
    }
  });

  const cellColor = blueprintMode ? "#1f5444" : dayMode ? "#8eb49c" : "#274139";
  const sectionColor = blueprintMode ? "#389e77" : dayMode ? "#568f68" : "#447451";
  const majorColor = blueprintMode ? "#5ce1e6" : dayMode ? "#2f7d32" : "#68b653";
  const tileColor = blueprintMode ? "#0e2922" : dayMode ? "#bdd6c6" : "#152621";

  return (
    <group>
      {/* Dynamic Curved Steering Path Guides when turning Left or Right */}
      {steerArcs && (
        <group>
          <Line
            points={steerArcs.leftPts}
            color="#ffaa00"
            lineWidth={2.2}
            dashed
            dashSize={0.18}
            gapSize={0.12}
          />
          <Line
            points={steerArcs.rightPts}
            color="#ffaa00"
            lineWidth={2.2}
            dashed
            dashSize={0.18}
            gapSize={0.12}
          />
        </group>
      )}

      <group ref={yawGroupRef}>
        <group ref={scrollGroupRef}>
          {/* ==================== MODE 1: CAD CHECKERED GRID ("grid") ==================== */}
          {terrainMode === "grid" && (
            <group>
              {dayMode && !blueprintMode && (
                <mesh position={[0, -0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[38, 38]} />
                  <meshStandardMaterial color="#d8e8df" roughness={0.92} />
                </mesh>
              )}
              <gridHelper args={[32, 32, sectionColor, cellColor]} position={[0, 0.001, 0]} />
              <gridHelper args={[32, 16, majorColor, sectionColor]} position={[0, 0.003, 0]} />
              {checkerTiles.map(([tx, tz], idx) => (
                <mesh key={idx} position={[tx, -0.002, tz]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.96, 0.96]} />
                  <meshBasicMaterial color={tileColor} transparent opacity={dayMode ? 0.55 : 0.42} />
                </mesh>
              ))}
            </group>
          )}

          {/* ==================== MODE 2: RURAL AGRICULTURAL ROAD ("road") ==================== */}
          {terrainMode === "road" && (
            <group>
              {/* Outer rural earth/grass base plane */}
              <mesh position={[0, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[38, 38]} />
                <meshStandardMaterial
                  color={blueprintMode ? "#0d261f" : dayMode ? "#4d7c43" : "#1f3322"}
                  roughness={0.95}
                />
              </mesh>

              {/* Subtle grid overlay for spatial reference */}
              <gridHelper
                args={[36, 18, dayMode ? "#5f8c55" : "#3b523e", dayMode ? "#456e3d" : "#253829"]}
                position={[0, -0.006, 0]}
              />

              {/* Compacted gravel / rural road bed along X (width = 4.6m) */}
              <mesh position={[0, -0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[38, 4.6]} />
                <meshStandardMaterial
                  color={blueprintMode ? "#1b3d36" : dayMode ? "#8b7d6b" : "#4a4339"}
                  roughness={0.92}
                />
              </mesh>

              {/* Raised dirt/gravel shoulders on both edges of the road */}
              {[-2.35, 2.35].map((zEdge, i) => (
                <mesh key={`shoulder-${i}`} position={[0, 0.002, zEdge]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[38, 0.35]} />
                  <meshStandardMaterial color={dayMode ? "#a68e70" : "#695843"} roughness={0.95} />
                </mesh>
              ))}

              {/* Dual compacted tire track ruts (huellas de tractor en el camino) */}
              {[-0.98, 0.98].map((zTrack, i) => (
                <mesh key={`rut-${i}`} position={[0, 0.001, zTrack]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[38, 0.62]} />
                  <meshStandardMaterial color={dayMode ? "#6d5f4f" : "#38322a"} roughness={0.96} />
                </mesh>
              ))}

              {/* Center dashed road markings (repeats every 2m, period divides 4m) */}
              {roadFeatures.dashes.map((xPos, idx) => (
                <mesh key={`dash-${idx}`} position={[xPos, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.95, 0.1]} />
                  <meshBasicMaterial color="#e0b84c" transparent opacity={0.75} />
                </mesh>
              ))}

              {/* Roadside wooden fence/marker posts with reflective bands every 4m */}
              {roadFeatures.posts.map((post, idx) => (
                <group key={`post-${idx}`} position={[post.x, 0, post.z]}>
                  <mesh position={[0, 0.28, 0]} castShadow>
                    <cylinderGeometry args={[0.055, 0.065, 0.56, 10]} />
                    <meshStandardMaterial color="#6e4b2a" roughness={0.85} />
                  </mesh>
                  {/* Reflective top band */}
                  <mesh position={[0, 0.46, 0]}>
                    <cylinderGeometry args={[0.058, 0.058, 0.08, 10]} />
                    <meshStandardMaterial color="#ff9f1c" emissive="#ff6b00" emissiveIntensity={0.4} />
                  </mesh>
                </group>
              ))}

              {/* Gravel/stone clumps along road shoulders */}
              {roadFeatures.stones.map((st, idx) => (
                <mesh key={`stone-${idx}`} position={[st.x, st.s * 0.4, st.z]}>
                  <dodecahedronGeometry args={[st.s, 0]} />
                  <meshStandardMaterial color="#7c7265" roughness={0.9} />
                </mesh>
              ))}
            </group>
          )}

          {/* ==================== MODE 3: PASTURE WITH PLANTS ("pasture") ==================== */}
          {terrainMode === "pasture" && (
            <group>
              {/* Lush green pasture ground base */}
              <mesh position={[0, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[38, 38]} />
                <meshStandardMaterial
                  color={blueprintMode ? "#0e2c22" : dayMode ? "#3b7a38" : "#214423"}
                  roughness={0.95}
                />
              </mesh>

              {/* Alternating pasture strips / mowing bands every 2m */}
              {[-14, -10, -6, -2, 2, 6, 10, 14].map((zBand, idx) => (
                <mesh key={`band-${idx}`} position={[0, -0.006, zBand]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[38, 2.0]} />
                  <meshStandardMaterial
                    color={blueprintMode ? "#12362a" : dayMode ? "#489143" : "#28522a"}
                    roughness={0.95}
                  />
                </mesh>
              ))}

              {/* Tilled soil furrows along the tractor's working path */}
              {[-0.75, -0.25, 0.25, 0.75].map((zFurrow, idx) => (
                <mesh key={`furrow-${idx}`} position={[0, -0.002, zFurrow]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[38, 0.18]} />
                  <meshStandardMaterial color={dayMode ? "#5c4732" : "#3c2f21"} roughness={0.98} />
                </mesh>
              ))}

              {/* 3D Procedural Agricultural Plants, Grass Tufts & Flowering Forage */}
              {pasturePlants.map((p, idx) => (
                <group
                  key={`plant-${idx}`}
                  position={[p.x, 0, p.z]}
                  rotation={[0, p.rot, 0]}
                  scale={[p.scale, p.scale, p.scale]}
                >
                  {/* Central plant stem / foliage cone */}
                  <mesh position={[0, 0.14, 0]} castShadow>
                    <coneGeometry args={[0.14, 0.28, 6]} />
                    <meshStandardMaterial
                      color={p.type === "bush" ? "#3b7a2e" : "#4d9a38"}
                      roughness={0.8}
                      wireframe={blueprintMode}
                    />
                  </mesh>

                  {/* Side angled leaf blades */}
                  <mesh position={[0.06, 0.11, 0]} rotation={[0, 0, -0.45]}>
                    <coneGeometry args={[0.09, 0.22, 5]} />
                    <meshStandardMaterial
                      color="#63b848"
                      roughness={0.75}
                      wireframe={blueprintMode}
                    />
                  </mesh>
                  <mesh position={[-0.06, 0.11, 0.04]} rotation={[0.25, 0, 0.45]}>
                    <coneGeometry args={[0.09, 0.22, 5]} />
                    <meshStandardMaterial
                      color="#52a33b"
                      roughness={0.75}
                      wireframe={blueprintMode}
                    />
                  </mesh>

                  {/* Forage blossom / crop head on "flower" type */}
                  {p.type === "flower" && (
                    <mesh position={[0, 0.29, 0]}>
                      <sphereGeometry args={[0.048, 8, 8]} />
                      <meshStandardMaterial
                        color="#ffd166"
                        emissive="#f4a261"
                        emissiveIntensity={0.2}
                        roughness={0.5}
                      />
                    </mesh>
                  )}
                </group>
              ))}
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Disc,
  Eye,
  EyeOff,
  Leaf,
  Lightbulb,
  Link2,
  Link2Off,
  Moon,
  Power,
  Settings,
  Square,
  Sun,
  X,
} from "lucide-react";
import type { TurnSignalState, CameraViewMode } from "@/components/TractorSchematic3D";
import type { DiscCount } from "@/components/RearDiscAttachment3D";
import type { TerrainMode } from "@/components/TractorTerrain3D";

type Props = {
  engineOn: boolean;
  setEngineOn: React.Dispatch<React.SetStateAction<boolean>>;
  lightsOn: boolean;
  setLightsOn: React.Dispatch<React.SetStateAction<boolean>>;
  turnSignal: TurnSignalState;
  setTurnSignal: React.Dispatch<React.SetStateAction<TurnSignalState>>;
  driveSpeed: number;
  setDriveSpeed: React.Dispatch<React.SetStateAction<number>>;
  steerAngle: number;
  setSteerAngle: React.Dispatch<React.SetStateAction<number>>;
  rearDiscAssembled: boolean;
  setRearDiscAssembled: React.Dispatch<React.SetStateAction<boolean>>;
  rearDiscHidden: boolean;
  setRearDiscHidden: React.Dispatch<React.SetStateAction<boolean>>;
  discCount: DiscCount;
  setDiscCount: React.Dispatch<React.SetStateAction<DiscCount>>;
  terrainMode: TerrainMode;
  setTerrainMode: React.Dispatch<React.SetStateAction<TerrainMode>>;
  dayMode: boolean;
  setDayMode: React.Dispatch<React.SetStateAction<boolean>>;
  plowingActive: boolean;
  setPlowingActive: React.Dispatch<React.SetStateAction<boolean>>;
  onFocusImplement: () => void;
  viewMode: CameraViewMode;
};

/**
 * Compact Right-Side HUD & Floating Settings Modal inside the 3D Tractor Viewport:
 * - Minimalist Power button + Eye Day/Night button + Gear Settings button
 * - Momentary & Auto-Centering Driving D-Pad:
 *   - Holding Forward (↑/W or Up button) moves forward; releasing stops immediately.
 *   - Pressing Left (←/A) or Right (→/D) nudges slightly left/right (~300ms) and automatically straightens the wheels so the tractor continues straight forward, stopping when Forward is released.
 */
export default function TractorControlDeck({
  engineOn,
  setEngineOn,
  lightsOn,
  setLightsOn,
  turnSignal,
  setTurnSignal,
  driveSpeed,
  setDriveSpeed,
  steerAngle,
  setSteerAngle,
  rearDiscAssembled,
  setRearDiscAssembled,
  rearDiscHidden,
  setRearDiscHidden,
  discCount,
  setDiscCount,
  terrainMode,
  setTerrainMode,
  dayMode,
  setDayMode,
  plowingActive,
  setPlowingActive,
  onFocusImplement,
}: Props) {
  const [configOpen, setConfigOpen] = useState(false);

  // Track active hold states & timers so steering nudges slightly and straightens automatically
  const forwardHeldRef = useRef(false);
  const reverseHeldRef = useRef(false);
  const steerResetTimerRef = useRef<number | null>(null);
  const driveStopTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (steerResetTimerRef.current !== null) {
      window.clearTimeout(steerResetTimerRef.current);
      steerResetTimerRef.current = null;
    }
    if (driveStopTimerRef.current !== null) {
      window.clearTimeout(driveStopTimerRef.current);
      driveStopTimerRef.current = null;
    }
  }, []);

  // Start holding Forward (↑ / W or Up button)
  const startForward = useCallback(() => {
    if (driveStopTimerRef.current !== null) {
      window.clearTimeout(driveStopTimerRef.current);
      driveStopTimerRef.current = null;
    }
    forwardHeldRef.current = true;
    setEngineOn(true);
    setDriveSpeed(1.38);
  }, [setDriveSpeed, setEngineOn]);

  // Release Forward -> Stop immediately
  const stopForward = useCallback(() => {
    forwardHeldRef.current = false;
    if (!reverseHeldRef.current) {
      setDriveSpeed(0);
    }
  }, [setDriveSpeed]);

  // Start holding Reverse (↓ / S or Down button)
  const startReverse = useCallback(() => {
    if (driveStopTimerRef.current !== null) {
      window.clearTimeout(driveStopTimerRef.current);
      driveStopTimerRef.current = null;
    }
    reverseHeldRef.current = true;
    setEngineOn(true);
    setDriveSpeed(-0.98);
  }, [setDriveSpeed, setEngineOn]);

  // Release Reverse -> Stop immediately
  const stopReverse = useCallback(() => {
    reverseHeldRef.current = false;
    if (!forwardHeldRef.current) {
      setDriveSpeed(0);
    }
  }, [setDriveSpeed]);

  // Nudge Left or Right slightly, then automatically straighten wheels and continue straight ahead
  const triggerSteerNudge = useCallback(
    (direction: "left" | "right") => {
      clearTimers();
      setEngineOn(true);

      const angle = direction === "left" ? 0.42 : -0.42;
      setSteerAngle(angle);
      setTurnSignal(direction);

      // Ensure tractor moves forward during the nudge
      if (!reverseHeldRef.current) {
        setDriveSpeed(1.38);
      }

      // After 300ms of slight turn, straighten wheels (steerAngle = 0) so tractor goes straight forward
      steerResetTimerRef.current = window.setTimeout(() => {
        setSteerAngle(0);
        setTurnSignal((prev) => (prev === "hazard" ? "hazard" : "off"));

        // If the user is NOT holding Forward/Reverse, let it advance straight for 450ms and then stop cleanly
        if (!forwardHeldRef.current && !reverseHeldRef.current) {
          driveStopTimerRef.current = window.setTimeout(() => {
            if (!forwardHeldRef.current && !reverseHeldRef.current) {
              setDriveSpeed(0);
            }
          }, 450);
        }
      }, 300);
    },
    [clearTimers, setDriveSpeed, setEngineOn, setSteerAngle, setTurnSignal]
  );

  // Keyboard control listener (Arrows + WASD + Space) with keyup auto-stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          startForward();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          startReverse();
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          if (!e.repeat) {
            triggerSteerNudge("left");
          }
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          if (!e.repeat) {
            triggerSteerNudge("right");
          }
          break;
        case " ":
          e.preventDefault();
          clearTimers();
          forwardHeldRef.current = false;
          reverseHeldRef.current = false;
          setDriveSpeed(0);
          setSteerAngle(0);
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          stopForward();
          break;
        case "ArrowDown":
        case "s":
        case "S":
          stopReverse();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [clearTimers, setDriveSpeed, setSteerAngle, startForward, startReverse, stopForward, stopReverse, triggerSteerNudge]);

  const speedKmh = Math.abs(driveSpeed * 11.5).toFixed(1);
  const rpm = engineOn ? (Math.abs(driveSpeed) > 0.1 ? 1550 : 850) : 0;

  return (
    <div className="tractor-hud-right" role="region" aria-label="Controles de conducción y configuración del tractor">
      {/* TOP QUICK ROW: BOTÓN DE ENCENDER + BOTÓN OJO (DÍA/NOCHE) + RUEDITA DE CONFIGURACIÓN */}
      <div className="hud-top-actions">
        <button
          type="button"
          className={`hud-power-btn ${engineOn ? "on" : ""}`}
          onClick={() => {
            const next = !engineOn;
            setEngineOn(next);
            if (!next) {
              clearTimers();
              forwardHeldRef.current = false;
              reverseHeldRef.current = false;
              setDriveSpeed(0);
              setSteerAngle(0);
            }
          }}
          title={engineOn ? `Motor activo (${rpm} RPM) · Clic para apagar` : "Clic para encender el motor"}
        >
          <Power size={14} />
          <span>{engineOn ? "Encendido" : "Encender"}</span>
          <small>{engineOn ? `${rpm} RPM` : "OFF"}</small>
        </button>

        <button
          type="button"
          className={`hud-eye-daynight-btn ${dayMode ? "day" : "night"}`}
          onClick={() => setDayMode((d) => !d)}
          title={dayMode ? "Vista de Día activa · Clic en el ojo para cambiar a Noche" : "Vista de Noche activa · Clic en el ojo para cambiar a Día"}
          aria-label="Cambiar entre vista de día y de noche"
        >
          <Eye size={14} />
          {dayMode ? <Sun size={13} /> : <Moon size={13} />}
          <span>{dayMode ? "Día" : "Noche"}</span>
        </button>

        <button
          type="button"
          className={`hud-gear-btn ${configOpen ? "active" : ""}`}
          onClick={() => setConfigOpen((v) => !v)}
          aria-expanded={configOpen}
          title="Configuración: Luces y Lastre Trasero de Discos"
        >
          <Settings size={16} className={configOpen ? "spin-gear" : ""} />
        </button>
      </div>

      {/* COMPACT RIGHT-SIDE DRIVE & TURN SIGNALS PAD (MINIMAL TEXT / ARROWS) */}
      <div className="hud-drive-pad">
        <div className="hud-drive-head">
          <span className="hud-drive-title">CONDUCCIÓN (WASD / ↑↓←→)</span>
          <span className="hud-speed-pill">
            {driveSpeed > 0
              ? `▲ ${speedKmh} km/h`
              : driveSpeed < 0
              ? `▼ ${speedKmh} km/h`
              : "0,0 km/h"}
          </span>
        </div>

        <div className="hud-dpad-grid">
          {/* Row 1: Hazard | Forward (Hold to move, release to stop) | Stop/Center */}
          <button
            type="button"
            className={`hud-arrow-btn hazard ${turnSignal === "hazard" ? "blinking" : ""}`}
            onClick={() => setTurnSignal((s) => (s === "hazard" ? "off" : "hazard"))}
            title="Luces estacionarias de emergencia"
          >
            <AlertTriangle size={14} />
            <small>Estac.</small>
          </button>

          <button
            type="button"
            className={`hud-arrow-btn ${driveSpeed > 0 ? "active-move" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              startForward();
            }}
            onPointerUp={stopForward}
            onPointerLeave={stopForward}
            onPointerCancel={stopForward}
            title="Mantén presionado para ir hacia Adelante (suelta para detener)"
          >
            <ArrowUp size={17} />
          </button>

          <button
            type="button"
            className="hud-arrow-btn stop"
            onClick={() => {
              clearTimers();
              forwardHeldRef.current = false;
              reverseHeldRef.current = false;
              setDriveSpeed(0);
              setSteerAngle(0);
              setTurnSignal("off");
            }}
            title="Detener y centrar dirección (Espacio)"
          >
            <Square size={12} />
            <small>Stop</small>
          </button>

          {/* Row 2: Left (Nudge left + straighten ahead) | Down (Hold Reverse, release to stop) | Right (Nudge right + straighten ahead) */}
          <button
            type="button"
            className={`hud-arrow-btn ${turnSignal === "left" || steerAngle > 0.1 ? "blinking" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              triggerSteerNudge("left");
            }}
            title="Gira un poquito a la Izquierda y continúa recto hacia adelante"
          >
            <ArrowLeft size={17} />
          </button>

          <button
            type="button"
            className={`hud-arrow-btn ${driveSpeed < 0 ? "active-move" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              startReverse();
            }}
            onPointerUp={stopReverse}
            onPointerLeave={stopReverse}
            onPointerCancel={stopReverse}
            title="Mantén presionado para ir hacia Atrás (suelta para detener)"
          >
            <ArrowDown size={17} />
          </button>

          <button
            type="button"
            className={`hud-arrow-btn ${turnSignal === "right" || steerAngle < -0.1 ? "blinking" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              triggerSteerNudge("right");
            }}
            title="Gira un poquito a la Derecha y continúa recto hacia adelante"
          >
            <ArrowRight size={17} />
          </button>
        </div>

        {/* ESCENARIO / TERRENO 3D: CAMINO AGRÍCOLA vs POTRERO CON PLANTAS vs PISO CAD */}
        <div className="hud-terrain-box" role="group" aria-label="Selector de terreno 3D">
          <span className="hud-terrain-label">TERRENO 3D</span>
          <div className="hud-terrain-btns">
            <button
              type="button"
              className={`hud-terrain-btn road ${terrainMode === "road" ? "active" : ""}`}
              onClick={() => setTerrainMode((m) => (m === "road" ? "grid" : "road"))}
              title="Activar camino rural agrícola 3D con huellas y postes"
            >
              <Compass size={13} />
              <span>Camino</span>
            </button>
            <button
              type="button"
              className={`hud-terrain-btn pasture ${terrainMode === "pasture" ? "active" : ""}`}
              onClick={() => setTerrainMode((m) => (m === "pasture" ? "grid" : "pasture"))}
              title="Activar potrero agrícola 3D con plantas forrajeras y surcos"
            >
              <Leaf size={13} />
              <span>Potrero con Plantas</span>
            </button>
          </div>
          {/* BOTÓN LATERAL PARA APLICAR ARADO CON LOS DISCOS (PINTA EL SUELO EN MODO POTRERO) */}
          <button
            type="button"
            className={`hud-plow-btn ${plowingActive ? "active" : ""}`}
            onClick={() => {
              const next = !plowingActive;
              setPlowingActive(next);
              if (next) {
                setRearDiscHidden(false);
                setRearDiscAssembled(true);
              }
            }}
            title="Activa el arado de discos: cuando el suelo es Potrero con Plantas y el tractor avanza, pinta el suelo de tierra negra/café arada"
          >
            <Disc size={13} />
            <span>
              {plowingActive
                ? terrainMode === "pasture"
                  ? "Arado Activo (Arando Potrero)"
                  : "Arado Activo (Activa Potrero)"
                : "Aplicar Arado"}
            </span>
          </button>

          {terrainMode !== "grid" && (
            <button
              type="button"
              className="hud-terrain-reset"
              onClick={() => setTerrainMode("grid")}
            >
              Volver a Piso Cuadrícula CAD
            </button>
          )}
        </div>
      </div>

      {/* FLOATING NON-BLOCKING MODAL FOR LIGHTS & REAR 3-POINT DISC BALLAST */}
      {configOpen && (
        <div className="hud-config-modal" role="dialog" aria-label="Configuración de luces y lastre trasero">
          <div className="hud-modal-header">
            <span>CONFIGURACIÓN DEL TRACTOR</span>
            <button
              type="button"
              className="hud-modal-close"
              onClick={() => setConfigOpen(false)}
              aria-label="Cerrar configuración"
            >
              <X size={14} />
            </button>
          </div>

          {/* 01 · MOTOR E ILUMINACIÓN (LUCES CAPÓ + TECHO) */}
          <div className="hud-modal-section">
            <div className="hud-modal-sec-head">
              <span className="eyebrow">01 · ILUMINACIÓN DELANTERA Y TECHO</span>
              <span className={`telemetry-badge ${lightsOn ? "online" : ""}`}>
                {lightsOn ? "ACTIVA" : "APAGADA"}
              </span>
            </div>
            <button
              type="button"
              className={`deck-btn lights-btn ${lightsOn ? "on" : ""}`}
              onClick={() => setLightsOn((v) => !v)}
            >
              <Lightbulb size={14} />
              {lightsOn ? "Luces: Prendidas (Capó + Techo)" : "Prender Luces (Capó + Techo)"}
            </button>
          </div>

          {/* 03 · TRIPUNTAL TRASERO CAT. III · LASTRE DE DISCOS */}
          <div className="hud-modal-section">
            <div className="hud-modal-sec-head">
              <span className="eyebrow">03 · TRIPUNTAL TRASERO CAT. III · LASTRE DE DISCOS</span>
              <span className={`telemetry-badge ${rearDiscHidden ? "" : rearDiscAssembled ? "online" : "warn"}`}>
                {rearDiscHidden
                  ? "QUITADO DE VISTA 3D"
                  : rearDiscAssembled
                  ? `ACOPLADO (${discCount} DISCOS)`
                  : "DESENSAMBLADO"}
              </span>
            </div>

            <div className="implement-actions-row">
              <button
                type="button"
                className={`deck-btn assemble-btn ${rearDiscAssembled && !rearDiscHidden ? "assembled" : "disassembled"}`}
                onClick={() => {
                  if (rearDiscHidden) {
                    setRearDiscHidden(false);
                    setRearDiscAssembled(true);
                  } else {
                    setRearDiscAssembled((v) => !v);
                  }
                  onFocusImplement();
                }}
              >
                {rearDiscAssembled && !rearDiscHidden ? <Link2Off size={14} /> : <Link2 size={14} />}
                {rearDiscHidden
                  ? "Ensamblar Lastre"
                  : rearDiscAssembled
                  ? "Desensamblar Lastre"
                  : "Ensamblar Lastre"}
              </button>

              {(!rearDiscAssembled || rearDiscHidden) && (
                <button
                  type="button"
                  className={`deck-btn remove-implement-btn ${rearDiscHidden ? "restore" : ""}`}
                  onClick={() => setRearDiscHidden((v) => !v)}
                  title={
                    rearDiscHidden
                      ? "Volver a mostrar el lastre trasero en la vista 3D"
                      : "Quitar por completo el lastre trasero de la vista 3D"
                  }
                >
                  {rearDiscHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                  {rearDiscHidden ? "Mostrar" : "Quitar"}
                </button>
              )}
            </div>

            <div className="disc-count-selector" role="group" aria-label="Cantidad de discos del lastre trasero">
              <button
                type="button"
                className={discCount === 4 ? "selected" : ""}
                onClick={() => {
                  setRearDiscHidden(false);
                  setDiscCount(4);
                  onFocusImplement();
                }}
              >
                <Disc size={12} /> 4 Discos
              </button>
              <button
                type="button"
                className={discCount === 6 ? "selected" : ""}
                onClick={() => {
                  setRearDiscHidden(false);
                  setDiscCount(6);
                  onFocusImplement();
                }}
              >
                <Disc size={12} /> 6 Discos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

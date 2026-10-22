"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Disc,
  Eye,
  EyeOff,
  Lightbulb,
  Link2,
  Link2Off,
  Power,
  Settings,
  Square,
  X,
} from "lucide-react";
import type { TurnSignalState, CameraViewMode } from "@/components/TractorSchematic3D";
import type { DiscCount } from "@/components/RearDiscAttachment3D";

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
  onFocusImplement: () => void;
  viewMode: CameraViewMode;
};

/**
 * Compact Right-Side HUD & Floating Settings Modal inside the 3D Tractor Viewport:
 * - Minimalist Power button + Gear Settings button (opens modal with Lights & Rear 4/6-Disc Implement)
 * - Compact Arrow D-Pad on the right side for driving & turn signals (WASD / Arrow keys)
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
  onFocusImplement,
}: Props) {
  const [configOpen, setConfigOpen] = useState(false);

  // Keyboard control listener (Arrows + WASD + Space)
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
          setEngineOn(true);
          setDriveSpeed(1.35);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          setEngineOn(true);
          setDriveSpeed(-0.95);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          setEngineOn(true);
          setDriveSpeed((prev) => (Math.abs(prev) < 0.05 ? 1.25 : prev));
          setSteerAngle(0.48);
          setTurnSignal("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          setEngineOn(true);
          setDriveSpeed((prev) => (Math.abs(prev) < 0.05 ? 1.25 : prev));
          setSteerAngle(-0.48);
          setTurnSignal("right");
          break;
        case " ":
          e.preventDefault();
          setDriveSpeed(0);
          setSteerAngle(0);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setDriveSpeed, setEngineOn, setSteerAngle, setTurnSignal]);

  const speedKmh = Math.abs(driveSpeed * 11.5).toFixed(1);
  const rpm = engineOn ? (Math.abs(driveSpeed) > 0.1 ? 1550 : 850) : 0;

  return (
    <div className="tractor-hud-right" role="region" aria-label="Controles de conducción y configuración del tractor">
      {/* TOP QUICK ROW: BOTÓN DE ENCENDER + RUEDITA DE CONFIGURACIÓN */}
      <div className="hud-top-actions">
        <button
          type="button"
          className={`hud-power-btn ${engineOn ? "on" : ""}`}
          onClick={() => {
            const next = !engineOn;
            setEngineOn(next);
            if (!next) {
              setDriveSpeed(0);
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
          {/* Row 1: Hazard | Forward (Up) | Stop/Center */}
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
            onClick={() => {
              if (driveSpeed > 0) {
                setDriveSpeed(0);
              } else {
                setEngineOn(true);
                setDriveSpeed(1.35);
              }
            }}
            title="Adelante (Flecha Arriba / W)"
          >
            <ArrowUp size={17} />
          </button>

          <button
            type="button"
            className="hud-arrow-btn stop"
            onClick={() => {
              setDriveSpeed(0);
              setSteerAngle(0);
              setTurnSignal("off");
            }}
            title="Detener y centrar dirección (Espacio)"
          >
            <Square size={12} />
            <small>Stop</small>
          </button>

          {/* Row 2: Left | Down (Reverse) | Right */}
          <button
            type="button"
            className={`hud-arrow-btn ${turnSignal === "left" || steerAngle > 0.1 ? "blinking" : ""}`}
            onClick={() => {
              if (turnSignal === "left" && steerAngle > 0) {
                setTurnSignal("off");
                setSteerAngle(0);
              } else {
                setEngineOn(true);
                if (Math.abs(driveSpeed) < 0.05) setDriveSpeed(1.25);
                setTurnSignal("left");
                setSteerAngle(0.48);
              }
            }}
            title="Direccional y giro Izquierda (Flecha Izquierda / A)"
          >
            <ArrowLeft size={17} />
          </button>

          <button
            type="button"
            className={`hud-arrow-btn ${driveSpeed < 0 ? "active-move" : ""}`}
            onClick={() => {
              if (driveSpeed < 0) {
                setDriveSpeed(0);
              } else {
                setEngineOn(true);
                setDriveSpeed(-0.95);
              }
            }}
            title="Atrás / Reversa (Flecha Abajo / S)"
          >
            <ArrowDown size={17} />
          </button>

          <button
            type="button"
            className={`hud-arrow-btn ${turnSignal === "right" || steerAngle < -0.1 ? "blinking" : ""}`}
            onClick={() => {
              if (turnSignal === "right" && steerAngle < 0) {
                setTurnSignal("off");
                setSteerAngle(0);
              } else {
                setEngineOn(true);
                if (Math.abs(driveSpeed) < 0.05) setDriveSpeed(1.25);
                setTurnSignal("right");
                setSteerAngle(-0.48);
              }
            }}
            title="Direccional y giro Derecha (Flecha Derecha / D)"
          >
            <ArrowRight size={17} />
          </button>
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

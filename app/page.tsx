"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDownRight, ArrowLeftRight, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Compass,
  Droplets, Eye, EyeOff, Gauge, Leaf, Maximize2, Pause, Play, RotateCcw, Ruler, Settings2,
  ShieldCheck, SlidersHorizontal, Sparkles, Truck, Weight, Wind, X,
} from "lucide-react";
import {
  Axle, DimensionId, Variant, asNumber, barToPsi, idealContactAreaCm2,
  sources, tireFor, tireGeometry, tractorDimensionList,
} from "@/lib/specs";
import type { CameraViewMode, SelectedDimState, TurnSignalState } from "@/components/TractorSchematic3D";
import type { DiscCount } from "@/components/RearDiscAttachment3D";
import type { TerrainMode } from "@/components/TractorTerrain3D";
import TractorControlDeck from "@/components/TractorControlDeck";

const WheelScene = dynamic(() => import("@/components/WheelScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Preparando vista tridimensional…</div>,
});

const TractorSchematic3D = dynamic(() => import("@/components/TractorSchematic3D"), {
  ssr: false,
  loading: () => <div className="scene-loading">Generando esquema 3D del Fendt 728 Vario Gen7.1…</div>,
});

type Tab = "schematic" | "dimensions" | "pressure" | "variogrip" | "loads";
const navigation: { id: Tab; name: string; icon: typeof Ruler }[] = [
  { id: "schematic", name: "Esquema 3D (Tractor + Llantas)", icon: Maximize2 },
  { id: "dimensions", name: "Laboratorio 3D de Llanta", icon: Ruler },
  { id: "pressure", name: "Presión y suelo", icon: Gauge },
  { id: "variogrip", name: "Sistema VarioGrip", icon: Wind },
  { id: "loads", name: "Cargas y explicación", icon: Weight },
];
const bound = (number: number, min: number, max: number) => Math.min(max, Math.max(min, number));

function BigMetric({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  return <div className="big-metric"><span>{label}</span><strong>{value}<small>{unit}</small></strong>{note && <em>{note}</em>}</div>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="source-tag"><Check size={12}/>{children}</span>;
}

/** Esquema técnico escalable en SVG para cada neumático (vista perfil + vista frontal de banda) */
function ScalableTireSchematicSVG({
  title,
  specKey,
  widthMm,
  aspect,
  rimInches,
  sidewallMm,
  rimMm,
  diameterMm,
  isRear,
}: {
  title: string;
  specKey: string;
  widthMm: number;
  aspect: number;
  rimInches: number;
  sidewallMm: number;
  rimMm: number;
  diameterMm: number;
  isRear: boolean;
}) {
  // Proportional scaling relative to max 2100mm diameter and 750mm width
  const rOuter = Math.round((diameterMm / 2100) * 78);
  const rRim = Math.round((rimMm / 2100) * 78);
  const treadW = Math.round((widthMm / 750) * 68);
  const cy = 128;
  const cxSide = 148;
  const cxFront = 315;

  const yTop = cy - rOuter;
  const yBottom = cy + rOuter;
  const yRimTop = cy - rRim;
  const yRimBottom = cy + rRim;

  return (
    <div className="tire-schematic-card">
      <div className="tire-schematic-head">
        <div>
          <span className="eyebrow">{title}</span>
          <h4>
            <span className="tire-badge-code">{specKey}</span>
          </h4>
        </div>
        <span className="source-tag">{isRear ? "Eje Trasero (Tracción)" : "Eje Delantero (Dirección/4WD)"}</span>
      </div>

      <svg
        viewBox="0 0 410 250"
        className="tire-schematic-svg"
        role="img"
        aria-label={`Esquema dimensional escalable del neumático ${specKey}`}
      >
        <defs>
          <pattern id={`grid-${specKey}`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#1a3329" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="410" height="250" rx="10" fill="#091512" />
        <rect width="410" height="250" rx="10" fill={`url(#grid-${specKey})`} />

        {/* --- 1. SIDE PROFILE VIEW (Left) --- */}
        {/* Outer Tire Circle */}
        <circle cx={cxSide} cy={cy} r={rOuter} fill="#1b2223" stroke="#3c4b47" strokeWidth="3" />
        {/* Sidewall ring */}
        <circle cx={cxSide} cy={cy} r={(rOuter + rRim) / 2} fill="none" stroke="#293433" strokeWidth="1.5" strokeDasharray="5 4" />
        {/* Fendt Red Rim */}
        <circle cx={cxSide} cy={cy} r={rRim} fill="#cf3b25" stroke="#ff7152" strokeWidth="2.5" />
        <circle cx={cxSide} cy={cy} r={rRim * 0.35} fill="#252e30" stroke="#7d8f8b" strokeWidth="1.5" />

        {/* Cota: Diámetro exterior estimado (Left orange arrow) */}
        <line x1={cxSide - rOuter - 28} y1={yTop} x2={cxSide} y2={yTop} stroke="#ff8533" strokeWidth="1" strokeDasharray="3 2" />
        <line x1={cxSide - rOuter - 28} y1={yBottom} x2={cxSide} y2={yBottom} stroke="#ff8533" strokeWidth="1" strokeDasharray="3 2" />
        <line x1={cxSide - rOuter - 24} y1={yTop} x2={cxSide - rOuter - 24} y2={yBottom} stroke="#ff8533" strokeWidth="2" />
        <text x={cxSide - rOuter - 30} y={cy - 6} fill="#cbdcd0" fontSize="8.5" textAnchor="end">Ø exterior est.</text>
        <text x={cxSide - rOuter - 30} y={cy + 7} fill="#ff8533" fontSize="11" fontWeight="bold" textAnchor="end">
          ≈ {asNumber(diameterMm, 0)} mm
        </text>

        {/* Cota: Altura nominal del perfil (Top-right orange arrow) */}
        <line x1={cxSide} y1={yTop} x2={cxSide + rOuter + 18} y2={yTop} stroke="#fb5607" strokeWidth="1" strokeDasharray="3 2" />
        <line x1={cxSide} y1={yRimTop} x2={cxSide + rOuter + 18} y2={yRimTop} stroke="#fb5607" strokeWidth="1" strokeDasharray="3 2" />
        <line x1={cxSide + rOuter + 14} y1={yTop} x2={cxSide + rOuter + 14} y2={yRimTop} stroke="#fb5607" strokeWidth="2" />
        <text x={cxSide + rOuter + 20} y={(yTop + yRimTop) / 2 - 3} fill="#cbdcd0" fontSize="8.5">
          Perfil ({aspect}%):
        </text>
        <text x={cxSide + rOuter + 20} y={(yTop + yRimTop) / 2 + 9} fill="#fb5607" fontSize="10.5" fontWeight="bold">
          {asNumber(sidewallMm, 1)} mm
        </text>

        {/* Cota: Diámetro de llanta / aro (Middle-right amber arrow) */}
        <line x1={cxSide} y1={yRimBottom} x2={cxSide + rOuter + 18} y2={yRimBottom} stroke="#ffb703" strokeWidth="1" strokeDasharray="3 2" />
        <line x1={cxSide + rOuter + 14} y1={yRimTop} x2={cxSide + rOuter + 14} y2={yRimBottom} stroke="#ffb703" strokeWidth="2" />
        <text x={cxSide + rOuter + 20} y={cy - 2} fill="#cbdcd0" fontSize="8.5">
          Llanta R{rimInches}:
        </text>
        <text x={cxSide + rOuter + 20} y={cy + 10} fill="#ffb703" fontSize="10.5" fontWeight="bold">
          {asNumber(rimMm, 1)} mm
        </text>

        {/* --- 2. FRONT TREAD WIDTH VIEW (Right) --- */}
        <rect
          x={cxFront - treadW / 2}
          y={yTop}
          width={treadW}
          height={rOuter * 2}
          rx="10"
          fill="#1d2526"
          stroke="#495b56"
          strokeWidth="2"
        />
        {/* Chevron agricultural lugs pattern */}
        {[-0.65, -0.35, -0.05, 0.25, 0.55].map((rel, i) => {
          const ly = cy + rel * rOuter;
          return (
            <g key={i} stroke="#364442" strokeWidth="4" strokeLinecap="round">
              <line x1={cxFront - treadW * 0.42} y1={ly + 7} x2={cxFront - 3} y2={ly - 4} />
              <line x1={cxFront + treadW * 0.42} y1={ly + 7} x2={cxFront + 3} y2={ly - 4} />
            </g>
          );
        })}

        {/* Cota: Anchura nominal */}
        <line x1={cxFront - treadW / 2} y1={yTop - 16} x2={cxFront - treadW / 2} y2={yTop} stroke="#5ce1e6" strokeWidth="1.2" />
        <line x1={cxFront + treadW / 2} y1={yTop - 16} x2={cxFront + treadW / 2} y2={yTop} stroke="#5ce1e6" strokeWidth="1.2" />
        <line x1={cxFront - treadW / 2} y1={yTop - 12} x2={cxFront + treadW / 2} y2={yTop - 12} stroke="#5ce1e6" strokeWidth="2" />
        <text x={cxFront} y={yTop - 20} fill="#5ce1e6" fontSize="10.5" fontWeight="bold" textAnchor="middle">
          {widthMm} mm
        </text>
        <text x={cxFront} y={yBottom + 16} fill="#9eb8a4" fontSize="8.5" textAnchor="middle">
          Anchura nominal
        </text>
      </svg>

      <div className="tire-schematic-metrics">
        <div>
          <span>Anchura nominal</span>
          <strong>{widthMm} mm</strong>
        </div>
        <div>
          <span>Altura perfil ({aspect}%)</span>
          <strong>{asNumber(sidewallMm, 1)} mm</strong>
        </div>
        <div>
          <span>Diámetro llanta ({rimInches}&quot;)</span>
          <strong>{asNumber(rimMm, 1)} mm</strong>
        </div>
        <div>
          <span>Ø exterior estimado</span>
          <strong className="highlight-orange">≈ {asNumber(diameterMm, 0)} mm</strong>
        </div>
      </div>

      <div className="tire-formula-inline">
        <b>Cálculo técnico:</b> Perfil = {widthMm} × 0,{aspect} = <b>{asNumber(sidewallMm, 1)} mm</b> · Ø Total ={" "}
        {asNumber(rimMm, 1)} + 2×{asNumber(sidewallMm, 1)} = <b>{asNumber(diameterMm, 1)} mm</b>
      </div>
    </div>
  );
}

function ContactPatch({ pressure, load }: { pressure: number; load: number }) {
  const area = idealContactAreaCm2(load, pressure);
  const rx = bound(Math.sqrt(area) * 2.2, 76, 205);
  return <div className="patch-layout">
    <div className="patch-scene">
      <div className="patch-caption">Huella idealizada sobre el terreno</div>
      <svg viewBox="0 0 510 280" role="img" aria-label="Ilustración cualitativa: la huella aumenta al disminuir la presión de inflado bajo la misma carga">
        <defs>
          <pattern id="soiltexture" width="18" height="12" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1" fill="#789274" opacity="0.48"/></pattern>
          <radialGradient id="patchGradient"><stop offset="0" stopColor="#96e064" stopOpacity="0.75"/><stop offset="1" stopColor="#4b9e39" stopOpacity="0.27"/></radialGradient>
        </defs>
        <path d="M22 230 L480 230 L503 266 L0 266Z" fill="#314237" />
        <path d="M22 230 L480 230 L503 266 L0 266Z" fill="url(#soiltexture)" />
        <ellipse cx="256" cy="221" rx={rx} ry={bound(rx * 0.31, 25, 58)} fill="url(#patchGradient)" stroke="#a7ed83" strokeWidth="1.5" strokeDasharray="5 4"/>
        <ellipse cx="256" cy="130" rx="111" ry="112" fill="#272d2d" stroke="#6b7871" strokeWidth="8" />
        <ellipse cx="256" cy="130" rx="58" ry="58" fill="#b94227" stroke="#f4714f" strokeWidth="9" />
        <circle cx="256" cy="130" r="21" fill="#515f63" stroke="#9cabae" strokeWidth="4"/>
        <path d="M110 220 H403" stroke="#d4f5a7" strokeWidth="1" strokeDasharray="4 5" />
        <text x="24" y="24" fill="#b0bea9" fontSize="14">Representación conceptual · no a escala</text>
      </svg>
      <div className="patch-scale"><span>Mayor presión → huella menor</span><span>Menor presión → huella mayor</span></div>
    </div>
    <div className="patch-stats">
      <div className="eyebrow">Modelo simplificado A = F / p</div>
      <strong>{asNumber(area)} <small>cm²</small></strong>
      <p>Área idealizada estimada con la carga elegida, suponiendo que la presión media de contacto es igual a la de inflado.</p>
      <div className="fraction"><span>F = {asNumber(load)} × 9,81 N</span><div/><span>p = {asNumber(pressure, 1)} × 100.000 Pa</span></div>
      <p className="accent-note">La huella real también depende de la carcasa, dibujo, suelo y deflexión. Este valor NO es un resultado validado por Fendt.</p>
    </div>
  </div>;
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("schematic");
  const [axle, setAxle] = useState<Axle>("rear");
  const [variant, setVariant] = useState<Variant>("standard");
  const [pressure, setPressure] = useState(1.2);
  const [target, setTarget] = useState(1.8);
  const [running, setRunning] = useState(false);
  const [spin, setSpin] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [load, setLoad] = useState(1800);
  const [showSources, setShowSources] = useState(false);
  const [showWheelCotas, setShowWheelCotas] = useState(true);

  // 3D Tractor Schematic states
  const [viewMode, setViewMode] = useState<CameraViewMode>("iso");
  const [selectedDim, setSelectedDim] = useState<SelectedDimState>("all");
  const [showFendtGuide, setShowFendtGuide] = useState(true);
  const [blueprintMode, setBlueprintMode] = useState(false);
  const [showTireCotas, setShowTireCotas] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState<"tractor" | "tires">("tractor");
  const [topCotasDropdownOpen, setTopCotasDropdownOpen] = useState(false);
  const [showReferenceSheet, setShowReferenceSheet] = useState(true);

  // Interactive Tractor Systems: Ignition, Lights, Driving, Steering, Turn Signals & Rear 4/6-Disc Implement
  const [engineOn, setEngineOn] = useState(true);
  const [lightsOn, setLightsOn] = useState(true);
  const [turnSignal, setTurnSignal] = useState<TurnSignalState>("off");
  const [driveSpeed, setDriveSpeed] = useState(0);
  const [steerAngle, setSteerAngle] = useState(0);
  const [rearDiscAssembled, setRearDiscAssembled] = useState(true);
  const [rearDiscHidden, setRearDiscHidden] = useState(false);
  const [discCount, setDiscCount] = useState<DiscCount>(6);
  const [terrainMode, setTerrainMode] = useState<TerrainMode>("grid");

  const spec = useMemo(() => tireFor(axle, variant), [axle, variant]);
  const geom = useMemo(() => tireGeometry(spec), [spec]);

  const frontSpec = useMemo(() => tireFor("front", variant), [variant]);
  const rearSpec = useMemo(() => tireFor("rear", variant), [variant]);
  const frontGeom = useMemo(() => tireGeometry(frontSpec), [frontSpec]);
  const rearGeom = useMemo(() => tireGeometry(rearSpec), [rearSpec]);

  const status = Math.abs(target - pressure) < 0.05 ? "Presión alcanzada" : target > pressure ? "Inflando (simulado)" : "Desinflando (simulado)";

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setPressure((current) => {
        const diff = target - current;
        if (Math.abs(diff) < 0.019) { setRunning(false); return target; }
        return bound(Math.round((current + Math.sign(diff) * Math.min(Math.abs(diff), 0.025)) * 1000) / 1000, 0.6, 2.5);
      });
    }, 75);
    return () => window.clearInterval(timer);
  }, [running, target]);

  const goPreset = (next: number) => { setTarget(next); setRunning(true); };
  const resetModel = () => {
    setAxle("rear");
    setVariant("standard");
    setPressure(1.2);
    setTarget(1.8);
    setRunning(false);
    setSpin(false);
    setWireframe(false);
    setLoad(1800);
    setViewMode("iso");
    setSelectedDim("all");
    setShowFendtGuide(true);
    setBlueprintMode(false);
    setShowTireCotas(true);
    setEngineOn(true);
    setLightsOn(true);
    setTurnSignal("off");
    setDriveSpeed(0);
    setSteerAngle(0);
    setRearDiscAssembled(true);
    setDiscCount(6);
  };

  const handleSelectDimensionCard = (dim: DimensionId, recommendedView: CameraViewMode) => {
    if (selectedDim === dim) {
      setSelectedDim("all");
      setViewMode("iso");
    } else {
      setSelectedDim(dim);
      if (dim === "heightWithGuide") setShowFendtGuide(true);
      setViewMode(recommendedView);
    }
  };

  const handleFocusTiresIn3D = () => {
    setRightPanelMode("tires");
    setShowTireCotas(true);
    setSelectedDim("none");
    setViewMode("tires");
  };

  const allCotasHidden = selectedDim === "none" && !showTireCotas;

  return <div className="app-shell">
    <header className="top-bar">
      <div className="top-inner">
        <a href="#inicio" className="logo"><span className="logo-glyph">F</span><span>FENDT <b>728</b></span><i className="logo-sep"/><span className="logo-sub">LABORATORIO 3D</span></a>
        <div className="top-right"><span className="top-dot"/> Gen7.1 <span className="top-divider">/</span> Esquema 3D y Neumáticos <button className={`top-sources ${showSources ? "active" : ""}`} onClick={() => setShowSources((v) => !v)}><BookOpen size={15}/> Fuentes y Ficha Técnica</button></div>
      </div>
    </header>

    <main className="container" id="inicio">
      <section className="intro">
        <div><div className="eyebrow"><Sparkles size={13}/> INGENIERÍA DE MAQUINARIA AGRÍCOLA · ESQUEMA 3D ESCALABLE</div>
          <h1>Fendt 728 Vario Gen7.1 <br/><span>en esquema 3D cotado.</span></h1>
          <p>Explora en tres dimensiones las medidas oficiales del tractor (<b>5.516 mm</b> de longitud, <b>2.900 mm</b> de batalla, <b>2.650 mm</b> de anchura, alturas <b>3.280 / 3.332 mm</b> y despeje <b>570 mm</b>) y la geometría escalable de sus neumáticos homologados (<b>540/65 R34</b> + <b>650/85 R38</b> y opción <b>600/70 R30</b> + <b>710/70 R42</b>).</p>
        </div>
        <div className="hero-figure" aria-hidden="true"><div className="hero-disc"><span>728</span><small>VARIO</small></div><span className="hero-corner">GEN 7.1 / 3D CAD</span></div>
      </section>

      <section className="overview-stats">
        <div><span>LONGITUD / BATALLA</span><strong>5,52 / 2,90 <em>m · ficha oficial</em></strong></div>
        <div><span>NEUMÁTICOS ESTÁNDAR</span><strong>R34 / R38 <em>540/65 · 650/85</em></strong></div>
        <div><span>NEUMÁTICOS OPCIÓN 1</span><strong>R30 / R42 <em>600/70 · 710/70</em></strong></div>
        <div><span>COMPRESOR VARIOGRIP</span><strong>800 <em>L/min · Gen7.1</em></strong></div>
      </section>

      <nav className="lab-nav" aria-label="Módulos del laboratorio">
        {navigation.map((item, index) => <button key={item.id} className={`nav-btn ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
          <span className="nav-index">0{index+1}</span><item.icon size={17}/>{item.name}
        </button>)}
      </nav>

      {activeTab === "schematic" && <section className="schematic-section" aria-labelledby="heading-schematic-3d">
        <div className="schematic-fullbleed">
          <div className="scene-panel fullwidth-tractor-panel">
            {/* BARRA SUPERIOR CON DESPLEGABLE DE COTAS DEL TRACTOR (6) Y DIMENSIONES DE LLANTAS */}
            <div className="scene-header top-dropdown-bar">
              <div>
                <span className="eyebrow">ESQUEMA TRIDIMENSIONAL ESCALABLE (TRACTOR + NEUMÁTICOS + LASTRE DE DISCOS)</span>
                <h2 id="heading-schematic-3d">
                  Fendt 728 Vario Gen7.1 — <small>{variant === "standard" ? "Montaje Estándar (540/65R34 · 650/85R38)" : "Montaje Opción 1 (600/70R30 · 710/70R42)"}</small>
                </h2>
              </div>

              <div className="top-dropdown-triggers">
                <button
                  type="button"
                  className={`top-drop-btn ${topCotasDropdownOpen && rightPanelMode === "tractor" ? "active" : ""}`}
                  onClick={() => {
                    if (topCotasDropdownOpen && rightPanelMode === "tractor") {
                      setTopCotasDropdownOpen(false);
                    } else {
                      setRightPanelMode("tractor");
                      if (selectedDim === "none") setSelectedDim("all");
                      setTopCotasDropdownOpen(true);
                    }
                  }}
                >
                  <Ruler size={14} />
                  Cotas del Tractor (6)
                  <ChevronDown size={14} className={topCotasDropdownOpen && rightPanelMode === "tractor" ? "rot" : ""} />
                </button>

                <button
                  type="button"
                  className={`top-drop-btn ${topCotasDropdownOpen && rightPanelMode === "tires" ? "active" : ""}`}
                  onClick={() => {
                    if (topCotasDropdownOpen && rightPanelMode === "tires") {
                      setTopCotasDropdownOpen(false);
                    } else {
                      setRightPanelMode("tires");
                      setShowTireCotas(true);
                      setTopCotasDropdownOpen(true);
                    }
                  }}
                >
                  <SlidersHorizontal size={14} />
                  Dimensiones de Llantas
                  <ChevronDown size={14} className={topCotasDropdownOpen && rightPanelMode === "tires" ? "rot" : ""} />
                </button>

                <Tag>Escala 1:1 en metros</Tag>
              </div>
            </div>

            <div className="camera-presets-bar">
              <span className="preset-label">Vistas 3D:</span>
              <button className={viewMode === "iso" ? "active" : ""} onClick={() => { setViewMode("iso"); setSelectedDim("all"); }}>Vista 3D General</button>
              <button className={viewMode === "side" ? "active" : ""} onClick={() => setViewMode("side")}>Perfil Lateral</button>
              <button className={viewMode === "front" ? "active" : ""} onClick={() => setViewMode("front")}>Vista Frontal</button>
              <button className={viewMode === "clearance" ? "active" : ""} onClick={() => { setViewMode("clearance"); setSelectedDim("clearance"); }}>Despeje (570 mm)</button>
              <button className={viewMode === "tires" ? "active" : ""} onClick={handleFocusTiresIn3D}>
                Neumáticos (Explicación 3D)
              </button>
              <button className={viewMode === "frontTire" ? "active" : ""} onClick={() => { setRightPanelMode("tires"); setShowTireCotas(true); setViewMode("frontTire"); }}>
                Zoom Delantero ({frontSpec.key})
              </button>
              <button className={viewMode === "rearTire" ? "active" : ""} onClick={() => { setRightPanelMode("tires"); setShowTireCotas(true); setViewMode("rearTire"); }}>
                Zoom Trasero ({rearSpec.key})
              </button>
              <button className={viewMode === "implement" ? "active" : ""} onClick={() => setViewMode("implement")}>
                Lastre Trasero ({discCount} Discos)
              </button>
            </div>

            {/* ESCENARIO 3D A ANCHO COMPLETO DEL BODY CON MODAL FLOTANTE SUPERIOR Y HUD DERECHO */}
            <div className="scene-stage schematic-stage fullwidth-stage">
              {/* DESPLEGABLE / MODAL FLOTANTE SUPERIOR (NO AFECTA AL FONDO DEL TRACTOR 3D) */}
              {topCotasDropdownOpen && (
                <div className="top-cotas-floating-modal" role="dialog" aria-label="Cotas oficiales y dimensiones de llantas">
                  <div className="top-cotas-modal-bar">
                    <div className="panel-mode-tabs compact-tabs">
                      <button
                        type="button"
                        className={rightPanelMode === "tractor" ? "selected" : ""}
                        onClick={() => {
                          setRightPanelMode("tractor");
                          if (selectedDim === "none") setSelectedDim("all");
                        }}
                      >
                        Cotas del Tractor (6)
                      </button>
                      <button
                        type="button"
                        className={rightPanelMode === "tires" ? "selected" : ""}
                        onClick={() => {
                          setRightPanelMode("tires");
                          setShowTireCotas(true);
                        }}
                      >
                        Dimensiones de Llantas
                      </button>
                    </div>

                    <div className="top-cotas-modal-meta">
                      <span>
                        {rightPanelMode === "tractor"
                          ? "COTAS OFICIALES DEL TRACTOR · Dimensiones principales (clic para enfocar 3D)"
                          : "INGENIERÍA DE NEUMÁTICOS AGRÍCOLAS · GEN7.1"}
                      </span>
                      <button
                        type="button"
                        className="top-cotas-close"
                        onClick={() => setTopCotasDropdownOpen(false)}
                        aria-label="Cerrar desplegable"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {rightPanelMode === "tractor" ? (
                    <div className="dim-cards-compact-grid">
                      {tractorDimensionList.map((item) => {
                        const isSelected = selectedDim === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`dim-card-compact ${isSelected ? "selected" : ""}`}
                            style={{ borderLeftColor: item.color }}
                            onClick={() => handleSelectDimensionCard(item.id, item.viewRecommended)}
                          >
                            <div className="dim-card-compact-top">
                              <span className="dim-card-compact-label">{item.label}</span>
                              <span className="dim-card-compact-badge" style={{ color: item.color }}>
                                {item.viewRecommended === "side" ? "Perfil" : item.viewRecommended === "front" ? "Frontal" : "Inferior"}
                              </span>
                            </div>
                            <div className="dim-card-compact-values">
                              <strong style={{ color: isSelected ? item.color : undefined }}>
                                {asNumber(item.valueMm)} <small>mm</small>
                              </strong>
                              <span>({item.valueM})</span>
                            </div>
                            <p>{item.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="tires-dropdown-compact">
                      <div className="tires-dropdown-switch">
                        <span>Configuración homologada:</span>
                        <button
                          type="button"
                          className={variant === "standard" ? "selected" : ""}
                          onClick={() => setVariant("standard")}
                        >
                          Estándar (R34 / R38)
                        </button>
                        <button
                          type="button"
                          className={variant === "optional" ? "selected" : ""}
                          onClick={() => setVariant("optional")}
                        >
                          Opción 1 (R30 / R42)
                        </button>
                      </div>

                      <div className="tires-dropdown-cards">
                        <div
                          className="tire-summary-box compact"
                          onClick={() => setViewMode("frontTire")}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="tire-summary-top">
                            <span className="eyebrow">DELANTERO ({variant === "standard" ? "ESTÁNDAR" : "OPCIÓN 1"})</span>
                            <span className="zoom-pill">Zoom 3D ↗</span>
                          </div>
                          <div className="tire-code-compact">{frontSpec.key}</div>
                          <div className="tire-mini-grid compact">
                            <div><span>Anchura</span><b>{frontSpec.widthMm} mm</b></div>
                            <div><span>Perfil ({frontSpec.aspect}%)</span><b>{asNumber(frontGeom.sidewallMm, 1)} mm</b></div>
                            <div><span>Ø Llanta ({frontSpec.rimInches}&quot;)</span><b>{asNumber(frontGeom.rimMm, 1)} mm</b></div>
                            <div><span>Ø Exterior</span><b className="highlight-orange">≈ {asNumber(frontGeom.nominalDiameterMm, 0)} mm</b></div>
                          </div>
                        </div>

                        <div
                          className="tire-summary-box compact"
                          onClick={() => setViewMode("rearTire")}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="tire-summary-top">
                            <span className="eyebrow">TRASERO ({variant === "standard" ? "ESTÁNDAR" : "OPCIÓN 1"})</span>
                            <span className="zoom-pill">Zoom 3D ↗</span>
                          </div>
                          <div className="tire-code-compact">{rearSpec.key}</div>
                          <div className="tire-mini-grid compact">
                            <div><span>Anchura</span><b>{rearSpec.widthMm} mm</b></div>
                            <div><span>Perfil ({rearSpec.aspect}%)</span><b>{asNumber(rearGeom.sidewallMm, 1)} mm</b></div>
                            <div><span>Ø Llanta ({rearSpec.rimInches}&quot;)</span><b>{asNumber(rearGeom.rimMm, 1)} mm</b></div>
                            <div><span>Ø Exterior</span><b className="highlight-orange">≈ {asNumber(rearGeom.nominalDiameterMm, 0)} mm</b></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <TractorSchematic3D
                viewMode={viewMode}
                selectedDim={selectedDim}
                onSelectDim={setSelectedDim}
                showFendtGuide={showFendtGuide}
                blueprintMode={blueprintMode}
                spinWheels={spin}
                tireVariant={variant}
                showTireCotas={showTireCotas}
                onSelectTireAxle={(clickedAxle) => {
                  setAxle(clickedAxle);
                  setRightPanelMode("tires");
                  setViewMode(clickedAxle === "front" ? "frontTire" : "rearTire");
                }}
                engineOn={engineOn}
                lightsOn={lightsOn}
                turnSignal={turnSignal}
                driveSpeed={driveSpeed}
                steerAngle={steerAngle}
                rearDiscAssembled={rearDiscAssembled}
                rearDiscHidden={rearDiscHidden}
                discCount={discCount}
                terrainMode={terrainMode}
              />

              {/* HUD DERECHO DENTRO DEL DIV DEL TRACTOR: BOTÓN ENCENDER + RUEDITA DE CONFIGURACIÓN (MODAL LUCES/LASTRE) + FLECHAS DE CONDUCCIÓN */}
              <TractorControlDeck
                engineOn={engineOn}
                setEngineOn={setEngineOn}
                lightsOn={lightsOn}
                setLightsOn={setLightsOn}
                turnSignal={turnSignal}
                setTurnSignal={setTurnSignal}
                driveSpeed={driveSpeed}
                setDriveSpeed={setDriveSpeed}
                steerAngle={steerAngle}
                setSteerAngle={setSteerAngle}
                rearDiscAssembled={rearDiscAssembled}
                setRearDiscAssembled={setRearDiscAssembled}
                rearDiscHidden={rearDiscHidden}
                setRearDiscHidden={setRearDiscHidden}
                discCount={discCount}
                setDiscCount={setDiscCount}
                terrainMode={terrainMode}
                setTerrainMode={setTerrainMode}
                onFocusImplement={() => setViewMode("implement")}
                viewMode={viewMode}
              />

              <div className="scene-bottom-id">
                FENDT 728 <span>{frontSpec.key} DEL. · {rearSpec.key} TRAS. · {rearDiscHidden ? "LASTRE QUITADO" : rearDiscAssembled ? `LASTRE ${discCount} DISCOS ACOPLADO` : "LASTRE DESACOPLADO"}</span>
              </div>
            </div>

            <div className="scene-toolbar">
              <button
                className={terrainMode === "road" ? "btn-active" : ""}
                onClick={() => setTerrainMode((m) => (m === "road" ? "grid" : "road"))}
              >
                <Compass size={16}/> {terrainMode === "road" ? "Camino 3D: Activo" : "Activar Camino"}
              </button>
              <button
                className={terrainMode === "pasture" ? "btn-active" : ""}
                onClick={() => setTerrainMode((m) => (m === "pasture" ? "grid" : "pasture"))}
              >
                <Leaf size={16}/> {terrainMode === "pasture" ? "Potrero con Plantas: Activo" : "Potrero con Plantas"}
              </button>
              {terrainMode !== "grid" && (
                <button onClick={() => setTerrainMode("grid")}>
                  <RotateCcw size={16}/> Piso Cuadrícula CAD
                </button>
              )}
              <button
                className={selectedDim === "all" && showTireCotas ? "btn-active" : ""}
                onClick={() => {
                  setSelectedDim("all");
                  setShowTireCotas(true);
                }}
              >
                <Eye size={16}/> Ver todas las cotas
              </button>
              <button
                className={allCotasHidden ? "btn-active" : ""}
                onClick={() => {
                  setSelectedDim("none");
                  setShowTireCotas(false);
                }}
              >
                <EyeOff size={16}/> Ocultar todas las cotas
              </button>
              <button
                className={showTireCotas ? "btn-active" : ""}
                onClick={() => {
                  const next = !showTireCotas;
                  setShowTireCotas(next);
                  if (next) setRightPanelMode("tires");
                }}
              >
                <Ruler size={16}/> {showTireCotas ? "Cotas de llantas: Visibles" : "Ver cotas de llantas 3D"}
              </button>
              <button
                className={variant === "optional" ? "btn-active" : ""}
                onClick={() => setVariant((v) => (v === "standard" ? "optional" : "standard"))}
              >
                <SlidersHorizontal size={16}/> {variant === "standard" ? "Cambiar a Opción 1 (600/70R30 · 710/70R42)" : "Volver a Estándar (540/65R34 · 650/85R38)"}
              </button>
              <button className={blueprintMode ? "btn-active" : ""} onClick={() => setBlueprintMode((v) => !v)}>
                <Sparkles size={16}/> {blueprintMode ? "Modo Color Fendt" : "Modo Blueprint CAD"}
              </button>
              <button onClick={() => setSpin((v) => !v)}>
                {spin ? <Pause size={16}/> : <Play size={16}/>} {spin ? "Detener ruedas" : "Girar ruedas"}
              </button>
            </div>

            <div className="info-strip">
              <ShieldCheck size={17}/> Esquema 3D paramétrico a ancho completo: usa el desplegable superior para consultar las <b>Cotas del Tractor (6)</b> y <b>Dimensiones de Llantas</b> sin perder de vista el tractor, o los controles a la derecha para conducir y configurar luces y el lastre trasero de discos.
            </div>
          </div>
        </div>

        {/* SECCIÓN INTEGRADA DE ESQUEMAS ESCALABLES DE NEUMÁTICOS (DELANTERO Y TRASERO) */}
        <div className="tires-integrated-section">
          <div className="reference-header">
            <div>
              <span className="eyebrow">ESQUEMA TÉCNICO ESCALABLE DE NEUMÁTICOS · DATOS OFICIALES VERIFICADOS</span>
              <h3>
                Desglose geométrico: Delantero ({frontSpec.key}) y Trasero ({rearSpec.key})
              </h3>
            </div>
            <div className="two-buttons compact-switch">
              <button
                type="button"
                className={variant === "standard" ? "selected" : ""}
                onClick={() => setVariant("standard")}
              >
                Ver Estándar (540/65 R34 · 650/85 R38)
              </button>
              <button
                type="button"
                className={variant === "optional" ? "selected" : ""}
                onClick={() => setVariant("optional")}
              >
                Ver Opción 1 (600/70 R30 · 710/70 R42)
              </button>
            </div>
          </div>

          <div className="tire-schematics-dual-grid">
            <ScalableTireSchematicSVG
              title={`NEUMÁTICO DELANTERO ${variant === "standard" ? "ESTÁNDAR" : "OPCIÓN 1"}`}
              specKey={frontSpec.key}
              widthMm={frontSpec.widthMm}
              aspect={frontSpec.aspect}
              rimInches={frontSpec.rimInches}
              sidewallMm={frontGeom.sidewallMm}
              rimMm={frontGeom.rimMm}
              diameterMm={frontGeom.nominalDiameterMm}
              isRear={false}
            />
            <ScalableTireSchematicSVG
              title={`NEUMÁTICO TRASERO ${variant === "standard" ? "ESTÁNDAR" : "OPCIÓN 1"}`}
              specKey={rearSpec.key}
              widthMm={rearSpec.widthMm}
              aspect={rearSpec.aspect}
              rimInches={rearSpec.rimInches}
              sidewallMm={rearGeom.sidewallMm}
              rimMm={rearGeom.rimMm}
              diameterMm={rearGeom.nominalDiameterMm}
              isRear={true}
            />
          </div>

          {/* Tabla comparativa completa de las 4 configuraciones homologadas */}
          <div className="all-tires-comparison-bar">
            <div className="comparison-item">
              <span className="eyebrow">DELANTERO ESTÁNDAR</span>
              <strong>540/65 R34</strong>
              <small>Ancho: 540 mm · Perfil: 351 mm · Llanta: 863,6 mm · Ø ≈ 1.566 mm</small>
            </div>
            <div className="comparison-item">
              <span className="eyebrow">TRASERO ESTÁNDAR</span>
              <strong>650/85 R38</strong>
              <small>Ancho: 650 mm · Perfil: 552,5 mm · Llanta: 965,2 mm · Ø ≈ 2.070 mm</small>
            </div>
            <div className="comparison-item">
              <span className="eyebrow">OPCIÓN 1 — DELANTERO</span>
              <strong>600/70 R30</strong>
              <small>Ancho: 600 mm · Perfil: 420 mm · Llanta: 762,0 mm · Ø ≈ 1.602 mm</small>
            </div>
            <div className="comparison-item">
              <span className="eyebrow">OPCIÓN 1 — TRASERO</span>
              <strong>710/70 R42</strong>
              <small>Ancho: 710 mm · Perfil: 497 mm · Llanta: 1.066,8 mm · Ø ≈ 2.061 mm</small>
            </div>
          </div>
        </div>

        {/* Láminas Esquemáticas Oficiales (Tractor + Neumáticos) */}
        <div className="reference-sheet-panel">
          <div className="reference-header">
            <div>
              <span className="eyebrow">LÁMINAS ESQUEMÁTICAS DE REFERENCIA (FICHA TÉCNICA OFICIAL)</span>
              <h3>Esquema de dimensiones del tractor y lámina verificada de neumáticos</h3>
            </div>
            <button className="toggle-sheet-btn" onClick={() => setShowReferenceSheet((v) => !v)}>
              {showReferenceSheet ? "Ocultar láminas de referencia" : "Mostrar láminas de referencia"}
            </button>
          </div>

          {showReferenceSheet && (
            <div className="reference-grid">
              <div className="reference-image-box">
                <img
                  src="/esquema-fendt-728.jpg"
                  alt="Esquema oficial de dimensiones principales del Fendt 728 Vario Gen7.1"
                  className="reference-img"
                />
                <div className="reference-caption">
                  <span>Lámina 1: Dimensiones generales del Fendt 728 Vario Gen7.1 (Longitud 5.516 mm, Batalla 2.900 mm, Anchura 2.650 mm, Despeje 570 mm)</span>
                </div>
              </div>

              <div className="reference-image-box">
                <img
                  src="/esquema-neumaticos-728.png"
                  alt="Neumáticos, dimensiones y variantes verificadas según ficha oficial del Fendt 728 Vario Gen7.1"
                  className="reference-img"
                />
                <div className="reference-caption">
                  <span>Lámina 2: Neumáticos estándar (540/65 R34 y 650/85 R38) y configuraciones opcionales (600/70 R30 y 710/70 R42)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>}

      {activeTab === "dimensions" && <section className="workspace" aria-labelledby="heading-3d">
        <div className="scene-panel">
          <div className="scene-header"><div><span className="eyebrow">VISTA MANIPULABLE INDIVIDUAL</span><h2 id="heading-3d">Modelo de neumático <small>3D cotado</small></h2></div><Tag>Geometría ilustrativa</Tag></div>
          <div className="scene-stage"><WheelScene spec={spec} pressure={pressure} spin={spin} wireframe={wireframe} showCotas={showWheelCotas}/><div className="scene-hint"><Compass size={16}/> Arrastra para girar · rueda para acercar</div><div className="scene-bottom-id">{spec.key} <span>{axle === "front" ? "EJE DELANTERO" : "EJE TRASERO"}</span></div></div>
          <div className="scene-toolbar">
            <button onClick={() => setSpin((v) => !v)}>{spin ? <Pause size={16}/> : <Play size={16}/>} {spin ? "Detener giro" : "Giro automático"}</button>
            <button onClick={() => setShowWheelCotas((v) => !v)}>{showWheelCotas ? <EyeOff size={16}/> : <Eye size={16}/>} {showWheelCotas ? "Ocultar cotas 3D" : "Ver cotas 3D"}</button>
            <button onClick={() => setWireframe((v) => !v)}><SlidersHorizontal size={16}/>{wireframe ? "Ver superficie" : "Ver malla"}</button>
            <button onClick={resetModel}><RotateCcw size={16}/> Restablecer</button>
          </div>
          <div className="info-strip"><ShieldCheck size={17}/> Representación tridimensional pedagógica con cotas nominales en tiempo real.</div>
        </div>
        <div className="detail-panel">
          <div className="section-heading"><div className="eyebrow">CONFIGURADOR</div><h2>Dimensiones y configuración</h2><p>Elige eje y neumático; las medidas y cálculos cambian al instante.</p></div>
          <div className="input-block"><label>Posición en el tractor</label><div className="two-buttons"><button className={axle === "front" ? "selected" : ""} onClick={() => setAxle("front")}>Delantero</button><button className={axle === "rear" ? "selected" : ""} onClick={() => setAxle("rear")}>Trasero</button></div></div>
          <div className="input-block"><label>Ficha técnica</label><div className="two-buttons"><button className={variant === "standard" ? "selected" : ""} onClick={() => setVariant("standard")}>Estándar</button><button className={variant === "optional" ? "selected" : ""} onClick={() => setVariant("optional")}>Opción 1</button></div></div>
          <div className="tire-name"><span>MEDIDA SELECCIONADA</span><strong>{spec.key}</strong><small>{variant === "standard" ? "Configuración estándar" : "Primera opción declarada"} · Gen7.1</small></div>
          <div className="measures-grid"><BigMetric label="ANCHO NOMINAL" value={String(spec.widthMm)} unit="mm"/><BigMetric label="ALTURA DEL PERFIL" value={asNumber(geom.sidewallMm, 1)} unit="mm"/><BigMetric label="DIÁMETRO DEL ARO" value={asNumber(geom.rimMm, 1)} unit="mm"/><BigMetric label="Ø NOMINAL CALCULADO" value={asNumber(geom.nominalDiameterMm, 1)} unit="mm"/></div>
          <div className="formula-card"><span className="eyebrow">¿CÓMO SE LEE {spec.key}?</span><div className="interpretation"><b>{spec.widthMm}</b><i>/</i><b>{spec.aspect}</b><i>R</i><b>{spec.rimInches}</b></div><div className="interpretation-labels"><span>Ancho (mm)</span><span>Perfil (%)</span><span>Aro (in)</span></div><hr/><p><b>Altura del perfil:</b> {spec.widthMm} × {spec.aspect} / 100 = {asNumber(geom.sidewallMm, 1)} mm.</p><p><b>Diámetro nominal:</b> {asNumber(geom.rimMm,1)} + 2 × {asNumber(geom.sidewallMm,1)} = <strong>{asNumber(geom.nominalDiameterMm, 1)} mm.</strong></p></div>
          <p className="micro-disclaimer">El diámetro calculado a partir del código es teórico: no equivale necesariamente al diámetro dimensional medido ni al radio dinámico bajo carga.</p>
        </div>
      </section>}

      {activeTab === "pressure" && <section className="content-tab">
        <div className="section-heading title-lead"><div className="eyebrow">PRESIÓN · TRANSFERENCIA DE CARGA · SUELO</div><h2>¿Qué ocurre al modificar el aire?</h2><p>Modifica la presión y observa el área de contacto que predice un modelo físico simplificado. No sustituye las tablas de carga/inflado del fabricante.</p></div>
        <div className="pressure-grid"><div className="settings-card">
          <div className="settings-header"><Gauge size={22}/><h3>Control de presión</h3><span>SIMULADOR</span></div>
          <label htmlFor="pressure-slider">Presión de inflado hipotética</label><div className="slider-heading"><strong>{asNumber(pressure,2)} <small>bar</small></strong><div>{asNumber(barToPsi(pressure),1)} psi <em>(lb/in²)</em></div></div>
          <input id="pressure-slider" aria-label="Presión de aire en bar" type="range" min="0.6" max="2.5" step="0.05" value={pressure} onChange={(e) => {setRunning(false);setPressure(Number(e.target.value));}} />
          <div className="range-ticks"><span>0,6 bar</span><span>2,5 bar</span></div>
          <div className="mini-presets"><button onClick={()=> {setPressure(0.9);setRunning(false);}}>Ejemplo 0,9 bar</button><button onClick={()=> {setPressure(1.8);setRunning(false);}}>Ejemplo 1,8 bar</button></div>
          <label htmlFor="load-slider">Carga hipotética sobre UNA rueda</label><div className="slider-heading"><strong>{asNumber(load)} <small>kg</small></strong><div>Caso ilustrativo</div></div>
          <input id="load-slider" aria-label="Carga hipotética por rueda en kilogramos" type="range" min="650" max="3000" step="50" value={load} onChange={(e)=>setLoad(Number(e.target.value))}/><div className="range-ticks"><span>650 kg</span><span>3.000 kg</span></div>
          <div className="warning-soft"><CircleHelp size={17}/> Los valores son escenarios didácticos, no presiones ni cargas autorizadas para este neumático. La carga admisible debe verificarse con índice de carga, presión, velocidad y fabricante.</div>
          <h4>Conversión rápida</h4><table className="conversion"><thead><tr><th>bar</th><th>psi</th></tr></thead><tbody>{[0.6,0.8,1,1.2,1.5,1.8,2,2.5].map(b=><tr key={b}><td>{asNumber(b,1)}</td><td>{asNumber(barToPsi(b),1)}</td></tr>)}</tbody></table>
        </div>
        <div className="patch-panel"><ContactPatch pressure={pressure} load={load}/></div></div>
        <div className="three-takeaways"><div><Leaf size={19}/><b>Campo</b><p>Una presión compatible más baja puede aumentar la huella y reducir patinamiento, sin eliminar la compactación profunda.</p></div><div><Truck size={19}/><b>Carretera</b><p>Una presión adecuada para la velocidad y carga puede disminuir la deformación y la resistencia de rodadura.</p></div><div><ShieldCheck size={19}/><b>Criterio técnico</b><p>La decisión depende de los datos reales del neumático, carga por eje, velocidad y estado del suelo.</p></div></div>
      </section>}

      {activeTab === "variogrip" && <section className="content-tab">
        <div className="section-heading title-lead"><div className="eyebrow">TECNOLOGÍA OPCIONAL · FENDT</div><h2>VarioGrip: aire controlado desde la cabina</h2><p>Demostración de cómo las válvulas, los conductos y el compresor regulan la presión con el tractor en movimiento.</p></div>
        <div className="variogrip-layout">
          <div className="vg-diagram"><div className="source-tag"><Wind size={13}/> Esquema funcional didáctico</div><div className="vg-nodes"><div><div className="vg-icon"><Settings2/></div><strong>COMPRESOR</strong><small>800 L/min<br/>refrigerado por agua</small></div><div className="vg-link"/><div><div className="vg-icon"><ArrowLeftRight/></div><strong>CONDUCTOS</strong><small>Línea de control<br/>+ línea de aire</small></div><div className="vg-link"/><div><div className="vg-icon"><Gauge/></div><strong>NEUMÁTICO</strong><small>La válvula abre<br/>según la orden</small></div></div><div className={`air-line ${running ? "moving" : ""}`}><div className="air-particle"/><div className="air-particle"/><div className="air-particle"/></div><p>La línea de control acciona la válvula; otra línea introduce o evacúa aire. Es el principio de dos líneas descrito en el folleto Gen7. Las cifras de caudal del compresor provienen del folleto Gen7.1.</p><div className="water-note"><Droplets size={19}/><span><b>¿Y el agua?</b> Refrigera el compresor. No es el fluido que VarioGrip envía a los neumáticos. El lastrado líquido es otro procedimiento distinto.</span></div></div>
          <div className="terminal-card"><div className="terminal-top"><span>FENDTONE · VISUALIZACIÓN DIDÁCTICA</span><div><i/><i/><i/></div></div><div className="terminal-title">Gestión de presión de neumáticos</div><div className="terminal-gauges"><div><span>PRESIÓN SIMULADA</span><strong>{asNumber(pressure,2)}</strong><small>bar · {asNumber(barToPsi(pressure),1)} psi</small></div><ArrowLeftRight size={24}/><div><span>OBJETIVO</span><strong>{asNumber(target,2)}</strong><small>bar · {asNumber(barToPsi(target),1)} psi</small></div></div><div className="terminal-status"><span className={running ? "blink-dot" : "still-dot"}/>{running ? status : "Simulación detenida / lista"}</div><label htmlFor="target-pressure">Ajustar presión objetivo de ejemplo</label><input id="target-pressure" type="range" min="0.6" max="2.5" step="0.05" value={target} onChange={e=>setTarget(Number(e.target.value))}/><div className="range-ticks"><span>0,6 bar</span><span>2,5 bar</span></div><div className="mini-presets"><button onClick={()=>goPreset(0.9)}>Ejemplo campo</button><button onClick={()=>goPreset(1.8)}>Ejemplo carretera</button></div><button className="run-button" onClick={()=>setRunning(!running)}>{running ? <Pause size={18}/> : <Play size={18}/>} {running ? "Pausar simulación" : "Simular ajuste de presión"}</button><p className="terminal-footnote">La interfaz no es una réplica de FendtONE. El tiempo y la velocidad de inflado son inventados para animación; no representan rendimiento real.</p></div>
        </div>
        <div className="fact-banner"><div><b>+10 %</b><span>de tracción, hasta</span></div><div><b>−8 %</b><span>de consumo de diésel, hasta</span></div><p>Resultados comunicados por Fendt para condiciones de estudio, no mejoras garantizadas en cualquier parcela ni para cualquier neumático.</p></div>
      </section>}

      {activeTab === "loads" && <section className="content-tab">
        <div className="section-heading title-lead"><div className="eyebrow">FICHA TÉCNICA · INTERPRETACIÓN</div><h2>Pesos que importa no confundir</h2><p>La capacidad del tractor no es lo mismo que la capacidad de un neumático, ni la carga máxima por eje puede sumarse libremente al peso bruto permitido.</p></div>
        <div className="load-grid"><div className="load-card"><Weight size={27}/><label>PESO OPERATIVO</label><strong>9.200–9.650 <small>kg</small></strong><p>Depende del equipamiento y accesorios declarados por el fabricante (±5 %).</p></div><div className="load-card"><ArrowDownRight size={27}/><label>MÁX. EJE DELANTERO</label><strong>6.900 <small>kg</small></strong><p>Valor del eje, no carga permitida para una sola rueda y no fuerza del elevador.</p></div><div className="load-card"><Weight size={27}/><label>MÁX. EJE TRASERO</label><strong>11.500 <small>kg</small></strong><p>Límite citado por Fendt para configuraciones y anchos de vía específicos; comprobar homologación.</p></div><div className="load-card"><Truck size={27}/><label>PESO BRUTO TOTAL</label><strong>15.000 <small>kg</small></strong><p>Hasta 40/50 km/h en los países y versiones autorizados; 14.000 kg para versión 60 km/h.</p></div></div>
        <div className="explainer-columns"><article><h3>¿De qué sirve conocer la carga por eje?</h3><p>Para dimensionar neumáticos y presiones con las tablas oficiales. La carga máxima del eje no significa que puedas inflar cualquier neumático a cualquier presión.</p><h3>¿Se puede sumar 6.900 + 11.500 kg?</h3><p>No como peso de operación autorizado: cada eje tiene un límite individual, y el peso total del vehículo también tiene su límite reglamentario.</p></article><article className="script-card"><div className="eyebrow"><BookOpen size={14}/> GUION BREVE PARA EXPONER</div><p>«La medida <strong>{spec.key}</strong> nos dice el ancho de la sección, la altura del perfil y el diámetro del aro. Una vez elegido el neumático, debemos determinar la presión adecuada a partir de la carga real y la velocidad. VarioGrip permite ajustar esa presión desde la cabina. En campo buscamos una buena huella y tracción; en carretera, limitar deformación y resistencia de rodadura. Pero los valores definitivos siempre dependen de las tablas del fabricante».</p><button onClick={()=>navigator.clipboard?.writeText(`La medida ${spec.key} nos dice el ancho, la altura del perfil y el diámetro del aro. Una vez elegido el neumático, debemos determinar la presión adecuada a partir de la carga real y la velocidad. VarioGrip permite ajustar esa presión desde la cabina. En campo buscamos una buena huella y tracción; en carretera, limitar deformación y resistencia de rodadura. Los valores definitivos dependen de las tablas del fabricante.`)}>Copiar guion <ChevronRight size={15}/></button></article></div>
      </section>}

      <section className="bottom-learning"><div><span className="eyebrow">CONCLUSIÓN DE INGENIERÍA AGRÍCOLA</span><h2>No existe una presión correcta sin conocer la carga.</h2><p>Una ficha técnica ofrece dimensiones y límites de diseño. La selección operativa exige tablas del neumático, velocidad, masa por eje y condiciones del terreno.</p></div><button onClick={() => {setActiveTab("pressure");window.scrollTo({top:0,behavior:"smooth"});}}>Explorar presión <ChevronRight size={18}/></button></section>

      {showSources && (
        <div className="ficha-modal-backdrop" onClick={() => setShowSources(false)} role="dialog" aria-modal="true" aria-label="Ficha Técnica Oficial y Fuentes del Fendt 728 Vario Gen7.1">
          <div className="ficha-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ficha-modal-header">
              <div>
                <span className="eyebrow">DOCUMENTACIÓN DE INGENIERÍA AGRÍCOLA · AGCO GmbH / FENDT</span>
                <h2>Ficha Técnica Oficial — Fendt 728 Vario Gen7.1 y Fuentes</h2>
              </div>
              <button type="button" className="ficha-modal-close" onClick={() => setShowSources(false)} aria-label="Cerrar ficha técnica">
                <X size={18} />
              </button>
            </div>

            <div className="ficha-modal-body">
              <div className="ficha-specs-grid">
                {/* 1. MOTOR */}
                <div className="ficha-block">
                  <h3>01 · Motor AGCO Power CORE75</h3>
                  <table className="ficha-table">
                    <tbody>
                      <tr><th>Fabricante / Modelo</th><td>AGCO Power CORE75 (Concepto Fendt iD bajas RPM)</td></tr>
                      <tr><th>Cilindros / Cilindrada</th><td>6 cilindros en línea · 7,5 litros (7.500 cm³)</td></tr>
                      <tr><th>Potencia nominal (ECE R120)</th><td>283 CV / 208 kW</td></tr>
                      <tr><th>Potencia máx. con DynamicPerformance</th><td><b>303 CV / 223 kW</b> (+20 CV adicionales bajo demanda)</td></tr>
                      <tr><th>Par motor máximo</th><td><b>1.450 Nm</b> a 1.200 – 1.450 rpm</td></tr>
                      <tr><th>Régimen nominal / Ralentí</th><td>1.700 rpm / 700 rpm</td></tr>
                      <tr><th>Depósito Combustible / AdBlue</th><td>450 L (diésel) / 48 L (DEF AdBlue)</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. TRANSMISIÓN Y SISTEMA HIDRÁULICO */}
                <div className="ficha-block">
                  <h3>02 · Transmisión VarioDrive y Sistema Hidráulico</h3>
                  <table className="ficha-table">
                    <tbody>
                      <tr><th>Transmisión</th><td><b>Fendt VarioDrive TA 190</b> (CVT continua sin escalonamientos)</td></tr>
                      <tr><th>Tracción integral 4WD</th><td>Independiente eje delantero/trasero con efecto <i>pull-in-turn</i></td></tr>
                      <tr><th>Velocidad máxima</th><td><b>60 km/h</b> a 1.450 rpm (50 km/h a 1.200 rpm · 40 km/h a 950 rpm)</td></tr>
                      <tr><th>Toma de fuerza (TDF / PTO)</th><td>Trasera: 540 / 540E / 1000 / 1000E rpm · Delantera: 1000 rpm</td></tr>
                      <tr><th>Bomba hidráulica Load-Sensing</th><td>165 L/min estándar · 220 L/min opc. (hasta 430 L/min doble bomba)</td></tr>
                      <tr><th>Elevador trasero (Tripuntal Cat. III)</th><td>Capacidad máx. <b>11.050 daN</b> (≈ 11.268 kgf)</td></tr>
                      <tr><th>Elevador delantero (Cat. II)</th><td>Capacidad máx. <b>5.300 daN</b> (≈ 5.404 kgf)</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. DIMENSIONES OFICIALES */}
                <div className="ficha-block">
                  <h3>03 · Dimensiones Oficiales (Fendt 728 Vario Gen7.1)</h3>
                  <table className="ficha-table">
                    <tbody>
                      <tr><th>Longitud total</th><td><b>5.516 mm</b> (5,516 m)</td></tr>
                      <tr><th>Batalla (distancia entre ejes)</th><td><b>2.900 mm</b> (2,900 m)</td></tr>
                      <tr><th>Anchura total (neumáticos estándar)</th><td><b>2.650 mm</b> (2,650 m)</td></tr>
                      <tr><th>Altura cabina VisioPlus sin Fendt Guide</th><td><b>3.280 mm</b> (3,280 m)</td></tr>
                      <tr><th>Altura cabina VisioPlus con Fendt Guide</th><td><b>3.332 mm</b> (3,332 m)</td></tr>
                      <tr><th>Despeje máximo sobre el suelo</th><td><b>570 mm</b> (0,570 m)</td></tr>
                      <tr><th>Radio de giro mínimo</th><td>5,9 m (con neumáticos estándar y efecto pull-in-turn)</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. MASAS, CARGAS Y NEUMÁTICOS */}
                <div className="ficha-block">
                  <h3>04 · Pesos, Cargas por Eje y Neumáticos Homologados</h3>
                  <table className="ficha-table">
                    <tbody>
                      <tr><th>Peso en vacío operativo</th><td><b>9.200 – 9.650 kg</b> (según equipamiento ±5 %)</td></tr>
                      <tr><th>Peso bruto máximo autorizado</th><td><b>15.000 kg</b> (hasta 50 km/h) · 14.000 kg (a 60 km/h)</td></tr>
                      <tr><th>Carga máxima admisible Eje Delantero</th><td><b>6.900 kg</b></td></tr>
                      <tr><th>Carga máxima admisible Eje Trasero</th><td><b>11.500 kg</b></td></tr>
                      <tr><th>Neumáticos Estándar (Del. / Tras.)</th><td><b>540/65 R34</b> (Ø ≈ 1.566 mm) / <b>650/85 R38</b> (Ø ≈ 2.070 mm)</td></tr>
                      <tr><th>Neumáticos Opción 1 (Del. / Tras.)</th><td><b>600/70 R30</b> (Ø ≈ 1.602 mm) / <b>710/70 R42</b> (Ø ≈ 2.061 mm)</td></tr>
                      <tr><th>Sistema de teleinflado Fendt VarioGrip</th><td>Compresor doble refrigerado por agua de <b>800 L/min</b></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FUENTES BIBLIOGRÁFICAS OFICIALES */}
              <div className="ficha-sources-box">
                <h3>05 · Fuentes Oficiales de los Datos (AGCO GmbH / Fendt)</h3>
                <div className="ficha-sources-list">
                  {sources.map((s, i) => (
                    <div key={i} className="ficha-source-item">
                      <div>
                        <b>{s.title}</b>
                        <p>{s.detail}</p>
                      </div>
                      <a href={s.url} target="_blank" rel="noreferrer" className="ficha-source-link">
                        Sitio oficial Fendt ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <footer className="footer"><span>FENDT 728 VARIO GEN7.1 · EXPLICACIÓN EDUCATIVA</span><span>Proyecto independiente · No asociado ni avalado por AGCO/Fendt</span></footer>
    </main>
  </div>;
}

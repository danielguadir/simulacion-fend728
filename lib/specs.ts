export type Axle = "front" | "rear";
export type Variant = "standard" | "optional";
export type TireSpec = { key: string; axle: Axle; variant: Variant; widthMm: number; aspect: number; rimInches: number };

/** Tabla oficial Gen7.1: AGCO GmbH, Fendt 700 Vario, pp. 30–31 (impresas). */
export const tireSpecs: TireSpec[] = [
  { key: "540/65R34", axle: "front", variant: "standard", widthMm: 540, aspect: 65, rimInches: 34 },
  { key: "650/85R38", axle: "rear", variant: "standard", widthMm: 650, aspect: 85, rimInches: 38 },
  { key: "600/70R30", axle: "front", variant: "optional", widthMm: 600, aspect: 70, rimInches: 30 },
  { key: "710/70R42", axle: "rear", variant: "optional", widthMm: 710, aspect: 70, rimInches: 42 },
];

export function tireFor(axle: Axle, variant: Variant): TireSpec {
  const found = tireSpecs.find((item) => item.axle === axle && item.variant === variant);
  if (!found) throw new Error("Configuración de neumático no encontrada");
  return found;
}
export function tireGeometry(spec: TireSpec) {
  const sidewallMm = (spec.widthMm * spec.aspect) / 100;
  const rimMm = spec.rimInches * 25.4;
  return { sidewallMm, rimMm, nominalDiameterMm: rimMm + 2 * sidewallMm, nominalRadiusM: (rimMm + 2 * sidewallMm) / 2000 };
}
export const barToPsi = (bar: number) => bar * 14.5037738;
export const psiToBar = (psi: number) => psi / 14.5037738;
export const asNumber = (value: number, digits = 0) => value.toLocaleString("es-CO", { maximumFractionDigits: digits, minimumFractionDigits: digits });

/** Ilustración física muy simplificada: A=F/p. NO es área real homologada de la huella. */
export function idealContactAreaCm2(loadKg: number, inflationBar: number) {
  return (loadKg * 9.81 / (inflationBar * 100_000)) * 10_000;
}

export const technicalData = {
  operatingWeightKg: [9200, 9650] as const,
  frontAxleLimitKg: 6900,
  rearAxleLimitKg: 11500,
  grossMax40to50Kg: 15000,
  compressorAirflowLmin: 800,
  maxTireDiameterM: 2.05,
};

export type DimensionId =
  | "length"
  | "wheelbase"
  | "width"
  | "heightNoGuide"
  | "heightWithGuide"
  | "clearance";

export type TractorDimensionSpec = {
  id: DimensionId;
  label: string;
  shortLabel: string;
  valueMm: number;
  valueM: string;
  viewRecommended: "side" | "front" | "clearance" | "iso";
  description: string;
  color: string;
};

/** Dimensiones principales según ficha técnica oficial Fendt 728 Vario Gen7.1 */
export const tractorDimensions = {
  totalLengthMm: 5516,
  wheelbaseMm: 2900,
  totalWidthStandardMm: 2650,
  heightWithoutGuideMm: 3280,
  heightWithGuideMm: 3332,
  maxGroundClearanceMm: 570,
} as const;

export const tractorDimensionList: TractorDimensionSpec[] = [
  {
    id: "length",
    label: "Longitud total",
    shortLabel: "Longitud total",
    valueMm: 5516,
    valueM: "5,516 m",
    viewRecommended: "side",
    description: "Desde el extremo del elevador delantero hasta el extremo del enganche trasero.",
    color: "#a8f176",
  },
  {
    id: "wheelbase",
    label: "Batalla (distancia entre ejes)",
    shortLabel: "Batalla",
    valueMm: 2900,
    valueM: "2,900 m",
    viewRecommended: "side",
    description: "Distancia longitudinal entre el centro del eje delantero y el centro del eje trasero.",
    color: "#5ce1e6",
  },
  {
    id: "heightNoGuide",
    label: "Altura total cabina sin Fendt Guide",
    shortLabel: "Altura sin Fendt Guide",
    valueMm: 3280,
    valueM: "3,280 m",
    viewRecommended: "side",
    description: "Desde el nivel del suelo hasta el techo de la cabina VisioPlus sin domo receptor GNSS.",
    color: "#ffd166",
  },
  {
    id: "heightWithGuide",
    label: "Altura total cabina con Fendt Guide",
    shortLabel: "Altura con Fendt Guide",
    valueMm: 3332,
    valueM: "3,332 m",
    viewRecommended: "side",
    description: "Incluye el receptor de autoguiado Fendt Guide y baliza superior en el techo (+52 mm).",
    color: "#ff9f1c",
  },
  {
    id: "width",
    label: "Anchura total con neumáticos estándar",
    shortLabel: "Anchura total",
    valueMm: 2650,
    valueM: "2,65 m",
    viewRecommended: "front",
    description: "Anchura exterior medida entre los flancos externos de los neumáticos estándar.",
    color: "#c084fc",
  },
  {
    id: "clearance",
    label: "Despeje máximo respecto al suelo",
    shortLabel: "Despeje al suelo",
    valueMm: 570,
    valueM: "0,570 m",
    viewRecommended: "clearance",
    description: "Altura libre inferior bajo el puente/chasis respecto al plano de apoyo de los neumáticos.",
    color: "#ff6b6b",
  },
];

export const sources = [
  { title: "AGCO GmbH — Fendt 700 Vario Gen7.1", detail: "Folleto oficial en inglés, páginas impresas 20–21 (VarioGrip) y 30–31 (dimensiones generales, neumáticos y pesos).", url: "https://www.fendt.com/int/agricultural-machinery/tractors/fendt-700-vario-gen7" },
  { title: "AGCO GmbH — Fendt 700 Vario Gen7", detail: "Folleto oficial en español, página impresa 39 (líneas de aire y VarioGrip). Documento de generación anterior: apoyo conceptual únicamente.", url: "https://www.fendt.com/int/agricultural-machinery/tractors/fendt-700-vario-gen7" },
];


import type { Metadata } from "next";
import "./globals.css";
import SecurityShield from "@/components/SecurityShield";

export const metadata: Metadata = {
  title: "Laboratorio 3D Fendt 728 Vario Gen7.1 | Impulso GP",
  description:
    "Simulador y explorador tridimensional educativo de neumáticos, VarioGrip, bar/psi y cargas del Fendt 728 Vario Gen7.1 — Impulso GP.",
  robots: {
    index: true,
    follow: true,
    noarchive: true,
    nosnippet: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <SecurityShield />
        {children}
      </body>
    </html>
  );
}

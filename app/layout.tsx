import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio de neumáticos | Fendt 728 Vario Gen7.1",
  description: "Explorador tridimensional educativo de neumáticos, VarioGrip, bar/psi y cargas del Fendt 728 Vario Gen7.1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}

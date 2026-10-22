"use client";

import { useEffect } from "react";

/**
 * Capa de protección de cliente (Impulso GP Security Shield)
 * Disuade e impide el acceso casual al código fuente, clic derecho,
 * guardado de página (Ctrl+S), vista de código fuente (Ctrl+U) y atajos de DevTools (F12 / Ctrl+Shift+I/J/C).
 */
export default function SecurityShield() {
  useEffect(() => {
    // 1. Mensaje disuasorio de propiedad intelectual en consola
    try {
      console.clear();
      console.log(
        "%c⚠️ IMPULSO GP — SISTEMA PROTEGIDO",
        "color:#58a236;font-size:18px;font-weight:900;background:#0b1915;padding:6px 12px;border-radius:6px;border:1px solid #58a236;"
      );
      console.log(
        "%cEste simulador 3D y su ingeniería paramétrica son propiedad exclusiva de Impulso GP. Queda prohibida la copia, ingeniería inversa o extracción no autorizada.",
        "color:#b8d4c0;font-size:12px;"
      );
    } catch {
      // Ignorar si console está restringido
    }

    // 2. Bloquear menú contextual (Clic derecho -> Inspeccionar / Guardar como)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 3. Bloquear atajos de inspección de código (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // F12
      if (e.key === "F12") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I (Inspector), Ctrl+Shift+J (Consola), Ctrl+Shift+C (Element picker), Ctrl+Shift+K
      if (ctrlOrMeta && e.shiftKey && (key === "i" || key === "j" || key === "c" || key === "k")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (Ver código fuente) o Ctrl+S (Guardar HTML/código)
      if (ctrlOrMeta && (key === "u" || key === "s")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 4. Bloquear arrastre de imágenes y lienzos 3D (dragstart)
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  return null;
}

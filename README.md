# Simulación 3D — Fendt 728 Vario Gen7.1 (Laboratorio de Maquinaria Agrícola)

Simulador y laboratorio interactivo 3D a escala real (`1:1`) del tractor **Fendt 728 Vario Gen7.1**, desarrollado con **Next.js 15 (App Router), React 19, TypeScript y Three.js (`@react-three/fiber` + `@react-three/drei`)**.

## Características principales

- **Modelo esquemático 3D paramétrico del Fendt 728 Vario Gen7.1 (Escala 1:1)**:
  - **6 cotas oficiales interactivas**: Longitud total (`5.516 mm`), Batalla (`2.900 mm`), Anchura total estándar (`2.650 mm`), Altura cabina VisioPlus sin Fendt Guide (`3.280 mm`), Altura con Fendt Guide (`3.332 mm`) y Despeje máximo al suelo (`570 mm`).
  - **Desplegable superior flotante**: Consulta rápida de las 6 cotas del tractor y dimensiones de neumáticos sin bloquear la vista 3D.
- **Ingeniería escalable de neumáticos homologados (3D + 2D)**:
  - Conmutación dinámica en vivo entre **Montaje Estándar** (`540/65 R34` delantero · `650/85 R38` trasero) y **Opción 1** (`600/70 R30` delantero · `710/70 R42` trasero), reescalando automáticamente radio exterior, llanta, ancho de banda y perfil.
- **Telemática, conducción e iluminación interactiva**:
  - Encendido de motor (`850 / 1.550 RPM`) con vibración de chasis y humo de escape.
  - Iluminación LED frontal en capó y faros de trabajo en techo de cabina.
  - Conducción adelante/reversa y giro de dirección con direccionales ámbar (mediante controles HUD o teclado `WASD` / flechas `↑ ↓ ← →`) sobre piso 3D en cuadritos con rotación y desplazamiento continuo.
- **Tripuntal trasero Cat. III con lastre modular de 4 o 6 discos**:
  - Acoplamiento/desacoplamiento animado en 3D, opción de ocultar/quitar de la vista 3D y giro físico sincronizado de los discos durante el avance.
- **Módulos adicionales de ingeniería agrícola**:
  - Laboratorio 3D individual de neumático, simulador de huella de contacto y presión (`bar` / `psi`), sistema de teleinflado **Fendt VarioGrip** (`800 L/min`), análisis de cargas por eje y **Ficha Técnica Oficial completa**.

## Arquitectura del proyecto

```text
app/
  layout.tsx                      # Metadatos y estructura raíz
  page.tsx                        # Orquestador de vistas, desplegables y Ficha Técnica Oficial
  globals.css                     # Sistema de diseño responsive y HUD flotantes
components/
  TractorSchematic3D.tsx          # Escena 3D principal del Fendt 728 Vario Gen7.1, cámaras y cotas 3D
  TractorControlDeck.tsx          # HUD derecho compacto (encendido, conducción WASD y modal de configuración)
  RearDiscAttachment3D.tsx        # Implemento modular trasero de lastre con 4 o 6 discos en tripuntal Cat. III
  WheelScene.tsx                  # Visor 3D individual de neumático agrícola
lib/
  specs.ts                        # Datos técnicos verificados, fórmulas geométricas y referencias
```

## Ejecución en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000` en el navegador.

## Despliegue en Vercel

El repositorio está estructurado en la raíz para despliegue directo (**Zero-Config**) en **Vercel**:
1. Importa el repositorio `danielguadir/simulacion-fend728` en [Vercel](https://vercel.com/new).
2. Framework Preset: **Next.js** (detectado automáticamente).
3. Comando de compilación: `npm run build`.

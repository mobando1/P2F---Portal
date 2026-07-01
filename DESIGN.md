---
name: Passport2Fluency
description: CRM y portal premium para una escuela de idiomas — cálido, confiable, on-brand en claro y oscuro.
colors:
  primary: "#1C7BB1"
  primary-900: "#0A4A6E"
  accent: "#F59E1C"
  fog-blue: "#EAF4FA"
  background: "#FBFDFE"
  surface: "#FFFFFF"
  ink: "#0A4A6E"
  muted: "#E9F2F8"
  muted-foreground: "#647D8C"
  border: "#DBE5EC"
  success: "#27A36A"
  warning: "#F7A008"
  danger: "#DC3C3C"
  dark-background: "#0B1220"
  dark-surface: "#141B29"
  dark-ink: "#EEF3F9"
  dark-primary: "#38B6F0"
typography:
  display:
    fontFamily: '"Plus Jakarta Sans", Inter, ui-sans-serif, sans-serif'
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Plus Jakarta Sans", Inter, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: '"Plus Jakarta Sans", Inter, sans-serif'
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  "2xl": "20px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0 1rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-900}"
    textColor: "{colors.surface}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-900}"
    rounded: "{rounded.lg}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "3rem"
  stat-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
---

# Design System: Passport2Fluency

## 1. Overview

**Creative North Star: "La Hora Dorada"**

El sistema vive en la hora dorada: el **sky-blue** (#1C7BB1) es el cielo despejado y el **sun-orange** (#F59E1C) es la luz cálida del atardecer. Esa combinación —cielo confiable + sol cálido— es exactamente lo que la marca quiere transmitir: **confiable, cálido y premium**. No es un SaaS más; es una herramienta que da gusto operar y orgullo mostrar. El **night-blue** (#0A4A6E) ancla el texto y el modo oscuro, como el cielo justo después del ocaso.

La densidad es **respirada, no amontonada**: mucho aire, una acción primaria evidente por pantalla, jerarquía tipográfica clara. Cada superficie que un cliente potencial pueda ver —empezando por el login— debe generar deseo, no solo funcionar. La marca se expresa vía **tokens** (CSS variables en `client/src/index.css`) y funciona idéntica en claro y oscuro; el modo oscuro es una superficie casi-negra azulada premium (#0B1220), nunca el slate genérico de shadcn.

Este sistema **rechaza explícitamente**: el SaaS genérico color crema con grids de tarjetas idénticas, el enterprise recargado sin aire (HubSpot/Salesforce viejo), el gris bancario frío, y lo infantil/chillón. Calidez con credibilidad, siempre.

**Key Characteristics:**
- Marca sky-blue + sun-orange + night-blue, vía tokens, en claro y oscuro.
- Plano en reposo, se eleva al interactuar (sombras azuladas + glow de marca).
- Tipografía display Plus Jakarta Sans + cuerpo Inter.
- Aire y jerarquía sobre densidad; una acción primaria por pantalla.
- Micro-motion con spring; respeta `prefers-reduced-motion`.

## 2. Colors

Paleta cálida-confiable: un azul cielo de marca como voz principal, un naranja sol como acento de energía/acción, y neutros levemente azulados (nunca grises fríos ni cremas).

### Primary
- **Sky Blue** (#1C7BB1 · `hsl(200 69% 43%)`): color de marca principal. Botones primarios, enlaces, estados activos del sidebar, acentos de KPI, foco. En oscuro sube a un sky luminoso (#38B6F0) para brillar sobre fondo casi-negro.
- **Night Blue** (#0A4A6E · `hsl(208 74% 25%)`): extremo profundo de la rampa (`primary-900`). Texto principal en claro, degradados de botón (`from-primary to-primary-700`), panel de marca del login.

### Secondary
- **Sun Orange** (#F59E1C · `hsl(37 95% 58%)`): acento cálido. Botón de registro, badges de "lead", destellos de energía. Uso deliberado y minoritario — es el sol, no el cielo.

### Neutral
- **Fog Blue** (#EAF4FA): fondos suaves, superficies `muted`, chips.
- **Background** (#FBFDFE claro / #0B1220 oscuro): lienzo de la app (levemente azulado, nunca crema).
- **Surface** (#FFFFFF claro / #141B29 oscuro): cards, popovers, sidebar.
- **Ink** (#0A4A6E claro / #EEF3F9 oscuro): texto principal.
- **Muted-foreground** (#647D8C): texto secundario — verificado ≥4.5:1 sobre superficies claras.
- **Border** (#DBE5EC): bordes y divisores, azulados (no gris neutro).

### Estados
- **Success** (#27A36A) · **Warning** (#F7A008) · **Danger** (#DC3C3C) · **Info** = Sky Blue. Se usan como fondo a 10-15% de opacidad + texto del mismo tono (nunca gris sobre color).

### Named Rules
**La Regla del Sol.** El sun-orange es acento, no fondo: aparece en ≤10% de cualquier pantalla. Su escasez es lo que lo hace cálido; si inunda la UI, se vuelve infantil.
**La Regla del Tinte Azul.** Neutros y bordes llevan un leve tinte hacia el hue de marca (azul), nunca hacia el crema/beige. El crema es el default del SaaS-IA que evitamos.

## 3. Typography

**Display Font:** Plus Jakarta Sans (fallback Inter, sans-serif)
**Body Font:** Inter (fallback system-ui, sans-serif)

**Character:** Contraste por peso y forma, no por familias parecidas. Plus Jakarta (humanista, con personalidad en los remates) da calidez a los titulares; Inter (neutra, altísima legibilidad) sostiene el texto denso del CRM. Ambas cargan vía Google Fonts.

### Hierarchy
- **Display** (Plus Jakarta 800, `clamp(2rem, 5vw, 3rem)`, lh 1.05, -0.02em): headline del login y héroes. `text-wrap: balance`.
- **Headline** (Plus Jakarta 700, 1.5rem, lh 1.2): títulos de página (`PageHeader`).
- **Title** (Plus Jakarta 600, 1.125rem, lh 1.3): títulos de card/sección.
- **Body** (Inter 400, ~0.9375rem, lh 1.5): texto general; línea máx 65–75ch en prosa.
- **Label** (Inter 500, 0.75rem, +0.02em): metadatos, KPIs pequeños, columnas de tabla; números con `tabular-nums`.

### Named Rules
**La Regla del Kicker Prohibido.** Nada de eyebrows en mayúsculas tracked sobre cada sección. La jerarquía la da el tamaño/peso display, no un scaffold repetido.

## 4. Elevation

**Plano en reposo, se eleva al interactuar.** Las superficies descansan planas o con una sombra mínima; la elevación es una **respuesta a estado** (hover, foco, drag). Las sombras llevan **tinte azulado de marca** (no negro puro), lo que las hace premium y coherentes con la paleta. Glass y aurora-gradient existen pero son **raros y con propósito** (panel del login, headers), nunca decoración por defecto.

### Shadow Vocabulary
- **sm** (`0 1px 3px 0 hsl(208 60% 20% / 0.06)`): reposo de cards.
- **md** (`0 4px 12px -2px hsl(208 60% 20% / 0.08)`): hover de cards, popovers.
- **lg / xl**: modales y overlays.
- **glow-primary** (`0 0 0 1px hsl(200 69% 43% / 0.2), 0 8px 32px -8px hsl(200 69% 43% / 0.35)`): hover de KPI/StatCard y card en drag.

### Named Rules
**La Regla de la Sombra Azul.** Toda sombra usa `hsl(208 60% 20% / α)`, nunca negro puro. El negro puro se ve barato sobre una paleta cálida.

## 5. Components

### Buttons
- **Shape:** radio `lg` (12px).
- **Primary:** degradado `from-primary to-primary-700`, texto blanco, `h-2.5rem`. Micro-motion: `hover:brightness-110` + sombra que crece.
- **Accent (registro/CTA cálido):** `from-accent to-accent-600`, texto night-blue.
- **Hover / Focus:** transición ~200ms; foco visible con `ring` sky-blue. `whileTap` scale sutil en acciones.
- **Ghost / Outline:** para acciones secundarias; borde `border`, hover `bg-muted`.

### Cards / Containers
- **Corner Style:** radio `lg`–`2xl` (12–20px); primitivas destacadas usan `2xl`.
- **Background:** `surface`; texto `ink`.
- **Shadow Strategy:** `sm` en reposo → `md`/`glow-primary` en hover (ver Elevation).
- **Border:** `1px border` azulado. **Nunca** border-left grueso de color como acento.
- **Internal Padding:** `1.25rem` (20px).

### Inputs / Fields
- **Style:** fondo `background`, borde `border`, radio `md`, altura `3rem`; iconos lucide a la izquierda.
- **Focus:** borde → `primary` + `ring-primary/20` + sombra suave; transición 300ms.
- **Error / Disabled:** borde `danger` / opacidad reducida.

### Navigation (AppShell)
- Sidebar colapsable (shadcn `sidebar`), item activo con fondo `sidebar-accent` + texto `sidebar-primary`. Topbar sticky con glass sutil al scroll, breadcrumb, y **command palette ⌘K**. En móvil el sidebar es drawer.

### StatusBadge (componente firma)
- Mapa central de color por etapa del pipeline (trial/lead/negotiation/customer/inactive) y por estado (success/warning/danger/info). Fondo tono/10 + texto del mismo tono + `ring` inset; punto de color opcional. Reemplaza todos los colores de estado hardcodeados.

### StatCard / TrendChart (componentes firma)
- **StatCard:** número grande `font-display tabular-nums` con count-up (framer-motion), delta con color success/danger, glow al hover.
- **TrendChart:** wrapper de recharts con colores de marca vía tokens (`var(--chart-*)`), gradientes de área y tooltip glass; dark-mode automático.

## 6. Do's and Don'ts

### Do:
- **Do** usar los tokens (`--primary`, `--accent`, `--foreground`, `--muted`, `--success`…) para todo color; nunca hex de marca hardcodeado (rompe el modo oscuro).
- **Do** mantener el sun-orange como acento ≤10% de la pantalla.
- **Do** verificar contraste AA: cuerpo ≥4.5:1, texto grande ≥3:1, en claro **y** oscuro.
- **Do** elevar en respuesta a estado (hover/foco/drag) con sombras azuladas + `glow-primary`.
- **Do** envolver toda animación con una alternativa `@media (prefers-reduced-motion: reduce)`.
- **Do** usar Plus Jakarta para display e Inter para cuerpo; jerarquía por tamaño/peso.

### Don't:
- **Don't** caer en el **SaaS genérico color crema** ni en grids de tarjetas idénticas icono+título+texto.
- **Don't** amontonar como **enterprise recargado** (HubSpot/Salesforce viejo): sin aire, mil opciones a la vez.
- **Don't** volverlo **gris bancario frío** ni **infantil/chillón** (primarios de juguete).
- **Don't** usar `border-left`/`border-right` grueso de color como acento en cards o alerts.
- **Don't** usar texto con gradiente (`background-clip: text`), glassmorphism decorativo por defecto, ni sombras negras puras.
- **Don't** poner eyebrows en mayúsculas tracked sobre cada sección.

---
timestamp: 2026-07-01T03-11-21Z
slug: client-src-components-crm-crmoverview-tsx
---
# Critique — CRM (/admin/crm) · Passport2Fluency

Method: dual-agent (A: design-review · B: deterministic detector). Register: product. Browser overlay: no disponible (sin herramienta de navegador) → evidencia = detector estático + revisión de código.

## Design Health Score (Nielsen)

| # | Heurística | Score | Problema clave |
|---|-----------|-------|----------------|
| 1 | Visibilidad del estado | 3 | Skeletons + toasts sí; pero drag de etapa no da feedback optimista ni spinner por-tarjeta hasta el refetch. |
| 2 | Match mundo real | 3 | `lead` = "Prospecto" en Pipeline vs "Lead" en lista/badges — un dato, dos nombres. |
| 3 | Control y libertad | 2 | Sin undo: mover etapa (drag), borrar nota, completar tarea, créditos — irreversibles salvo el delete de contacto. |
| 4 | Consistencia y estándares | 2 | StudentDetail fuera del sistema: `bg-white` literal, `bg-orange-100/text-orange-800`, tags con hex crudo. Rompe dark mode. |
| 5 | Prevención de errores | 3 | Delete con nombre tipeado = excelente. Créditos usa `window.confirm` nativo (off-brand). |
| 6 | Reconocer > recordar | 3 | ⌘K con búsqueda muy bueno; bulk no dice cuántos/qué afecta más allá del número. |
| 7 | Flexibilidad/eficiencia | 3 | ⌘K, bulk, deep-links, drag. Falta "siguiente contacto" y atajos dentro del detalle. |
| 8 | Estética y minimalismo | 3 | Respirado; resta el `uppercase tracking-wide` omnipresente y el triple grid de stat-cards. |
| 9 | Recuperación de errores | 2 | Error de carga = texto rojo plano, sin icono, sin "reintentar", sin EmptyState. |
| 10 | Ayuda y documentación | 2 | Sin tooltips/onboarding; las stat-cards no explican qué cuentan. |
| **Total** | | **26/40** | **Por encima de la media real (20-32). Frenado por consistencia y red de seguridad.** |

## Anti-Patterns Verdict — ¿parece hecho por IA?

**LLM (A):** NO es slop — top ~10% de CRMs generados. Tokens bien pensados, `StatusBadge` centralizado, sombras azuladas, sin gradient-text ni border-left ni glass decorativo. PERO hay residuos: (1) **viola su propia "Regla del Kicker Prohibido"** — `uppercase tracking-wide` en cada label de KPI (`stat-card.tsx:61`) y header de tabla (`data-table.tsx:126`); (2) patrón "grid de 4 stat-cards idénticas" repetido 3× (Overview, Contactos, Métricas); (3) `glass-card.tsx` existe como tentación latente.

**Detector (B):** pasada **limpia** — exit 0, `[]`, 0 hallazgos en los 10 archivos (2.525 líneas). Motor verificado con canary (disparó `bounce-easing` en código malo a propósito).

**Dónde discrepan:** el detector NO capturó el eyebrow-rule ni el `bg-white`/clase dudosa ni la inconsistencia de traducción — esos los cazó la revisión humana. El detector confirma ausencia de los slop clásicos; la revisión encuentra los sutiles.

## Overall
Buen esqueleto con tokens sólidos y 3 aciertos reales. Los problemas no son de gusto sino de **coherencia y red de seguridad**: StudentDetail se quedó una generación atrás del resto, mover etapa es destructivo sin undo, y el sistema contradice su propia regla del kicker. Nada catastrófico; todo arreglable sin rediseño. El gap estratégico: falta el "wow" que la marca promete para su superficie-vitrina.

## What's Working
1. **StatusBadge como fuente única de color de estado** — mapa central stage+state → tokens, dark-mode aware. La mejor pieza.
2. **Delete con confirmación por nombre tipeado** — fricción proporcional al riesgo, patrón GitHub-grade.
3. **⌘K con búsqueda en vivo + deep-links a `/contacts/:id`** — soporte real a "velocidad de venta".

## Priority Issues
- **[P1] Mover etapa (drag) es destructivo, silencioso e irreversible** (`CrmPipeline.tsx:126`, `StudentDetail` moveStage). Un cliente movido a "inactive" por un drag torpe = pérdida silenciosa. Fix: update optimista + toast "Deshacer" (5s); micro-confirm en saltos graves. → `/harden` + `/animate`.
- **[P1] StudentDetail fuera del design system / dark mode** — `bg-white` literal (`:657,:729`), `bg-orange-100 text-orange-800` (`:111`), tags con hex crudo; verificar `bg-muted/40` (el resto de la app usa `/opacity` sobre estos tokens y renderiza, pero conviene confirmar). Fix: tokens (`bg-card`, StatusBadge para no-show), y reemplazar `window.confirm` de créditos por AlertDialog on-brand. → `/colorize` + `/clarify`.
- **[P2] Eyebrows `uppercase tracking-wide` violan la Regla del Kicker** (`stat-card.tsx:61`, `data-table.tsx:126`). Un cambio en 2 primitivas propaga a todo el CRM. → `/typeset`.
- **[P2] Estados de error sin recuperación ni marca** (Pipeline/List/Metrics). Fix: `ErrorState` (variante de EmptyState) con icono + mensaje cálido + "Reintentar" (`refetch()`). → `/harden`.
- **[P3] Triple grid de stat-cards; en Contactos empuja la tabla bajo el fold** (`CrmStudentList.tsx:279`). Fix: colapsar el summary a chips/segmented-control que además filtre por etapa; diferenciar los 3 dashboards. → `/distill` + `/layout`.
- **[P3] "Wow desde el login" no llega al dashboard** (Principio 1 de PRODUCT.md). Fix: un momento firma en "Hoy" (saludo + progreso del día con barra sun-orange) y elevar "Hoy" sobre los KPIs. → `/delight`.

## Persona Red Flags
- **Vendedor power-user:** drag accidental a etapa errónea sin undo; StudentDetail apretado en móvil (5 acciones + 5 tabs en 520px); sin "siguiente contacto". (Ama ⌘K y bulk.)
- **Admin primerizo:** sin ayuda inline (lead vs negotiation); ve "Prospecto" vs "Lead" y cree que son distintos; `window.confirm` gris parece error del sistema.
- **Dueño/prospecto (vitrina):** "ordenado, pero como cualquier CRM" — sin wow; si el demo cae en error de red, ve texto rojo plano.

## Minor
- `prefers-reduced-motion` no respetado en variants de framer (`listStagger`, `kpiPop`) — solo `useCountUp` lo respeta. Contradice Accessibility de PRODUCT.md.
- Tag se ve distinto entre vistas (`${tag.color}22` en lista vs sólido con texto blanco en detalle).
- Barra de pipeline en el bento normaliza contra el máximo → la etapa mayor siempre llega a 100% (sugiere "meta cumplida" falsamente).
- `PageHeader` soporta icon/breadcrumbs que ninguna pantalla usa (código muerto o duplicación con el topbar).
- Kanban en móvil = scroll horizontal + drag: frágil en touch; considerar tap→select para cambiar etapa.

## Questions
1. Si borrar exige tipear el nombre, ¿por qué mover a "inactive" (comercialmente comparable) no cuesta nada?
2. ¿Cuántos de esos KPIs mira el vendedor a las 9am vs cuántos son teatro para el prospecto? Separar "operar" de "vitrina".
3. StudentDetail: ¿panel de 520px o página completa? El vendedor vive ahí.
4. ¿Dónde está el "wow" del CRM? Hoy el único deleite es el count-up.
5. `glass-card.tsx` sin uso: ¿primitiva con propósito o tentación de slop? Bórrala o justifícala.

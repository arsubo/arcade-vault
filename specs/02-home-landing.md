# SPEC 02 — Home (landing) y reubicación de Biblioteca

> **Status:** Implementado
> **Depends on:** 01-mvp-visual
> **Date:** 2026-07-30
> **Objective:** Portar la landing de marketing (`home.jsx`) del prototipo en `references/templates/home-about/` a la ruta `/` de Next.js App Router, moviendo la Biblioteca actual de `/` a `/biblioteca` y actualizando el Nav compartido con los enlaces "Inicio" y "Acerca de", sin implementar todavía la página Acerca de (`about.jsx`) ni corregir los enlaces internos existentes que hoy asumen que `/` es la Biblioteca.

## Scope

**In:**

- Nueva ruta `/` (`app/page.tsx`) con la landing de marketing portada 1:1 de `home.jsx`:
  - Hero: silhouettes flotantes decorativos (`FloatingSilhouettes`, SVGs pixel-art), eyebrow "INSERTA UNA MONEDA", título de 3 líneas, subtítulo, CTAs "▶ EXPLORAR JUEGOS" (→ `/biblioteca`) y "✦ CREAR CUENTA" (→ `/auth`), indicador de scroll.
  - Sección "¿POR QUÉ ARCADE VAULT?": grid de 4 `feature-card` con `FeatureIcon` (pixel SVG) y animación reveal-on-scroll.
  - Sección "JUEGOS DISPONIBLES AHORA": riel de `MiniCard` (componente nuevo, más pequeño que `GameCard`, sin tilt) con `GAMES.slice(0, 6)`, cada tarjeta enlaza a `/games/[id]`; botón "VER TODOS LOS JUEGOS →" → `/biblioteca`.
  - Sección de stats: 3 bloques estáticos ("12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING").
  - Sección "ACTIVIDAD EN VIVO": ticker de puntuaciones recientes + "TOP JUGADORES · HOY", con los mismos datos de ejemplo hardcodeados del template (no derivados de `seededScores`); botón "VER SALÓN →" → `/salon`.
  - Sección de precios: card "JUGADOR VAULT $0 / SIEMPRE" con lista de beneficios y CTA → `/auth`, más FAQ de 3 preguntas.
  - CTA final "¿LISTO PARA JUGAR?" → `/biblioteca`.
  - Animaciones reveal-on-scroll vía `IntersectionObserver` (hook `useReveal`, igual que el template), definido localmente en la página ya que por ahora solo lo usa Home.
- Mover el contenido actual de `app/page.tsx` (pantalla Biblioteca de spec 01) a `app/biblioteca/page.tsx`, sin cambios de comportamiento ni de diseño.
- Renombrar las rutas de detalle y reproductor de `/juego/[id]` y `/juego/[id]/jugar` a `/games/[id]` y `/games/[id]/jugar` (mover `app/juego/` → `app/games/`), y actualizar los 5 puntos del código que hoy referencian `/juego`:
  - `components/Nav.tsx` (chequeo `isActive` de Biblioteca).
  - `components/GameCard.tsx` (`href`).
  - `app/games/[id]/page.tsx` (tipo `PageProps` y el link hacia `/games/[id]/jugar`).
  - `app/games/[id]/jugar/page.tsx` (link de vuelta a `/games/[id]`).
- Actualizar `components/Nav.tsx`:
  - El logo sigue enlazando a `/` (ahora es la nueva Home).
  - Nuevo enlace "Inicio", activo cuando `pathname === "/"`.
  - El enlace "Biblioteca" pasa a apuntar a `/biblioteca`; se considera activo en `/biblioteca` y en `/games/*` (igual que hoy con `/juego/*`).
  - Nuevo enlace "Acerca de" como placeholder inerte (sin `href`, no navega), visible en el menú de escritorio y en el panel móvil, ya que `about.jsx` queda fuera de este spec.
- Ampliar `app/globals.css` con las clases necesarias para las nuevas secciones de Home (`.home-hero`, `.home-silos`, `.feature-grid`, `.mini-card`, `.home-stats`, `.activity-grid`, `.pricing-grid`, etc.), portadas 1:1 desde `styles.css` del template.

**Out of scope (para specs futuros):**

- La página Acerca de (`about.jsx`) y su ruta (p. ej. `/acerca-de`) — el enlace del Nav queda como placeholder sin implementación.
- Corregir los enlaces internos que hoy navegan a `/` esperando la Biblioteca y que, sin cambios, pasarán a apuntar a la nueva Home: los 2 casos en `/auth` (submit y botón invitado), el botón "volver al vault" en `/salon`, en `/games/[id]` y en el modal de fin de partida de `/games/[id]/jugar`. Se corrigen en un spec de limpieza posterior.
- Cualquier dato real para el ticker de "actividad en vivo" o "top jugadores" — quedan estáticos y hardcodeados.
- Autenticación real, backend, persistencia, sistema de créditos funcional (ya fuera de alcance desde spec 01).

## Data model

Este spec no introduce datos nuevos en `lib/games.ts` ni ningún otro módulo compartido. La Home reutiliza `GAMES` (para el riel de `MiniCard`, vía `GAMES.slice(0, 6)`).

Los datos de "ACTIVIDAD EN VIVO" y "TOP JUGADORES · HOY" son arrays literales locales dentro de `app/page.tsx` (no exportados, no tipados en `lib/games.ts`), igual que en `home.jsx`:

```ts
// solo dentro de app/page.tsx, sin exportar
type TickerRow = { p: string; g: string; s: number; t: string; c: "cyan" | "magenta" | "yellow" | "green" };
type TopRow = { r: number; p: string; s: number };
```

No se agrega ninguna otra estructura, store o estado global.

## Implementation plan

1. Renombrar `app/juego/` → `app/games/` y actualizar los 4 puntos de código que referencian `/juego`: `components/Nav.tsx` (chequeo `isActive`), `components/GameCard.tsx` (`href`), `app/games/[id]/page.tsx` (tipo `PageProps` y el link hacia `/jugar`), `app/games/[id]/jugar/page.tsx` (link de vuelta al detalle). El sistema queda funcional con las mismas 5 rutas de antes, ahora bajo `/games`.
2. Mover el contenido actual de `app/page.tsx` a `app/biblioteca/page.tsx` sin cambios de comportamiento ni diseño. El sistema queda funcional: la Biblioteca sigue accesible, ahora en `/biblioteca` (aunque el Nav todavía no apunte ahí — se corrige en el paso 6).
3. Ampliar `app/globals.css` con las clases de Home portadas 1:1 de `styles.css` del template (`.home-hero`, `.home-silos`, `.feature-grid`, `.mini-card`, `.home-stats`, `.activity-grid`, `.pricing-grid`, etc.). No hay cambio visual todavía porque nada las usa aún.
4. Crear `components/MiniCard.tsx` (variante pequeña de tarjeta de juego, sin tilt, enlaza a `/games/[id]`), siguiendo el mismo patrón que `GameCard.tsx`.
5. Crear el nuevo `app/page.tsx` con la landing completa de Home: hero + `FloatingSilhouettes`, sección "¿Por qué Arcade Vault?" con `FeatureIcon`, riel de `MiniCard` con `GAMES.slice(0, 6)` + stats, sección "Actividad en vivo" (ticker y top jugadores con los arrays hardcodeados), sección de precios + FAQ, CTA final, y el hook `useReveal` para las animaciones reveal-on-scroll. El sistema queda funcional: `/` muestra la nueva Home completa.
6. Actualizar `components/Nav.tsx`: agregar enlace "Inicio" (activo en `/`), cambiar el enlace "Biblioteca" para apuntar a `/biblioteca` (activo en `/biblioteca` y `/games/*`), agregar "Acerca de" como placeholder inerte sin `href`, en el menú de escritorio y en el panel móvil.
7. Pasada de QA visual: recorrer `/`, `/biblioteca`, `/games/[id]`, `/games/[id]/jugar`, `/auth`, `/salon` comparando contra `home.jsx`/`arcade-vault-standalone.html`, verificar que los enlaces renombrados funcionen, y confirmar que "Acerca de" no navega a ningún lado.

## Acceptance criteria

- [x] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [x] `/` muestra la nueva landing de Home: hero con silhouettes flotantes, sección "¿Por qué Arcade Vault?", riel de juegos, stats, "Actividad en vivo", precios y CTA final.
- [x] El botón "▶ EXPLORAR JUEGOS" del hero de Home navega a `/biblioteca`.
- [x] El botón "✦ CREAR CUENTA" del hero de Home navega a `/auth`.
- [x] El riel "JUEGOS DISPONIBLES AHORA" muestra exactamente los primeros 6 juegos de `GAMES` y cada `MiniCard` enlaza a `/games/[id]`.
- [x] El botón "VER TODOS LOS JUEGOS →" navega a `/biblioteca`.
- [x] El botón "VER SALÓN →" de la sección "Actividad en vivo" navega a `/salon`.
- [x] El botón "EMPEZAR GRATIS →" de la sección de precios y el CTA final "INSERTAR MONEDA →" navegan a `/auth` y `/biblioteca` respectivamente, igual que en `home.jsx`.
- [x] Las secciones marcadas `reveal` aplican su animación de aparición al hacer scroll (se les agrega la clase `in` al entrar en el viewport).
- [x] `/biblioteca` muestra exactamente el mismo contenido y comportamiento que tenía `/` antes de este spec (buscador, chips de categoría, grid con tilt).
- [x] `/games/[id]` y `/games/[id]/jugar` funcionan igual que antes (mismo contenido, mismas interacciones), solo que bajo el nuevo prefijo `/games`.
- [x] Visitar `/juego/[id]` (ruta antigua) responde con la página 404 de Next.js.
- [x] En el Nav, "Inicio" aparece activo únicamente en `/`.
- [x] En el Nav, "Biblioteca" aparece activo en `/biblioteca` y en cualquier `/games/*`.
- [x] En el Nav, "Acerca de" es visible (escritorio y panel móvil) pero no navega a ningún lado ni produce error al hacer clic.
- [x] El logo del Nav sigue enlazando a `/` (ahora la nueva Home).
- [x] En viewport móvil (<840px), el Nav colapsa a hamburguesa y el panel lateral incluye "Inicio", "Biblioteca", "Salón de la Fama", "Acerca de" (inerte) e "Iniciar Sesión".
- [ ] No hay errores ni warnings en la consola del navegador al navegar por `/`, `/biblioteca`, `/games/[id]`, `/games/[id]/jugar`, `/auth` y `/salon`.

## Decisions

- **Sí:** `/` pasa a ser la nueva Home de marketing y la Biblioteca se mueve a `/biblioteca`. Coincide con `nav.jsx` del template, que trata "Inicio" y "Biblioteca" como enlaces distintos.
- **Sí:** renombrar `/juego/[id]` y `/juego/[id]/jugar` (ya implementados en spec 01) a `/games/[id]` y `/games/[id]/jugar`, actualizando los 4 puntos de código que los referencian. Se agrupó en este mismo spec para no dejar el codebase con dos convenciones de idioma mezcladas (`/juego` en inglés-español a medias vs. `/games`).
- **No:** implementar `about.jsx` en este spec. El enlace "Acerca de" queda como placeholder inerte (sin `href`) en el Nav. Se descartó implementarlo ahora para mantener este spec centrado en portar la Home; la página Acerca de se define en un spec futuro.
- **No:** corregir los 5 enlaces internos que hoy navegan a `/` esperando la Biblioteca (los 2 casos en `/auth`, y los botones "volver al vault" en `/salon`, `/games/[id]` y `/games/[id]/jugar`). Se descartó a pedido explícito del usuario para no ampliar el alcance de este spec; después de este cambio, esos botones llevarán a la nueva Home en vez de a la Biblioteca hasta que se corrijan en un spec de limpieza posterior.
- **Sí:** los datos de "ACTIVIDAD EN VIVO" y "TOP JUGADORES · HOY" quedan como arrays literales hardcodeados, iguales al template, en vez de derivarse de `seededScores`. Es contenido puramente decorativo, coherente con el enfoque "solo visual" ya establecido en spec 01.
- **Sí:** `MiniCard` se crea como componente nuevo (`components/MiniCard.tsx`), separado de `GameCard.tsx`, porque el template ya los define como variantes visuales distintas (sin tilt, sin badge de mejor puntuación).
- **No:** extraer `useReveal` a un hook compartido en `lib/`. Se descartó porque, al quedar `about.jsx` fuera de este spec, por ahora solo lo usa la Home; se define localmente en `app/page.tsx` igual que en el template.

## Identified risks

- **Confusión de navegación temporal:** tras este spec, los botones "volver al vault" en `/auth`, `/salon`, `/games/[id]` y `/games/[id]/jugar` llevarán a la nueva Home en vez de a la Biblioteca (ver Decisions). Es un riesgo aceptado explícitamente por el usuario, a corregir en un spec de limpieza posterior.
- **Enlaces rotos a la ruta antigua:** cualquier referencia externa o marcador guardado hacia `/juego/[id]` quedará en 404 tras el renombrado a `/games/[id]`. Aceptable porque el proyecto aún no está en producción (spec 01 recién implementado).

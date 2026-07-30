# SPEC 01 — MVP visual de Arcade Vault

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-07-29
> **Objective:** Portar las 5 pantallas del prototipo estático en `references/templates/` (biblioteca, detalle, reproductor, auth, salón de la fama) a rutas reales de Next.js App Router en TypeScript, reproduciendo el diseño y las interacciones locales tal cual, sin implementar lógica de juego real ni persistencia entre sesiones.

## Scope

**In:**

- 5 rutas reales de Next.js App Router, con textos y layout en español, reproduciendo el diseño de `references/templates/` 1:1:
  - `/` — Biblioteca: hero, buscador, chips de categoría, grid de tarjetas de juego (con tilt al hover).
  - `/juego/[id]` — Detalle: portada, tags, descripción, stats, tabla de mejores puntuaciones (datos simulados con `seededScores`).
  - `/juego/[id]/jugar` — Reproductor: HUD (jugador/puntuación/vidas/nivel), pantalla CRT con simulación animada (nave, enemigos, puntuación que sube sola, subida de nivel), pausa funcional, modal de fin de partida con botones "JUGAR DE NUEVO" / "VOLVER AL VAULT" (sin paso de guardar puntuación).
  - `/auth` — Login/registro: tabs "Iniciar sesión" / "Crear cuenta", formulario, botón de invitado y botones sociales decorativos. Ningún envío persiste ni afecta el estado de sesión.
  - `/salon` — Salón de la Fama: tabs por juego, podio (top 3), tabla completa de puntuaciones simuladas. Sin fila "tu mejor marca" (nunca hay usuario logueado).
- `Nav` compartido (enlaces desktop + panel hamburguesa móvil) y `footer` en `app/layout.tsx`, igual que `app.jsx` del template. El Nav siempre muestra el botón "Iniciar Sesión" (estado desconectado fijo).
- Datos simulados (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados a un módulo TypeScript tipado.
- Interactividad puramente local con React state (sin `localStorage`, sin contexto compartido entre páginas): filtro de búsqueda, chips de categoría, tabs de auth, tabs del salón, pausa/fin de partida del reproductor, tilt de tarjetas.
- Comportamiento responsive ya definido en `app/globals.css` (sin cambios necesarios ahí, ya está portado completo del template).

**Out of scope (for future specs):**

- Lógica real de cualquiera de los 8 juegos (bloque-buster, caída, serpentina, glotón, invasores, rocas, ranaria, duelo-pixel).
- Autenticación real, backend, base de datos o API.
- Persistencia de sesión o de puntuaciones (ni `localStorage` ni servidor) — el login y el guardado de puntuación son puramente decorativos.
- Sistema de créditos/monedas funcional (el contador "CRÉDITOS · 03" queda estático).
- Login social funcional (Google/GitHub).
- Cualquier ajuste de accesibilidad o i18n más allá de lo que ya trae el template.

## Data model

Módulo `lib/games.ts`, tipado, sin cambios de valores respecto a `data.jsx`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de portada, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export const GAMES: Game[] = [ /* los 8 juegos, igual que data.jsx */ ];
export const CATS: ("TODOS" | GameCategory)[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: string[] = [ /* 18 nombres, igual que data.jsx */ ];

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // DD/MM/AAAA
}

export function seededScores(seed: number, count?: number): ScoreRow[] { /* misma lógica de PRNG que data.jsx */ }
```

Convenciones:

- `id` de cada juego es el slug usado en la ruta `/juego/[id]`.
- `seededScores` es determinista (mismo `seed` → mismas filas), igual que en el template — no hay `Math.random()` real.
- No se introduce ningún otro store ni tipo de estado global (confirmado en el Scope: sin `localStorage`, sin contexto compartido).

## Implementation plan

1. Crear `lib/games.ts` con `GAMES`, `CATS`, `PLAYERS`, `seededScores` tipados (copiados 1:1 de `data.jsx`). No se consume todavía en ninguna pantalla.
2. Crear `components/Nav.tsx` (client component, usa `usePathname` de `next/navigation` para el estado activo en vez de la prop `route` del template) y añadirlo junto al `footer` en `app/layout.tsx`. El botón de sesión siempre muestra "Iniciar Sesión" y enlaza a `/auth`.
3. Reescribir `app/page.tsx` como la pantalla **Biblioteca**: hero + buscador + chips de categoría + grid de `components/GameCard.tsx`, filtrando `GAMES` por texto y categoría con `useState`. Cada tarjeta enlaza a `/juego/[id]`.
4. Crear `app/juego/[id]/page.tsx` — pantalla **Detalle**: portada, tags, descripción, stat-strip y leaderboard vía `seededScores(id)`. `notFound()` si el `id` no existe en `GAMES`. Botón "JUGAR AHORA" enlaza a `/juego/[id]/jugar`; "VOLVER AL VAULT" enlaza a `/`.
5. Crear `app/juego/[id]/jugar/page.tsx` (client component) — pantalla **Reproductor**: HUD, pantalla CRT con la simulación animada del template (nave/enemigos CSS, puntuación por `setInterval`, subida de nivel, pausa), y modal de fin de partida solo con "JUGAR DE NUEVO" / "VOLVER AL VAULT" (sin campo de iniciales ni guardado).
6. Crear `app/auth/page.tsx` (client component) — tabs "Iniciar sesión"/"Crear cuenta", formulario, botón de invitado y botones sociales; todos los envíos redirigen a `/` sin persistir nada.
7. Crear `app/salon/page.tsx` (client component) — pantalla **Salón de la Fama**: tabs por juego, podio (top 3) y tabla completa vía `seededScores`, sin la fila de "tu mejor marca".
8. Pasada de QA visual: recorrer las 5 rutas en el navegador comparando contra `references/templates/Arcade Vault.html`, corregir cualquier diferencia de maquetado, estados hover/focus o breakpoints.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `/` muestra el hero, el buscador y los chips de categoría; escribir en el buscador o cambiar de categoría filtra el grid sin recargar la página.
- [ ] Cada `GameCard` en `/` enlaza a `/juego/[id]` con el `id` correcto y aplica el efecto tilt al mover el mouse encima.
- [ ] `/juego/bloque-buster` (y cualquier otro id válido) muestra portada, tags, descripción, stats y una tabla de 10 puntuaciones ordenadas de mayor a menor.
- [ ] Visitar `/juego/no-existe` responde con la página 404 de Next.js.
- [ ] En `/juego/[id]/jugar`, la puntuación del HUD aumenta sola cada ~220ms mientras no está en pausa ni terminó la partida.
- [ ] Pulsar "PAUSA" detiene el incremento de puntuación y muestra el overlay "EN PAUSA"; pulsar "REANUDAR" lo retoma.
- [ ] Pulsar "FIN" abre el modal de fin de partida con la puntuación final y los botones "JUGAR DE NUEVO" / "VOLVER AL VAULT", sin campo de iniciales ni botón de guardar.
- [ ] "JUGAR DE NUEVO" reinicia puntuación, vidas y nivel a sus valores iniciales y cierra el modal.
- [ ] `/auth` alterna entre las pestañas "Iniciar sesión" y "Crear cuenta", mostrando el campo de correo solo en la segunda.
- [ ] Enviar el formulario de `/auth`, o pulsar "JUGAR COMO INVITADO", navega a `/` y el Nav sigue mostrando "Iniciar Sesión" (nunca cambia).
- [ ] `/salon` muestra tabs por cada juego de `GAMES`; cambiar de tab actualiza el podio y la tabla con datos distintos.
- [ ] `/salon` nunca muestra la fila "TU MEJOR MARCA".
- [ ] El Nav (enlaces, logo, contador de créditos estático "03", panel hamburguesa en móvil) y el footer aparecen igual en las 5 rutas.
- [ ] En viewport móvil (<840px), el Nav colapsa a hamburguesa y el panel lateral abre/cierra correctamente.
- [ ] No hay errores ni warnings en la consola del navegador al navegar por las 5 rutas.

## Decisions

- **Sí:** portar `reproductor.jsx` con su simulación animada (puntuación automática, pausa, subida de nivel) tal cual. Es lo que el propio template define como "juego" — es 100% visual/CSS, no motor de juego real, así que entra en el alcance de "solo la parte visual".
- **No:** dejar el reproductor completamente estático sin temporizadores. Se descartó porque perdería la experiencia visual ya diseñada sin necesidad real (no es lógica de juego, es animación de UI).
- **No:** persistir sesión de usuario o puntuaciones en `localStorage`. Se descartó para mantener el spec estrictamente visual y evitar simular un sistema de auth/backend que no existe.
- **No:** compartir el estado de sesión entre páginas vía React Context en `layout.tsx` (aunque no persistiera en `localStorage`). Se descartó por simplicidad: el Nav siempre queda en estado "desconectado", sin excepciones ni casos especiales que mantener.
- **No:** mostrar el toast "PUNTUACIÓN GUARDADA" en el modal de fin de partida. Se descartó junto con el resto del flujo de guardado, ya que no hay nada que guardar.
- **Sí:** rutas en español (`/juego/[id]`, `/juego/[id]/jugar`, `/salon`) en vez de inglés. Coherente con los textos de la UI, que están en español.
- **Sí:** reutilizar `app/globals.css` tal cual — ya es un port 1:1 de `styles.css` del template (confirmado por diff), solo cambian las variables de fuente para usar `next/font`.
- **Sí:** datos simulados en un único módulo tipado `lib/games.ts`, sin separar en varios archivos. El volumen de datos es pequeño y no cambia entre pantallas.

## What is **not** in this spec

- Lógica real de los 8 juegos (bloque-buster, caída, serpentina, glotón, invasores, rocas, ranaria, duelo-pixel).
- Autenticación real, backend, base de datos o API.
- Persistencia de sesión o de puntuaciones, en `localStorage` o en servidor.
- Sistema de créditos/monedas funcional.
- Login social funcional (Google/GitHub).

Cada uno de estos, si se implementa, va en su propio spec.

# SPEC 03 — Página Acerca de y formulario de contacto con Resend

> **Status:** Aprobado
> **Depends on:** 02-home-landing
> **Date:** 2026-07-30
> **Objective:** Portar la página `about.jsx` del prototipo a la ruta `/acerca-de`, activar el enlace "Acerca de" del Nav (hoy placeholder inerte) y conectar su formulario de contacto a un envío real de correo mediante Resend vía Server Action.

## Scope

**In:**

- Nueva ruta `/acerca-de` (`app/acerca-de/page.tsx`), portando `about.jsx` 1:1:
  - **Hero About:** kicker "▸ ACERCA DE", título "ACERCA DE ARCADE VAULT", párrafo de misión, fila de 3 `highlight` ("HECHO CON ❤️ PARA JUGADORES", "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", "PROYECTO EN CONSTANTE CRECIMIENTO") con icono propio y color (magenta/cyan/green) cada uno.
  - **Divisor** decorativo con pixeles animados (`about-divider`), con clase `reveal`.
  - **Sección de contacto** (`about-contact`, con clase `reveal`): columna izquierda con kicker "▸ CONTACTO", título "CONTÁCTANOS", subtítulo y 3 "tips" (RESPUESTA EN 24-48H / SUGERENCIAS BIENVENIDAS / SIN SPAM, JAMÁS); columna derecha con el formulario.
  - **Formulario de contacto** (campos NOMBRE, CORREO ELECTRÓNICO, MENSAJE + botón "▶ ENVIAR MENSAJE"):
    - Validación igual al template: si algún campo está vacío al enviar, se dispara el efecto `shake` (sin validar formato de email).
    - Nuevo estado de envío (no existía en el template, requerido por el envío real): mientras la Server Action está en curso, el botón muestra "ENVIANDO…" y queda deshabilitado.
    - Éxito: se reemplaza el formulario por el bloque `terminal-success` ya existente en el template (mismo texto, mismas líneas `[OK]`), con botón "ENVIAR OTRO MENSAJE" que limpia el estado y vuelve a mostrar el formulario vacío.
    - Nuevo estado de error (no existía en el template): si la Server Action falla (Resend rechaza o lanza), se muestra un mensaje de error dentro del propio formulario (reutilizando la clase `shake`) sin perder lo que el usuario ya escribió, y el usuario puede reintentar.
  - Animación reveal-on-scroll (`useReveal`) aplicada a `.about-divider` y `.about-contact`, igual que en el template.
- **Envío real de correo por Resend:**
  - Server Action (`app/acerca-de/actions.ts`) que recibe `{ name, email, msg }`, valida en servidor que ningún campo esté vacío, y llama al SDK `resend` para enviar el mensaje.
  - Remitente (`from`): `onboarding@resend.dev` (dominio de pruebas de Resend, sin verificación de dominio propio).
  - Destinatario (`to`): `arsubo@gmail.com`, literal en el código (no configurable por env var, por decisión explícita).
  - El cuerpo del correo incluye nombre, correo del remitente y mensaje del formulario.
  - `RESEND_API_KEY` se lee de variable de entorno server-side (`.env.local`, no versionado); se agrega `.env.example` documentando la variable requerida.
  - Se agrega la dependencia `resend` a `package.json`.
- **Activar el enlace "Acerca de" en `components/Nav.tsx`:**
  - Pasa de `<a>Acerca de</a>` (inerte) a `<Link href="/acerca-de">`, tanto en el menú de escritorio como en el panel móvil.
  - Activo (`isActive`) únicamente cuando `pathname === "/acerca-de"`.
- **Nuevos componentes/módulos compartidos:**
  - `components/HighlightIcon.tsx`: los 3 SVGs pixel-art (HEART, BROWSER, PLANT) del template, siguiendo el mismo patrón que `FeatureIcon`/`FloatingSilhouettes` de la Home.
  - `lib/useReveal.ts`: hook `useReveal` extraído del `app/page.tsx` actual (spec 02), reutilizado por Home y por About. `app/page.tsx` se actualiza para importar este hook en vez de definirlo localmente, sin cambio de comportamiento.
- Ampliar `app/globals.css` con las clases necesarias para About/Contact (`.about`, `.about-hero`, `.highlight-row`, `.about-divider`, `.about-contact`, `.contact-grid`, `.contact-form`, `.terminal-success`, etc.), portadas 1:1 desde `styles.css` del template.

**Out of scope (para specs futuros):**

- Protección anti-spam/anti-abuso del endpoint de contacto (honeypot, rate limiting, CAPTCHA). Sin persistencia real en el proyecto todavía, se deja como riesgo aceptado.
- Validación de formato de email (regex) en el formulario — se mantiene el comportamiento del template (solo "no vacío").
- Guardar los mensajes de contacto en alguna base de datos o listarlos en un panel — el único efecto es el envío del correo vía Resend.
- Verificación de dominio propio en Resend / cambiar el remitente a un dominio de arcadevault — se usa el dominio de pruebas `onboarding@resend.dev`.
- Hacer configurable el destinatario del correo por variable de entorno — queda hardcodeado a `arsubo@gmail.com`.
- Corregir los enlaces internos rotos identificados en spec 02 (botones "volver al vault" que hoy navegan a `/` en vez de `/biblioteca`) — sigue fuera de alcance, no relacionado con este spec.

## Data model

Este spec no introduce datos en `lib/games.ts` ni modifica estructuras existentes. Los tipos nuevos son locales a la Server Action y al formulario:

```ts
// app/acerca-de/actions.ts
export interface ContactPayload {
  name: string;
  email: string;
  msg: string;
}

export type ContactResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendContactMessage(data: ContactPayload): Promise<ContactResult> { /* ... */ }
```

```ts
// lib/useReveal.ts
export function useReveal(): void { /* misma lógica de IntersectionObserver que hoy vive en app/page.tsx */ }
```

No se agrega ningún store, contexto ni estado global. No hay persistencia: cada envío es una llamada directa a la API de Resend, sin guardar el mensaje en ningún lado.

## Implementation plan

1. Crear `lib/useReveal.ts` extrayendo el hook `useReveal` (IntersectionObserver sobre `.reveal`) que hoy está definido localmente en `app/page.tsx`, y actualizar `app/page.tsx` para importarlo desde ahí en vez de definirlo inline. El sistema queda funcional: Home se comporta exactamente igual que antes (spec 02), sin cambio visual.
2. Instalar la dependencia `resend` (`npm install resend`) y crear `.env.example` documentando `RESEND_API_KEY` como variable requerida. El sistema sigue funcional: nada la consume todavía.
3. Ampliar `app/globals.css` con las clases de About/Contact portadas 1:1 de `styles.css` del template (`.about`, `.about-hero`, `.highlight-row`, `.about-divider`, `.about-contact`, `.contact-grid`, `.contact-form`, `.terminal-success`, etc.). Sin cambio visual todavía porque nada las usa aún.
4. Crear `components/HighlightIcon.tsx` con los 3 SVGs pixel-art (HEART, BROWSER, PLANT) portados de `about.jsx`.
5. Crear `app/acerca-de/actions.ts` con la Server Action `sendContactMessage`: valida que `name`, `email` y `msg` no estén vacíos, instancia el SDK `resend` con `process.env.RESEND_API_KEY`, envía el correo (`from: "onboarding@resend.dev"`, `to: "arsubo@gmail.com"`, asunto y cuerpo con los datos del formulario) y devuelve `{ ok: true }` o `{ ok: false, error }` capturando cualquier excepción del SDK. El sistema queda funcional: la acción existe y es invocable, aunque ninguna UI la llame todavía.
6. Crear `app/acerca-de/page.tsx` (client component) portando el hero, la fila de highlights, el divisor y la sección de contacto de `about.jsx`, usando `useReveal()` de `lib/useReveal.ts` y `HighlightIcon`. El formulario maneja estados `idle | sending | sent | error`: `sending` mientras se espera `sendContactMessage`, `sent` muestra el `terminal-success` existente, `error` muestra el mensaje de fallo con el efecto `shake` sin perder los valores tipeados. El sistema queda funcional: `/acerca-de` es visitable y el formulario envía correos reales.
7. Actualizar `components/Nav.tsx`: reemplazar el `<a>Acerca de</a>` inerte (desktop y panel móvil) por `<Link href="/acerca-de">`, y agregar `"acerca-de"` al switch de `isActive`, activo solo en `pathname === "/acerca-de"`.
8. Pasada de QA: recorrer `/acerca-de` comparando contra `about.jsx`/`arcade-vault-standalone.html`, confirmar que el enlace "Acerca de" del Nav navega y queda activo solo ahí, enviar el formulario con datos válidos y confirmar que el correo llega a `arsubo@gmail.com`, probar el caso de campos vacíos (shake) y simular un fallo de Resend (p. ej. `RESEND_API_KEY` inválida) para confirmar que se muestra el estado de error sin romper la página.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `/acerca-de` muestra el hero ("ACERCA DE ARCADE VAULT"), la fila de 3 highlights con sus iconos y colores (magenta/cyan/green), el divisor animado y la sección de contacto (columna intro + formulario).
- [ ] Las secciones marcadas `reveal` (`.about-divider`, `.about-contact`) aplican su animación de aparición al hacer scroll, igual que en Home.
- [ ] Enviar el formulario con `NOMBRE`, `CORREO ELECTRÓNICO` y `MENSAJE` completos dispara el estado "ENVIANDO…" (botón deshabilitado) y, al resolver con éxito, reemplaza el formulario por la terminal de éxito con el nombre en mayúsculas en el mensaje final.
- [ ] Al enviar un formulario válido, llega un correo real a `arsubo@gmail.com` con el nombre, correo y mensaje ingresados.
- [ ] Enviar el formulario con algún campo vacío dispara el efecto `shake` y no invoca la Server Action.
- [ ] Si la Server Action devuelve `{ ok: false }` (p. ej. `RESEND_API_KEY` inválida o Resend caído), se muestra un estado de error visible en el formulario, los valores tipeados no se pierden, y el usuario puede reintentar el envío.
- [ ] "ENVIAR OTRO MENSAJE" en la terminal de éxito limpia el formulario (`name`, `email`, `msg` vacíos) y vuelve a mostrar los campos.
- [ ] En el Nav, "Acerca de" navega a `/acerca-de` (escritorio y panel móvil) y aparece activo únicamente en esa ruta.
- [ ] `app/page.tsx` (Home) se sigue comportando igual que en spec 02 tras extraer `useReveal` a `lib/useReveal.ts` (mismas animaciones reveal-on-scroll).
- [ ] `.env.example` documenta `RESEND_API_KEY` como variable requerida.
- [ ] No hay errores ni warnings en la consola del navegador al navegar y usar `/acerca-de`.

## Decisions

- **Sí:** ruta `/acerca-de` en español, consistente con `/salon` y `/biblioteca` del proyecto, aunque spec 02 introdujo `/games` en inglés para las rutas de juego.
- **Sí:** el envío de correo se implementa como Server Action (`app/acerca-de/actions.ts`) en vez de un API route (`app/api/contact/route.ts`). Evita exponer un endpoint HTTP separado y mantiene `RESEND_API_KEY` estrictamente server-side, invocada directamente desde el client component del formulario.
- **Sí:** remitente fijo `onboarding@resend.dev` (dominio de pruebas de Resend). No se verifica un dominio propio en este spec para no bloquear la implementación en un paso externo (DNS) fuera del control del código.
- **Sí:** destinatario fijo `arsubo@gmail.com`, hardcodeado en la Server Action en vez de variable de entorno configurable. Decisión explícita del usuario; es el único destino relevante hoy y evita configuración extra.
- **No:** agregar honeypot o rate limiting al formulario de contacto. Se descartó para este spec porque el proyecto no tiene persistencia real todavía; se deja como riesgo aceptado (ver Identified risks).
- **No:** validar formato de email con regex. Se mantiene el comportamiento exacto del template (solo verificar que los campos no estén vacíos), para no introducir una regla de validación que el diseño original no tenía.
- **Sí:** extraer `useReveal` a `lib/useReveal.ts` compartido entre Home y About, resolviendo la duplicación que spec 02 había dejado pendiente explícitamente ("por ahora solo lo usa la Home").
- **Sí:** `components/HighlightIcon.tsx` como componente propio (no inline), siguiendo el mismo patrón ya establecido por `FeatureIcon` y `FloatingSilhouettes` en la Home de spec 02.
- **Sí:** agregar estados `sending` y `error` al formulario, inexistentes en el template porque ahí el "envío" era una simulación local síncrona. Son necesarios porque ahora hay una llamada de red real que puede tardar o fallar.

## Identified risks

- **Sin protección anti-spam:** el formulario puede recibir envíos automatizados/abusivos ya que no hay honeypot, CAPTCHA ni rate limiting (ver Decisions). Riesgo aceptado explícitamente; a mitigar en un spec futuro si se vuelve un problema real.
- **Remitente de dominio de pruebas:** al usar `onboarding@resend.dev`, Resend puede aplicar límites más estrictos que con un dominio verificado propio, y algunos proveedores de correo podrían marcar el mensaje como spam. Aceptable mientras el proyecto no esté en producción.
- **`RESEND_API_KEY` ausente o inválida:** si la variable no está configurada en `.env.local`, todo envío fallará con el estado de error del formulario; no rompe el build ni el resto del sitio, pero el envío queda inoperante hasta configurarla (mitigado por `.env.example` documentándola).
- **Destinatario hardcodeado:** cambiar a quién llegan los mensajes de contacto requiere editar código y redeployar, no una variable de entorno. Riesgo aceptado por decisión explícita del usuario.

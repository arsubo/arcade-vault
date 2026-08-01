# SPEC 04 — Integración base de Supabase

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-08-01
> **Objective:** Instalar y configurar el cliente de Supabase (`@supabase/ssr` + `@supabase/supabase-js`) para Next.js App Router, sin crear autenticación, rutas protegidas ni tablas — solo la conexión base, verificada con un script standalone.

## Scope

**In:**

- Instalar las dependencias `@supabase/ssr` y `@supabase/supabase-js`.
- Crear `lib/supabase/client.ts`: factory `createClient()` para uso en Client Components, vía `createBrowserClient` de `@supabase/ssr`, usando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Crear `lib/supabase/server.ts`: factory `createClient()` (async) para uso en Server Components/Server Actions, vía `createServerClient` de `@supabase/ssr`, leyendo/escribiendo cookies con la API `cookies()` de `next/headers`.
- Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.example` y `.env.template` (valores placeholder), y documentar que deben completarse en `.env.local` (ya ignorado por git).
- Script standalone de verificación `scripts/check-supabase.mjs`: instancia un cliente con `@supabase/supabase-js` usando las mismas variables de entorno, ejecuta una llamada trivial (`auth.getSession()`) y loguea éxito o el error tal cual lo devuelve Supabase. Se ejecuta con `node --env-file=.env.local scripts/check-supabase.mjs` (sin agregar `dotenv` como dependencia, Node 24 ya soporta `--env-file` nativo).

**Out of scope (para specs futuros):**

- Autenticación real (login/signup, reemplazo del formulario simulado de `/auth`).
- Middleware de refresco de sesión (`middleware.ts`) — no aplica sin auth todavía.
- Cualquier tabla, esquema o política RLS en la base de datos — el proyecto de Supabase sigue sin tablas después de este spec.
- Rutas protegidas o lógica de sesión en el Nav.
- Persistencia de partidas, puntajes o perfiles de usuario (Salón de la Fama sigue con `seededScores` hardcodeado).
- Uso del esquema legacy de keys (`ANON_KEY`/JWT) — se usa directamente el nuevo esquema `PUBLISHABLE_KEY`.
- Tocar `SUPABASE_DB_PASSWORD` (ya existente en `.env.example`/`.env.template`, ajeno a este spec).

## Data model

Este spec no introduce estructuras de datos ni tablas. No se crea ningún esquema en Supabase (el proyecto sigue con 0 tablas en `public` al terminar este spec). Los únicos artefactos nuevos son funciones factory de cliente (`lib/supabase/client.ts`, `lib/supabase/server.ts`) y un script de verificación, sin estado ni modelo propio.

## Implementation plan

1. Instalar `@supabase/ssr` y `@supabase/supabase-js` (`npm install @supabase/ssr @supabase/supabase-js`). El sistema queda funcional: build y app siguen igual, nada las usa todavía.
2. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (placeholders) a `.env.example` y `.env.template`, y completar los valores reales del proyecto `fllhgsztaompmzjgjygu` en `.env.local` (no versionado). El sistema sigue funcional: variables presentes pero sin consumidores aún.
3. Crear `lib/supabase/client.ts` con una función `createClient()` que devuelve un cliente vía `createBrowserClient` de `@supabase/ssr`, leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. El sistema sigue funcional: el archivo existe pero ningún componente lo importa todavía.
4. Crear `lib/supabase/server.ts` con una función `createClient()` async que devuelve un cliente vía `createServerClient` de `@supabase/ssr`, integrando la API `cookies()` de `next/headers` para leer/escribir cookies de sesión. El sistema sigue funcional: el archivo existe, sin consumidores todavía.
5. Crear `scripts/check-supabase.mjs`: instancia un cliente con `createClient` de `@supabase/supabase-js` (URL + publishable key desde `process.env`), llama `supabase.auth.getSession()`, y loguea en consola éxito (`"OK: conexión a Supabase establecida"`) o el error devuelto por el SDK. El sistema queda funcional y este es el último paso ejecutable del spec: correr `node --env-file=.env.local scripts/check-supabase.mjs` confirma que la integración funciona de punta a punta.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `@supabase/ssr` y `@supabase/supabase-js` aparecen en `package.json` como dependencias.
- [ ] `lib/supabase/client.ts` exporta `createClient()` usando `createBrowserClient`.
- [ ] `lib/supabase/server.ts` exporta `createClient()` async usando `createServerClient` e integrando `cookies()` de `next/headers`.
- [ ] `.env.example` y `.env.template` documentan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con placeholders.
- [ ] `.env.local` contiene los valores reales del proyecto y no está trackeado por git (`git status` no lo muestra).
- [ ] Ejecutar `node --env-file=.env.local scripts/check-supabase.mjs` termina con el mensaje de éxito, sin lanzar excepciones ni devolver error del SDK.
- [ ] El proyecto de Supabase sigue con 0 tablas en el schema `public` al finalizar el spec (verificable con `list_tables`).
- [ ] Ninguna página o componente de la app (`app/**`) importa `lib/supabase/client.ts` ni `lib/supabase/server.ts` todavía.

## Decisions

- **Sí:** `@supabase/ssr` + `@supabase/supabase-js` en vez de solo `@supabase/supabase-js`. Es el patrón oficial de Supabase para Next.js App Router (clientes separados browser/server basados en cookies) y evita rehacer el setup cuando llegue el spec de autenticación.
- **No:** `middleware.ts` de refresco de sesión. Sin autenticación en este spec no hay sesión que refrescar; se agrega en el spec de auth.
- **Sí:** usar el esquema nuevo de keys (`sb_publishable_...`, variable `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) en vez del legacy `anon` JWT. Es el esquema vigente para proyectos nuevos de Supabase.
- **No:** tocar `SUPABASE_DB_PASSWORD` en `.env.example`/`.env.template`. Ya existía antes de este spec, de un setup previo del usuario, y no lo consume nada de lo que se construye acá.
- **Sí:** verificar la integración con un script standalone (`scripts/check-supabase.mjs`) en vez de código temporal dentro de la app. Mantiene la app sin cambios visibles ni consumidores del cliente todavía, tal como pide el scope ("solo integración, sin crear objetos").
- **Sí:** correr el script con `node --env-file=.env.local` en vez de agregar `dotenv` como dependencia. Node 24 (versión instalada) soporta `--env-file` nativamente, evitando una dependencia nueva para algo tan puntual.
- **No:** crear tablas, esquema o políticas RLS. Explícitamente fuera de alcance — el proyecto de Supabase queda en 0 tablas al terminar.

## Identified risks

- **Versión de `@supabase/supabase-js` y el esquema de `sb_publishable_...`:** las keys publishable son un esquema relativamente nuevo; si `npm install` resuelve una versión de `@supabase/supabase-js` desactualizada, podría no reconocer el formato de la key. Mitigación: si el script de verificación falla con un error de formato de key, fijar la versión mínima que sí lo soporta.
- **`.env.local` ausente en otras máquinas:** cualquiera que clone el repo necesita crear su propio `.env.local` con las credenciales reales (no versionado). Mitigado por los placeholders documentados en `.env.example`/`.env.template`.

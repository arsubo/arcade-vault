---
name: spec-impl-game
description: Implementa un spec de juego aprobado siguiendo /spec-impl al pie de la letra, y al terminar encadena skin-designer y después mobile-porter sobre el juego recién implementado.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git add:*), Bash(git commit:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementador de specs de juego, con acabado automático

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

---

## Qué es esto

Es `/spec-impl`, pero para specs que dan de alta un juego, con dos pasos de acabado
encadenados al final: `skin-designer` (las 3 skins) y `mobile-porter` (el pad táctil). Un
juego que solo pasó por `/spec-impl` a secas queda jugable pero sin skins y sin controles
táctiles — es exactamente ese hueco el que este comando cierra en una sola invocación.

**No reimplementa la lógica de `/spec-impl`.** Lee `.claude/skills/spec-impl/SKILL.md` completo
con la tool Read y ejecuta sus Fases 1 a 4 tal cual están escritas ahí — mismas reglas de
búsqueda del spec, misma validación de `Status`, misma creación de rama, mismas pausas por
paso durante la implementación. Si `spec-impl` cambia (viene de `fernando-skills`, trackeado
en `skills-lock.json`), este comando hereda el cambio automáticamente la próxima vez que se
invoque, porque no hay una copia congelada de su texto acá.

Sobre esa base se agregan tres deltas y cuatro fases nuevas, descritos abajo.

---

## Instrucciones

### Fase 0 — Ejecutar `/spec-impl` con tres deltas

1. Lee `.claude/skills/spec-impl/SKILL.md` completo.
2. Ejecuta su Fase 1 (Identificar el spec) usando `$ARGUMENTS` tal cual esa fase indica.

**Delta A — puerta de "esto es un spec de juego"** (justo después de encontrar el archivo,
antes de tocar su `Status`): lee el spec y confirma que da de alta un juego — busca una fila
nueva para la tabla `games`, un alta en `GAME_REGISTRY` (`components/games/registry.tsx`) y en
`REAL_GAME_IDS` (`lib/real-games.ts`). Si el spec no trata de eso (p. ej. es un spec de
infraestructura o de una página), dilo explícitamente y **detente**, sugiriendo `/spec-impl
$ARGUMENTS` a secas — este comando no es para specs que no son de juego.

**Delta B — resolver y confirmar el `game-id`** (inmediatamente después del Delta A, todavía
antes de la Fase 2 de `spec-impl`): extrae del spec el `game.id` propuesto (el valor que va a
`GAME_REGISTRY`/`REAL_GAME_IDS`, no necesariamente el slug del archivo del spec ni el nombre
de carpeta bajo `components/games/`). Muéstraselo al usuario citando la línea del spec de
donde salió y pide confirmación explícita antes de seguir:

```
Spec de juego detectado: specs/NN-slug.md
game-id propuesto: <id>  (fuente: "<cita textual de la línea del spec>")

¿Confirmas este game-id? Es el que se le va a pasar a skin-designer y mobile-porter
al final de la implementación.
```

Si no se puede extraer con confianza, pregunta directamente cuál es. Esta es la **única**
pausa que este comando agrega sobre las de `spec-impl` — se pide acá, temprano, para que la
cadena de agentes del final corra sin interrupciones.

3. Ejecuta las Fases 2, 3 y 4 de `spec-impl` exactamente como están escritas (validación de
   `Status`, creación/checkout de rama, resumen del spec, implementación paso a paso con
   pausas de revisión de diff).

**Delta C — final distinto**: donde `spec-impl` termina con el recordatorio de verificar los
criterios de aceptación y parar, acá ese recordatorio es el disparador de la Fase 5 de este
comando — sigue de largo, no te detengas.

### Fase 5 — Verificación y checkpoint 1

1. Verifica los criterios de aceptación del spec uno por uno.
2. Corre `npm run build` y `npm run lint`. **Si cualquiera de los dos queda en rojo, detente
   ahí y no invoques a ningún agente** — tanto `skin-designer` como `mobile-porter` exigen
   línea base verde en su propia Fase 0 y abortarían igual, pero es mejor cortarlo acá con un
   mensaje claro que quemar una corrida de agente.
3. Confirma que el `game-id` confirmado en el Delta B efectivamente quedó dado de alta en
   `GAME_REGISTRY` **y** en `REAL_GAME_IDS` (si el paso 2 pasó, esto debería ser cierto, pero
   verificarlo acá evita que la sonda 3 de `mobile-porter` sea la primera en notarlo).
4. `git add -A` y `git commit` en la rama `spec-NN-slug` con un mensaje que identifique el
   spec implementado. Este es el checkpoint que le permite a `mobile-porter` pasar su sonda de
   árbol limpio más adelante — no lo omitas aunque el usuario no lo haya pedido explícitamente.

### Fase 6 — `skin-designer`

Invoca la tool Agent con `subagent_type: skin-designer`, **`run_in_background: false`**
(la Fase 7 depende de que esta termine antes de arrancar). El prompt debe:

- Dar el `game-id` confirmado en el Delta B de forma explícita y sin ambigüedad — sin él el
  agente se detiene por su propia regla dura y pregunta, cortando la cadena.
- Explicar brevemente el contexto: se acaba de implementar el spec `NN-slug`, este es su
  primer paso de acabado.

Al volver:

- Si `skin-designer` reportó que el juego ya tenía sus 3 skins, o se detuvo pidiendo una
  decisión al usuario (p. ej. un choque de contraste que no pudo resolver solo), **no
  reintentes ni respondas en su nombre** — registra su respuesta tal cual y sigue a la Fase 7
  igual (si se detuvo sin escribir código, no hay nada que commitear de esta etapa).
- Si escribió código: corre `npm run build`, `npm run lint` y `npm run check:skins <carpeta>`
  como red de seguridad adicional, y haz el checkpoint 2 (`git add -A` + commit) en la misma
  rama, con mensaje que identifique que es el paso de skins.

### Fase 7 — `mobile-porter`

Igual que la Fase 6: tool Agent, `subagent_type: mobile-porter`, `run_in_background: false`,
`game-id` explícito en el prompt — **después** de que la Fase 6 haya vuelto por completo,
nunca en paralelo con ella. Menciona en el prompt que `mobile-porter` puede correr sus propias
verificaciones de `build`/`lint`/`git status` sin problema porque el checkpoint 2 dejó el
árbol limpio.

Al volver:

- Si se detuvo en su "puerta de encaje" (el juego necesita más de 6 controles o un tipo de
  input que el pad no puede expresar), **surfacea sus 2-3 opciones concretas al usuario tal
  cual las planteó y detente ahí** — no elijas una opción en su nombre.
- Si terminó limpio, no hace falta un checkpoint 3 aparte: deja los archivos en el working
  tree para que el usuario revise el diff final completo junto con el informe de la Fase 8.

### Fase 8 — Informe final

Cierra con:

- Las tres etapas (implementación, skins, táctil): qué archivos tocó cada una, en una frase.
- Los commits de checkpoint creados, con hash corto y mensaje.
- Lo que reportó cada agente, tal cual — incluida cualquier pregunta que hayan dejado abierta.
- El QA manual pendiente que haya pedido `mobile-porter` (siempre lo pide: probar en un
  teléfono real o en la emulación táctil de DevTools).
- El recordatorio de marcar el spec como `Implementado` y de que mergear la rama
  `spec-NN-slug` es decisión del usuario — este comando nunca mergea ni pushea.

---

## Reglas duras

- Nunca reimplementes la lógica de `/spec-impl`: se lee su SKILL.md y se sigue, no se copia su
  texto a este archivo.
- Nunca invoques a `skin-designer` y `mobile-porter` en paralelo, ni inviertas el orden —
  siempre skins primero, táctil después, cada uno esperando a que el anterior termine.
- Nunca invoques a ninguno de los dos agentes sin el `game-id` que confirmó el usuario en el
  Delta B.
- Nunca invoques a los agentes si `npm run build` o `npm run lint` quedaron en rojo en la
  Fase 5.
- Nunca respondas en nombre del usuario una pregunta o una puerta de decisión que un agente
  dejó abierta — repórtala y detente.
- Nunca mergees la rama `spec-NN-slug` ni hagas `git push` — el commit de checkpoint es lo
  único que este comando hace por su cuenta en git, y solo dentro de esa rama.
- Si el spec identificado no da de alta un juego (Delta A negativo), no sigas con este
  comando: dirige al usuario a `/spec-impl` a secas.

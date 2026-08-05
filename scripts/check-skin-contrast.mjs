// Verificador de contraste WCAG sobre las paletas de skins de `lib/skins.ts`.
//
// Uso:
//   node scripts/check-skin-contrast.mjs            → todos los juegos presentes
//   node scripts/check-skin-contrast.mjs asteroids  → solo esa carpeta
//
// ESM puro, sin dependencias. Importa `lib/skins.ts` directamente con el
// type-stripping nativo de Node — nada de compilar ni transpilar antes.
//
// ── UMBRALES (contrato; cambiarlos es cambiar el contrato) ──────────────────
//   play          Elemento jugable contra su fondo.
//                 ratio ≥ 3.0:1   (WCAG 2.1 §1.4.11, contraste no textual)
//   text          Texto dibujado en canvas contra su fondo compuesto.
//                 ratio ≥ 4.5:1   (WCAG 2.1 §1.4.3)
//   label-on-fill Etiqueta sobre el relleno de un botón: se mide contra EL
//                 RELLENO, no contra el fondo general.
//                 ratio ≥ 4.5:1
//   sibling       Dos colores que el jugador debe poder distinguir entre sí
//                 (escalones de una misma `scale`, cabeza vs. cuerpo…).
//                 ratio ≥ 1.5:1
//   decor         Adorno puro (grillas, scanlines) contra su fondo.
//                 BANDA 1.10:1 – 2.20:1. El techo es tan obligatorio como el
//                 piso: "arreglar el contraste" de un detalle decorativo nunca
//                 debe convertirlo en un elemento que compita con el juego.
//
// ── COBERTURA ──────────────────────────────────────────────────────────────
// Acotada, no total. Falla si un juego que YA está en `GAME_PALETTES` no tiene
// alguna de las `SKIN_IDS`. NUNCA falla porque un juego ausente de
// `GAME_PALETTES` no tenga paletas: el catálogo se migra de a un juego por
// corrida del subagente `skin-designer`.

// URL relativa al propio script: no depende del cwd desde donde se invoque.
const skinsUrl = new URL("../lib/skins.ts", import.meta.url);

const { SKIN_IDS, SKIN_RAMP, GAME_PALETTES, GAME_CONTRAST_RULES } =
  await import(skinsUrl.href);

// ── Color ──────────────────────────────────────────────────────────────────

/** Parsea "#rgb", "#rrggbb", "rgb(...)" o "rgba(...)" a {r,g,b,a}. */
function parseColor(value) {
  if (Array.isArray(value)) {
    return { r: value[0], g: value[1], b: value[2], a: 1 };
  }
  if (typeof value !== "string") return null;
  const v = value.trim();

  if (v.startsWith("#")) {
    const h = v.slice(1);
    const full =
      h.length === 3
        ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
        : h.slice(0, 6).padEnd(6, "0");
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }

  const m = v.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 ? parts[3] : 1,
  };
}

/** Composición alpha sobre un fondo opaco: c' = a·c + (1-a)·bg. */
function composite(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: fg.a * fg.r + (1 - fg.a) * bg.r,
    g: fg.a * fg.g + (1 - fg.a) * bg.g,
    b: fg.a * fg.b + (1 - fg.a) * bg.b,
    a: 1,
  };
}

/** Luminancia relativa WCAG 2.1. */
function luminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ratio de contraste WCAG entre dos colores ya compuestos. */
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// ── Reglas ─────────────────────────────────────────────────────────────────

const THRESHOLDS = {
  play: { min: 3.0 },
  text: { min: 4.5 },
  "label-on-fill": { min: 4.5 },
  sibling: { min: 1.5 },
  decor: { min: 1.1, max: 2.2 },
};

const offenders = [];

function check({ game, skin, token, kind, fgRaw, bgRaw }) {
  const fg = parseColor(fgRaw);
  const bg = parseColor(bgRaw);
  if (!fg || !bg) {
    offenders.push({
      game,
      skin,
      token,
      ratio: "—",
      required: `color ilegible (${JSON.stringify(fgRaw)} / ${JSON.stringify(bgRaw)})`,
    });
    return;
  }

  const bgSolid = composite(bg, { r: 0, g: 0, b: 0, a: 1 });
  const ratio = contrast(composite(fg, bgSolid), bgSolid);
  const rule = THRESHOLDS[kind];

  if (ratio < rule.min) {
    offenders.push({
      game,
      skin,
      token,
      ratio: ratio.toFixed(2),
      required: `≥ ${rule.min.toFixed(2)} (${kind})`,
    });
  } else if (rule.max !== undefined && ratio > rule.max) {
    offenders.push({
      game,
      skin,
      token,
      ratio: ratio.toFixed(2),
      required: `≤ ${rule.max.toFixed(2)} (${kind}, techo)`,
    });
  }
}

// ── 1. Rampa compartida ────────────────────────────────────────────────────
// Se verifica siempre: es la base de la que dependen todas las paletas
// `neon`/`retro`, que nunca contienen literales propios.

for (const skin of SKIN_IDS) {
  const ramp = SKIN_RAMP[skin];
  check({
    game: "ramp",
    skin,
    token: "grid",
    kind: "decor",
    fgRaw: ramp.grid,
    bgRaw: ramp.bg,
  });
  check({
    game: "ramp",
    skin,
    token: "ink",
    kind: "text",
    fgRaw: ramp.ink,
    bgRaw: ramp.bg,
  });
  check({
    game: "ramp",
    skin,
    token: "inkDim",
    kind: "text",
    fgRaw: ramp.inkDim,
    bgRaw: ramp.bg,
  });
  for (const slot of ["accent", "accent2", "warn", "danger", "ok", "neutral"]) {
    check({
      game: "ramp",
      skin,
      token: slot,
      kind: "play",
      fgRaw: ramp[slot],
      bgRaw: ramp.bg,
    });
  }
  // Cada escalón de la `scale` es un objeto dibujable: tiene que verse sobre
  // el fondo.
  //
  // Deliberadamente NO se barren los 8 escalones entre sí con `sibling`: es
  // incompatible con `play`. Si los 8 deben dar ≥ 3.0:1 contra el fondo, su
  // luminancia mínima queda fijada y el rango total disponible cae a ~6.7x,
  // mientras que 7 saltos consecutivos de 1.5:1 exigen 17x. La clase `sibling`
  // se aplica a los pares que el jugador realmente compara lado a lado, y esos
  // se declaran explícitamente en `GAME_CONTRAST_RULES` de cada juego.
  for (let i = 0; i < ramp.scale.length; i++) {
    check({
      game: "ramp",
      skin,
      token: `scale[${i}]`,
      kind: "play",
      fgRaw: ramp.scale[i],
      bgRaw: ramp.bg,
    });
  }
}

// ── 2. Paletas por juego (descubrimiento dinámico) ─────────────────────────

const only = process.argv[2];
const games = Object.keys(GAME_PALETTES).filter((g) => !only || g === only);

if (only && games.length === 0) {
  console.error(
    `Error: "${only}" no está en GAME_PALETTES. Juegos con paletas: ${
      Object.keys(GAME_PALETTES).join(", ") || "(ninguno todavía)"
    }`
  );
  process.exit(1);
}

for (const game of games) {
  const bySkin = GAME_PALETTES[game];

  for (const skin of SKIN_IDS) {
    if (!bySkin[skin]) {
      offenders.push({
        game,
        skin,
        token: "(paleta completa)",
        ratio: "—",
        required: "el juego está en GAME_PALETTES pero le falta esta skin",
      });
    }
  }

  const rules = GAME_CONTRAST_RULES[game] ?? [];
  for (const skin of SKIN_IDS) {
    const pal = bySkin[skin];
    if (!pal) continue;
    for (const rule of rules) {
      check({
        game,
        skin,
        token: `${rule.token} vs ${rule.against}`,
        kind: rule.kind,
        fgRaw: pal[rule.token],
        bgRaw: pal[rule.against],
      });
    }
  }
}

// ── 3. Salida ──────────────────────────────────────────────────────────────

if (offenders.length > 0) {
  const cols = ["juego", "skin", "token", "ratio", "requerido"];
  const rows = offenders.map((o) => [
    o.game,
    o.skin,
    o.token,
    String(o.ratio),
    o.required,
  ]);
  const widths = cols.map((c, i) =>
    Math.max(c.length, ...rows.map((r) => r[i].length))
  );
  const line = (cells) =>
    cells.map((c, i) => c.padEnd(widths[i])).join("  ·  ");

  console.error(`Contraste: ${offenders.length} infractor(es)\n`);
  console.error(line(cols));
  console.error(widths.map((w) => "─".repeat(w)).join("──┼──"));
  for (const r of rows) console.error(line(r));
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}

/**
 * Forma de la paleta de Tetris. Acá va SOLO el tipo: los valores de las tres
 * skins viven en `lib/skins.ts` (`GAME_PALETTES.tetris`), que es la fuente
 * única de color del catálogo.
 */
export interface TetrisPalette {
  /** Fondo real del tablero (lo hereda de `.crt-screen`, el canvas es transparente). */
  bg: string;
  /** Línea de la grilla del tablero. Decorativa. */
  grid: string;
  /**
   * Los 8 tetrominós, en el orden en que el motor los indexa:
   * I, O, T, S, Z, J, L, N (la "tuerca"). El motor usa índices 1..8, así que
   * la pieza `n` es `pieces[n - 1]`.
   */
  pieces: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  /** Bisel superior de cada bloque. Siempre un color con alpha. */
  highlight: string;
}

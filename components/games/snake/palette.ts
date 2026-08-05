// Forma de la paleta de Snake. SOLO el tipo: los valores de cada skin viven en
// `lib/skins.ts` (`GAME_PALETTES.snake`), que es la fuente única de color.

export interface SnakePalette {
  /** Fondo del tablero de 20x20. */
  boardBg: string;
  /** Líneas de la grilla. Decorativo: nunca debe competir con la serpiente. */
  gridLine: string;
  /** Relleno de los segmentos del cuerpo. */
  body: string;
  /** Relleno del segmento cabeza. */
  head: string;
  /** Ojos dibujados sobre la cabeza. */
  eye: string;
  /**
   * Disco de color dibujado DEBAJO del sprite de fruta.
   *
   * Los sprites de fruta son fotográficos y multi-tono: teñirlos los vuelve
   * irreconocibles entre sí (una manzana teñida de ámbar es indistinguible de
   * un tomate). En vez de teñir, se dibuja este "plato" detrás y el sprite
   * queda intacto encima.
   *
   * `null` en `clasico`, donde la fruta nunca tuvo plato.
   */
  fruitPlate: string | null;
}

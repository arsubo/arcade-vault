// Tipo de la paleta de "Asteroides".
// Solo el TIPO vive acá — los valores de las 3 skins viven en `lib/skins.ts`
// (`GAME_PALETTES.asteroids`), que es la fuente única de color.

export interface AsteroidsPalette {
  /** Fondo de la superficie de juego. */
  bg: string;
  /** Trazo de la silueta de la nave. */
  ship: string;
  /** Llama del propulsor. */
  thrust: string;
  /** Trazo del polígono de los asteroides. */
  asteroid: string;
  /** Relleno de los proyectiles. */
  bullet: string;
  /**
   * Base RGB de las partículas de explosión. Va como tripleta y no como string
   * porque su alpha es dinámico (se desvanecen): componer `rgba(...)` en el
   * momento de dibujar evita cadenas de color inválidas, que canvas ignora en
   * silencio conservando el `strokeStyle` anterior.
   */
  particle: readonly [number, number, number];
  /** Trazo del rombo del power-up de triple disparo. */
  powerUp: string;
  /** Etiqueta "3x" dentro del rombo del power-up. */
  powerUpText: string;
  /** Texto del HUD dibujado en canvas (score, nivel). */
  hudText: string;
  /** Contador "3x" del HUD mientras dura el triple disparo. */
  hudPowerUp: string;
  /** Naves en miniatura que indican las vidas restantes. */
  lifeIcon: string;
  /** Título del overlay de GAME OVER. */
  overlayTitle: string;
  /** Subtítulo del overlay de GAME OVER. */
  overlaySub: string;
}

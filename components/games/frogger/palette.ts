// Forma de la paleta de Frogger. SOLO el tipo: los valores de cada skin viven
// en `lib/skins.ts` (`GAME_PALETTES.frogger`), que es la fuente única de color.

export interface FroggerPalette {
  /** Fondo de las filas de río (1-6). */
  riverBg: string;
  /** Fondo de las filas de carretera (8-12); también el color de zona por defecto. */
  roadBg: string;
  /**
   * Fondo de la fila de metas (0). Es el fondo real bajo el HUD, la barra de
   * tiempo y los íconos de vida — todos se dibujan dentro de esa fila.
   */
  goalBg: string;
  /** Franjas seguras: zona media (7) y fila de inicio (13). */
  safeBg: string;
  /** Contorno de las 5 bocas de meta. */
  goalBorder: string;
  /** Relleno de una boca de meta ya conquistada. */
  goalFilled: string;
  /** La rana: cuerpo y halo. */
  frog: string;
  /** Esclerótica de los ojos de la rana. */
  frogEye: string;
  /** Pupila de los ojos de la rana. */
  frogPupil: string;
  /**
   * Base RGB de las tortugas, como tripleta `[r, g, b]`.
   *
   * Su alpha es DINÁMICO (1 emergida, 0.25 sumergida), así que el motor compone
   * el `rgba(...)` en el momento de dibujar. Interpolar un hex rompería en
   * silencio: canvas conserva el `fillStyle` anterior ante una cadena de color
   * inválida y el bug solo se ve en movimiento.
   */
  turtle: readonly [number, number, number];
  /** Troncos del río. */
  log: string;
  /**
   * Los 5 colores de vehículo, indexados por la posición del entity. El color
   * no significa nada mecánicamente (todo vehículo mata igual): solo separa
   * unos de otros a simple vista.
   */
  cars: readonly [string, string, string, string, string];
  /** Divisorias punteadas de carril. Decorativo: nunca compite con el juego. */
  laneLine: string;
  /** Texto del marcador (arriba a la izquierda). */
  hudScore: string;
  /** Halo (`shadowColor`) del marcador. */
  hudScoreGlow: string;
  /** Texto del nivel (arriba al centro). */
  hudLevel: string;
  /** Halo (`shadowColor`) del nivel. */
  hudLevelGlow: string;
  /** Ícono de vida restante. */
  lifeIcon: string;
  /** Barra de tiempo con más de la mitad de la ronda por delante. */
  timeOk: string;
  /** Barra de tiempo entre el 25% y el 50%. */
  timeWarn: string;
  /** Barra de tiempo por debajo del 25%. */
  timeDanger: string;
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_SKIN,
  SKIN_STORAGE_KEY,
  isSkinId,
  type SkinId,
} from "@/lib/skins";

/**
 * Skin activa del reproductor, persistida en `localStorage`.
 *
 * Está montado sobre `useSyncExternalStore` y no sobre `useState` + `useEffect`
 * por dos motivos:
 *   1. Hidratación: `getServerSnapshot` devuelve siempre `DEFAULT_SKIN`, así que
 *      el HTML del servidor y el primer render del cliente coinciden; recién
 *      después React re-renderiza con el valor real de `localStorage`. Nunca se
 *      lee `localStorage` en el render del servidor.
 *   2. La regla `react-hooks/set-state-in-effect` del repo prohíbe llamar a
 *      `setState` de forma síncrona dentro de un efecto, que es como se
 *      escribiría la variante con `useState`.
 */

// Fallback en memoria para cuando `localStorage` está bloqueado (modo privado,
// cookies de terceros): el selector tiene que seguir funcionando en la sesión.
let memorySkin: SkinId | null = null;
let listeners: Array<() => void> = [];

function readSkin(): SkinId {
  try {
    const stored = window.localStorage.getItem(SKIN_STORAGE_KEY);
    if (isSkinId(stored)) return stored;
  } catch {
    // sin persistencia disponible
  }
  return memorySkin ?? DEFAULT_SKIN;
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.push(onStoreChange);
  // `storage` solo dispara en OTRAS pestañas: mantiene el selector sincronizado.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners = listeners.filter((l) => l !== onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function serverSkin(): SkinId {
  return DEFAULT_SKIN;
}

export function useSkin(): [SkinId, (skin: SkinId) => void] {
  const skin = useSyncExternalStore(subscribe, readSkin, serverSkin);

  const setSkin = useCallback((next: SkinId) => {
    memorySkin = next;
    try {
      window.localStorage.setItem(SKIN_STORAGE_KEY, next);
    } catch {
      // sin persistencia disponible
    }
    for (const listener of listeners) listener();
  }, []);

  return [skin, setSkin];
}

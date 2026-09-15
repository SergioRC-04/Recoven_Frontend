// lib/offlineCache.ts
//
// Caché de solo lectura de respaldo para la sección Usuarios: el personal
// de campo camina la microrruta con mala conectividad en varios tramos, así
// que el mapa, la guía de calles y la lista de direcciones/pólizas ya
// cargados deben seguir visibles aunque se pierda la conexión o se recargue
// la página — no solo mientras el componente sigue montado en memoria.
// localStorage es suficiente para el tamaño de estos datos (GeoJSON de una
// sola microrruta + su guía + su lista de usuarios, no toda la ciudad).
import { useEffect, useMemo, useState } from "react";

const PREFIX = "recoven:usuarios:";

// localStorage suele tener una cuota de 5-10MB por origen — el GeoJSON de
// TODAS las vías de una ciudad completa (p. ej. "vias:BARRANQUILLA") puede
// superar eso fácilmente por sí solo. Ese dato es solo la capa de
// referencia visual de fondo, no algo que la sección Usuarios necesite
// preservar sin conexión (a diferencia del mapa/guía/direcciones DE LA
// MICRORRUTA seleccionada, que sí son pequeños) — así que si el JSON ya
// serializado es demasiado grande, se evita el intento de escritura en
// vez de fallar con QuotaExceededError en cada carga.
const TAMANO_MAXIMO_CACHE_BYTES = 3 * 1024 * 1024;

export function guardarCache<T>(key: string, value: T): void {
  try {
    const serializado = JSON.stringify(value);
    if (serializado.length > TAMANO_MAXIMO_CACHE_BYTES) {
      console.warn(
        `No se guarda en caché "${key}": supera los ${TAMANO_MAXIMO_CACHE_BYTES} bytes ` +
          "(localStorage no da para datos de este tamaño). Se seguirá pidiendo por red."
      );
      return;
    }
    localStorage.setItem(PREFIX + key, serializado);
  } catch (error) {
    console.error(`No se pudo guardar en la caché local de Usuarios (${key}):`, error);
  }
}

export function leerCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`No se pudo leer la caché local de Usuarios (${key}):`, error);
    return null;
  }
}

// Recurso remoto con respaldo en caché local: mientras el fetch nuevo no ha
// resuelto (o falla, p. ej. por falta de señal en un tramo de la ruta), se
// muestra el último valor guardado para esa misma llave en vez de nada —
// clave para que el mapa/guía/información de Usuarios no desaparezcan con
// mala conectividad. `cacheKey` en null se usa para "no hay nada que
// cargar todavía" (p. ej. ninguna microrruta seleccionada): no dispara
// fetch ni cae a caché. `extraDeps` permite forzar un refetch sin cambiar
// la llave de caché (p. ej. tras crear/editar/eliminar un registro).
//
// setState solo ocurre dentro del callback asíncrono de la promesa, nunca
// de forma síncrona en el cuerpo del efecto (ver react-hooks/set-state-in-effect):
// el valor mostrado durante la carga se deriva con useMemo leyendo la
// caché, no escribiendo estado desde el efecto.
export function useCachedResource<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  extraDeps: unknown[] = []
): T | null {
  const [loaded, setLoaded] = useState<{ key: string; data: T } | null>(null);

  useEffect(() => {
    if (cacheKey === null) return;
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (cancelled) return;
        setLoaded({ key: cacheKey, data });
        guardarCache(cacheKey, data);
      })
      .catch((error) => {
        console.error(`Error cargando "${cacheKey}" (se conserva la caché si existía):`, error);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ...extraDeps]);

  return useMemo(() => {
    if (cacheKey === null) return null;
    if (loaded && loaded.key === cacheKey) return loaded.data;
    return leerCache<T>(cacheKey);
  }, [loaded, cacheKey]);
}

// lib/microrrutaConteos.ts
//
// Cuenta cuántas microrrutas hay por localidad y por barrio, a partir del
// campo microrruta.barrios ya resuelto por el backend (ver
// MicrorrutaBarrio) — no requiere ningún endpoint nuevo. Se usa tanto en
// el panel de administración (AdminMicrorrutas.tsx) como en el mapa
// público (MapaServicios.tsx) para mostrar el conteo junto a cada opción
// de los filtros de Localidad/Barrio, y para ordenar esas opciones (las
// que sí tienen microrrutas primero).

import type { MicrorrutaProperties } from "../types/microrruta";

export interface ConteosMicrorrutas {
  porLocalidad: Map<string, number>;
  porBarrio: Map<string, number>;
}

/**
 * A partir de la lista COMPLETA de microrrutas (sin ningún filtro de
 * localidad/barrio aplicado), cuenta cuántas rutas distintas tiene cada
 * localidad y cada barrio. Una ruta cuenta una sola vez por localidad,
 * aunque tenga varios de sus barrios dentro de esa misma localidad.
 */
export function calcularConteosMicrorrutas(
  microrrutas: MicrorrutaProperties[]
): ConteosMicrorrutas {
  const porLocalidad = new Map<string, number>();
  const porBarrio = new Map<string, number>();

  microrrutas.forEach((mr) => {
    const localidadesDeEstaRuta = new Set<string>();
    mr.barrios.forEach((b) => {
      porBarrio.set(b.barrioCod, (porBarrio.get(b.barrioCod) ?? 0) + 1);
      if (b.localidadCod) localidadesDeEstaRuta.add(b.localidadCod);
    });
    localidadesDeEstaRuta.forEach((cod) => {
      porLocalidad.set(cod, (porLocalidad.get(cod) ?? 0) + 1);
    });
  });

  return { porLocalidad, porBarrio };
}

/**
 * Ordena una lista de opciones (localidades o barrios) dejando primero las
 * que tienen al menos una microrruta (alfabéticamente entre ellas), y
 * después las que no tienen ninguna (alfabéticamente también). No decide
 * cómo se muestra el conteo — quien renderiza usa el `count` devuelto para
 * mostrar "(N)" solo cuando N > 0, sin mostrar nunca "(0)".
 */
export function ordenarPorConteo<T>(
  items: T[],
  conteos: Map<string, number>,
  obtenerCodigo: (item: T) => string,
  obtenerNombre: (item: T) => string
): { item: T; count: number }[] {
  const conRutas: T[] = [];
  const sinRutas: T[] = [];
  items.forEach((item) => {
    if ((conteos.get(obtenerCodigo(item)) ?? 0) > 0) conRutas.push(item);
    else sinRutas.push(item);
  });
  const porNombre = (a: T, b: T) => obtenerNombre(a).localeCompare(obtenerNombre(b), "es");
  conRutas.sort(porNombre);
  sinRutas.sort(porNombre);
  return [
    ...conRutas.map((item) => ({ item, count: conteos.get(obtenerCodigo(item)) ?? 0 })),
    ...sinRutas.map((item) => ({ item, count: 0 })),
  ];
}

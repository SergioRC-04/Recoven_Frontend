// lib/puntoEnPoligono.ts
//
// Prueba geométrica "¿este punto cae dentro de este polígono?" en JS
// plano, sin depender de OpenLayers — para poder usarla desde componentes
// que no montan un mapa (p. ej. AdminMicrorrutas.tsx necesita adivinar en
// qué localidad cae un trazo recién dibujado, ANTES de guardarlo, para
// sugerir un nombre). Solo revisa el anillo exterior de cada polígono
// (barrios no suelen tener huecos interiores) — es una aproximación para
// una RECOMENDACIÓN editable, no el cálculo autoritativo que hace el
// backend con PostGIS después de guardar la geometría.
import type { GeoJsonGeometry } from "../types/geo";

// Ray-casting estándar sobre un solo anillo (array de [lon, lat, ...]).
function puntoEnAnillo(punto: [number, number], anillo: number[][]): boolean {
  const [x, y] = punto;
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    const cruza = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

export function puntoEnGeometria(punto: [number, number], geometry: GeoJsonGeometry): boolean {
  if (geometry.type === "Polygon") {
    const anillos = geometry.coordinates as unknown as number[][][];
    const exterior = anillos[0];
    return exterior ? puntoEnAnillo(punto, exterior) : false;
  }
  if (geometry.type === "MultiPolygon") {
    const poligonos = geometry.coordinates as unknown as number[][][][];
    return poligonos.some((anillos) => {
      const exterior = anillos[0];
      return exterior ? puntoEnAnillo(punto, exterior) : false;
    });
  }
  return false;
}

// lib/viasEtiquetas.ts
//
// La tabla `vias` guarda cada calle partida en varios segmentos cortos
// (uno por cuadra/tramo), así que al pedir "las vías cercanas a esta
// microrruta" es normal recibir varios features distintos con el mismo
// nombre. Mostrar el nombre en TODOS esos segmentos hace que se repita
// muchas veces sobre una misma calle larga — en vez de eso, se marca solo
// UN feature por nombre y los demás quedan sin etiqueta.
//
// Compartido entre UsuariosMapa.tsx (mapa interactivo) y
// usuarioReportePdf.ts (mapa del PDF) — mismo criterio en los dos.
import type Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";

export const PROP_MOSTRAR_NOMBRE_VIA = "_mostrarNombreVia";

// La columna `vias.geom` es MultiLineString, no LineString — no tiene
// getCoordinateAt(), solo getLength() y getClosestPoint() (heredados de
// SimpleGeometry, presentes en ambos tipos). Duck-typing en vez de un
// cast a un tipo concreto, para no asumir cuál de los dos llega.
interface GeometriaConLongitud extends Geometry {
  getLength(): number;
}
interface GeometriaConPuntoCercano extends Geometry {
  getClosestPoint(point: [number, number]): [number, number];
}

function tieneLongitud(g: Geometry | undefined | null): g is GeometriaConLongitud {
  return !!g && typeof (g as GeometriaConLongitud).getLength === "function";
}

function tienePuntoCercano(g: Geometry | undefined | null): g is GeometriaConPuntoCercano {
  return !!g && typeof (g as GeometriaConPuntoCercano).getClosestPoint === "function";
}

/**
 * @param puntoReferencia Coordenada (en la proyección de las geometrías)
 * cerca de la cual debe quedar el segmento elegido — típicamente el
 * centro del recuadro visible del mapa. Cuando se da, se prefiere el
 * segmento cuyo punto más cercano a esa coordenada quede a menor
 * distancia (para que su etiqueta caiga dentro del recuadro visible, no
 * cortada en el borde de una imagen pequeña como la del PDF). Sin ella,
 * se usa el criterio anterior: el segmento más largo (más espacio para
 * el texto) — el caso del mapa interactivo, donde no hay un recuadro
 * fijo que cuidar.
 */
export function marcarUnaEtiquetaPorCalle(
  features: Feature[],
  puntoReferencia?: [number, number]
): void {
  const mejorPorNombre = new Map<string, { feature: Feature; score: number }>();

  features.forEach((feature) => {
    const nombre = String(feature.get("abrTexto") || feature.get("texto") || "").trim();
    if (!nombre) return;

    const geometry = feature.getGeometry();
    if (!tieneLongitud(geometry)) return;
    const longitud = geometry.getLength();
    if (longitud <= 0) return;

    let score: number;
    if (puntoReferencia && tienePuntoCercano(geometry)) {
      const [px, py] = geometry.getClosestPoint(puntoReferencia);
      const dx = px - puntoReferencia[0];
      const dy = py - puntoReferencia[1];
      // Score más alto = mejor: más cerca del punto de referencia.
      score = -Math.sqrt(dx * dx + dy * dy);
    } else {
      score = longitud;
    }

    const actual = mejorPorNombre.get(nombre);
    if (!actual || score > actual.score) {
      mejorPorNombre.set(nombre, { feature, score });
    }
  });

  const elegidos = new Set(Array.from(mejorPorNombre.values()).map((v) => v.feature));
  features.forEach((feature) => {
    feature.set(PROP_MOSTRAR_NOMBRE_VIA, elegidos.has(feature));
  });
}

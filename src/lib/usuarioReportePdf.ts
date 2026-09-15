// lib/usuarioReportePdf.ts
//
// Tercer generador de PDF, independiente de microrrutaReportePdf.ts y
// macrorrutaReportePdf.ts (no se tocan esos dos archivos a propósito).
// Diseño propio, NO reciclado del reporte individual de microrruta:
//   - Página VERTICAL (a4 portrait), no horizontal.
//   - SIN encabezado con nombre de cooperativa/NIT ni leyenda — solo el
//     logo, sin título ni recuadro alrededor.
//   - Dos microrrutas por página: cada una ocupa exactamente media hoja
//     (mitad superior / mitad inferior), con mapa a la izquierda y, a la
//     derecha, el logo, la tabla de datos y la guía de calles apiladas.
//   - La guía de calles se dibuja en el mismo bloque (no en páginas
//     aparte al final): el tamaño de letra se autoajusta para que quepa
//     en el espacio que le queda dentro de esa media hoja.
import { jsPDF } from "jspdf";
import OLMap from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import { Style, Stroke, Fill } from "ol/style";
import TextStyle from "ol/style/Text";
import RegularShape from "ol/style/RegularShape";
import { isEmpty, getCenter } from "ol/extent";
import type OlFeature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";

import { getRecyclers } from "../services/recyclers";
import { getViasGeoJson } from "../services/geo";
import { getGuiaCalles } from "../services/usuarios";
import type { GeoJsonFeatureCollection, ViaProperties } from "../types/geo";
import type { MicrorrutaProperties, LineStringGeoJson } from "../types/microrruta";
import type { GuiaCallesPaso } from "../types/usuario";
import type { Recycler } from "../types/recycler";
import { marcarUnaEtiquetaPorCalle, PROP_MOSTRAR_NOMBRE_VIA } from "./viasEtiquetas";

const VIEW_PROJ = "EPSG:3857";
const DATA_PROJ = "EPSG:4326";
const COLOR_RUTA = "#dc2626";

export interface MicrorrutaParaReporte {
  properties: MicrorrutaProperties;
  geometry: LineStringGeoJson;
}

type Punto = [number, number];

function primerPunto(geometry: LineStringGeoJson): Punto | null {
  const c = geometry.coordinates[0];
  return c ? [c[0], c[1]] : null;
}

function ultimoPunto(geometry: LineStringGeoJson): Punto | null {
  const c = geometry.coordinates[geometry.coordinates.length - 1];
  return c ? [c[0], c[1]] : null;
}

// Metros por grado de latitud (constante) y de longitud a una latitud
// dada (varía con cos(latitud)) — suficiente para distancias a escala de
// ciudad, no hace falta una proyección exacta.
const METROS_POR_GRADO_LAT = 111320;

function distanciaMetros(a: Punto, b: Punto, factorLonMetros: number): number {
  const dy = (a[1] - b[1]) * METROS_POR_GRADO_LAT;
  const dx = (a[0] - b[0]) * factorLonMetros;
  return Math.sqrt(dx * dx + dy * dy);
}

// Umbral de distancia (metros) para seguir encadenando por cercanía real:
// mientras el punto de inicio de alguna ruta no visitada quede a menos de
// esto del punto final de la última elegida, se sigue esa cadena. Cuando
// ya no queda ninguna así de cerca (se agotó el grupo de rutas vecinas),
// en vez de saltar arbitrariamente a la más cercana aunque esté lejos, se
// reinicia la búsqueda por un criterio cardinal — evita zigzags largos
// sin sentido geográfico dentro de un mismo barrio.
const UMBRAL_ENCADENAMIENTO_M = 1000;

interface ItemOrden {
  mr: MicrorrutaParaReporte;
  inicio: Punto | null;
  fin: Punto | null;
}

// Entre los índices dados, el de mayor (si preferirMayor) o menor valor
// devuelto por obtenerValor — ignora los que devuelven null. null si
// ninguno tiene valor válido.
function elegirExtremo(
  indices: number[],
  obtenerValor: (i: number) => number | null,
  preferirMayor: boolean
): number | null {
  let mejor: number | null = null;
  let mejorValor = preferirMayor ? -Infinity : Infinity;
  indices.forEach((i) => {
    const v = obtenerValor(i);
    if (v == null) return;
    if (preferirMayor ? v > mejorValor : v < mejorValor) {
      mejorValor = v;
      mejor = i;
    }
  });
  return mejor;
}

/**
 * Orden de exportación: empieza por la microrruta más al oeste. Desde su
 * punto FINAL (no su centroide) como referencia, busca entre las que
 * faltan la que tenga el punto de INICIO más cercano (dentro de
 * UMBRAL_ENCADENAMIENTO_M) y la encadena — y así sucesivamente, usando
 * siempre el punto final de la última elegida como nueva referencia.
 * Cuando ninguna de las que faltan tiene su inicio a esa distancia (se
 * acabó el grupo cercano), se reinicia con la que falte más al norte; si
 * ninguna tiene coordenada válida para eso, la más al sur; si tampoco, la
 * más al oeste — así se garantiza que el recorrido siempre avanza y
 * ninguna microrruta se queda sin exportar, cubriendo los casos donde el
 * simple "vecino más cercano" saltaría de forma rara o se travaría con
 * datos incompletos.
 */
function ordenarPorRecorridoOesteAEste(
  microrrutas: MicrorrutaParaReporte[]
): MicrorrutaParaReporte[] {
  if (microrrutas.length <= 1) return microrrutas;

  const items: ItemOrden[] = microrrutas.map((mr) => ({
    mr,
    inicio: primerPunto(mr.geometry),
    fin: ultimoPunto(mr.geometry),
  }));

  const latitudes = items
    .flatMap((it) => [it.inicio?.[1], it.fin?.[1]])
    .filter((v): v is number => typeof v === "number");
  const latPromedio =
    latitudes.length > 0 ? latitudes.reduce((s, v) => s + v, 0) / latitudes.length : 0;
  const factorLonMetros = METROS_POR_GRADO_LAT * Math.cos((latPromedio * Math.PI) / 180);

  const puntoDeReferencia = (i: number): number | null =>
    items[i].inicio?.[1] ?? items[i].fin?.[1] ?? null;
  const lonDeReferencia = (i: number): number | null =>
    items[i].inicio?.[0] ?? items[i].fin?.[0] ?? null;

  const elegirSiguienteSemilla = (indices: number[]): number =>
    elegirExtremo(indices, puntoDeReferencia, true) ?? // más al norte
    elegirExtremo(indices, puntoDeReferencia, false) ?? // más al sur
    elegirExtremo(indices, lonDeReferencia, false) ?? // más al oeste
    indices[0];

  const pendientes = new Set(items.map((_, i) => i));
  const orden: number[] = [];
  let referencia: Punto | null = null;

  while (pendientes.size > 0) {
    const indices = Array.from(pendientes);
    let siguiente: number;

    if (referencia) {
      const ref = referencia;
      const candidatosCercanos = indices.filter(
        (i) => items[i].inicio && distanciaMetros(items[i].inicio as Punto, ref, factorLonMetros) <= UMBRAL_ENCADENAMIENTO_M
      );
      if (candidatosCercanos.length > 0) {
        siguiente = candidatosCercanos.reduce((mejor, i) =>
          distanciaMetros(items[i].inicio as Punto, ref, factorLonMetros) <
          distanciaMetros(items[mejor].inicio as Punto, ref, factorLonMetros)
            ? i
            : mejor
        );
      } else {
        siguiente = elegirSiguienteSemilla(indices);
      }
    } else {
      // Primera elección: la más al oeste.
      siguiente = elegirExtremo(indices, lonDeReferencia, false) ?? indices[0];
    }

    orden.push(siguiente);
    pendientes.delete(siguiente);
    referencia = items[siguiente].fin ?? items[siguiente].inicio ?? referencia;
  }

  return orden.map((i) => items[i].mr);
}

function estiloRuta(feature: OlFeature): Style[] {
  const estilos: Style[] = [
    new Style({ stroke: new Stroke({ color: COLOR_RUTA, width: 5 }) }),
  ];

  const geometry = feature.getGeometry();
  if (!(geometry instanceof LineString)) return estilos;
  const coords = geometry.getCoordinates();
  if (coords.length < 2) return estilos;

  const [x0, y0] = coords[0];
  const [x1, y1] = coords[1];
  const anguloInicio = Math.atan2(y1 - y0, x1 - x0);
  estilos.push(
    new Style({
      geometry: new Point(coords[0]),
      image: new RegularShape({
        points: 3,
        radius: 8,
        rotation: -anguloInicio - Math.PI / 2,
        fill: new Fill({ color: COLOR_RUTA }),
      }),
    })
  );

  const [xn1, yn1] = coords[coords.length - 2];
  const [xn2, yn2] = coords[coords.length - 1];
  const anguloFinal = Math.atan2(yn2 - yn1, xn2 - xn1);
  estilos.push(
    new Style({
      geometry: new Point(coords[coords.length - 1]),
      image: new RegularShape({
        points: 3,
        radius: 8,
        rotation: -anguloFinal + Math.PI / 2,
        fill: new Fill({ color: COLOR_RUTA }),
      }),
    })
  );

  return estilos;
}

function estiloNombreVia(feature: FeatureLike): Style {
  // Solo el segmento marcado por marcarUnaEtiquetaPorCalle (ver
  // lib/viasEtiquetas.ts) dibuja el nombre — evita que una misma calle
  // larga, partida en varios segmentos, repita su nombre una vez por
  // segmento.
  if (!feature.get(PROP_MOSTRAR_NOMBRE_VIA)) return new Style({});
  // abrTexto (abreviado, p.ej. "CL 45") en vez de texto completo — ocupa
  // menos espacio y se lee mejor a este tamaño de mapa. Si una vía no
  // trae abreviatura, se cae al texto completo en vez de dejarla sin
  // nombre.
  const texto = String(feature.get("abrTexto") || feature.get("texto") || "").trim();
  if (!texto) return new Style({});
  return new Style({
    text: new TextStyle({
      text: texto,
      font: "bold 14px sans-serif",
      // Texto negro sólido sobre una placa blanca (backgroundFill), no
      // con un halo/stroke fino — el stroke competía visualmente con el
      // negro y lo hacía verse más gris que negro. La placa además
      // resuelve lo mismo que el halo (legible sobre cualquier fondo del
      // mapa) sin restarle solidez a la letra.
      fill: new Fill({ color: "#000000" }),
      backgroundFill: new Fill({ color: "#ffffff" }),
      padding: [1, 2, 1, 2],
      placement: "line",
      // Desplazada por encima de la línea (en vez de centrada justo
      // sobre ella) para que no tape el trazo de la vía debajo del
      // texto — se lee mejor la calle y la línea al mismo tiempo.
      offsetY: -8,
      overflow: true,
    }),
  });
}

function componerCanvasDesdeContainer(
  container: HTMLElement,
  widthPx: number,
  heightPx: number
): string {
  const mapCanvas = document.createElement("canvas");
  mapCanvas.width = widthPx;
  mapCanvas.height = heightPx;
  const mapContext = mapCanvas.getContext("2d");
  if (!mapContext) throw new Error("No se pudo crear el contexto de canvas para el mapa.");
  mapContext.fillStyle = "#ffffff";
  mapContext.fillRect(0, 0, widthPx, heightPx);

  const canvases = container.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas");
  const lista = canvases.length > 0 ? canvases : container.querySelectorAll<HTMLCanvasElement>("canvas");
  lista.forEach((canvas) => {
    if (canvas.width <= 0) return;
    const opacityStr = canvas.parentElement?.style.opacity || canvas.style.opacity;
    mapContext.globalAlpha = opacityStr === "" ? 1 : Number(opacityStr);
    const transform = canvas.style.transform;
    const match = transform && transform.match(/^matrix\(([^)]*)\)$/);
    if (match) {
      const m = match[1].split(",").map(Number);
      if (m.length === 6) mapContext.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }
    mapContext.drawImage(canvas, 0, 0);
  });
  mapContext.setTransform(1, 0, 0, 1, 0, 0);
  mapContext.globalAlpha = 1;
  return mapCanvas.toDataURL("image/jpeg", 0.92);
}

async function renderizarMapaConNombresVias(
  geometry: LineStringGeoJson,
  viasGeoJson: GeoJsonFeatureCollection<ViaProperties> | null,
  widthPx: number,
  heightPx: number
): Promise<string> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0px";
  container.style.width = `${widthPx}px`;
  container.style.height = `${heightPx}px`;
  document.body.appendChild(container);

  try {
    const geoJsonFormat = new GeoJSON({ dataProjection: DATA_PROJ, featureProjection: VIEW_PROJ });

    const viasLayer = new VectorLayer({
      source: new VectorSource({ features: viasGeoJson ? geoJsonFormat.readFeatures(viasGeoJson) : [] }),
      style: new Style({ stroke: new Stroke({ color: "#9ca3af", width: 1 }) }),
    });

    const rutaFeature = geoJsonFormat.readFeature({
      type: "Feature",
      geometry,
      properties: {},
    }) as OlFeature;
    const rutaLayer = new VectorLayer({
      source: new VectorSource({ features: [rutaFeature] }),
      style: () => estiloRuta(rutaFeature),
    });

    // Nombres de vía por encima del trazo de la ruta — mismo criterio que
    // UsuariosMapa.tsx, pero eligiendo el segmento más cercano al centro
    // del recuadro que se va a recortar (el de la ruta), en vez del más
    // largo: un segmento largo puede estirarse mucho más allá de ese
    // recuadro y su etiqueta terminaría cortada en el borde de la imagen
    // pequeña del PDF.
    const rutaExtent = rutaFeature.getGeometry()?.getExtent();
    const centroRuta =
      rutaExtent && !isEmpty(rutaExtent) ? (getCenter(rutaExtent) as [number, number]) : undefined;
    const featuresLabel = viasGeoJson ? geoJsonFormat.readFeatures(viasGeoJson) : [];
    marcarUnaEtiquetaPorCalle(featuresLabel, centroRuta);
    const viasLabelLayer = new VectorLayer({
      source: new VectorSource({ features: featuresLabel }),
      style: estiloNombreVia,
    });

    const osmLayer = new TileLayer({ source: new OSM() });

    const map = new OLMap({
      target: container,
      layers: [osmLayer, viasLayer, rutaLayer, viasLabelLayer],
      view: new View({ center: [0, 0], zoom: 2 }),
      controls: [],
      interactions: [],
    });
    map.setSize([widthPx, heightPx]);

    if (rutaExtent && !isEmpty(rutaExtent)) {
      // Más margen que antes (30 → 45px) para que una etiqueta cerca del
      // borde de la ruta tenga espacio de sobra y no quede cortada.
      map.getView().fit(rutaExtent, { padding: [45, 45, 45, 45], size: [widthPx, heightPx] });
    }

    return await new Promise<string>((resolve, reject) => {
      map.once("rendercomplete", () => {
        try {
          resolve(componerCanvasDesdeContainer(container, widthPx, heightPx));
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Error componiendo el canvas del mapa."));
        }
      });
      map.renderSync();
    });
  } finally {
    document.body.removeChild(container);
  }
}

async function cargarImagenComoDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo cargar la imagen: ${url}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error al leer la imagen"));
    reader.readAsDataURL(blob);
  });
}

async function obtenerLogo(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const dataUrl = await cargarImagenComoDataUrl("/assets/img/logo.png");
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    return { dataUrl, width: img.naturalWidth, height: img.naturalHeight };
  } catch (error) {
    console.error("Error cargando logo para el reporte:", error);
    return null;
  }
}

function dibujarNorte(pdf: jsPDF, x: number, y: number): void {
  pdf.setFillColor("#000000");
  pdf.setDrawColor("#000000");
  pdf.triangle(x, y + 6, x + 2.2, y, x + 4.4, y + 6, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6);
  pdf.text("N", x + 2.2, y + 9.5, { align: "center" });
}

// Solo el logo — sin recuadro, sin título de cooperativa, sin NIT. Se
// centra horizontalmente en el ancho disponible.
function dibujarLogo(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  alturaReservada: number,
  logoInfo: { dataUrl: string; width: number; height: number } | null
): number {
  if (!logoInfo) return y;
  const logoAlto = Math.min(alturaReservada, 14);
  const logoAncho = (logoInfo.width / logoInfo.height) * logoAlto;
  const anchoFinal = Math.min(logoAncho, width * 0.6);
  const altoFinal = (logoInfo.height / logoInfo.width) * anchoFinal;
  pdf.addImage(logoInfo.dataUrl, "PNG", x + (width - anchoFinal) / 2, y, anchoFinal, altoFinal);
  return y + Math.max(altoFinal, alturaReservada);
}

interface FilaInfo {
  etiqueta: string;
  valor: string;
}

function dibujarTablaInfo(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  filas: FilaInfo[],
  alturaMaxima: number,
  nombreMicrorruta?: string
): number {
  const paddingSuperior = 2;
  const paddingInferior = nombreMicrorruta ? 6 : 1.5;
  const anchoEtiqueta = width * 0.34;
  const anchoValor = width - anchoEtiqueta - 5;

  let totalLines = 0;
  const linesPorFila: string[][] = [];
  for (const fila of filas) {
    const valorMayus = (fila.valor || "—").toUpperCase();
    const lines = pdf.splitTextToSize(valorMayus, anchoValor);
    linesPorFila.push(lines);
    totalLines += lines.length;
  }

  const espacioDisponible = alturaMaxima - paddingSuperior - paddingInferior;
  const alturaLinea = Math.max(espacioDisponible / totalLines, 2.4);
  const fontSize = Math.min(Math.max(alturaLinea * 2, 4.5), 7);
  const fontSizeEtiqueta = Math.min(fontSize + 0.4, 7.5);

  pdf.setDrawColor("#000000");
  pdf.setLineWidth(0.25);
  pdf.rect(x, y, width, alturaMaxima);

  let filaY = y + paddingSuperior;
  for (let i = 0; i < filas.length; i++) {
    const lines = linesPorFila[i];
    const etiqueta = filas[i].etiqueta;

    const etiquetaY = filaY + alturaLinea * 0.6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(fontSizeEtiqueta);
    pdf.text(etiqueta, x + 2.5, etiquetaY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);
    let lineY = filaY + alturaLinea * 0.6;
    for (const line of lines) {
      pdf.text(line, x + 2.5 + anchoEtiqueta, lineY, { maxWidth: anchoValor });
      lineY += alturaLinea;
    }
    filaY += lines.length * alturaLinea + 0.6;
  }

  if (nombreMicrorruta) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.text(nombreMicrorruta, x + width - 2.5, y + alturaMaxima - 2, {
      align: "right",
      maxWidth: width - 5,
    });
  }

  return y + alturaMaxima;
}

// Guía de calles compacta, dibujada DENTRO del bloque de la mitad de hoja
// (no en páginas aparte): el tamaño de letra se reduce hasta que la lista
// completa quepa en el alto disponible — con un piso mínimo legible; si
// aun así no cabe (guía inusualmente larga), se recorta al llegar al
// límite inferior del bloque en vez de invadir el siguiente elemento.
function dibujarGuiaCompacta(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  guiaCalles: GuiaCallesPaso[]
): void {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.text("GUÍA DE CALLES", x, y + 2.5);
  const areaY = y + 5;
  const areaHeight = height - 5;
  if (areaHeight <= 0) return;

  if (guiaCalles.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.text("No calculada todavía.", x, areaY + 3.5, { maxWidth: width });
    return;
  }

  const MIN_FONT = 3.6;
  let fontSize = 6.5;
  let lineHeight = 0;
  let lineas: string[] = [];

  while (fontSize >= MIN_FONT) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);
    lineHeight = fontSize * 0.42;
    lineas = [];
    for (const paso of guiaCalles) {
      const texto = `${paso.orden}. ${paso.instruccion}`;
      lineas.push(...(pdf.splitTextToSize(texto, width) as string[]));
    }
    if (lineas.length * lineHeight <= areaHeight) break;
    fontSize -= 0.2;
  }
  if (fontSize < MIN_FONT) fontSize = MIN_FONT;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(fontSize);
  const maxY = y + height;
  let cursorY = areaY + lineHeight * 0.75;
  for (const linea of lineas) {
    if (cursorY > maxY) break;
    pdf.text(linea, x, cursorY);
    cursorY += lineHeight;
  }
}

function formatearHorario(mr: MicrorrutaProperties): string {
  if (mr.horaInicio && mr.horaFin) return `${mr.horaInicio} - ${mr.horaFin}`;
  return mr.horaInicio || mr.horaFin || "";
}

function resolverUbicacion(mr: MicrorrutaProperties) {
  if (mr.barrios.length === 0) {
    return { barrioNombre: "", localidadNombre: null as string | null };
  }
  return {
    barrioNombre: mr.barrios.map((b) => b.barrioNombre).join(", "),
    localidadNombre: mr.barrios[0].localidadNombre,
  };
}

// Dibuja un bloque (una microrruta) dentro del rectángulo [x, y, width,
// height] dado — exactamente media hoja cuando se llama desde
// generarReporteUsuarios. Mapa a la izquierda; a la derecha, apilados de
// arriba a abajo: logo, tabla de datos y guía de calles.
async function dibujarBloqueMicrorruta(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  mr: MicrorrutaProperties,
  geometry: LineStringGeoJson,
  viasGeoJson: GeoJsonFeatureCollection<ViaProperties> | null,
  guiaCalles: GuiaCallesPaso[],
  reciclador: Recycler | null,
  logoInfo: { dataUrl: string; width: number; height: number } | null
): Promise<void> {
  const GAP = 2;
  pdf.setDrawColor("#d1d5db");
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, width, height);

  const anchoMapa = width * 0.56 - GAP / 2;
  const altoMapa = height;
  const colDerechaX = x + anchoMapa + GAP;
  const colDerechaAncho = width - anchoMapa - GAP;

  const DPI = 120;
  const widthPx = Math.round((anchoMapa / 25.4) * DPI);
  const heightPx = Math.round((altoMapa / 25.4) * DPI);

  const mapaDataUrl = await renderizarMapaConNombresVias(geometry, viasGeoJson, widthPx, heightPx);

  pdf.addImage(mapaDataUrl, "JPEG", x, y, anchoMapa, altoMapa);
  pdf.setDrawColor("#000000");
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, anchoMapa, altoMapa);
  dibujarNorte(pdf, x + 5, y + 5);

  const rawDistancia = mr.longitudKm;
  const distanciaKm =
    typeof rawDistancia === "number" ? rawDistancia : parseFloat(String(rawDistancia)) || 0;
  const ubicacion = resolverUbicacion(mr);

  let cursorY = dibujarLogo(pdf, colDerechaX, y, colDerechaAncho, 14, logoInfo) + GAP;

  const alturaTabla = Math.min(46, (height - (cursorY - y)) * 0.55);
  cursorY =
    dibujarTablaInfo(
      pdf,
      colDerechaX,
      cursorY,
      colDerechaAncho,
      [
        { etiqueta: "NOMBRE", valor: reciclador?.nombreCompleto ?? "" },
        { etiqueta: "CEDULA", valor: reciclador?.cedula ?? "" },
        { etiqueta: "NUMACRO", valor: mr.macrorrutaNumero ?? "" },
        { etiqueta: "HORARIO", valor: formatearHorario(mr) },
        { etiqueta: "BARRIO", valor: ubicacion.barrioNombre },
        { etiqueta: "LOCALIDAD", valor: ubicacion.localidadNombre ?? "" },
        { etiqueta: "DISTANCIA", valor: distanciaKm.toFixed(2) + " km" },
        { etiqueta: "INICIO", valor: mr.dirInicio ?? "" },
        { etiqueta: "FIN", valor: mr.dirFin ?? "" },
      ],
      alturaTabla,
      mr.nombre
    ) + GAP;

  const alturaGuia = y + height - cursorY;
  if (alturaGuia > 3) {
    dibujarGuiaCompacta(pdf, colDerechaX, cursorY, colDerechaAncho, alturaGuia, guiaCalles);
  }
}

/**
 * Genera el PDF de la sección Usuarios: página vertical, dos microrrutas
 * por página (mitad superior / mitad inferior), cada una con su mapa
 * (nombres de vías visibles), tabla de datos y guía de calles ya
 * calculada. Recibe la lista completa a exportar ya resuelta por el
 * llamador (una sola microrruta seleccionada, las de un barrio/localidad,
 * o todas) — este generador solo se encarga de dibujar cada una.
 */
export async function generarReporteUsuarios(
  microrrutas: MicrorrutaParaReporte[],
  nombreArchivo: string
): Promise<void> {
  if (microrrutas.length === 0) return;

  const microrrutasOrdenadas = ordenarPorRecorridoOesteAEste(microrrutas);
  if (microrrutasOrdenadas.length !== microrrutas.length) {
    console.error(
      `El orden del reporte de Usuarios perdió microrrutas: entraron ${microrrutas.length}, ` +
        `salieron ${microrrutasOrdenadas.length}.`
    );
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const [recyclers, logoInfo] = await Promise.all([
    getRecyclers({}).catch((error) => {
      console.error("Error cargando recicladores para el reporte:", error);
      return [] as Recycler[];
    }),
    obtenerLogo(),
  ]);
  const recicladorPorMicrorrutaId = new Map<number, Recycler>();
  recyclers.forEach((r) => {
    r.microrrutas.forEach((m) => {
      if (!recicladorPorMicrorrutaId.has(m.id)) recicladorPorMicrorrutaId.set(m.id, r);
    });
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margen = 8;
  const gapEntreBloques = 3;

  const contentWidth = pageWidth - margen * 2;
  const alturaBloque = (pageHeight - margen * 2 - gapEntreBloques) / 2;

  for (let i = 0; i < microrrutasOrdenadas.length; i++) {
    const esSuperior = i % 2 === 0;
    if (esSuperior && i > 0) pdf.addPage();
    const startY = esSuperior ? margen : margen + alturaBloque + gapEntreBloques;

    const { properties, geometry } = microrrutasOrdenadas[i];
    const [viasGeoJson, guiaCalles] = await Promise.all([
      getViasGeoJson({ microrrutaId: properties.id }).catch((error) => {
        console.error(`Error cargando vías de "${properties.nombre}" para el reporte:`, error);
        return null;
      }),
      getGuiaCalles(properties.id).catch((error) => {
        console.error(`Error cargando la guía de calles de "${properties.nombre}" para el reporte:`, error);
        return [] as GuiaCallesPaso[];
      }),
    ]);

    await dibujarBloqueMicrorruta(
      pdf,
      margen,
      startY,
      contentWidth,
      alturaBloque,
      properties,
      geometry,
      viasGeoJson,
      guiaCalles,
      recicladorPorMicrorrutaId.get(properties.id) ?? null,
      logoInfo
    );
  }

  pdf.save(`usuarios-${nombreArchivo.replace(/\s+/g, "_")}.pdf`);
}

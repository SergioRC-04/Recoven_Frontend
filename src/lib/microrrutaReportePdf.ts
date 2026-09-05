// lib/microrrutaReportePdf.ts

import { jsPDF, GState } from "jspdf";
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
import { isEmpty } from "ol/extent";
import { getPointResolution, fromLonLat } from "ol/proj";
import type OlFeature from "ol/Feature";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";

import { getBarriosGeoJson, getViasGeoJson, getLocalidadesGeoJson } from "../services/geo";
import { getRecyclersByTab } from "../services/recyclers";
import type {
  GeoJsonFeatureCollection,
  BarrioProperties,
  ViaProperties,
  LocalidadProperties,
} from "../types/geo";
import type { MicrorrutaProperties, LineStringGeoJson } from "../types/microrruta";
import type { Recycler } from "../types/recycler";

const VIEW_PROJ = "EPSG:3857";
const DATA_PROJ = "EPSG:4326";

const COOPERATIVA_NOMBRE = "RECOVEN ECA SAS ESP";
const COOPERATIVA_NIT = "NIT 901427170-6";

// ID fijo solicitado
const ID_MICRORRUTA_FIJO = "51406";

// Color de la ruta (rojo)
const COLOR_RUTA = "#dc2626";

// Altura fija del mapa localizador (mm)
const ALTO_LOCALIZADOR = 50;

// Alturas fijas para leyenda y escala
const ALTO_LEYENDA = 30;
const ALTO_ESCALA = 18;

// Gap general entre bloques
const GAP = 2;

interface CacheReporte {
  recyclers?: Recycler[];
  localidadesGeoJson?: GeoJsonFeatureCollection<LocalidadProperties> | null;
  logoInfo?: { dataUrl: string; width: number; height: number } | null;
  localizadores: Map<string, string>;
  contextosGeograficos: Map<
    string,
    {
      barriosGeoJson: GeoJsonFeatureCollection<BarrioProperties> | null;
      viasGeoJson: GeoJsonFeatureCollection<ViaProperties> | null;
    }
  >;
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

async function obtenerLogoCache(
  cache: CacheReporte
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (cache.logoInfo === undefined) {
    try {
      const dataUrl = await cargarImagenComoDataUrl("/assets/img/logo.png");
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      cache.logoInfo = {
        dataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    } catch (error) {
      console.error("Error cargando logo para el reporte:", error);
      cache.logoInfo = null;
    }
  }
  return cache.logoInfo;
}

function crearCacheReporte(): CacheReporte {
  return { contextosGeograficos: new Map(), localizadores: new Map() };
}

async function obtenerRecyclersCache(cache: CacheReporte): Promise<Recycler[]> {
  if (cache.recyclers === undefined) {
    try {
      cache.recyclers = await getRecyclersByTab("todos");
    } catch (error) {
      console.error("Error cargando recicladores para el reporte:", error);
      cache.recyclers = [];
    }
  }
  return cache.recyclers;
}

async function obtenerLocalidadesGeoJsonCache(
  cache: CacheReporte
): Promise<GeoJsonFeatureCollection<LocalidadProperties> | null> {
  if (cache.localidadesGeoJson === undefined) {
    try {
      cache.localidadesGeoJson = await getLocalidadesGeoJson();
    } catch (error) {
      console.error("Error cargando el GeoJSON de localidades para el reporte:", error);
      cache.localidadesGeoJson = null;
    }
  }
  return cache.localidadesGeoJson;
}

async function resolverReciclador(
  microrrutaId: number,
  cache: CacheReporte
): Promise<Recycler | null> {
  const todos = await obtenerRecyclersCache(cache);
  return todos.find((r) => r.microrrutas.some((m) => m.id === microrrutaId)) ?? null;
}

interface UbicacionDesdeMicrorruta {
  barrioCod: string | null;
  barrioNombre: string;
  localidadCod: string | null;
  localidadNombre: string | null;
}

function resolverUbicacionDesdeMicrorruta(mr: MicrorrutaProperties): UbicacionDesdeMicrorruta {
  if (mr.barrios.length === 0) {
    return { barrioCod: null, barrioNombre: "", localidadCod: null, localidadNombre: null };
  }
  return {
    barrioCod: mr.barrios[0].barrioCod,
    barrioNombre: mr.barrios.map((b) => b.barrioNombre).join(", "),
    localidadCod: mr.barrios[0].localidadCod,
    localidadNombre: mr.barrios[0].localidadNombre,
  };
}

async function obtenerContextoGeografico(
  localidadCod: string | null,
  barrioCod: string | null,
  cache: CacheReporte
) {
  if (!localidadCod) {
    return {
      barriosGeoJson: null as GeoJsonFeatureCollection<BarrioProperties> | null,
      viasGeoJson: null as GeoJsonFeatureCollection<ViaProperties> | null,
    };
  }

  const clave = `${localidadCod}|${barrioCod ?? ""}`;
  const enCache = cache.contextosGeograficos.get(clave);
  if (enCache) return enCache;

  try {
    const [barriosGeoJson, viasGeoJson] = await Promise.all([
      getBarriosGeoJson({ localidadCod }),
      getViasGeoJson({ localidadCod, barrioCod: barrioCod ?? undefined }),
    ]);
    const resultado = { barriosGeoJson, viasGeoJson };
    cache.contextosGeograficos.set(clave, resultado);
    return resultado;
  } catch (error) {
    console.error("Error cargando barrios/vías para el reporte:", error);
    const resultado = { barriosGeoJson: null, viasGeoJson: null };
    cache.contextosGeograficos.set(clave, resultado);
    return resultado;
  }
}

// Estilo de ruta: línea roja más gruesa (5px) y flechas más grandes (radio 9)
function estiloRuta(feature: OlFeature): Style[] {
  const estilos: Style[] = [
    new Style({
      stroke: new Stroke({ color: COLOR_RUTA, width: 5 }),
    }),
  ];

  const geometry = feature.getGeometry();
  if (!(geometry instanceof LineString)) return estilos;

  const coords = geometry.getCoordinates();
  if (coords.length === 0) return estilos;

  // Flecha al inicio (apunta en sentido contrario al recorrido)
  if (coords.length > 1) {
    const [x0, y0] = coords[0];
    const [x1, y1] = coords[1];
    const anguloInicio = Math.atan2(y1 - y0, x1 - x0);
    estilos.push(
      new Style({
        geometry: new Point(coords[0]),
        image: new RegularShape({
          points: 3,
          radius: 9,
          rotation: -anguloInicio - Math.PI / 2,
          fill: new Fill({ color: COLOR_RUTA }),
        }),
      })
    );
  }

  // Flecha al final (apunta en dirección de avance)
  if (coords.length > 1) {
    const [x1, y1] = coords[coords.length - 2];
    const [x2, y2] = coords[coords.length - 1];
    const anguloFinal = Math.atan2(y2 - y1, x2 - x1);
    estilos.push(
      new Style({
        geometry: new Point(coords[coords.length - 1]),
        image: new RegularShape({
          points: 3,
          radius: 9,
          rotation: -anguloFinal + Math.PI / 2,
          fill: new Fill({ color: COLOR_RUTA }),
        }),
      })
    );
  }

  return estilos;
}

interface ResultadoMapaImpresion {
  dataUrl: string;
  metrosPorMm: number;
}

async function renderizarMapaImpresion(
  geometry: LineStringGeoJson,
  barriosGeoJson: GeoJsonFeatureCollection<BarrioProperties> | null,
  viasGeoJson: GeoJsonFeatureCollection<ViaProperties> | null,
  widthPx: number,
  heightPx: number,
  anchoImpresoMm: number,
  barriosCodDeLaRuta: Set<string>
): Promise<ResultadoMapaImpresion> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0px";
  container.style.width = `${widthPx}px`;
  container.style.height = `${heightPx}px`;
  document.body.appendChild(container);

  try {
    const geoJsonFormat = new GeoJSON({ dataProjection: DATA_PROJ, featureProjection: VIEW_PROJ });

    const barriosLayer = new VectorLayer({
      source: new VectorSource({
        features: barriosGeoJson ? geoJsonFormat.readFeatures(barriosGeoJson) : [],
      }),
      style: (feature) => {
        const identificador = String(feature.get("identificador") ?? "");
        const esBarrioDeLaRuta = barriosCodDeLaRuta.has(identificador);

        if (esBarrioDeLaRuta) {
          return new Style({
            stroke: new Stroke({ color: "#2e7d32", width: 1.2 }),
            fill: new Fill({ color: "rgba(34, 197, 94, 0.15)" }),
            text: new TextStyle({
              text: String(feature.get("nombre") ?? ""),
              font: "bold 11px sans-serif",
              fill: new Fill({ color: "#ffffff" }),
              stroke: new Stroke({ color: "#2e7d32", width: 3 }),
              overflow: true,
            }),
          });
        } else {
          return new Style({
            stroke: new Stroke({ color: "#9ca3af", width: 0.4 }),
            fill: new Fill({ color: "rgba(200, 200, 200, 0.08)" }),
            text: undefined,
          });
        }
      },
    });

    const viasLayer = new VectorLayer({
      source: new VectorSource({
        features: viasGeoJson ? geoJsonFormat.readFeatures(viasGeoJson) : [],
      }),
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

    const osmLayer = new TileLayer({
      source: new OSM(),
    });

    const map = new OLMap({
      target: container,
      layers: [osmLayer, barriosLayer, viasLayer, rutaLayer],
      view: new View({ center: [0, 0], zoom: 2 }),
      controls: [],
      interactions: [],
    });
    map.setSize([widthPx, heightPx]);

    const rutaGeom = rutaFeature.getGeometry();
    const extent = rutaGeom?.getExtent();
    if (extent && !isEmpty(extent)) {
      map.getView().fit(extent, { padding: [50, 50, 50, 50], size: [widthPx, heightPx] });
    }

    const resolucion = map.getView().getResolution() ?? 1;
    const centro = map.getView().getCenter() ?? [0, 0];
    const metrosPorPixel = getPointResolution(VIEW_PROJ, resolucion, centro, "m");
    const metrosPorMm = metrosPorPixel * (widthPx / anchoImpresoMm);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      map.once("rendercomplete", () => {
        try {
          const mapCanvas = document.createElement("canvas");
          mapCanvas.width = widthPx;
          mapCanvas.height = heightPx;
          const mapContext = mapCanvas.getContext("2d");
          if (!mapContext) {
            reject(new Error("No se pudo crear el contexto de canvas para el mapa."));
            return;
          }
          mapContext.fillStyle = "#ffffff";
          mapContext.fillRect(0, 0, widthPx, heightPx);

          const canvases = container.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas");
          const listaCanvases =
            canvases.length > 0
              ? canvases
              : container.querySelectorAll<HTMLCanvasElement>("canvas");
          listaCanvases.forEach((canvas) => {
            if (canvas.width <= 0) return;
            const opacityStr = canvas.parentElement?.style.opacity || canvas.style.opacity;
            mapContext.globalAlpha = opacityStr === "" ? 1 : Number(opacityStr);
            const transform = canvas.style.transform;
            const match = transform && transform.match(/^matrix\(([^)]*)\)$/);
            if (match) {
              const m = match[1].split(",").map(Number);
              if (m.length === 6) {
                mapContext.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
              }
            }
            mapContext.drawImage(canvas, 0, 0);
          });
          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          mapContext.globalAlpha = 1;
          resolve(mapCanvas.toDataURL("image/jpeg", 0.92));
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Error componiendo el canvas del mapa."));
        }
      });
      map.renderSync();
    });

    return { dataUrl, metrosPorMm };
  } finally {
    document.body.removeChild(container);
  }
}

async function renderizarMapaLocalizador(
  localidadesGeoJson: GeoJsonFeatureCollection<LocalidadProperties> | null,
  localidadCodActual: string | null,
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

    const localidadesLayer = new VectorLayer({
      source: new VectorSource({
        features: localidadesGeoJson ? geoJsonFormat.readFeatures(localidadesGeoJson) : [],
      }),
      style: (feature) => {
        const isCurrent = feature.get("identificador") === localidadCodActual;
        return new Style({
          stroke: new Stroke({
            color: isCurrent ? "#059669" : "#9ca3af",
            width: isCurrent ? 1.5 : 0.5,
          }),
          fill: new Fill({
            color: isCurrent ? "#059669" : "rgba(200, 200, 200, 0.15)",
          }),
        });
      },
    });

    const osmLayer = new TileLayer({
      source: new OSM(),
    });

    const map = new OLMap({
      target: container,
      layers: [osmLayer, localidadesLayer],
      view: new View({ center: [0, 0], zoom: 2 }),
      controls: [],
      interactions: [],
    });
    map.setSize([widthPx, heightPx]);

    const source = localidadesLayer.getSource();
    if (source) {
      const extent = source.getExtent();
      if (extent && !isEmpty(extent)) {
        map.getView().fit(extent, {
          padding: [20, 20, 20, 20],
          size: [widthPx, heightPx],
          maxZoom: 12,
        });
      } else {
        map.getView().setCenter(fromLonLat([-74.7964, 10.9878]));
        map.getView().setZoom(10);
      }
    } else {
      map.getView().setCenter(fromLonLat([-74.7964, 10.9878]));
      map.getView().setZoom(10);
    }

    return new Promise((resolve, reject) => {
      map.once("rendercomplete", () => {
        try {
          const mapCanvas = document.createElement("canvas");
          mapCanvas.width = widthPx;
          mapCanvas.height = heightPx;
          const mapContext = mapCanvas.getContext("2d");
          if (!mapContext) {
            reject(new Error("No se pudo crear contexto canvas para localizador."));
            return;
          }
          mapContext.fillStyle = "#ffffff";
          mapContext.fillRect(0, 0, widthPx, heightPx);

          const canvases = container.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas");
          const listaCanvasesLoc =
            canvases.length > 0
              ? canvases
              : container.querySelectorAll<HTMLCanvasElement>("canvas");
          listaCanvasesLoc.forEach((canvas) => {
            if (canvas.width <= 0) return;
            const opacityStr = canvas.parentElement?.style.opacity || canvas.style.opacity;
            mapContext.globalAlpha = opacityStr === "" ? 1 : Number(opacityStr);
            const transform = canvas.style.transform;
            const match = transform && transform.match(/^matrix\(([^)]*)\)$/);
            if (match) {
              const m = match[1].split(",").map(Number);
              if (m.length === 6) {
                mapContext.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
              }
            }
            mapContext.drawImage(canvas, 0, 0);
          });
          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          mapContext.globalAlpha = 1;
          resolve(mapCanvas.toDataURL("image/jpeg", 0.92));
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Error capturando localizador."));
        }
      });
      map.renderSync();
    });
  } finally {
    document.body.removeChild(container);
  }
}

function calcularDistanciaBonita(distanciaMaximaM: number): number {
  if (distanciaMaximaM <= 0) return 1;
  const exponente = Math.floor(Math.log10(distanciaMaximaM));
  const bases = [1, 2, 5, 10];
  let mejor = Math.pow(10, exponente);
  for (const base of bases) {
    const candidato = base * Math.pow(10, exponente);
    if (candidato <= distanciaMaximaM) mejor = candidato;
  }
  return mejor;
}

function dibujarNorte(pdf: jsPDF, x: number, y: number): void {
  pdf.setFillColor("#000000");
  pdf.setDrawColor("#000000");
  pdf.triangle(x, y + 8, x + 3, y, x + 6, y + 8, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("N", x + 3, y + 13, { align: "center" });
}

function dibujarEncabezado(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  logoInfo: { dataUrl: string; width: number; height: number } | null
): number {
  const altura = 34;
  pdf.setDrawColor("#000000");
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, altura);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text(COOPERATIVA_NOMBRE, x + width / 2, y + 5, { align: "center", maxWidth: width - 4 });

  const centroX = x + width / 2;
  if (logoInfo) {
    const logoAncho = 50;
    const logoAlto = (logoInfo.height / logoInfo.width) * logoAncho;
    const espacioDisponible = altura - 8;
    const logoY = y + 5 + (espacioDisponible - logoAlto) / 2;
    pdf.addImage(logoInfo.dataUrl, "PNG", centroX - logoAncho / 2, logoY, logoAncho, logoAlto);
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(COOPERATIVA_NIT, x + 3, y + altura - 2.5);
  pdf.text(`ID: ${ID_MICRORRUTA_FIJO}`, x + width - 3, y + altura - 2.5, {
    align: "right",
    maxWidth: width / 2 - 6,
  });
  return y + altura;
}

interface FilaInfo {
  etiqueta: string;
  valor: string;
}

// Tabla con altura fija: ajusta fuente e interlineado para que quepa todo el contenido
function dibujarTablaInfo(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  filas: FilaInfo[],
  alturaMaxima: number,
  nombreMicrorruta?: string
): number {
  const paddingSuperior = 2.5;
  // Reservamos espacio inferior para el nombre (si existe) y para que no se salga
  const paddingInferior = nombreMicrorruta ? 9 : 2;
  const anchoEtiqueta = width * 0.34;
  const anchoValor = width - anchoEtiqueta - 6;

  // Calcular el número total de líneas necesarias
  let totalLines = 0;
  const linesPorFila: string[][] = [];
  for (const fila of filas) {
    const valorMayus = (fila.valor || "—").toUpperCase();
    const lines = pdf.splitTextToSize(valorMayus, anchoValor);
    linesPorFila.push(lines);
    totalLines += lines.length;
  }

  // Espacio disponible para las líneas
  const espacioDisponible = alturaMaxima - paddingSuperior - paddingInferior;
  const alturaLinea = Math.max(espacioDisponible / totalLines, 2.8);
  // Tamaño de fuente proporcional a la altura de línea (máximo 8, mínimo 5)
  const fontSize = Math.min(Math.max(alturaLinea * 2.2, 5), 8);
  const fontSizeEtiqueta = Math.min(fontSize + 0.5, 8.5);

  // Dibujar rectángulo con altura fija
  pdf.setDrawColor("#000000");
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, alturaMaxima);

  // Dibujar filas
  let filaY = y + paddingSuperior;
  for (let i = 0; i < filas.length; i++) {
    const lines = linesPorFila[i];
    const etiqueta = filas[i].etiqueta;

    // Etiqueta (centrada verticalmente respecto a la primera línea)
    const etiquetaY = filaY + alturaLinea * 0.6;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(fontSizeEtiqueta);
    pdf.text(etiqueta, x + 3, etiquetaY);

    // Valor (múltiples líneas)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);
    let lineY = filaY + alturaLinea * 0.6;
    for (const line of lines) {
      pdf.text(line, x + 3 + anchoEtiqueta, lineY, { maxWidth: anchoValor });
      lineY += alturaLinea;
    }
    filaY += lines.length * alturaLinea + 1.0;
  }

  // Nombre superpuesto en esquina inferior derecha, justo encima del borde
  if (nombreMicrorruta) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(nombreMicrorruta, x + width - 3, y + alturaMaxima - 2, {
      align: "right",
      maxWidth: width - 6,
    });
  }

  return y + alturaMaxima;
}

function dibujarLeyenda(pdf: jsPDF, x: number, y: number, width: number): number {
  const centerX = x + width / 2;
  const gapIconoTexto = 6;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("Leyenda", centerX, y + 4, { align: "center" });

  let filaY = y + 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(0);

  const elementos: Array<{
    dibujarIcono: (cx: number, cy: number) => void;
    etiqueta: string;
  }> = [
    {
      dibujarIcono: (cx, cy) => {
        const colorRuta = [220, 38, 38];
        pdf.setDrawColor(colorRuta[0], colorRuta[1], colorRuta[2]);
        pdf.setLineWidth(1.3);
        pdf.line(cx - 5, cy, cx + 5, cy);
        pdf.setFillColor(colorRuta[0], colorRuta[1], colorRuta[2]);
        pdf.triangle(cx - 6, cy, cx - 4, cy - 2.5, cx - 4, cy + 2.5, "F");
        pdf.triangle(cx + 6, cy, cx + 4, cy - 2.5, cx + 4, cy + 2.5, "F");
      },
      etiqueta: "Ruta",
    },
    {
      dibujarIcono: (cx, cy) => {
        pdf.setDrawColor(156, 163, 175);
        pdf.setLineWidth(0.5);
        pdf.line(cx - 6, cy, cx + 6, cy);
      },
      etiqueta: "Malla vial",
    },
    {
      dibujarIcono: (cx, cy) => {
        const colorVerde = [34, 197, 94];
        pdf.setDrawColor("#2e7d32");
        pdf.setLineWidth(0.8);
        pdf.setGState(new GState({ opacity: 0.15 }));
        pdf.setFillColor(colorVerde[0], colorVerde[1], colorVerde[2]);
        pdf.rect(cx - 6, cy - 3.5, 12, 5, "FD");
        pdf.setGState(new GState({ opacity: 1 }));
      },
      etiqueta: "Barrio",
    },
  ];

  elementos.forEach((el) => {
    const anchoIcono = 12;
    const anchoTexto = pdf.getTextWidth(el.etiqueta);
    const anchoBloque = anchoIcono + gapIconoTexto + anchoTexto;
    const inicioBloque = centerX - anchoBloque / 2;

    const iconoCenterX = inicioBloque + anchoIcono / 2;
    el.dibujarIcono(iconoCenterX, filaY);

    const textoX = inicioBloque + anchoIcono + gapIconoTexto;
    pdf.text(el.etiqueta, textoX, filaY + 0.5);

    filaY += 8;
  });

  return filaY;
}

function dibujarEscala(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  metrosPorMm: number
): number {
  const distanciaMaximaM = Math.max(metrosPorMm * 40, 1);
  const totalM = calcularDistanciaBonita(distanciaMaximaM);
  const pasos = 4;
  const anchoBarraMm = totalM / metrosPorMm;
  const alturaBarra = 3;

  const centroX = x + width / 2;
  const inicioBarra = centroX - anchoBarraMm / 2;

  for (let i = 0; i < pasos; i++) {
    pdf.setFillColor(i % 2 === 0 ? "#000000" : "#ffffff");
    pdf.setDrawColor("#000000");
    pdf.setLineWidth(0.2);
    pdf.rect(inicioBarra + (anchoBarraMm / pasos) * i, y, anchoBarraMm / pasos, alturaBarra, "FD");
  }

  const usaKm = totalM >= 1000;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  pdf.setTextColor(0);

  for (let i = 0; i <= pasos; i++) {
    const valor = (totalM / pasos) * i * (usaKm ? 1 / 1000 : 1);
    const etiqueta = usaKm ? valor.toFixed(2) : Math.round(valor).toString();
    const posX = inicioBarra + (anchoBarraMm / pasos) * i;
    pdf.text(etiqueta, posX, y + alturaBarra + 3, { align: "center" });
  }

  const unidad = usaKm ? "Kilómetros" : "Metros";
  pdf.text(unidad, centroX, y + alturaBarra + 8, { align: "center" });

  return y + alturaBarra + 12;
}

async function dibujarPaginaReporte(
  pdf: jsPDF,
  microrruta: MicrorrutaProperties,
  geometry: LineStringGeoJson,
  cache: CacheReporte
): Promise<void> {
  const reciclador = await resolverReciclador(microrruta.id, cache);
  const ubicacion = resolverUbicacionDesdeMicrorruta(microrruta);

  const { barriosGeoJson, viasGeoJson } = await obtenerContextoGeografico(
    ubicacion.localidadCod,
    ubicacion.barrioCod,
    cache
  );
  const localidadesGeoJson = await obtenerLocalidadesGeoJsonCache(cache);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margen = 8;

  // Mapa grande (izquierda) ocupa toda la altura
  const anchoMapa = (pageWidth - margen * 2) * 0.68 - GAP / 2;
  const altoMapa = pageHeight - margen * 2;
  const colDerechaX = margen + anchoMapa + GAP;
  const colDerechaAncho = pageWidth - margen - colDerechaX;

  // Mapa localizador (abajo a la derecha) con altura fija
  const yLocalizador = pageHeight - margen - ALTO_LOCALIZADOR;
  const anchoLocalizador = colDerechaAncho;

  const DPI = 150;
  const widthPx = Math.round((anchoMapa / 25.4) * DPI);
  const heightPx = Math.round((altoMapa / 25.4) * DPI);

  const barriosCodDeLaRuta = new Set(microrruta.barrios.map((b) => b.barrioCod));

  const { dataUrl: mapaDataUrl, metrosPorMm } = await renderizarMapaImpresion(
    geometry,
    barriosGeoJson,
    viasGeoJson,
    widthPx,
    heightPx,
    anchoMapa,
    barriosCodDeLaRuta
  );

  pdf.addImage(mapaDataUrl, "JPEG", margen, margen, anchoMapa, altoMapa);
  pdf.setDrawColor("#000000");
  pdf.setLineWidth(0.5);
  pdf.rect(margen, margen, anchoMapa, altoMapa);
  dibujarNorte(pdf, margen + 8, margen + 8);

  const rawDistancia = microrruta.longitudKm;
  const distanciaKm =
    typeof rawDistancia === "number" ? rawDistancia : parseFloat(String(rawDistancia)) || 0;
  const distanciaTexto = distanciaKm.toFixed(2) + " km";

  // Columna derecha: encabezado
  let cursorY = margen;
  const logoInfo = await obtenerLogoCache(cache);
  cursorY = dibujarEncabezado(pdf, colDerechaX, cursorY, colDerechaAncho, logoInfo) + GAP;

  // Espacio disponible para tabla + leyenda + escala antes del localizador
  const espacioTotal = yLocalizador - cursorY - GAP;

  // Asignar alturas: leyenda y escala fijas, el resto para la tabla
  const alturaTabla = espacioTotal - ALTO_LEYENDA - ALTO_ESCALA - GAP * 2;

  // Dibujar tabla con altura fija
  cursorY =
    dibujarTablaInfo(
      pdf,
      colDerechaX,
      cursorY,
      colDerechaAncho,
      [
        { etiqueta: "NOMBRE", valor: reciclador?.nombreCompleto ?? "" },
        { etiqueta: "CEDULA", valor: reciclador?.cedula ?? "" },
        { etiqueta: "NUMACRO", valor: String(microrruta.id) },
        { etiqueta: "HORARIO", valor: formatearHorario(microrruta) },
        { etiqueta: "BARRIO", valor: ubicacion.barrioNombre },
        { etiqueta: "LOCALIDAD", valor: ubicacion.localidadNombre ?? "" },
        { etiqueta: "DISTANCIA", valor: distanciaTexto },
        { etiqueta: "INICIO", valor: microrruta.dirInicio ?? "" },
        { etiqueta: "FIN", valor: microrruta.dirFin ?? "" },
      ],
      alturaTabla,
      microrruta.nombre
    ) + GAP;

  // Dibujar leyenda con altura fija
  cursorY = dibujarLeyenda(pdf, colDerechaX, cursorY, colDerechaAncho) + GAP;

  // Dibujar escala
  dibujarEscala(pdf, colDerechaX, cursorY, colDerechaAncho, metrosPorMm);

  // El localizador se dibuja en su posición fija
  const dpiLoc = 150;
  const widthPxLoc = Math.round((anchoLocalizador / 25.4) * dpiLoc);
  const heightPxLoc = Math.round((ALTO_LOCALIZADOR / 25.4) * dpiLoc);

  try {
    const claveLocalizador = `${ubicacion.localidadCod ?? "sin-localidad"}|${widthPxLoc}x${heightPxLoc}`;
    let localizadorDataUrl = cache.localizadores.get(claveLocalizador);
    if (!localizadorDataUrl) {
      localizadorDataUrl = await renderizarMapaLocalizador(
        localidadesGeoJson,
        ubicacion.localidadCod,
        widthPxLoc,
        heightPxLoc
      );
      cache.localizadores.set(claveLocalizador, localizadorDataUrl);
    }
    pdf.addImage(
      localizadorDataUrl,
      "JPEG",
      colDerechaX,
      yLocalizador,
      anchoLocalizador,
      ALTO_LOCALIZADOR
    );
    pdf.setDrawColor("#000000");
    pdf.setLineWidth(0.3);
    pdf.rect(colDerechaX, yLocalizador, anchoLocalizador, ALTO_LOCALIZADOR);
  } catch (error) {
    console.error("Error generando mapa localizador:", error);
    pdf.setDrawColor("#000000");
    pdf.setLineWidth(0.3);
    pdf.rect(colDerechaX, yLocalizador, anchoLocalizador, ALTO_LOCALIZADOR);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      "Localizador no disponible",
      colDerechaX + anchoLocalizador / 2,
      yLocalizador + ALTO_LOCALIZADOR / 2,
      { align: "center" }
    );
  }
}

function formatearHorario(mr: MicrorrutaProperties): string {
  if (mr.horaInicio && mr.horaFin) return `${mr.horaInicio} - ${mr.horaFin}`;
  return mr.horaInicio || mr.horaFin || "";
}

export async function generarReporteMicrorruta(
  microrruta: MicrorrutaProperties,
  geometry: LineStringGeoJson
): Promise<void> {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const cache = crearCacheReporte();
  await dibujarPaginaReporte(pdf, microrruta, geometry, cache);
  pdf.save(`microrruta-${microrruta.nombre.replace(/\s+/g, "_")}.pdf`);
}

export interface RutaParaReporte {
  microrruta: MicrorrutaProperties;
  geometry: LineStringGeoJson;
}

export async function generarReporteMicrorrutas(
  rutas: RutaParaReporte[],
  onProgreso?: (actual: number, total: number) => void
): Promise<void> {
  if (rutas.length === 0) return;

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const cache = crearCacheReporte();

  for (let i = 0; i < rutas.length; i++) {
    if (i > 0) pdf.addPage();
    await dibujarPaginaReporte(pdf, rutas[i].microrruta, rutas[i].geometry, cache);
    onProgreso?.(i + 1, rutas.length);
  }

  const fecha = new Date().toISOString().split("T")[0];
  pdf.save(`microrrutas-reporte-${fecha}.pdf`);
}

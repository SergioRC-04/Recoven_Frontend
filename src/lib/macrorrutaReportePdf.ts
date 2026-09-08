// lib/macrorrutaReportePdf.ts
//
// Reporte del mapa de macrorrutas — separado de microrrutaReportePdf.ts a
// propósito: es un reporte de naturaleza distinta (un mapa estático de
// sectores/localidades, no el trazo de una ruta puntual), y el archivo de
// reportes de microrruta ya es bastante grande por sí solo.

import { jsPDF } from "jspdf";
import OLMap from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Stroke, Fill } from "ol/style";
import TextStyle from "ol/style/Text";
import { isEmpty } from "ol/extent";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";

import { getMacrorrutasGeoJson } from "../services/microrutas";
import type { MacrorrutasMapaGeoJson } from "../types/microrruta";

const VIEW_PROJ = "EPSG:3857";
const DATA_PROJ = "EPSG:4326";

const COOPERATIVA_NOMBRE = "RECOVEN ECA SAS ESP";
const COOPERATIVA_NIT = "NIT 901427170-6";

// Renderiza el mapa de macrorrutas: solo las localidades con macrorruta
// activa (ya filtradas por el backend, ver obtenerMacrorrutasGeoJson en
// microrrutas.service.ts), cada una con borde verde (mismo verde que usa
// el resto de la app para localidades/barrios, #059669) y una etiqueta
// con su nombre y su número de macrorruta. Sin relleno, sin microrrutas
// ni vías encima — es solo el mapa de sectores, no un mapa de trazado.
// Mismo patrón de composición de canvas que renderizarMapaImpresion /
// renderizarMapaLocalizador más arriba.
async function renderizarMapaMacrorrutas(
  macrorrutasGeoJson: MacrorrutasMapaGeoJson,
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
        features: geoJsonFormat.readFeatures(macrorrutasGeoJson),
      }),
      style: (feature) =>
        new Style({
          stroke: new Stroke({ color: "#059669", width: 2 }),
          text: new TextStyle({
            text: `${String(feature.get("nombre") ?? "")}\n${String(feature.get("macrorrutaNumero") ?? "")}`,
            font: "bold 13px sans-serif",
            fill: new Fill({ color: "#065f46" }),
            stroke: new Stroke({ color: "#ffffff", width: 4 }),
            overflow: true,
          }),
        }),
    });

    const osmLayer = new TileLayer({ source: new OSM() });

    const map = new OLMap({
      target: container,
      layers: [osmLayer, localidadesLayer],
      view: new View({ center: [0, 0], zoom: 2 }),
      controls: [],
      interactions: [],
    });
    map.setSize([widthPx, heightPx]);

    const source = localidadesLayer.getSource();
    const extent = source?.getExtent();
    if (extent && !isEmpty(extent)) {
      map.getView().fit(extent, { padding: [40, 40, 40, 40], size: [widthPx, heightPx] });
    } else {
      map.getView().setCenter(fromLonLat([-74.7964, 10.9878]));
      map.getView().setZoom(11);
    }

    return await new Promise<string>((resolve, reject) => {
      map.once("rendercomplete", () => {
        try {
          const mapCanvas = document.createElement("canvas");
          mapCanvas.width = widthPx;
          mapCanvas.height = heightPx;
          const mapContext = mapCanvas.getContext("2d");
          if (!mapContext) {
            reject(
              new Error("No se pudo crear el contexto de canvas para el mapa de macrorrutas.")
            );
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
          reject(
            err instanceof Error
              ? err
              : new Error("Error componiendo el canvas del mapa de macrorrutas.")
          );
        }
      });
      map.renderSync();
    });
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Genera el mapa de macrorrutas: un solo PDF con la división por
 * localidades que sí tienen macrorruta (al menos una microrruta cayendo
 * mayoritariamente ahí, ver obtenerMacrorrutasGeoJson en
 * microrrutas.service.ts) — cada una con su borde verde y una etiqueta
 * con su nombre y su número de macrorruta. Sin líneas de microrrutas ni
 * de vías: es solo el mapa de sectores, no un mapa de trazado. Una
 * localidad sin ninguna microrruta asignada simplemente no aparece —lo
 * decide el propio backend, no hay nada que filtrar aquí.
 */
export async function generarReporteMacrorrutas(): Promise<void> {
  const macrorrutasGeoJson = await getMacrorrutasGeoJson();

  if (macrorrutasGeoJson.features.length === 0) {
    throw new Error(
      "Todavía no hay ninguna macrorruta activa (ninguna localidad tiene microrrutas asignadas)."
    );
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margen = 8;
  const alturaEncabezado = 14;
  const gapEncabezado = 3;

  pdf.setDrawColor("#000000");
  pdf.setLineWidth(0.3);
  pdf.rect(margen, margen, pageWidth - margen * 2, alturaEncabezado);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`${COOPERATIVA_NOMBRE} — Mapa de Macrorrutas`, pageWidth / 2, margen + 6, {
    align: "center",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(COOPERATIVA_NIT, margen + 3, margen + alturaEncabezado - 3);
  pdf.text(
    new Date().toLocaleDateString("es-CO"),
    pageWidth - margen - 3,
    margen + alturaEncabezado - 3,
    { align: "right" }
  );

  const yMapa = margen + alturaEncabezado + gapEncabezado;
  const anchoMapa = pageWidth - margen * 2;
  const altoMapa = pageHeight - margen - yMapa;

  const DPI = 150;
  const widthPx = Math.round((anchoMapa / 25.4) * DPI);
  const heightPx = Math.round((altoMapa / 25.4) * DPI);

  const dataUrl = await renderizarMapaMacrorrutas(macrorrutasGeoJson, widthPx, heightPx);

  pdf.addImage(dataUrl, "JPEG", margen, yMapa, anchoMapa, altoMapa);
  pdf.setDrawColor("#000000");
  pdf.setLineWidth(0.5);
  pdf.rect(margen, yMapa, anchoMapa, altoMapa);

  const fecha = new Date().toISOString().split("T")[0];
  pdf.save(`mapa-macrorrutas-${fecha}.pdf`);
}

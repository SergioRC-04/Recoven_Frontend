// components/admin/MicrorrutaMapEditor.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import GeoJSON from "ol/format/GeoJSON";
import Draw, { type DrawEvent } from "ol/interaction/Draw";
import Snap from "ol/interaction/Snap";
import { fromLonLat } from "ol/proj";
import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";
import { isEmpty } from "ol/extent";
import { getLength } from "ol/sphere";
import { FaDrawPolygon, FaSave, FaTimes, FaSpinner } from "react-icons/fa";
import { updateMicrorrutaGeometria } from "../../services/microrutas";
import type { MicrorrutasGeoJson, LineStringGeoJson } from "../../types/microrruta";
import type { GeoJsonFeatureCollection, BarrioProperties, ViaProperties } from "../../types/geo";

const VIEW_PROJ = "EPSG:3857";
const DATA_PROJ = "EPSG:4326";
const CENTER_BARRANQUILLA = fromLonLat([-74.7964, 10.9878]);

// Capa de referencia (barrios de la localidad filtrada) — solo contexto
// visual, sin interacción. Solo borde, sin relleno.
const BARRIOS_REF_STYLE = new Style({
  stroke: new Stroke({ color: "#7c3aed", width: 2 }),
});

// Barrio actualmente seleccionado en el filtro: mismo color, borde más
// grueso para distinguirlo del resto — sin relleno tampoco.
const BARRIO_SELECTED_STYLE = new Style({
  stroke: new Stroke({ color: "#7c3aed", width: 3.5 }),
});

const MICRORRUTA_STYLE = new Style({
  stroke: new Stroke({ color: "#2563eb", width: 3 }),
});

const MICRORRUTA_EDITING_STYLE = new Style({
  stroke: new Stroke({ color: "#d97706", width: 4, lineDash: [2, 6] }),
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: "#d97706" }),
    stroke: new Stroke({ color: "#fff", width: 2 }),
  }),
});

const SKETCH_STYLE = new Style({
  stroke: new Stroke({ color: "#059669", width: 3, lineDash: [6, 6] }),
});

// Vías — capa de referencia para guiar el trazado (snap), no interactiva
// por sí sola. Dorado/oliva a propósito: no se confunde con el violeta de
// barrios, el azul de microrrutas, el ámbar de edición ni el verde del
// trazo pendiente.
const VIAS_STYLE = new Style({
  stroke: new Stroke({ color: "#ca8a04", width: 1.5 }),
});

interface MicrorrutaMapEditorProps {
  localidadCod?: string;
  // Barrio seleccionado en el filtro: se resalta con estilo sólido y el
  // mapa se encuadra a sus límites cuando cambia.
  barrioCod?: string;
  // GeoJSON de los barrios de la localidad filtrada, provisto por el padre
  // (AdminMicrorrutas.tsx) — este componente ya no hace su propia petición,
  // para no competir en una carrera con la que hace el padre para el selector.
  barriosGeoJson: GeoJsonFeatureCollection<BarrioProperties> | null;
  // GeoJSON de las vías de la localidad/barrio filtrados — capa de
  // referencia y fuente para la interacción Snap mientras se dibuja o se
  // edita el trazo de una microrruta.
  viasGeoJson: GeoJsonFeatureCollection<ViaProperties> | null;
  microrrutasGeoJson: MicrorrutasGeoJson | null;
  // Vista previa del trazo recién dibujado, mientras el formulario de creación está abierto.
  pendingGeojson: LineStringGeoJson | null;
  drawing: boolean;
  editingGeometriaId: number | null;
  onDrawEnd: (geojson: LineStringGeoJson, distanciaTotalKm: number) => void;
  onGeometriaSaved: () => void;
  onCancelGeometriaEdit: () => void;
}

export default function MicrorrutaMapEditor({
  localidadCod,
  barrioCod,
  barriosGeoJson,
  viasGeoJson,
  microrrutasGeoJson,
  pendingGeojson,
  drawing,
  editingGeometriaId,
  onDrawEnd,
  onGeometriaSaved,
  onCancelGeometriaEdit,
}: MicrorrutaMapEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const barriosLayerRef = useRef<VectorLayer | null>(null);
  const viasLayerRef = useRef<VectorLayer | null>(null);
  const microrrutasLayerRef = useRef<VectorLayer | null>(null);
  const pendingLayerRef = useRef<VectorLayer | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  // Interacción de dibujo usada para REDIBUJAR el trazo de una microrruta
  // existente (mismo mecanismo que crear una nueva, no Modify — ver más abajo).
  const editDrawInteractionRef = useRef<Draw | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);

  const [savingGeometria, setSavingGeometria] = useState(false);
  const [geometriaError, setGeometriaError] = useState<string | null>(null);
  // Trazo nuevo dibujado para reemplazar la geometría de la microrruta en
  // edición. null mientras no se ha terminado de dibujar todavía.
  const [editSketchGeojson, setEditSketchGeojson] = useState<LineStringGeoJson | null>(null);

  // Inicializar mapa (una vez)
  useEffect(() => {
    if (!mapContainer.current) return;

    const baseLayer = new TileLayer({ source: new OSM() });
    const barriosLayer = new VectorLayer({ source: new VectorSource(), style: BARRIOS_REF_STYLE });
    const viasLayer = new VectorLayer({
      source: new VectorSource(),
      style: VIAS_STYLE,
      visible: false,
    });
    const microrrutasLayer = new VectorLayer({
      source: new VectorSource(),
      style: MICRORRUTA_STYLE,
    });
    const pendingLayer = new VectorLayer({ source: new VectorSource(), style: SKETCH_STYLE });

    barriosLayerRef.current = barriosLayer;
    viasLayerRef.current = viasLayer;
    microrrutasLayerRef.current = microrrutasLayer;
    pendingLayerRef.current = pendingLayer;

    const map = new Map({
      target: mapContainer.current,
      layers: [baseLayer, barriosLayer, viasLayer, microrrutasLayer, pendingLayer],
      view: new View({ center: CENTER_BARRANQUILLA, zoom: 12 }),
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Refrescar la fuente de barrios cuando llega nueva data del padre.
  useEffect(() => {
    const barriosLayer = barriosLayerRef.current;
    if (!barriosLayer) return;

    if (!barriosGeoJson) {
      barriosLayer.setSource(new VectorSource());
      return;
    }

    try {
      const source = new VectorSource({
        features: new GeoJSON({
          dataProjection: DATA_PROJ,
          featureProjection: VIEW_PROJ,
        }).readFeatures(barriosGeoJson),
      });
      barriosLayer.setSource(source);
    } catch (error) {
      console.error("Error interpretando el GeoJSON de barrios:", error);
    }
  }, [barriosGeoJson]);

  // Refrescar la fuente de vías cuando llega nueva data del padre. Esta
  // misma fuente es la que usa la interacción Snap (ver más abajo).
  useEffect(() => {
    const viasLayer = viasLayerRef.current;
    if (!viasLayer) return;

    if (!viasGeoJson) {
      viasLayer.setSource(new VectorSource());
      return;
    }

    try {
      const source = new VectorSource({
        features: new GeoJSON({
          dataProjection: DATA_PROJ,
          featureProjection: VIEW_PROJ,
        }).readFeatures(viasGeoJson),
      });
      viasLayer.setSource(source);
    } catch (error) {
      console.error("Error interpretando el GeoJSON de vías:", error);
    }
  }, [viasGeoJson]);

  // Visibilidad de la capa de vías: los datos siempre están cargados (para
  // que el snap funcione al instante), pero solo se muestran en pantalla
  // cuando hay un filtro de ubicación activo o cuando se está dibujando o
  // editando un trazo — el resto del tiempo estarían de más visualmente.
  useEffect(() => {
    const viasLayer = viasLayerRef.current;
    if (!viasLayer) return;
    const shouldShow = Boolean(localidadCod || barrioCod || drawing || editingGeometriaId !== null);
    viasLayer.setVisible(shouldShow);
  }, [localidadCod, barrioCod, drawing, editingGeometriaId]);

  // Resaltar el barrio seleccionado (si hay uno) y encuadrar el mapa:
  // - a los límites de ese barrio específico, o
  // - a los límites de todos los barrios cargados, si solo hay una
  //   localidad seleccionada (sin barrio específico todavía).
  // Depende de barriosGeoJson además de barrioCod/localidadCod porque, si
  // los datos llegan después de que el usuario ya eligió el barrio, este
  // efecto necesita volver a correr una vez el feature exista en el source.
  useEffect(() => {
    const barriosLayer = barriosLayerRef.current;
    const map = mapRef.current;
    if (!barriosLayer || !map) return;

    barriosLayer.setStyle((feature) =>
      feature.get("identificador") === barrioCod ? BARRIO_SELECTED_STYLE : BARRIOS_REF_STYLE
    );

    const source = barriosLayer.getSource();
    if (!source) return;

    if (barrioCod) {
      const feature = source.getFeatures().find((f) => f.get("identificador") === barrioCod);
      const geometry = feature?.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        if (extent && !isEmpty(extent)) {
          map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 17, duration: 400 });
        }
      }
      return;
    }

    if (localidadCod) {
      const extent = source.getExtent();
      if (extent && !isEmpty(extent)) {
        map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 15, duration: 400 });
      }
      return;
    }

    // Sin localidad ni barrio: no tocamos la cámara aquí. El efecto de
    // microrrutas (justo abajo) es quien decide el encuadre en ese caso
    // (a las rutas cargadas, o a la vista general si no hay ninguna) —
    // antes ambos efectos competían por la cámara al limpiar filtros,
    // produciendo un doble salto de zoom.
  }, [barrioCod, localidadCod, barriosGeoJson]);

  // Refrescar la capa de microrrutas cuando cambian los datos del padre
  useEffect(() => {
    const microrrutasLayer = microrrutasLayerRef.current;
    const map = mapRef.current;
    if (!microrrutasLayer || !microrrutasGeoJson) return;

    // Envuelto en try/catch a propósito: si la forma real del GeoJSON que
    // devuelve el backend difiere de lo asumido, preferimos loguear el error
    // y dejar la capa vacía en vez de que una excepción sin capturar aquí
    // (dentro de un efecto, sin Error Boundary) tumbe todo el árbol de React.
    try {
      const source = new VectorSource({
        features: new GeoJSON({
          dataProjection: DATA_PROJ,
          featureProjection: VIEW_PROJ,
        }).readFeatures(microrrutasGeoJson),
      });
      microrrutasLayer.setSource(source);
      microrrutasLayer.setStyle((feature) =>
        feature.get("id") === editingGeometriaId ? MICRORRUTA_EDITING_STYLE : MICRORRUTA_STYLE
      );

      // Esta capa solo controla el encuadre cuando NO hay un filtro de
      // localidad/barrio activo — si lo hay, el efecto de barrios/localidad
      // de arriba ya se encargó, y dejamos su encuadre intacto para no
      // competir por la cámara (antes ambos efectos peleaban al limpiar
      // filtros, produciendo un doble salto de zoom).
      if (map && editingGeometriaId === null && !localidadCod && !barrioCod) {
        const extent = source.getExtent();
        if (extent && !isEmpty(extent)) {
          map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 400 });
        } else {
          // Sin microrrutas que encuadrar y sin filtro de ubicación: vista
          // general de la ciudad en vez de quedarse donde estaba antes.
          map.getView().animate({ center: CENTER_BARRANQUILLA, zoom: 12, duration: 400 });
        }
      }
    } catch (error) {
      console.error(
        "Error interpretando el GeoJSON de microrrutas (revisa la forma real de la respuesta de GET /microrrutas):",
        error
      );
    }
  }, [microrrutasGeoJson, localidadCod, barrioCod, editingGeometriaId]);

  // Vista previa del trazo pendiente: el recién dibujado para crear una ruta
  // (mientras el formulario de creación está abierto), o el trazo de
  // reemplazo mientras se está redibujando la geometría de una existente.
  // Ambos casos son mutuamente excluyentes (no se puede crear y editar a la
  // vez), así que comparten la misma capa de vista previa.
  useEffect(() => {
    const pendingLayer = pendingLayerRef.current;
    if (!pendingLayer) return;

    const geojsonAMostrar = editingGeometriaId !== null ? editSketchGeojson : pendingGeojson;

    if (!geojsonAMostrar) {
      pendingLayer.setSource(new VectorSource());
      return;
    }

    try {
      const source = new VectorSource({
        features: new GeoJSON({
          dataProjection: DATA_PROJ,
          featureProjection: VIEW_PROJ,
        }).readFeatures({ type: "Feature", geometry: geojsonAMostrar, properties: {} }),
      });
      pendingLayer.setSource(source);
    } catch (error) {
      console.error("Error mostrando la vista previa del trazo:", error);
    }
  }, [pendingGeojson, editSketchGeojson, editingGeometriaId]);

  // Restyle + encuadre cuando cambia cuál microrruta está en edición de geometría
  useEffect(() => {
    const microrrutasLayer = microrrutasLayerRef.current;
    const map = mapRef.current;
    if (!microrrutasLayer) return;

    microrrutasLayer.setStyle((feature) =>
      feature.get("id") === editingGeometriaId ? MICRORRUTA_EDITING_STYLE : MICRORRUTA_STYLE
    );

    if (editingGeometriaId !== null && map) {
      const feature = microrrutasLayer
        .getSource()
        ?.getFeatures()
        .find((f) => f.get("id") === editingGeometriaId);
      const geometry = feature?.getGeometry();
      if (geometry) {
        const extent = geometry.getExtent();
        if (extent && !isEmpty(extent)) {
          map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 17, duration: 400 });
        }
      }
    }
  }, [editingGeometriaId]);

  // Interacción de dibujo (nueva ruta) — controlada por la prop `drawing`.
  // Se agrega también Snap sobre la fuente de vías, para que el trazo se
  // enganche a las calles cercanas mientras se dibuja. Depende también de
  // viasGeoJson: si el usuario alcanza a hacer clic en "Trazar" antes de que
  // las vías terminen de cargar, este efecto vuelve a correr en cuanto
  // llegan y las incorpora al snap (a costa de reiniciar el boceto en
  // progreso, un caso borde poco frecuente).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!drawing) {
      if (drawInteractionRef.current) {
        map.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      if (snapInteractionRef.current) {
        map.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
      return;
    }

    // El source de destino no necesita estar en una capa visible: mientras se
    // traza, OpenLayers dibuja el boceto con su propio overlay interno.
    const draw = new Draw({ source: new VectorSource(), type: "LineString" });
    draw.on("drawend", (event: DrawEvent) => {
      const geometry = event.feature.getGeometry();
      if (!geometry) return;
      const geojson = new GeoJSON({
        dataProjection: DATA_PROJ,
        featureProjection: VIEW_PROJ,
      }).writeGeometryObject(geometry) as LineStringGeoJson;
      // getLength calcula la distancia real (círculo máximo), no la de
      // píxeles en pantalla. La geometría ya está en EPSG:3857 (proyección
      // de la vista), que es la que getLength asume por defecto.
      const distanciaTotalKm = Math.round((getLength(geometry) / 1000) * 100) / 100;
      onDrawEnd(geojson, distanciaTotalKm);
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;

    // Snap debe agregarse DESPUÉS de Draw para interceptar correctamente sus
    // eventos de puntero. Si aún no hay vías cargadas, queda sin efecto
    // (fuente vacía) hasta que lleguen.
    const viasSource = viasLayerRef.current?.getSource();
    if (viasSource) {
      const snap = new Snap({ source: viasSource, pixelTolerance: 15 });
      map.addInteraction(snap);
      snapInteractionRef.current = snap;
    }

    return () => {
      map.removeInteraction(draw);
      if (drawInteractionRef.current === draw) drawInteractionRef.current = null;
      if (snapInteractionRef.current) {
        map.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, viasGeoJson]);

  // Interacción de dibujo para REDIBUJAR el trazo de una microrruta existente
  // — en vez de arrastrar vértices sobre la línea original (Modify), se
  // traza una línea nueva desde cero, igual que al crear una ruta. La línea
  // original queda visible con estilo punteado (ver el efecto de arriba)
  // como referencia mientras se dibuja la de reemplazo, y nunca se toca:
  // si se cancela, no queda nada distorsionado en pantalla.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (editingGeometriaId === null) {
      if (editDrawInteractionRef.current) {
        map.removeInteraction(editDrawInteractionRef.current);
        editDrawInteractionRef.current = null;
      }
      if (snapInteractionRef.current) {
        map.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
      return;
    }

    const draw = new Draw({ source: new VectorSource(), type: "LineString" });
    draw.on("drawend", (event: DrawEvent) => {
      const geometry = event.feature.getGeometry();
      if (!geometry) return;
      const geojson = new GeoJSON({
        dataProjection: DATA_PROJ,
        featureProjection: VIEW_PROJ,
      }).writeGeometryObject(geometry) as LineStringGeoJson;
      setEditSketchGeojson(geojson);

      // Ya se trazó el reemplazo: se retiran Draw y Snap de inmediato para
      // que no se pueda seguir dibujando encima. Si el usuario no queda
      // conforme, cancela y vuelve a entrar en modo edición para intentar
      // de nuevo — mantiene el flujo simple, sin un "redibujar sin salir".
      map.removeInteraction(draw);
      if (editDrawInteractionRef.current === draw) editDrawInteractionRef.current = null;
      if (snapInteractionRef.current) {
        map.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
    });

    map.addInteraction(draw);
    editDrawInteractionRef.current = draw;

    // Snap DESPUÉS de Draw, mismo motivo que en la interacción de creación.
    const viasSource = viasLayerRef.current?.getSource();
    if (viasSource) {
      const snap = new Snap({ source: viasSource, pixelTolerance: 15 });
      map.addInteraction(snap);
      snapInteractionRef.current = snap;
    }

    return () => {
      map.removeInteraction(draw);
      if (editDrawInteractionRef.current === draw) editDrawInteractionRef.current = null;
      if (snapInteractionRef.current) {
        map.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
    };
  }, [editingGeometriaId, viasGeoJson]);

  // Cancela la edición: descarta el trazo de reemplazo (si había uno) y
  // avisa al padre para salir del modo edición. El reseteo del estado local
  // vive aquí, en el evento que lo origina, no reactivamente en el efecto
  // de arriba (mismo criterio que ya aplicamos en AdminMicrorrutas.tsx).
  const handleCancelEdit = () => {
    setEditSketchGeojson(null);
    setGeometriaError(null);
    onCancelGeometriaEdit();
  };

  const handleSaveGeometria = useCallback(async () => {
    if (!editSketchGeojson || editingGeometriaId === null) return;

    setSavingGeometria(true);
    setGeometriaError(null);
    try {
      await updateMicrorrutaGeometria(editingGeometriaId, { geojson: editSketchGeojson });
      setEditSketchGeojson(null);
      onGeometriaSaved();
    } catch (error) {
      setGeometriaError(
        error instanceof Error ? error.message : "Error al guardar el nuevo trazo."
      );
    } finally {
      setSavingGeometria(false);
    }
  }, [editingGeometriaId, editSketchGeojson, onGeometriaSaved]);

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        className="h-125 w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm"
      />

      {drawing && (
        <div className="absolute top-3 left-3 z-10 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-gray-700 shadow-md">
          <FaDrawPolygon className="mr-1.5 inline text-emerald-600" />
          Clic para trazar puntos — doble clic para terminar
        </div>
      )}

      {editingGeometriaId !== null && (
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
          {!editSketchGeojson && (
            <div className="rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-gray-700 shadow-md">
              <FaDrawPolygon className="mr-1.5 inline text-amber-600" />
              Dibuja el nuevo trazo — doble clic para terminar
            </div>
          )}
          <div className="flex gap-2 rounded-xl bg-white/95 p-2 shadow-md">
            <button
              onClick={handleCancelEdit}
              disabled={savingGeometria}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-60"
            >
              <FaTimes /> Cancelar
            </button>
            {editSketchGeojson && (
              <button
                onClick={handleSaveGeometria}
                disabled={savingGeometria}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-70"
              >
                {savingGeometria ? <FaSpinner className="animate-spin" /> : <FaSave />}
                Guardar Trazo
              </button>
            )}
          </div>
          {geometriaError && (
            <div className="max-w-xs rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-md">
              {geometriaError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

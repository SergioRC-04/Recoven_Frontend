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
import Select from "ol/interaction/Select";
import { click } from "ol/events/condition";
import Collection from "ol/Collection";
import type OlFeature from "ol/Feature";
import { fromLonLat } from "ol/proj";
import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";
import { isEmpty } from "ol/extent";
import { getLength } from "ol/sphere";
import {
  FaDrawPolygon,
  FaSave,
  FaTimes,
  FaSpinner,
  FaUndo,
  FaArrowRight,
  FaTrash,
} from "react-icons/fa";
import { updateMicrorrutaGeometria } from "../../services/microrutas";
import type { MicrorrutasGeoJson, LineStringGeoJson } from "../../types/microrruta";
import type { GeoJsonFeatureCollection, BarrioProperties, ViaProperties } from "../../types/geo";

const VIEW_PROJ = "EPSG:3857";
const DATA_PROJ = "EPSG:4326";
const CENTER_BARRANQUILLA = fromLonLat([-74.7964, 10.9878]);

// Capa de referencia (barrios de la localidad filtrada) — solo contexto
// visual, sin interacción. Verde, tono suave y sin relleno: es solo un
// límite de referencia, no el que está seleccionado en el filtro.
const BARRIOS_REF_STYLE = new Style({
  stroke: new Stroke({ color: "rgba(16, 185, 129, 0.6)", width: 1.5 }),
});

// Barrio actualmente seleccionado en el filtro (no la localidad completa):
// mismo verde, borde sólido más marcado y un relleno leve — mismo criterio
// visual que usa el mapa público para resaltar un barrio, pero con menos
// intensidad (relleno al 15%, no al 25%) para no competir tanto con el
// resto de capas del editor.
const BARRIO_SELECTED_STYLE = new Style({
  stroke: new Stroke({ color: "#10b981", width: 2.5 }),
  fill: new Fill({ color: "rgba(16, 185, 129, 0.15)" }),
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

// Reemplaza a MICRORRUTA_STYLE en el resto de rutas mientras se traza una
// nueva o se redibuja el trazo de una existente, para que no compitan
// visualmente con lo que se está dibujando en ese momento. La que está en
// edición sigue viéndose en ámbar (MICRORRUTA_EDITING_STYLE) tal cual, sin
// atenuar. Opacidad al 40%: lo bastante tenue para no distraer, pero
// todavía claramente visible (una versión anterior, al 18%, quedó casi
// invisible).
const MICRORRUTA_SOFT_STYLE = new Style({
  stroke: new Stroke({ color: "rgba(37, 99, 235, 0.4)", width: 3 }),
});

// Rojo, a propósito: es el color que menos se presta a confusión con el
// resto de la paleta (verde=barrios/trazo pendiente, dorado=vías,
// azul=microrrutas, ámbar=editando) — para que "seleccionada para ver"
// nunca se confunda con "en edición". zIndex alto: sin esto, en los cruces
// entre dos microrrutas el orden de pintado dentro de la misma capa podía
// dejar el rojo por debajo del azul de la otra según cuál se procesara
// primero — con un zIndex explícito, la seleccionada siempre gana, sin
// depender de ese orden interno.
const MICRORRUTA_SELECTED_STYLE = new Style({
  stroke: new Stroke({ color: "#dc2626", width: 5 }),
  zIndex: 10,
});

const SKETCH_STYLE = new Style({
  stroke: new Stroke({ color: "#059669", width: 3, lineDash: [6, 6] }),
});

// Vías — capa de referencia para guiar el trazado (snap), no interactiva
// por sí sola. Mismo dorado/oliva de siempre (para no perder la
// convención de color), con opacidad moderada: una versión anterior, al
// 35%, quedó demasiado tenue para servir de referencia real.
const VIAS_STYLE = new Style({
  stroke: new Stroke({ color: "rgba(202, 138, 4, 0.55)", width: 1 }),
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
  // Se llama al hacer clic en una microrruta (o en otro lado, para
  // deseleccionar). No activo mientras se dibuja/edita — ver el efecto que
  // gestiona la interacción Select.
  onSelectMicrorruta?: (id: number | null) => void;
  // Selección controlada por el padre — permite seleccionar una
  // microrruta desde afuera (p. ej. clic en la fila de la tabla) y que el
  // mapa la resalte, no solo al revés (clic en el mapa → avisar al padre).
  selectedMicrorrutaId?: number | null;
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
  onSelectMicrorruta,
  selectedMicrorrutaId = null,
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
  // Colección estable de features para el Snap — NO se ata directamente al
  // VectorSource de la capa de vías. Hay un bug conocido de OpenLayers
  // (openlayers/openlayers#9034, #8107): si Snap se ata con `source` y ese
  // source se reemplaza o se le hace clear()+addFeatures() mientras el Snap
  // ya existe, su índice interno queda desactualizado o parcial (snapping
  // inconsistente). Usando `features` (una Collection) en vez de `source`,
  // Snap sí refleja correctamente los cambios futuros a esa misma colección
  // — es el workaround confirmado en esos issues.
  const viasSnapFeaturesRef = useRef<Collection<OlFeature> | null>(null);
  // Espejo de "hay un trazo en curso" en un ref, para poder leerlo desde el
  // efecto que refresca las vías sin declararlo como dependencia (evita que
  // ese efecto se dispare de más cada vez que se empieza/termina a dibujar).
  const dibujandoOEditandoRef = useRef(false);

  const [savingGeometria, setSavingGeometria] = useState(false);
  const [geometriaError, setGeometriaError] = useState<string | null>(null);
  // Trazo nuevo dibujado para reemplazar la geometría de la microrruta en
  // edición. null mientras no se ha terminado de dibujar todavía.
  const [editSketchGeojson, setEditSketchGeojson] = useState<LineStringGeoJson | null>(null);
  // true tras darle a "Borrar trazo anterior": oculta la línea original
  // (la punteada en ámbar) de la vista, para dibujar sobre un lienzo
  // limpio. Se reinicia a false cada vez que una sesión de edición
  // termina — ver handleCancelEdit y handleSaveGeometria, más abajo — no
  // reactivamente con un efecto: como toda edición nueva empieza después
  // de que la anterior ya terminó por uno de esos dos caminos, el
  // resultado es el mismo sin necesidad de un efecto extra.
  const [ocultarTrazoOriginal, setOcultarTrazoOriginal] = useState(false);

  // Inicializar mapa (una vez). zIndex explícito en cada capa (en vez de
  // depender solo del orden dentro de `layers`) para poder reordenarlas
  // dinámicamente más adelante sin recrear el mapa — ver el efecto de
  // reordenamiento mientras se dibuja/edita, más abajo. Los valores de
  // aquí son el orden "normal" (sin dibujar/editar): vías, barrios y
  // microrrutas de abajo hacia arriba, con pendingLayer siempre encima de
  // todo.
  useEffect(() => {
    if (!mapContainer.current) return;

    const baseLayer = new TileLayer({ source: new OSM(), zIndex: 0 });
    const viasLayer = new VectorLayer({
      source: new VectorSource(),
      style: VIAS_STYLE,
      visible: false,
      zIndex: 1,
    });
    const barriosLayer = new VectorLayer({
      source: new VectorSource(),
      style: BARRIOS_REF_STYLE,
      zIndex: 2,
    });
    const microrrutasLayer = new VectorLayer({
      source: new VectorSource(),
      style: MICRORRUTA_STYLE,
      zIndex: 3,
    });
    const pendingLayer = new VectorLayer({
      source: new VectorSource(),
      style: SKETCH_STYLE,
      zIndex: 4,
    });

    barriosLayerRef.current = barriosLayer;
    viasLayerRef.current = viasLayer;
    microrrutasLayerRef.current = microrrutasLayer;
    pendingLayerRef.current = pendingLayer;
    viasSnapFeaturesRef.current = new Collection<OlFeature>();

    const map = new Map({
      target: mapContainer.current,
      // El orden real de pintado ya no depende de esta lista (cada capa
      // tiene su propio zIndex) — se mantiene aquí solo como el orden de
      // agregado al mapa, sin efecto visual por sí mismo.
      layers: [baseLayer, viasLayer, barriosLayer, microrrutasLayer, pendingLayer],
      view: new View({ center: CENTER_BARRANQUILLA, zoom: 12 }),
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Mantiene el ref de "hay un trazo en curso" sincronizado, para leerlo
  // desde el efecto de vías sin declararlo como dependencia.
  useEffect(() => {
    dibujandoOEditandoRef.current = drawing || editingGeometriaId !== null;
  }, [drawing, editingGeometriaId]);

  // Reordena las capas mientras se dibuja una ruta nueva o se redibuja una
  // existente: las microrrutas ya guardadas (atenuadas, ver el estilo más
  // abajo) pasan por debajo de vías y barrios, dejando el trazo que se
  // está dibujando (pendingLayer, zIndex fijo en 4) como lo único
  // realmente destacado en pantalla. Al terminar, vuelve al orden normal
  // (microrrutas arriba de vías/barrios).
  useEffect(() => {
    const viasLayer = viasLayerRef.current;
    const barriosLayer = barriosLayerRef.current;
    const microrrutasLayer = microrrutasLayerRef.current;
    if (!viasLayer || !barriosLayer || !microrrutasLayer) return;

    const trazandoOEditando = drawing || editingGeometriaId !== null;

    if (trazandoOEditando) {
      microrrutasLayer.setZIndex(1);
      viasLayer.setZIndex(2);
      barriosLayer.setZIndex(3);
    } else {
      viasLayer.setZIndex(1);
      barriosLayer.setZIndex(2);
      microrrutasLayer.setZIndex(3);
    }
  }, [drawing, editingGeometriaId]);

  // Estilo de la capa de microrrutas: en edición se ve en ámbar
  // (MICRORRUTA_EDITING_STYLE), salvo que se haya pedido ocultarla
  // ("Borrar trazo anterior" — no se dibuja nada para esa feature); mientras
  // se traza/edita cualquier ruta, el resto se atenúa (MICRORRUTA_SOFT_STYLE)
  // para no competir visualmente con el trazo en curso; en cualquier otro
  // momento, color normal. La selección por clic (rojo) la sigue aplicando
  // la propia interacción Select más abajo — no se solapa con esto porque
  // Select se desactiva por completo mientras se dibuja/edita (ver ese
  // efecto).
  useEffect(() => {
    const microrrutasLayer = microrrutasLayerRef.current;
    if (!microrrutasLayer) return;

    const atenuar = drawing || editingGeometriaId !== null;

    microrrutasLayer.setStyle((feature) => {
      if (feature.get("id") === editingGeometriaId) {
        return ocultarTrazoOriginal ? undefined : MICRORRUTA_EDITING_STYLE;
      }
      if (atenuar) return MICRORRUTA_SOFT_STYLE;
      return MICRORRUTA_STYLE;
    });
  }, [drawing, editingGeometriaId, ocultarTrazoOriginal]);

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

  // Refrescar la fuente de vías cuando llega nueva data del padre. La capa
  // visual (viasLayer) se puede reemplazar libremente — el reemplazo de
  // VectorSource solo afecta el dibujo en pantalla. La Collection que usa
  // Snap (viasSnapFeaturesRef) es aparte, ver el comentario donde se declara.
  useEffect(() => {
    const viasLayer = viasLayerRef.current;
    const snapFeatures = viasSnapFeaturesRef.current;
    if (!viasLayer) return;

    if (!viasGeoJson) {
      viasLayer.setSource(new VectorSource());
      return;
    }

    try {
      const features = new GeoJSON({
        dataProjection: DATA_PROJ,
        featureProjection: VIEW_PROJ,
      }).readFeatures(viasGeoJson);
      viasLayer.setSource(new VectorSource({ features }));

      if (snapFeatures) {
        // Solo se vacía la colección cuando NO hay un trazo en curso — los
        // filtros de localidad/barrio están bloqueados mientras se dibuja,
        // así que las vías solo pueden pasar de "vacías" a "pobladas"
        // durante un trazo (nunca cambiar de un set a otro), por lo que
        // limpiar aquí en medio de un trazo nunca hace falta y evita
        // vaciar el índice de un Snap que ya está activo.
        if (!dibujandoOEditandoRef.current) {
          snapFeatures.clear();
        }
        const yaPresentes = new Set(snapFeatures.getArray());
        features.forEach((f) => {
          if (!yaPresentes.has(f)) snapFeatures.push(f);
        });
      }
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

  // Refrescar la capa de microrrutas cuando cambian los datos del padre.
  // El estilo NO se toca aquí (lo decide el efecto dedicado de más
  // arriba) — este efecto solo se ocupa de la fuente de datos y el
  // encuadre de cámara.
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

  // Encuadre (sin restyle, ya lo hace el efecto dedicado de más arriba)
  // cuando cambia cuál microrruta está en edición de geometría.
  useEffect(() => {
    const microrrutasLayer = microrrutasLayerRef.current;
    const map = mapRef.current;
    if (!microrrutasLayer) return;

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
    // eventos de puntero. Se ata a la Collection estable (viasSnapFeaturesRef),
    // no al VectorSource de la capa visual — ver el comentario donde se
    // declara esa Collection. Como es estable, este efecto YA NO depende de
    // viasGeoJson: si las vías llegan después de empezar a dibujar, Snap las
    // ve solo, sin necesidad de recrear Draw (que borraría el boceto en
    // curso — este era el bug real que se estaba reportando).
    const snapFeatures = viasSnapFeaturesRef.current;
    if (snapFeatures) {
      const snap = new Snap({ features: snapFeatures, pixelTolerance: 15 });
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
  }, [drawing]);

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

    // Snap DESPUÉS de Draw, sobre la misma Collection estable — mismo
    // motivo que en la interacción de creación (ver ese comentario).
    const snapFeatures = viasSnapFeaturesRef.current;
    if (snapFeatures) {
      const snap = new Snap({ features: snapFeatures, pixelTolerance: 15 });
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
  }, [editingGeometriaId]);

  // Cancela la edición: descarta el trazo de reemplazo (si había uno) y
  // avisa al padre para salir del modo edición. El reseteo del estado local
  // vive aquí, en el evento que lo origina, no reactivamente en el efecto
  // de arriba (mismo criterio que ya aplicamos en AdminMicrorrutas.tsx).
  const handleCancelEdit = () => {
    setEditSketchGeojson(null);
    setGeometriaError(null);
    setOcultarTrazoOriginal(false);
    onCancelGeometriaEdit();
  };

  // Deshace el último punto colocado, sin tener que cancelar y empezar de
  // cero — funciona tanto al trazar una ruta nueva como al redibujar una
  // existente, según cuál de las dos interacciones esté activa en ese
  // momento. removeLastPoint() es un método propio de Draw en OpenLayers,
  // pensado exactamente para esto.
  const handleDeshacerUltimoPunto = () => {
    if (drawing) {
      drawInteractionRef.current?.removeLastPoint();
    } else if (editingGeometriaId !== null) {
      editDrawInteractionRef.current?.removeLastPoint();
    }
  };

  // Solo tiene sentido en modo edición: en vez de trazar el reemplazo
  // desde cero, retoma el trazo ORIGINAL (el mismo que se ve punteado en
  // ámbar) para seguir agregándole puntos al final. Usa Draw.extend(), un
  // método de OpenLayers hecho exactamente para esto — "inicia el modo de
  // dibujo a partir de una geometría existente, que recibe los puntos
  // nuevos." Solo tiene efecto si todavía no se ha completado un trazo de
  // reemplazo en esta sesión de edición (antes de que exista
  // editSketchGeojson) — una vez completado, Draw ya se retiró del mapa.
  const handleContinuarDesdeExistente = () => {
    const microrrutasLayer = microrrutasLayerRef.current;
    const draw = editDrawInteractionRef.current;
    if (!microrrutasLayer || !draw || editingGeometriaId === null) return;

    const feature = microrrutasLayer
      .getSource()
      ?.getFeatures()
      .find((f) => f.get("id") === editingGeometriaId);
    if (!feature) return;

    draw.extend(feature);
  };

  const handleSaveGeometria = useCallback(async () => {
    if (!editSketchGeojson || editingGeometriaId === null) return;

    setSavingGeometria(true);
    setGeometriaError(null);
    try {
      await updateMicrorrutaGeometria(editingGeometriaId, { geojson: editSketchGeojson });
      setEditSketchGeojson(null);
      setOcultarTrazoOriginal(false);
      onGeometriaSaved();
    } catch (error) {
      setGeometriaError(
        error instanceof Error ? error.message : "Error al guardar el nuevo trazo."
      );
    } finally {
      setSavingGeometria(false);
    }
  }, [editingGeometriaId, editSketchGeojson, onGeometriaSaved]);

  // Interacción Select: permite hacer clic en una microrruta para
  // resaltarla (estilo propio, no el de la capa) y avisar al padre — que a
  // su vez resalta la fila correspondiente en la tabla. Clic en cualquier
  // otro lugar del mapa deselecciona automáticamente (comportamiento nativo
  // de Select, no hay que programarlo). No convive con dibujar/editar:
  // Draw también captura clics, y tenerlas activas a la vez causaría
  // conflictos — por eso esta interacción ni siquiera se crea en esos casos.
  //
  // selectedMicrorrutaId está en las dependencias para que, si la
  // selección se pide desde afuera (clic en la fila de la tabla), esta
  // interacción se recree ya con esa microrruta resaltada — el costo de
  // recrear la interacción en cada clic es insignificante. El cleanup NO
  // vuelve a avisar null al padre: si lo hiciera, cada vez que este mismo
  // efecto se recrea por un cambio de selección se autocancelaría la
  // selección que se acababa de pedir, un instante antes de aplicarla.
  useEffect(() => {
    const map = mapRef.current;
    const microrrutasLayer = microrrutasLayerRef.current;
    if (!map || !microrrutasLayer) return;
    if (drawing || editingGeometriaId !== null) return;

    const select = new Select({
      condition: click,
      layers: [microrrutasLayer],
      style: MICRORRUTA_SELECTED_STYLE,
    });
    map.addInteraction(select);

    if (selectedMicrorrutaId != null) {
      const feature = microrrutasLayer
        .getSource()
        ?.getFeatures()
        .find((f) => f.get("id") === selectedMicrorrutaId);
      if (feature) select.getFeatures().push(feature);
    }

    select.on("select", (e) => {
      const seleccionada = e.selected[0];
      const id = seleccionada ? (seleccionada.get("id") as number) : null;
      onSelectMicrorruta?.(id);
    });

    return () => {
      map.removeInteraction(select);
    };
  }, [drawing, editingGeometriaId, selectedMicrorrutaId, onSelectMicrorruta]);

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        className="h-125 w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm"
      />

      {drawing && (
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
          <div className="rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-gray-700 shadow-md">
            <FaDrawPolygon className="mr-1.5 inline text-emerald-600" />
            Clic para trazar puntos — doble clic para terminar
          </div>
          <button
            onClick={handleDeshacerUltimoPunto}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-md transition hover:bg-gray-100"
          >
            <FaUndo /> Deshacer último punto
          </button>
        </div>
      )}

      {editingGeometriaId !== null && (
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
          {!editSketchGeojson && (
            <>
              <div className="rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-gray-700 shadow-md">
                <FaDrawPolygon className="mr-1.5 inline text-amber-600" />
                Dibuja el nuevo trazo — doble clic para terminar
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={handleContinuarDesdeExistente}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-md transition hover:bg-gray-100"
                >
                  <FaArrowRight /> Continuar desde el trazo existente
                </button>
                <button
                  onClick={() => setOcultarTrazoOriginal(true)}
                  disabled={ocultarTrazoOriginal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-red-700 shadow-md transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaTrash /> Borrar trazo anterior
                </button>
                <button
                  onClick={handleDeshacerUltimoPunto}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-md transition hover:bg-gray-100"
                >
                  <FaUndo /> Deshacer último punto
                </button>
              </div>
            </>
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

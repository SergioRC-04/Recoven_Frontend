// components/admin/UsuariosMapa.tsx
//
// Mapa de la sección Usuarios: misma base que MicrorrutaMapEditor.tsx
// (OpenLayers, capa vial + trazo de microrrutas), pero de solo
// visualización/selección — sin trazar ni editar geometría, que no aplica
// aquí. Se le añaden dos capas propias:
//   1. Nombres de vía (campo `texto`) en negro, en una capa POR ENCIMA del
//      trazo de las microrrutas, para que el texto nunca quede tapado.
//   2. Ubicación en vivo del trabajador (navigator.geolocation.watchPosition).
import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import GeoJSON from "ol/format/GeoJSON";
import Select from "ol/interaction/Select";
import { click } from "ol/events/condition";
import type { FeatureLike } from "ol/Feature";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Circle from "ol/geom/Circle";
import LineStringGeom from "ol/geom/LineString";
import type OlLineString from "ol/geom/LineString";
import { fromLonLat } from "ol/proj";
import { Style, Stroke, Fill, Circle as CircleStyle } from "ol/style";
import TextStyle from "ol/style/Text";
import { isEmpty, intersects as extentsIntersects } from "ol/extent";
import { FaLocationArrow, FaExclamationTriangle } from "react-icons/fa";
import type { MicrorrutasGeoJson } from "../../types/microrruta";
import type { GeoJsonFeatureCollection, BarrioProperties, ViaProperties } from "../../types/geo";
import { marcarUnaEtiquetaPorCalle, PROP_MOSTRAR_NOMBRE_VIA } from "../../lib/viasEtiquetas";

const VIEW_PROJ = "EPSG:3857";
const DATA_PROJ = "EPSG:4326";
const CENTER_BARRANQUILLA = fromLonLat([-74.7964, 10.9878]);

const BARRIOS_REF_STYLE = new Style({
  stroke: new Stroke({ color: "rgba(16, 185, 129, 1)", width: 1.5 }),
});

const BARRIO_SELECTED_STYLE = new Style({
  stroke: new Stroke({ color: "#10b981", width: 2.5 }),
  fill: new Fill({ color: "rgba(16, 185, 129, 0.15)" }),
});

const RESOLUCION_ZOOM_12 = 156543.03392804097 / Math.pow(2, 12);
const RESOLUCION_ZOOM_15 = 156543.03392804097 / Math.pow(2, 15);

// Nivel de zoom (absoluto) a partir del cual se muestran los nombres de las
// vías — mismo patrón que BARRIOS_ZOOM_THRESHOLD en MapaServicios.tsx. Por
// debajo de este nivel (vista de barrio/ciudad) el mapa se llenaría de
// texto ilegible superpuesto sobre decenas de segmentos de vía a la vez;
// los nombres solo aportan a nivel de calle. 16 se probó visualmente: a 15
// ya empieza a competir con el trazo de la microrruta en zonas con manzanas
// pequeñas, a 16 el texto ya tiene espacio propio.
const VIAS_LABEL_ZOOM_THRESHOLD = 16;
const RESOLUCION_VIAS_LABEL = 156543.03392804097 / Math.pow(2, VIAS_LABEL_ZOOM_THRESHOLD);

function grosorSegunResolucion(resolution: number, min: number, max: number): number {
  if (resolution >= RESOLUCION_ZOOM_12) return min;
  if (resolution <= RESOLUCION_ZOOM_15) return max;
  const t = (RESOLUCION_ZOOM_12 - resolution) / (RESOLUCION_ZOOM_12 - RESOLUCION_ZOOM_15);
  return min + t * (max - min);
}

function estiloMicrorrutaNormal(_feature: FeatureLike, resolution: number): Style {
  return new Style({
    stroke: new Stroke({ color: "#2563eb", width: grosorSegunResolucion(resolution, 1, 3) }),
  });
}

function estiloMicrorrutaSelected(_feature: FeatureLike, resolution: number): Style {
  return new Style({
    stroke: new Stroke({ color: "#dc2626", width: grosorSegunResolucion(resolution, 1.5, 5) }),
    zIndex: 10,
  });
}

// Vías — capa de referencia (la línea), igual color que en el editor de
// microrrutas. El nombre de cada vía se dibuja aparte, en VIAS_LABEL_STYLE,
// en una capa distinta con zIndex más alto que el trazo de microrrutas.
const VIAS_STYLE = new Style({
  stroke: new Stroke({ color: "rgba(202, 138, 4, 0.55)", width: 1 }),
});

// Texto negro bien visible sobre cada segmento de vía. Halo blanco (stroke
// del TextStyle, no del trazo) solo para que se pueda leer encima del mapa
// base y del trazo de la microrruta — el color del texto en sí es negro,
// como pide el diseño. Si el nombre se repite varias veces porque la vía
// tiene varios segmentos, se deja así a propósito (sin declutter). Lo que
// sí depende del zoom es si el texto se dibuja o no — ver
// VIAS_LABEL_ZOOM_THRESHOLD más arriba — comparando la resolución actual
// del mapa (que OL pasa a la función de estilo en cada render) contra la
// resolución equivalente a ese umbral; por debajo del umbral se devuelve un
// Style vacío, sin tocar la capa de la línea de la vía en sí (VIAS_STYLE),
// que no depende del zoom.
function estiloNombreVia(feature: FeatureLike, resolution: number): Style {
  if (resolution > RESOLUCION_VIAS_LABEL) return new Style({});
  // Solo el segmento marcado por marcarUnaEtiquetaPorCalle (ver
  // lib/viasEtiquetas.ts) dibuja el nombre — evita que una misma calle
  // larga, partida en varios segmentos, repita su nombre una vez por
  // segmento.
  if (!feature.get(PROP_MOSTRAR_NOMBRE_VIA)) return new Style({});
  // abrTexto (abreviado, p.ej. "CL 45") en vez del nombre completo — se
  // lee mejor a este tamaño; si una vía no trae abreviatura, se cae al
  // texto completo en vez de dejarla sin nombre.
  const texto = String(feature.get("abrTexto") || feature.get("texto") || "").trim();
  if (!texto) return new Style({});
  return new Style({
    text: new TextStyle({
      text: texto,
      font: "bold 8px sans-serif",
      // Texto negro sólido sobre una placa blanca (backgroundFill), no
      // con un halo/stroke fino — el stroke competía visualmente con el
      // negro y lo hacía verse más gris que negro.
      fill: new Fill({ color: "#000000" }),
      backgroundFill: new Fill({ color: "#ffffff" }),
      padding: [1, 2, 1, 2],
      placement: "line",
      // Desplazada por encima de la línea, no centrada justo sobre ella,
      // para no tapar el trazo de la vía debajo del texto.
      offsetY: -4,
      overflow: true,
    }),
  });
}

// Línea amarilla gruesa sobre el tramo que dos o más microrrutas recorren
// en común — por encima del trazo azul normal, para que resalte.
const TRAMO_COMPARTIDO_STYLE = new Style({
  stroke: new Stroke({ color: "#facc15", width: 6 }),
  zIndex: 10,
});

// Tolerancia (metros, EPSG:3857) para considerar que un punto de una ruta
// "está sobre" la otra — no puede ser tan chica que el trazo a mano de dos
// personas distintas por la misma calle no encaje, ni tan grande que
// confunda dos calles paralelas del mismo bloque.
const TOLERANCIA_TRAMO_COMPARTIDO_M = 15;

// Longitud mínima (metros) de una racha de puntos cercanos para contarla
// como un tramo de verdad recorrido en común, no un simple cruce de
// pasada en una esquina — un cruce perpendicular solo entra y sale de la
// tolerancia en unos pocos metros; un tramo compartido real (misma calle
// por varias cuadras) la supera de sobra. Mismo criterio y mismo valor
// que RACHA_MINIMA_A_LO_LARGO_M en lib/usuarioReportePdf.ts, para "recorre
// junto a" vs. "solo cruza".
const MIN_TRAMO_COMPARTIDO_M = 50;

// Cada cuántos metros se muestrea una ruta para buscar tramos compartidos.
const INTERVALO_MUESTREO_TRAMO_M = 10;

// Recorre `lineaA` muestreada y separa los tramos donde queda dentro de
// TOLERANCIA_TRAMO_COMPARTIDO_M de `lineaB` — solo se quedan las rachas
// que superan MIN_TRAMO_COMPARTIDO_M. Cada tramo devuelto son las propias
// coordenadas de A en ese rango (ya sirven para dibujar: ahí es
// literalmente donde pasa la calle compartida).
function calcularTramosCompartidos(
  lineaA: OlLineString,
  lineaB: OlLineString
): [number, number][][] {
  const longitud = lineaA.getLength();
  if (longitud <= 0) return [];

  const numMuestras = Math.max(1, Math.round(longitud / INTERVALO_MUESTREO_TRAMO_M));
  const tramos: [number, number][][] = [];
  let rachaActual: [number, number][] = [];

  const cerrarRacha = () => {
    if (rachaActual.length >= 2) {
      let largo = 0;
      for (let i = 1; i < rachaActual.length; i++) {
        const dx = rachaActual[i][0] - rachaActual[i - 1][0];
        const dy = rachaActual[i][1] - rachaActual[i - 1][1];
        largo += Math.sqrt(dx * dx + dy * dy);
      }
      if (largo >= MIN_TRAMO_COMPARTIDO_M) tramos.push(rachaActual);
    }
    rachaActual = [];
  };

  for (let k = 0; k <= numMuestras; k++) {
    const punto = lineaA.getCoordinateAt(k / numMuestras) as [number, number];
    const cercano = lineaB.getClosestPoint(punto);
    const dx = punto[0] - cercano[0];
    const dy = punto[1] - cercano[1];
    const distancia = Math.sqrt(dx * dx + dy * dy);

    if (distancia <= TOLERANCIA_TRAMO_COMPARTIDO_M) {
      rachaActual.push(punto);
    } else {
      cerrarRacha();
    }
  }
  cerrarRacha();

  return tramos;
}

// Todos los tramos donde dos microrrutas DISTINTAS (mismo id = no cuenta)
// recorren de verdad el mismo camino — no un cruce puntual en una
// esquina. Se filtra primero por extent (bounding box) de cada par de
// rutas antes de muestrear — evita comparar rutas que ni siquiera están
// cerca una de la otra.
function calcularTramosDeCruce(features: Feature[]): [number, number][][] {
  const lineas = features
    .map((f) => ({
      id: f.get("id") as number,
      geom: f.getGeometry() as OlLineString | undefined,
    }))
    .filter((l): l is { id: number; geom: OlLineString } => !!l.geom);

  const tramos: [number, number][][] = [];

  for (let i = 0; i < lineas.length; i++) {
    for (let j = i + 1; j < lineas.length; j++) {
      if (lineas[i].id === lineas[j].id) continue;
      if (!extentsIntersects(lineas[i].geom.getExtent(), lineas[j].geom.getExtent())) continue;

      tramos.push(...calcularTramosCompartidos(lineas[i].geom, lineas[j].geom));
    }
  }

  return tramos;
}

const UBICACION_STYLE = new Style({
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({ color: "#2563eb" }),
    stroke: new Stroke({ color: "#ffffff", width: 2 }),
  }),
});

const UBICACION_PRECISION_STYLE = new Style({
  stroke: new Stroke({ color: "rgba(37, 99, 235, 0.5)", width: 1.5 }),
  fill: new Fill({ color: "rgba(37, 99, 235, 0.1)" }),
});

interface UsuariosMapaProps {
  localidadCod?: string;
  barrioCod?: string;
  barriosGeoJson: GeoJsonFeatureCollection<BarrioProperties> | null;
  viasGeoJson: GeoJsonFeatureCollection<ViaProperties> | null;
  // Vías cercanas SOLO a la microrruta seleccionada — alimenta
  // exclusivamente la capa de nombres (viasLabelLayer). null mientras no
  // hay microrruta seleccionada, para que no se dibuje ningún nombre en
  // ningún lado del mapa (a diferencia de viasGeoJson, que sigue mostrando
  // la línea de referencia de todas las vías del área filtrada).
  viasLabelGeoJson: GeoJsonFeatureCollection<ViaProperties> | null;
  microrrutasGeoJson: MicrorrutasGeoJson | null;
  // Decide CUÁNDO se re-encuadra la cámara a todas las rutas: solo cuando
  // esta clave cambia, no cada vez que llegan datos nuevos (p. ej. la
  // recarga silenciosa al volver a la pestaña del navegador). Sin ella, se
  // re-encuadra siempre que cambie microrrutasGeoJson, como antes.
  encuadreKey?: unknown;
  selectedMicrorrutaId: number | null;
  onSelectMicrorruta: (id: number | null) => void;
  titulo: string | null;
}

export default function UsuariosMapa({
  localidadCod,
  barrioCod,
  barriosGeoJson,
  viasGeoJson,
  viasLabelGeoJson,
  microrrutasGeoJson,
  encuadreKey,
  selectedMicrorrutaId,
  onSelectMicrorruta,
  titulo,
}: UsuariosMapaProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const barriosLayerRef = useRef<VectorLayer | null>(null);
  const viasLayerRef = useRef<VectorLayer | null>(null);
  const viasLabelLayerRef = useRef<VectorLayer | null>(null);
  const microrrutasLayerRef = useRef<VectorLayer | null>(null);
  const crucesLayerRef = useRef<VectorLayer | null>(null);
  const ubicacionLayerRef = useRef<VectorLayer | null>(null);
  const ubicacionFeatureRef = useRef<Feature<Point> | null>(null);
  const ubicacionPrecisionFeatureRef = useRef<Feature<Circle> | null>(null);
  const centradoInicialRef = useRef(false);

  const [geoError, setGeoError] = useState<string | null>(() =>
    navigator.geolocation ? null : "Este navegador no soporta geolocalización."
  );
  const [siguiendoUbicacion, setSiguiendoUbicacion] = useState(false);

  // Inicializar mapa (una vez).
  useEffect(() => {
    if (!mapContainer.current) return;

    const baseLayer = new TileLayer({ source: new OSM(), zIndex: 0 });
    const viasLayer = new VectorLayer({
      source: new VectorSource(),
      style: VIAS_STYLE,
      zIndex: 1,
    });
    const barriosLayer = new VectorLayer({
      source: new VectorSource(),
      style: BARRIOS_REF_STYLE,
      zIndex: 2,
    });
    const microrrutasLayer = new VectorLayer({
      source: new VectorSource(),
      style: estiloMicrorrutaNormal,
      zIndex: 3,
    });
    // Nombres de vía — SIEMPRE por encima del trazo de las microrrutas
    // (zIndex 4), para que el texto nunca quede tapado por la línea azul.
    const viasLabelLayer = new VectorLayer({
      source: new VectorSource(),
      style: estiloNombreVia,
      zIndex: 4,
    });
    // Tramos que 2+ microrrutas recorren en común — por encima del trazo
    // pero por debajo de los nombres de vía, para no competir con el texto.
    const crucesLayer = new VectorLayer({
      source: new VectorSource(),
      style: TRAMO_COMPARTIDO_STYLE,
      zIndex: 3.5,
    });
    const ubicacionLayer = new VectorLayer({
      source: new VectorSource(),
      zIndex: 5,
    });

    barriosLayerRef.current = barriosLayer;
    viasLayerRef.current = viasLayer;
    viasLabelLayerRef.current = viasLabelLayer;
    microrrutasLayerRef.current = microrrutasLayer;
    crucesLayerRef.current = crucesLayer;
    ubicacionLayerRef.current = ubicacionLayer;

    const map = new Map({
      target: mapContainer.current,
      layers: [
        baseLayer,
        viasLayer,
        barriosLayer,
        microrrutasLayer,
        crucesLayer,
        viasLabelLayer,
        ubicacionLayer,
      ],
      view: new View({ center: CENTER_BARRANQUILLA, zoom: 12 }),
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Fuente de barrios (capa de referencia).
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

  // Fuente de vías — línea de referencia (todas las vías del área
  // filtrada, sin depender de la selección de microrruta).
  useEffect(() => {
    const viasLayer = viasLayerRef.current;
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
    } catch (error) {
      console.error("Error interpretando el GeoJSON de vías:", error);
    }
  }, [viasGeoJson]);

  // Fuente de nombres de vía — SOLO las vías cercanas a la microrruta
  // seleccionada (viasLabelGeoJson, null mientras no hay selección). Así
  // los nombres nunca aparecen en ningún lado sin una microrruta activa,
  // sin importar el zoom.
  useEffect(() => {
    const viasLabelLayer = viasLabelLayerRef.current;
    if (!viasLabelLayer) return;
    if (!viasLabelGeoJson) {
      viasLabelLayer.setSource(new VectorSource());
      return;
    }
    try {
      const features = new GeoJSON({
        dataProjection: DATA_PROJ,
        featureProjection: VIEW_PROJ,
      }).readFeatures(viasLabelGeoJson);
      marcarUnaEtiquetaPorCalle(features);
      viasLabelLayer.setSource(new VectorSource({ features }));
    } catch (error) {
      console.error("Error interpretando el GeoJSON de vías (etiquetas):", error);
    }
  }, [viasLabelGeoJson]);

  // Resaltar el barrio filtrado y encuadrar el mapa a sus límites (o a los
  // de la localidad completa si no hay barrio puntual todavía).
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
    }
  }, [barrioCod, localidadCod, barriosGeoJson]);

  // Fuente de microrrutas (y sus tramos compartidos). El encuadre de
  // cámara va en el efecto siguiente, con su propia clave.
  useEffect(() => {
    const microrrutasLayer = microrrutasLayerRef.current;
    const crucesLayer = crucesLayerRef.current;
    if (!microrrutasLayer || !microrrutasGeoJson) return;

    try {
      const features = new GeoJSON({
        dataProjection: DATA_PROJ,
        featureProjection: VIEW_PROJ,
      }).readFeatures(microrrutasGeoJson);
      const source = new VectorSource({ features });
      microrrutasLayer.setSource(source);

      if (crucesLayer) {
        const tramosDeCruce = calcularTramosDeCruce(features);
        crucesLayer.setSource(
          new VectorSource({
            features: tramosDeCruce.map(
              (coords) => new Feature({ geometry: new LineStringGeom(coords) })
            ),
          })
        );
      }
    } catch (error) {
      console.error("Error interpretando el GeoJSON de microrrutas:", error);
    }
  }, [microrrutasGeoJson]);

  // Encuadre general (solo si no hay filtro de ubicación activo, igual
  // criterio que MicrorrutaMapEditor). Corre después del efecto de la
  // fuente, así que lee la fuente ya actualizada.
  const claveEncuadre = encuadreKey ?? microrrutasGeoJson;
  useEffect(() => {
    const microrrutasLayer = microrrutasLayerRef.current;
    const map = mapRef.current;
    if (!map || !microrrutasLayer || !microrrutasGeoJson) return;
    if (localidadCod || barrioCod) return;

    const extent = microrrutasLayer.getSource()?.getExtent();
    if (extent && !isEmpty(extent)) {
      map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 16, duration: 400 });
    } else {
      map.getView().animate({ center: CENTER_BARRANQUILLA, zoom: 12, duration: 400 });
    }
    // microrrutasGeoJson solo se lee para saber si ya cargó; el disparo lo
    // decide claveEncuadre a propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveEncuadre, localidadCod, barrioCod]);

  // Encuadrar sobre la microrruta seleccionada (desde la tabla o desde el
  // propio mapa) — para que, al elegir una ruta en la tabla de abajo, el
  // trazo quede visible sin tener que buscarlo a mano en el mapa.
  useEffect(() => {
    const microrrutasLayer = microrrutasLayerRef.current;
    const map = mapRef.current;
    if (!microrrutasLayer || !map || selectedMicrorrutaId == null) return;

    const feature = microrrutasLayer
      .getSource()
      ?.getFeatures()
      .find((f) => f.get("id") === selectedMicrorrutaId);
    const geometry = feature?.getGeometry();
    if (geometry) {
      const extent = geometry.getExtent();
      if (extent && !isEmpty(extent)) {
        map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 17, duration: 400 });
      }
    }
  }, [selectedMicrorrutaId]);

  // Interacción de selección por clic — mismo patrón que
  // MicrorrutaMapEditor.tsx, sin las exclusiones de "mientras dibuja/edita"
  // porque aquí nunca se dibuja ni se edita.
  useEffect(() => {
    const map = mapRef.current;
    const microrrutasLayer = microrrutasLayerRef.current;
    if (!map || !microrrutasLayer) return;

    const select = new Select({
      condition: click,
      layers: [microrrutasLayer],
      style: estiloMicrorrutaSelected,
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
      onSelectMicrorruta(id);
    });

    return () => {
      map.removeInteraction(select);
    };
  }, [selectedMicrorrutaId, onSelectMicrorruta]);

  // Ubicación en vivo del trabajador — pide permiso al montar y actualiza
  // mientras la página esté abierta (watchPosition, no una sola lectura).
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        setSiguiendoUbicacion(true);
        const map = mapRef.current;
        const ubicacionLayer = ubicacionLayerRef.current;
        if (!map || !ubicacionLayer) return;

        const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);

        if (!ubicacionFeatureRef.current) {
          const puntoFeature = new Feature({ geometry: new Point(coords) });
          puntoFeature.setStyle(UBICACION_STYLE);
          const precisionFeature = new Feature({
            geometry: new Circle(coords, pos.coords.accuracy || 0),
          });
          precisionFeature.setStyle(UBICACION_PRECISION_STYLE);
          ubicacionFeatureRef.current = puntoFeature;
          ubicacionPrecisionFeatureRef.current = precisionFeature;
          ubicacionLayer.setSource(new VectorSource({ features: [precisionFeature, puntoFeature] }));
        } else {
          ubicacionFeatureRef.current.setGeometry(new Point(coords));
          ubicacionPrecisionFeatureRef.current?.setGeometry(
            new Circle(coords, pos.coords.accuracy || 0)
          );
        }

        // Solo centra el mapa la primera vez que llega una posición — las
        // siguientes actualizaciones mueven el marcador sin arrebatarle la
        // cámara al usuario mientras navega el mapa a mano.
        if (!centradoInicialRef.current) {
          centradoInicialRef.current = true;
          if (!localidadCod && !barrioCod) {
            map.getView().animate({ center: coords, zoom: 16, duration: 400 });
          }
        }
      },
      (err) => {
        setSiguiendoUbicacion(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Ubicación denegada — actívala en el navegador para verte en el mapa."
            : "No se pudo obtener tu ubicación en este momento."
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // Deliberadamente sin localidadCod/barrioCod como dependencias más
    // allá del uso puntual arriba: no queremos reiniciar el watch (y perder
    // el marcador ya puesto) solo porque el usuario cambió un filtro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      {titulo && (
        <div className="mb-2 rounded-xl bg-gray-900 px-4 py-2.5 text-center text-sm font-bold text-white">
          {titulo}
        </div>
      )}
      <div
        ref={mapContainer}
        className="h-80 w-full overflow-hidden rounded-2xl border border-gray-200 shadow-sm sm:h-96 md:h-125"
      />
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        <div
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-md ${
            siguiendoUbicacion ? "bg-white/95 text-blue-600" : "bg-white/95 text-gray-400"
          }`}
        >
          <FaLocationArrow className={siguiendoUbicacion ? "animate-pulse" : ""} />
          {siguiendoUbicacion ? "Ubicación en vivo" : "Sin ubicación"}
        </div>
        {geoError && (
          <div className="flex max-w-xs items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 shadow-md">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            {geoError}
          </div>
        )}
      </div>
    </div>
  );
}

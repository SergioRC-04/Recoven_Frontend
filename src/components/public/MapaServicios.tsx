// components/public/MapaServicios.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { Style, Stroke, Fill } from "ol/style";
import Select from "ol/interaction/Select";
import { click } from "ol/events/condition";
import { isEmpty, getCenter } from "ol/extent";
import SimpleGeometry from "ol/geom/SimpleGeometry";
import type Geometry from "ol/geom/Geometry";
import {
  getLocalidadesList,
  getBarriosList,
  getLocalidadesGeoJson,
  getBarriosGeoJson,
} from "../../services/geo";
import { getMicrorrutas } from "../../services/microrutas";
import { DIAS_SEMANA, DIA_EVENTUAL, type MicrorrutaProperties } from "../../types/microrruta";
import type { Localidad, Barrio } from "../../types/geo";

const VIEW_PROJ = "EPSG:3857";
const DATA_PROJ = "EPSG:4326";
const CENTER_BARRANQUILLA = fromLonLat([-74.7964, 10.9878]);

// Zoom inicial del mapa (respaldo si aún no se ha calculado el ajuste real a las localidades).
const INITIAL_ZOOM = 11.5;

// Nivel de zoom (absoluto) a partir del cual se muestran los barrios en modo "exploración libre".
// Ajustar según qué tan denso se vea el mapa con los datos reales.
const BARRIOS_ZOOM_THRESHOLD = 13;

// Margen sobre el zoom "de referencia" (calculado al encuadrar todas las localidades) que se
// usa para decidir si el usuario volvió a un nivel de zoom "similar al inicial" y así
// restablecer los filtros automáticamente.
const RESET_ZOOM_MARGIN = 0.75;

// Estilos reutilizables (OpenLayers recomienda compartir instancias de Style entre features).
const LOCALIDADES_STYLE = new Style({
  stroke: new Stroke({ color: "#10b981", width: 2.5 }),
  fill: new Fill({ color: "rgba(16, 185, 129, 0.1)" }),
});

const BARRIOS_STYLE = new Style({
  stroke: new Stroke({ color: "#34d399", width: 1.5 }),
  fill: new Fill({ color: "rgba(5, 150, 105, 0.25)" }),
});

// Azul marino — mismo color que usan las microrrutas en el admin (mapa de
// trazado y reporte PDF), para mantener una convención visual consistente
// en toda la app: "esto es una ruta" siempre se ve igual. Contrasta bien
// contra los verdes de localidades/barrios de este mapa público.
//
// El grosor SÍ cambia con el zoom (a diferencia del admin): a la vista
// inicial (más alejado) un grosor fijo se ve como un bloque grueso tapando
// el mapa; acercándose, ese mismo grosor luce apropiado. Se interpola
// entre dos referencias de zoom en vez de usar un valor fijo.
const GROSOR_RUTA_MIN = 1.2; // al zoom 12 o más alejado
const GROSOR_RUTA_MAX = 3; // al zoom 15 o más cercano
// 156543.03392804097 = resolución (m/px) en zoom 0 para EPSG:3857 con
// tiles de 256px — la misma constante que usa cualquier mapa web estándar
// (OL, Leaflet, Google Maps) para su grilla de tiles.
const RESOLUCION_ZOOM_12 = 156543.03392804097 / Math.pow(2, 12);
const RESOLUCION_ZOOM_15 = 156543.03392804097 / Math.pow(2, 15);

function grosorRutaSegunResolucion(resolution: number): number {
  if (resolution >= RESOLUCION_ZOOM_12) return GROSOR_RUTA_MIN;
  if (resolution <= RESOLUCION_ZOOM_15) return GROSOR_RUTA_MAX;
  const t = (RESOLUCION_ZOOM_12 - resolution) / (RESOLUCION_ZOOM_12 - RESOLUCION_ZOOM_15);
  return GROSOR_RUTA_MIN + t * (GROSOR_RUTA_MAX - GROSOR_RUTA_MIN);
}

// Función de estilo (no un objeto de Style fijo): OpenLayers la vuelve a
// llamar en cada render pasándole la resolución actual, así el grosor se
// recalcula solo al hacer zoom — no depende de ningún estado de React.
function estiloMicrorrutas(_feature: unknown, resolution: number): Style {
  return new Style({
    stroke: new Stroke({ color: "#1e3a5f", width: grosorRutaSegunResolucion(resolution) }),
  });
}

// Rojo para la seleccionada — contrasta con el azul marino de las rutas
// normales y con los verdes de localidades/barrios. Reutiliza el mismo
// grosor dinámico (un poco más grueso) para que se siga viendo proporcionada
// en cualquier nivel de zoom, no solo un color distinto.
function estiloMicrorrutaSeleccionada(_feature: unknown, resolution: number): Style {
  return new Style({
    stroke: new Stroke({ color: "#dc2626", width: grosorRutaSegunResolucion(resolution) + 1.5 }),
  });
}

type Ciudad = "Barranquilla" | "Puerto Colombia";

// NOTA: se asume que las propiedades de los features GeoJSON exponen el mismo campo
// "identificador" que ya usan los listados (Localidad.identificador / Barrio.identificador).
// Si el GeoJSON del backend usa otro nombre de campo, ajustar esta constante.
const ID_PROPERTY = "identificador";

// Traduce el código guardado ("1-3-5") a nombres de día legibles para el
// público general — reutiliza el mismo catálogo que ya usa el formulario
// de microrrutas del admin, en vez de duplicar la lista de días aquí.
function formatearDias(diasFrecuencia: string): string {
  if (!diasFrecuencia) return "—";
  const codigos = diasFrecuencia
    .split("-")
    .map((d) => parseInt(d, 10))
    .filter((d) => !isNaN(d));

  if (codigos.includes(DIA_EVENTUAL)) return "Eventual";

  return (
    codigos
      .map((cod) => DIAS_SEMANA.find((d) => d.value === cod)?.full)
      .filter((nombre): nombre is string => Boolean(nombre))
      .join(", ") || "—"
  );
}

export default function MapaServicios() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  const [selectedCity, setSelectedCity] = useState<Ciudad>("Barranquilla");
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>("");
  const [selectedBarrio, setSelectedBarrio] = useState<string>("");
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  // Lista liviana para el panel de la derecha (nombre/días/distancia) — se
  // llena con los mismos datos que ya se piden para la capa del mapa, con
  // el mismo filtro activo, no es una petición aparte.
  const [microrrutasList, setMicrorrutasList] = useState<MicrorrutaProperties[]>([]);
  // Microrruta resaltada al hacer clic en ella en el mapa — se refleja en
  // la tarjeta correspondiente de la lista de la derecha.
  const [selectedMicrorrutaId, setSelectedMicrorrutaId] = useState<number | null>(null);
  // Referencias a cada tarjeta de la lista, para poder hacerle scroll a la
  // seleccionada sin depender de ids de DOM ni de querySelector.
  // Objeto plano, no un Map nativo: este archivo ya importa "Map" de
  // OpenLayers como identificador (el propio mapa), lo que tapa tanto el
  // tipo como el valor del Map nativo de JS/TS en todo el archivo — un
  // "new Map()" aquí en realidad intentaría construir un mapa de
  // OpenLayers sin las opciones que necesita, rompiendo la página entera
  // al montar. Un objeto simple evita el choque por completo.
  const microrrutaCardRefs = useRef<Record<number, HTMLDivElement>>({});

  const layerLocalidadesRef = useRef<VectorLayer | null>(null);
  const layerBarriosRef = useRef<VectorLayer | null>(null);
  // Capa de microrrutas: independiente de la lógica de zoom de
  // localidades/barrios (esa alterna entre las dos según exploración; las
  // rutas son el servicio que se muestra, así que siempre están visibles).
  // Solo cambia su fuente de datos según el filtro de localidad/barrio.
  const layerMicrorrutasRef = useRef<VectorLayer | null>(null);

  // Espejos en ref de la selección actual, para poder leerla dentro de listeners del mapa
  // (moveend) sin recrearlos ni depender de closures desactualizados.
  const selectedLocalidadRef = useRef<string>("");
  const selectedBarrioRef = useRef<string>("");

  // Localidad "padre" del barrio actualmente seleccionado (para mostrarla resaltada en el mapa
  // aunque el usuario no haya elegido explícitamente una localidad en el filtro).
  const barrioParentLocalidadIdRef = useRef<string>("");

  // Zoom "de referencia" para la vista general, calculado tras el encuadre inicial.
  const baselineZoomRef = useRef<number>(INITIAL_ZOOM);

  // Evita que el fit() programático (al seleccionar localidad/barrio) dispare por accidente
  // el restablecimiento automático de filtros dentro del propio handler de moveend.
  const isProgrammaticMoveRef = useRef(false);

  // Coordinación del encuadre inicial: localidades y microrrutas se cargan
  // con peticiones independientes que pueden resolver en cualquier orden.
  // Para evitar un doble movimiento de cámara (encuadrar a localidades y
  // luego "saltar" a microrrutas, o viceversa), ninguna de las dos hace
  // fit() por su cuenta — cada una marca que ya está lista y llama a
  // intentarEncuadreInicial(), que solo actúa cuando AMBAS lo están, y solo
  // una vez en toda la vida del componente (encuadreInicialHechoRef).
  const localidadesListasRef = useRef(false);
  const microrrutasListasRef = useRef(false);
  const encuadreInicialHechoRef = useRef(false);

  // Cargar localidades (listado) al montar
  useEffect(() => {
    const loadLocalidades = async () => {
      try {
        const data = await getLocalidadesList();
        setLocalidades(data);
      } catch (error) {
        console.error("Error cargando localidades:", error);
      }
    };
    loadLocalidades();
  }, []);

  // Cargar barrios (listado) cuando cambia localidad
  useEffect(() => {
    const loadBarrios = async () => {
      try {
        const data = await getBarriosList(selectedLocalidad || undefined);
        const ordenados = [...data].sort((a, b) =>
          a.nombre_barrio.localeCompare(b.nombre_barrio, "es")
        );
        setBarrios(ordenados);
        if (selectedBarrio && !ordenados.some((b) => b.identificador === selectedBarrio)) {
          setSelectedBarrio("");
        }
      } catch (error) {
        console.error("Error cargando barrios:", error);
      }
    };
    loadBarrios();
  }, [selectedLocalidad, selectedBarrio]);

  // Determina a qué localidad pertenece un barrio, sin depender de ningún campo del backend:
  // usa el centro del bounding box del barrio y prueba contra cada polígono de localidad ya
  // cargado ("point in polygon"). Es una heurística geométrica, no una consulta al backend.
  const resolveParentLocalidadId = useCallback((barrioGeometry: Geometry | undefined): string => {
    if (!barrioGeometry) return "";
    const localidadesSource = layerLocalidadesRef.current?.getSource();
    if (!localidadesSource) return "";

    const testPoint = getCenter(barrioGeometry.getExtent());
    const match = localidadesSource.getFeatures().find((f) => {
      const geom = f.getGeometry();
      return geom instanceof SimpleGeometry && geom.intersectsCoordinate(testPoint);
    });
    return (match?.get(ID_PROPERTY) as string | undefined) ?? "";
  }, []);

  // Encuadre inicial único: se enfoca hacia donde están las microrrutas
  // (acercando lo que haga falta para que se vean bien), y solo si no hay
  // ninguna registrada todavía cae de respaldo a la vista general de
  // localidades. El nivel de zoom donde termine este fit decide solo, a
  // través de la lógica de umbral que ya existe en applyLayerVisibility, si
  // se terminan mostrando barrios (si quedó lo bastante cerca) o
  // localidades (si quedó lejano) — no hace falta ninguna lógica aparte
  // para eso, ya está cubierto por esa función.
  const intentarEncuadreInicial = useCallback(() => {
    if (encuadreInicialHechoRef.current) return;
    if (selectedLocalidadRef.current || selectedBarrioRef.current) return;
    if (!localidadesListasRef.current || !microrrutasListasRef.current) return;

    const map = mapRef.current;
    if (!map) return;

    const microrrutasExtent = layerMicrorrutasRef.current?.getSource()?.getExtent();
    const hayMicrorrutas = Boolean(microrrutasExtent && !isEmpty(microrrutasExtent));
    const extent = hayMicrorrutas
      ? microrrutasExtent
      : layerLocalidadesRef.current?.getSource()?.getExtent();

    if (!extent || isEmpty(extent)) return;

    encuadreInicialHechoRef.current = true;
    isProgrammaticMoveRef.current = true;
    map.getView().fit(extent, {
      padding: hayMicrorrutas ? [80, 80, 80, 80] : [60, 60, 60, 60],
      // Con microrrutas, se deja acercar tanto como haga falta para
      // enfocarlas bien — incluso pasando el umbral de barrios a
      // propósito, ya que es justo eso lo que hace que aparezcan barrios
      // en vez de localidades al cargar. Sin microrrutas (respaldo a
      // localidades), se limita para no acercar de más en una vista
      // general sin nada específico que enfocar.
      maxZoom: hayMicrorrutas ? 17 : BARRIOS_ZOOM_THRESHOLD - 0.5,
      callback: () => {
        baselineZoomRef.current = map.getView().getZoom() ?? INITIAL_ZOOM;
      },
    });
  }, []);

  // Aplica visibilidad/estilo a las capas según el estado actual (selección + zoom).
  // Solo lee de refs, así que es seguro usarla dentro de listeners creados una sola vez.
  // No toca la capa de microrrutas a propósito: esa siempre está visible, ver el
  // comentario donde se declara layerMicrorrutasRef.
  const applyLayerVisibility = useCallback(() => {
    const localidadesLayer = layerLocalidadesRef.current;
    const barriosLayer = layerBarriosRef.current;
    const view = mapRef.current?.getView();
    if (!localidadesLayer || !barriosLayer || !view) return;

    const locSel = selectedLocalidadRef.current;
    const barSel = selectedBarrioRef.current;

    if (barSel) {
      // Selección de barrio: mostrar la localidad a la que pertenece (resaltada) y ocultar
      // el resto de barrios, dejando visible únicamente el seleccionado.
      const parentId = barrioParentLocalidadIdRef.current;
      localidadesLayer.setVisible(true);
      localidadesLayer.setStyle((feature) =>
        parentId && feature.get(ID_PROPERTY) === parentId ? LOCALIDADES_STYLE : undefined
      );
      barriosLayer.setVisible(true);
      barriosLayer.setStyle((feature) =>
        feature.get(ID_PROPERTY) === barSel ? BARRIOS_STYLE : undefined
      );
      return;
    }

    if (locSel) {
      // Selección de localidad: mostrar solo esa localidad y sus barrios (ya vienen
      // pre-filtrados por localidadCod desde el backend).
      localidadesLayer.setVisible(true);
      localidadesLayer.setStyle((feature) =>
        feature.get(ID_PROPERTY) === locSel ? LOCALIDADES_STYLE : undefined
      );
      barriosLayer.setVisible(true);
      barriosLayer.setStyle(BARRIOS_STYLE);
      return;
    }

    // Sin selección: el comportamiento depende únicamente del nivel de zoom.
    const zoom = view.getZoom() ?? INITIAL_ZOOM;
    const showBarrios = zoom >= BARRIOS_ZOOM_THRESHOLD;
    localidadesLayer.setVisible(!showBarrios);
    localidadesLayer.setStyle(LOCALIDADES_STYLE);
    barriosLayer.setVisible(showBarrios);
    barriosLayer.setStyle(BARRIOS_STYLE);
  }, []);

  // Inicializar mapa (una vez)
  useEffect(() => {
    if (!mapContainer.current) return;

    const baseLayer = new TileLayer({ source: new OSM() });

    const localidadesLayer = new VectorLayer({
      source: new VectorSource(),
      style: LOCALIDADES_STYLE,
    });

    const barriosLayer = new VectorLayer({
      source: new VectorSource(),
      style: BARRIOS_STYLE,
      visible: false, // oculto hasta que se cumpla el nivel de zoom o haya una selección
    });

    const microrrutasLayer = new VectorLayer({
      source: new VectorSource(),
      style: estiloMicrorrutas,
    });

    layerLocalidadesRef.current = localidadesLayer;
    layerBarriosRef.current = barriosLayer;
    layerMicrorrutasRef.current = microrrutasLayer;

    const map = new Map({
      target: mapContainer.current,
      // microrrutasLayer al final: se dibuja encima de los rellenos de
      // localidades/barrios, para que las líneas de ruta nunca queden tapadas.
      layers: [baseLayer, localidadesLayer, barriosLayer, microrrutasLayer],
      view: new View({
        center: CENTER_BARRANQUILLA,
        zoom: INITIAL_ZOOM,
      }),
    });

    mapRef.current = map;

    const handleMoveEnd = () => {
      if (isProgrammaticMoveRef.current) {
        isProgrammaticMoveRef.current = false;
        applyLayerVisibility();
        return;
      }

      const zoom = map.getView().getZoom() ?? INITIAL_ZOOM;
      const hasFilter = Boolean(selectedLocalidadRef.current || selectedBarrioRef.current);

      if (hasFilter && zoom <= baselineZoomRef.current + RESET_ZOOM_MARGIN) {
        // El usuario volvió a un nivel de zoom similar al inicial: restablecer filtros.
        setSelectedLocalidad("");
        setSelectedBarrio("");
        return;
      }

      applyLayerVisibility();
    };

    map.on("moveend", handleMoveEnd);

    return () => {
      map.un("moveend", handleMoveEnd);
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener sincronizados los refs de selección + reaccionar a cambios de localidad/barrio
  useEffect(() => {
    selectedLocalidadRef.current = selectedLocalidad;
  }, [selectedLocalidad]);

  useEffect(() => {
    selectedBarrioRef.current = selectedBarrio;

    const map = mapRef.current;
    const barriosLayer = layerBarriosRef.current;

    if (selectedBarrio && map && barriosLayer) {
      const feature = barriosLayer
        .getSource()
        ?.getFeatures()
        .find((f) => f.get(ID_PROPERTY) === selectedBarrio);
      const geometry = feature?.getGeometry();

      // Si ya había una localidad elegida en el filtro, confiamos en ella; si no, la
      // deducimos geométricamente a partir del barrio.
      barrioParentLocalidadIdRef.current =
        selectedLocalidadRef.current || resolveParentLocalidadId(geometry);

      if (geometry) {
        const extent = geometry.getExtent();
        if (extent && !isEmpty(extent)) {
          isProgrammaticMoveRef.current = true;
          map.getView().fit(extent, {
            padding: [80, 80, 80, 80],
            duration: 500,
            maxZoom: 17,
          });
        }
      }
      // Si el feature aún no está cargado (carrera con el fetch de barrios), el efecto de
      // carga de barrios se encarga de encuadrar, resolver la localidad padre y aplicar el
      // estilo una vez llegue el dato.
    } else {
      barrioParentLocalidadIdRef.current = "";
    }

    applyLayerVisibility();
  }, [selectedBarrio, applyLayerVisibility, resolveParentLocalidadId]);

  // Cargar localidades (GeoJSON) una sola vez — ya NO encuadra la cámara
  // por su cuenta (ver intentarEncuadreInicial): solo carga los datos y
  // marca que está lista.
  useEffect(() => {
    const loadLocalidadesGeo = async () => {
      const localidadesLayer = layerLocalidadesRef.current;
      if (!localidadesLayer) return;

      try {
        const localidadesGeo = await getLocalidadesGeoJson();
        const source = new VectorSource({
          features: new GeoJSON({
            dataProjection: DATA_PROJ,
            featureProjection: VIEW_PROJ,
          }).readFeatures(localidadesGeo),
        });
        localidadesLayer.setSource(source);
        applyLayerVisibility();
      } catch (error) {
        console.error("Error cargando localidades GeoJSON:", error);
      } finally {
        // Se marca "lista" incluso si falló: si esta petición nunca va a
        // llegar, no tiene sentido que el encuadre inicial se quede
        // esperándola para siempre — sigue con lo que sí tenga (microrrutas).
        localidadesListasRef.current = true;
        intentarEncuadreInicial();
      }
    };

    loadLocalidadesGeo();
  }, [applyLayerVisibility, intentarEncuadreInicial]);

  // Cargar barrios (GeoJSON) cuando cambia la localidad seleccionada; si hay una localidad
  // seleccionada, encuadrar el mapa a su extensión.
  useEffect(() => {
    const loadBarriosGeo = async () => {
      const map = mapRef.current;
      const barriosLayer = layerBarriosRef.current;
      if (!map || !barriosLayer) return;

      try {
        const barriosGeo = await getBarriosGeoJson(
          selectedLocalidad ? { localidadCod: selectedLocalidad } : {}
        );
        const source = new VectorSource({
          features: new GeoJSON({
            dataProjection: DATA_PROJ,
            featureProjection: VIEW_PROJ,
          }).readFeatures(barriosGeo),
        });
        barriosLayer.setSource(source);

        if (selectedLocalidad) {
          const locFeature = layerLocalidadesRef.current
            ?.getSource()
            ?.getFeatures()
            .find((f) => f.get(ID_PROPERTY) === selectedLocalidad);
          const geometry = locFeature?.getGeometry();
          if (geometry) {
            const extent = geometry.getExtent();
            if (extent && !isEmpty(extent)) {
              isProgrammaticMoveRef.current = true;
              map.getView().fit(extent, {
                padding: [60, 60, 60, 60],
                duration: 500,
                maxZoom: 15,
              });
            }
          }
        }

        // Si ya había un barrio seleccionado (carrera con este fetch), encuadrarlo y resolver
        // su localidad padre ahora que sus datos terminaron de cargar.
        if (selectedBarrioRef.current) {
          const barrioFeature = source
            .getFeatures()
            .find((f) => f.get(ID_PROPERTY) === selectedBarrioRef.current);
          const geometry = barrioFeature?.getGeometry();

          barrioParentLocalidadIdRef.current =
            selectedLocalidadRef.current || resolveParentLocalidadId(geometry);

          if (geometry) {
            const extent = geometry.getExtent();
            if (extent && !isEmpty(extent)) {
              isProgrammaticMoveRef.current = true;
              map.getView().fit(extent, {
                padding: [80, 80, 80, 80],
                duration: 500,
                maxZoom: 17,
              });
            }
          }
        }

        applyLayerVisibility();
      } catch (error) {
        console.error("Error cargando capas GeoJSON de barrios:", error);
      }
    };

    loadBarriosGeo();
  }, [selectedLocalidad, applyLayerVisibility, resolveParentLocalidadId]);

  // Cargar microrrutas (GeoJSON) — se repite cada vez que cambia localidad o barrio, usando
  // los mismos filtros que ya existen para barrios. Sin vías: esta capa es solo para mostrar
  // públicamente dónde opera el servicio, no para trazar/editar rutas. Siempre visible, sin
  // depender del nivel de zoom (a diferencia de localidades/barrios).
  useEffect(() => {
    const esCargaInicialSinFiltro = !selectedLocalidad && !selectedBarrio;

    const loadMicrorrutasGeo = async () => {
      const microrrutasLayer = layerMicrorrutasRef.current;
      if (!microrrutasLayer) return;

      try {
        const microrrutasGeo = await getMicrorrutas({
          localidadCod: selectedLocalidad || undefined,
          barrioCod: selectedBarrio || undefined,
        });
        const source = new VectorSource({
          features: new GeoJSON({
            dataProjection: DATA_PROJ,
            featureProjection: VIEW_PROJ,
          }).readFeatures(microrrutasGeo),
        });
        microrrutasLayer.setSource(source);
        setMicrorrutasList(microrrutasGeo.features.map((f) => f.properties));
      } catch (error) {
        console.error("Error cargando microrrutas GeoJSON:", error);
      } finally {
        // Solo la carga inicial (sin filtro) participa del encuadre único
        // — ver intentarEncuadreInicial, que además solo se ejecuta una
        // vez en toda la vida del componente.
        if (esCargaInicialSinFiltro) {
          microrrutasListasRef.current = true;
          intentarEncuadreInicial();
        }
      }
    };

    loadMicrorrutasGeo();
  }, [selectedLocalidad, selectedBarrio, intentarEncuadreInicial]);

  // Interacción Select: clic en una microrruta la resalta (estilo rojo,
  // ver estiloMicrorrutaSeleccionada) y avisa que se seleccionó — la lista
  // de la derecha resalta la tarjeta correspondiente y hace scroll hasta
  // ella (ver el efecto de abajo). Clic en cualquier otro lugar del mapa
  // deselecciona automáticamente (comportamiento nativo de Select).
  //
  // selectedMicrorrutaId está en las dependencias para que, si la
  // selección se pide desde afuera (clic en una tarjeta de la lista), esta
  // interacción se recree ya con esa microrruta resaltada en el mapa. El
  // cleanup NO vuelve a poner null: si lo hiciera, cada vez que este mismo
  // efecto se recrea por un cambio de selección se autocancelaría la
  // selección recién pedida, un instante antes de aplicarla. También se
  // recrea con el filtro de localidad/barrio, porque ahí sí cambia la
  // fuente de datos de la capa.
  useEffect(() => {
    const map = mapRef.current;
    const microrrutasLayer = layerMicrorrutasRef.current;
    if (!map || !microrrutasLayer) return;

    const select = new Select({
      condition: click,
      layers: [microrrutasLayer],
      style: estiloMicrorrutaSeleccionada,
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
      setSelectedMicrorrutaId(id);
    });

    return () => {
      map.removeInteraction(select);
    };
  }, [selectedLocalidad, selectedBarrio, selectedMicrorrutaId]);

  // Lleva la tarjeta seleccionada a la vista dentro de la lista — no la
  // reordena (a diferencia de la tabla del admin), solo hace scroll hasta
  // ella si está fuera del área visible.
  useEffect(() => {
    if (selectedMicrorrutaId == null) return;
    const card = microrrutaCardRefs.current[selectedMicrorrutaId];
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedMicrorrutaId]);

  // Manejador de cambio de ciudad
  const handleCityChange = (city: Ciudad) => {
    setSelectedCity(city);
    setSelectedLocalidad("");
    setSelectedBarrio("");
    if (city === "Puerto Colombia") {
      alert("Próximamente cobertura y servicios en Puerto Colombia");
      setSelectedCity("Barranquilla");
    }
  };

  return (
    <section className="relative w-full bg-emerald-950 py-12 text-white">
      <div className="container mx-auto px-6">
        {/* Encabezado centrado */}
        <div className="mb-8 text-center">
          <span className="mb-3 inline-block rounded-full border border-emerald-700/50 bg-emerald-900/80 px-4 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
            RECOVEN ECA • Cobertura Territorial
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-emerald-50 sm:text-4xl">
            Mapa de Cobertura y Operación
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-base text-emerald-200/80">
            Explora las localidades y sectores atendidos por nuestras rutas de aprovechamiento
            ambiental.
          </p>
        </div>

        {/* Tabs de ciudad - ALINEADOS A LA IZQUIERDA */}
        <div className="mb-6 flex justify-start border-b border-emerald-700/40 pb-1">
          <div className="flex space-x-2">
            <button
              onClick={() => handleCityChange("Barranquilla")}
              className={`rounded-t-lg px-6 py-2 font-bold transition ${
                selectedCity === "Barranquilla"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/60 hover:text-white"
              }`}
            >
              📍 Barranquilla
            </button>
            <button
              onClick={() => handleCityChange("Puerto Colombia")}
              className={`rounded-t-lg px-6 py-2 font-bold transition ${
                selectedCity === "Puerto Colombia"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-900/60 text-emerald-300/60 hover:bg-emerald-800/60 hover:text-white"
              }`}
            >
              ⚓ Puerto Colombia <span className="text-[10px] opacity-75">(Próximamente)</span>
            </button>
          </div>
        </div>

        {/* Panel de filtros - ALINEADO A LA IZQUIERDA */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg bg-emerald-900/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-emerald-300">Localidad:</label>
            <select
              value={selectedLocalidad}
              onChange={(e) => setSelectedLocalidad(e.target.value)}
              className="rounded-lg border border-emerald-700/60 bg-emerald-900/80 px-3 py-2 text-sm text-emerald-100 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
            >
              <option value="" className="bg-emerald-950 text-emerald-100">
                Todas
              </option>
              {localidades.map((loc) => (
                <option
                  key={loc.identificador}
                  value={loc.identificador}
                  className="bg-emerald-950 text-emerald-100"
                >
                  {loc.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-emerald-300">Barrio:</label>
            <select
              value={selectedBarrio}
              onChange={(e) => setSelectedBarrio(e.target.value)}
              disabled={barrios.length === 0}
              className="rounded-lg border border-emerald-700/60 bg-emerald-900/80 px-3 py-2 text-sm text-emerald-100 focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              <option value="" className="bg-emerald-950 text-emerald-100">
                Todos
              </option>
              {barrios.map((b) => (
                <option
                  key={b.identificador}
                  value={b.identificador}
                  className="bg-emerald-950 text-emerald-100"
                >
                  {b.nombre_barrio}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mapa (70%) + lista de microrrutas (30%) — apilados en pantallas
            pequeñas, lado a lado desde el breakpoint lg. */}
        <div className="flex flex-col gap-4 lg:flex-row">
          <div
            ref={mapContainer}
            className="h-150 overflow-hidden rounded-xl border border-emerald-800/60 shadow-2xl lg:w-[70%]"
          />

          <div className="flex h-150 flex-col overflow-hidden rounded-xl border border-emerald-800/60 bg-emerald-900/40 backdrop-blur-sm lg:w-[30%]">
            <div className="border-b border-emerald-700/40 px-4 py-3">
              <h3 className="text-sm font-bold text-emerald-100">
                Microrrutas ({microrrutasList.length})
              </h3>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {microrrutasList.length === 0 ? (
                <p className="py-6 text-center text-xs text-emerald-300/70">
                  No hay microrrutas registradas con este filtro.
                </p>
              ) : (
                microrrutasList.map((mr) => (
                  <div
                    key={mr.id}
                    ref={(el) => {
                      if (el) microrrutaCardRefs.current[mr.id] = el;
                      else delete microrrutaCardRefs.current[mr.id];
                    }}
                    onClick={() =>
                      setSelectedMicrorrutaId((prev) => (prev === mr.id ? null : mr.id))
                    }
                    className={`cursor-pointer rounded-lg border p-3 transition ${
                      mr.id === selectedMicrorrutaId
                        ? "border-red-400 bg-red-950/30 ring-1 ring-red-400"
                        : "border-emerald-700/40 bg-emerald-950/40 hover:border-emerald-500/60"
                    }`}
                  >
                    <p className="text-sm font-bold text-emerald-50">{mr.nombre}</p>
                    <p className="mt-1 text-xs text-emerald-300/80">
                      {formatearDias(mr.diasFrecuencia)}
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-300/80">
                      {mr.longitudKm != null
                        ? `${parseFloat(String(mr.longitudKm)).toFixed(2)} km`
                        : "—"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

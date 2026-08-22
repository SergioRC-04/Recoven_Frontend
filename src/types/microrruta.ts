// types/microrruta.ts
import type { GeoJsonFeatureCollection, GeoJsonFeature } from "./geo";

// ============================================================
// GEOMETRÍA (siempre LineString, EPSG:4326)
// ============================================================
// Reutilizamos GeoJsonPosition de geo.ts; LineStringGeoJson se define aquí
// porque es un subtipo concreto, no un tipo genérico de la capa geo.

export interface LineStringGeoJson {
  type: "LineString";
  // GeoJsonPosition = [number, number] | [number, number, number]
  coordinates: [number, number][] | [number, number, number][];
}

// ============================================================
// CATÁLOGOS — tipos de microrruta
// Fuente: Resolución SSPD 20174000237705-15-16 (reporte de información al
// SUI), Anexo — Formato de reporte de microrrutas, campo 2.
// ============================================================

export const TIPO_MICRORRUTA_LABELS: Record<number, string> = {
  1: "Recolección de residuos no aprovechables",
  2: "Barrido y limpieza de vías y áreas públicas",
  3: "Limpieza de playas",
  4: "Corte de césped",
  5: "Poda de árboles",
  6: "Recolección de residuos aprovechables (no incluye corte de césped y poda de árboles entre otros)",
  7: "Recolección de residuos provenientes de la actividad de barrido y limpieza de vías y áreas públicas",
  8: "Recolección de residuos provenientes de las actividades de corte de césped y poda de árboles",
};

// Etiquetas cortas para badges/columnas de tabla donde el texto completo
// no cabe.
export const TIPO_MICRORRUTA_LABELS_CORTOS: Record<number, string> = {
  1: "Res. no aprov.",
  2: "Barrido y limpieza",
  3: "Limpieza playas",
  4: "Corte césped",
  5: "Poda árboles",
  6: "Res. aprovechables",
  7: "Res. de barrido",
  8: "Res. corte/poda",
};

// Regla SUI (texto exacto de la resolución): "Para el caso en que el tipo
// de microrruta corresponda al código 4 (corte de césped) y/o 5 (poda de
// árboles), el diligenciamiento de los campos 4 al 7 y 13 del presente
// reporte de información no será obligatorio." → dirección/hora de inicio
// y fin (campos 4-7) SOLO son opcionales para tipo 4 y 5. El tipo 3
// (limpieza de playas) SÍ requiere estos campos — antes se incluía por
// error junto con 4 y 5.
export const TIPOS_SIN_HORARIOS_NI_DIRECCIONES = [4, 5] as const;

export function requiereHorariosYDirecciones(tipo: number): boolean {
  return !TIPOS_SIN_HORARIOS_NI_DIRECCIONES.includes(
    tipo as (typeof TIPOS_SIN_HORARIOS_NI_DIRECCIONES)[number]
  );
}

// Regla SUI (campos 8 y 9): "Si el tipo de microrruta reportado en el campo
// 2 corresponde a los códigos 3, 4 o 5, en este campo se debe reportar cero
// (0)." → las distancias sí incluyen el tipo 3 (limpieza de playas),
// a diferencia de la regla anterior.
export const TIPOS_SIN_DISTANCIAS_VIALES = [3, 4, 5] as const;

export function requiereDistanciasViales(tipo: number): boolean {
  return !TIPOS_SIN_DISTANCIAS_VIALES.includes(
    tipo as (typeof TIPOS_SIN_DISTANCIAS_VIALES)[number]
  );
}

// Regla SUI (campo 13): "Tipo de barrido. Para las microrrutas de barrido
// (códigos 2 y/o 3 del campo 2)..." → tipo de barrido solo tiene sentido
// para tipo 2 (barrido y limpieza de vías) y 3 (limpieza de playas);
// además el campo 2 confirma que no es obligatorio para 4 y 5. Para el
// resto de tipos (1, 6, 7, 8) se deshabilita por no ser aplicable.
export const TIPOS_CON_TIPO_BARRIDO = [2, 3] as const;

export function aplicaTipoBarrido(tipo: number): boolean {
  return TIPOS_CON_TIPO_BARRIDO.includes(tipo as (typeof TIPOS_CON_TIPO_BARRIDO)[number]);
}

// Tipo de barrido — códigos según "Tabla 1" publicada en la web del SUI,
// no incluida en las páginas de la resolución que se compartieron. Se deja
// el placeholder Manual/Mecánico ya usado; confirmar contra la Tabla 1 real
// si se necesita precisión.
export const TIPO_BARRIDO_LABELS: Record<number, string> = {
  1: "Manual",
  2: "Mecánico",
};

export const ESTACION_TRANSFERENCIA_LABELS: Record<number, string> = {
  1: "Sí",
  2: "No",
};

// Estado de la microrruta. Solo se ha confirmado "BORRADOR" en respuestas
// reales del backend hasta ahora — se deja como string (no como union
// estricto) porque no sabemos el listado completo de valores posibles.
// Si el backend confirma más estados (p. ej. "PUBLICADO", "ACTIVO"),
// conviene volverlo un union type y añadir sus labels/colores aquí.
export type EstadoMicrorruta = string;

export const ESTADO_MICRORRUTA_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
};

export const ESTADO_MICRORRUTA_COLORS: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-600",
};

// Días de la semana para el selector de "Días Frecuencia" (formato "1-3-5").
// Fuente: resolución, campo 11 — códigos 1 a 7 (Lunes a Domingo) más el
// código 8 "Eventual" para microrrutas sin días fijos. El campo 10
// (Frecuencia) admite decimales únicamente cuando se selecciona Eventual.
export const DIAS_SEMANA: { value: number; label: string; full: string }[] = [
  { value: 1, label: "L", full: "Lunes" },
  { value: 2, label: "M", full: "Martes" },
  { value: 3, label: "X", full: "Miércoles" },
  { value: 4, label: "J", full: "Jueves" },
  { value: 5, label: "V", full: "Viernes" },
  { value: 6, label: "S", full: "Sábado" },
  { value: 7, label: "D", full: "Domingo" },
];

export const DIA_EVENTUAL = 8;

// ============================================================
// TEXTOS DE AYUDA POR CAMPO
// Fuente: Resolución SSPD 20174000237705-15-16, definiciones de los campos
// 1 a 13 del reporte de microrrutas. Se usan en los íconos de información
// del formulario (MicrorrutaFormModal.tsx).
// ============================================================

export const CAMPO_AYUDA = {
  nombre:
    "Nombre de la microrruta definido por el prestador. Debe ser único dentro de la misma área de prestación.",
  tipo: "Clasifica la actividad de la microrruta según la codificación del SUI (1 a 8). Ver las opciones del selector para el detalle de cada código.",
  fechaOperacion:
    "Fecha a partir de la cual entró en operación la microrruta (se reporta al SUI en formato DD-MM-AAAA).",
  dirInicio:
    "Dirección del predio donde inicia el recorrido. No es obligatoria para corte de césped (4) o poda de árboles (5).",
  horaInicio:
    "Hora programada de inicio del recorrido, de 00:00 a 23:59. No es obligatoria para corte de césped (4) o poda de árboles (5).",
  dirFin:
    "Dirección del predio donde finaliza el recorrido. No es obligatoria para corte de césped (4) o poda de árboles (5).",
  horaFin:
    "Hora programada de finalización del recorrido. No es obligatoria para corte de césped (4) o poda de árboles (5).",
  distPavimentada:
    "Distancia en km de vía pavimentada que cubre la microrruta. Se reporta en 0 para limpieza de playas (3), corte de césped (4) y poda de árboles (5).",
  distNoPavimentada:
    "Distancia en km de vía no pavimentada. Se reporta en 0 para limpieza de playas (3), corte de césped (4) y poda de árboles (5).",
  frecuencia:
    "Número de veces por semana que se realiza la actividad. Admite decimales solo si la frecuencia es Eventual (código 8 en Días).",
  diasFrecuencia:
    "Días de la semana en que opera la microrruta (Lunes a Domingo), o Eventual si no tiene días fijos. Se guarda como códigos separados por guiones, p. ej. 1-3-5.",
  estacionTransferencia:
    "Indica si el recorrido termina en una estación de transferencia: una instalación dedicada a trasladar los residuos de un vehículo recolector a otro de mayor capacidad.",
  tipoBarrido:
    "Solo aplica para microrrutas de barrido: tipo 2 (Barrido y limpieza de vías) o tipo 3 (Limpieza de playas), según la Tabla 1 publicada en la página web del SUI.",
} as const;

// ============================================================
// ENTIDAD (propiedades del GeoJSON feature)
// ============================================================

export interface MicrorrutaProperties {
  id: number;
  nombre: string;
  tipo: number;
  fechaOperacion: string;
  dirInicio: string | null;
  horaInicio: string | null;
  dirFin: string | null;
  horaFin: string | null;
  distPavimentada: number;
  distNoPavimentada: number;
  frecuencia: number;
  diasFrecuencia: string;
  estacionTransferencia: number;
  tipoBarrido: number;
  estado: EstadoMicrorruta;
  // Calculada por el backend (PostGIS ST_Length). Prisma serializa Decimal
  // como string en JSON; se admite también number para defensividad.
  longitudKm?: number | string | null;
}

// ============================================================
// FORMA CRUDA DE GET /microrrutas
// ============================================================
// Confirmado con una respuesta real de Postman: el backend NO devuelve un
// GeoJSON FeatureCollection. Devuelve un array plano de objetos con los
// nombres de columna de Prisma en snake_case (sin mapear a DTO de
// respuesta, a diferencia del módulo de recyclers que sí aplana/mapea).
// La geometría viene anidada en `geojson` por cada item, no como
// feature.geometry de una colección.
//
// Ejemplo real:
// [{"id":6,"nombre":"recoleccion-01","tipo":6,
//   "fecha_operacion":"2026-08-21T00:00:00.000Z",
//   "dir_inicio":"calle 55 # 32-15","hora_inicio":"19:00",
//   "dir_fin":"calle 54 #33","hora_fin":"20:00",
//   "dist_pavimentada":0.5,"dist_no_pavimentada":0,
//   "frecuencia":4,"dias_frecuencia":"1-3-5",
//   "estacion_transferencia":2,"tipo_barrido":1,"estado":"BORRADOR",
//   "geojson":{"type":"LineString","coordinates":[[lon,lat],[lon,lat]]},
//   "longitud_calculada_km":"0.29"}]
//
// Nota: las escrituras (POST/PUT) sí usan camelCase, validadas por los DTO
// de Nest — la asimetría es solo en la respuesta de lectura de este
// endpoint en particular.
export interface MicrorrutaApiItem {
  id: number;
  nombre: string;
  tipo: number;
  fecha_operacion: string;
  dir_inicio: string | null;
  hora_inicio: string | null;
  dir_fin: string | null;
  hora_fin: string | null;
  dist_pavimentada: number;
  dist_no_pavimentada: number;
  frecuencia: number;
  dias_frecuencia: string;
  estacion_transferencia: number;
  tipo_barrido: number;
  estado: string;
  geojson: LineStringGeoJson | null;
  longitud_calculada_km: string | number | null;
}

// Reutilizamos los genéricos de geo.ts para evitar duplicar la estructura
// GeoJSON Feature/FeatureCollection.
export type MicrorrutaFeature = GeoJsonFeature<MicrorrutaProperties>;
export type MicrorrutasGeoJson = GeoJsonFeatureCollection<MicrorrutaProperties>;

// ============================================================
// FILTROS
// ============================================================

export interface MicrorrutasFilters {
  localidadCod?: string;
  barrioCod?: string;
}

// ============================================================
// FORMULARIO / PAYLOADS
// ============================================================

export interface MicrorrutaFormValues {
  nombre: string;
  tipo: number;
  fechaOperacion: string;
  dirInicio: string;
  horaInicio: string;
  dirFin: string;
  horaFin: string;
  distPavimentada: number;
  distNoPavimentada: number;
  frecuencia: number;
  diasFrecuencia: string;
  estacionTransferencia: number;
  tipoBarrido: number;
}

export interface MicrorrutaCreatePayload extends MicrorrutaFormValues {
  geojson: LineStringGeoJson;
}

// El backend implementó PUT /admin/microrrutas/:id con UpdateMicrorrutaDto
// (PartialType de CreateMicrorrutaDto), lo que significa que todos los campos
// son opcionales, incluyendo geojson. El servicio (services/microrrutas.ts)
// usa este tipo sin geojson para editar solo los datos del SUI, y
// MicrorrutaGeometriaPayload para editar solo la geometría.
export type MicrorrutaUpdatePayload = MicrorrutaFormValues;

export interface MicrorrutaGeometriaPayload {
  geojson: LineStringGeoJson;
}

// ============================================================
// HELPERS
// ============================================================

export function toMicrorrutaFormValues(mr: MicrorrutaProperties): MicrorrutaFormValues {
  return {
    nombre: mr.nombre,
    tipo: mr.tipo,
    fechaOperacion: mr.fechaOperacion.split("T")[0],
    dirInicio: mr.dirInicio ?? "",
    horaInicio: mr.horaInicio ?? "",
    dirFin: mr.dirFin ?? "",
    horaFin: mr.horaFin ?? "",
    distPavimentada: mr.distPavimentada,
    distNoPavimentada: mr.distNoPavimentada,
    frecuencia: mr.frecuencia,
    diasFrecuencia: mr.diasFrecuencia,
    estacionTransferencia: mr.estacionTransferencia,
    tipoBarrido: mr.tipoBarrido,
  };
}

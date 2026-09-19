// types/recycler.ts
import type { Municipio } from "./geo";

// ============================================================
// CATÁLOGOS
// ============================================================

// Confirmado con Prisma schema: ClasificacionRecycler = NUEVO | REGULAR | A_QUITAR
// (ACTIVO es EstadoVinculacion, no clasificación — corregido desde la versión anterior)
export type Clasificacion = "NUEVO" | "REGULAR" | "A_QUITAR";

export const CLASIFICACION_LABELS: Record<Clasificacion, string> = {
  NUEVO: "Nuevo",
  REGULAR: "Regular",
  A_QUITAR: "A quitar",
};

export const CLASIFICACION_COLORS: Record<Clasificacion, string> = {
  NUEVO: "bg-blue-100 text-blue-800",
  REGULAR: "bg-emerald-100 text-emerald-800",
  A_QUITAR: "bg-amber-100 text-amber-800",
};

// EstadoVinculacion — solo para lectura/display; no se envía en el form.
// INACTIVO = desvinculado (soft-delete del backend: deletedAt + estadoVinculacion)
export type EstadoVinculacion = "ACTIVO" | "INACTIVO";

// Tipo de documento de identidad — antes se asumía siempre cédula
// colombiana; ahora cubre también extranjeros (venezolanos en particular,
// el caso más frecuente hoy) y otros casos. Confirmado con el enum
// TipoDocumento del schema de Prisma.
export type TipoDocumento =
  "CEDULA_CIUDADANIA" | "CEDULA_EXTRANJERIA" | "CEDULA_VENEZOLANA" | "PASAPORTE" | "OTRO";

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  CEDULA_CIUDADANIA: "Cédula de ciudadanía",
  CEDULA_EXTRANJERIA: "Cédula de extranjería",
  CEDULA_VENEZOLANA: "Cédula venezolana",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
};

// Los 6 reportes exportables — censados/no_censados y con_ruta/sin_ruta
// coinciden con dimensiones de filtro de la tabla; desvinculados también,
// aunque ahí se expresa como un valor de "estado" en vez de su propia
// pestaña (ver EstadoFiltro en AdminRecyclers.tsx).
export type TipoExportRecyclers =
  "todos" | "desvinculados" | "censados" | "no_censados" | "con_ruta" | "sin_ruta";

export const TIPOS_EXPORT_RECYCLERS: { tipo: TipoExportRecyclers; label: string }[] = [
  { tipo: "todos", label: "Todos (activos)" },
  { tipo: "desvinculados", label: "Desvinculados" },
  { tipo: "censados", label: "Censados" },
  { tipo: "no_censados", label: "Sin censar" },
  { tipo: "con_ruta", label: "Con ruta" },
  { tipo: "sin_ruta", label: "Sin ruta" },
];

// ============================================================
// RELACIONES — forma en que el backend las devuelve mapeadas
// ============================================================

// El backend ya aplana la relación M:N en el service.findAll():
//   barrios: r.barrios.map((b) => ({ barrioId: b.barrioId, nombreBarrio: b.barrio?.nombre ?? '' }))
//   microrrutas: r.microrrutas.map((m) => ({ id: m.microrruta.id, nombre: m.microrruta.nombre }))
// Por eso los tipos del front reflejan esa estructura aplanada, no la del join crudo de Prisma.

export interface BarrioResumen {
  barrioId: string;
  // Confirmado: el backend hace join con Barrios y devuelve el nombre
  // aplanado (siempre string, nunca undefined — el service usa `?? ''`
  // como respaldo si el barrio no existiera).
  nombreBarrio: string;
}

export interface MicrorrutaResumen {
  id: number;
  nombre: string;
}

// ============================================================
// ENTIDAD (forma de la respuesta del backend)
// ============================================================

export interface Recycler {
  id: number;
  tipoDocumento: TipoDocumento;
  cedula: string;
  nombreCompleto: string;
  censado: boolean;
  clasificacion: Clasificacion;
  // Aclaración libre sobre la ubicación, además de los barrios asignados
  // — p. ej. "Solo el Conjunto Villa Alegre" o "Sector Juan Mina, no
  // pertenece a ningún barrio formal". Un solo campo general por
  // reciclador, no uno por cada barrio. null cuando no se ha escrito nada.
  detalleUbicacion: string | null;
  estadoVinculacion: EstadoVinculacion;
  barrios: BarrioResumen[];
  microrrutas: MicrorrutaResumen[];
  // Fecha de ingreso real del reciclador a la organización — editable,
  // distinta de createdAt (que es el timestamp de auditoría del registro).
  // Default en BD: 1 de enero del año en curso.
  fechaIngreso: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// FILTROS (parámetros de query en GET /recyclers)
// ============================================================

// Reemplaza al antiguo RecyclerTab (una sola pestaña excluyente): ahora
// son dimensiones independientes que se combinan entre sí — se puede
// filtrar por ruta, censo, clasificación y barrio a la vez, y la tabla
// muestra la intersección de todo lo activo.
export interface RecyclersFilters {
  // true = ver el histórico de desvinculados; false/undefined = solo activos.
  desvinculados?: boolean;
  rutas?: "con_ruta" | "sin_ruta";
  clasificacion?: Clasificacion;
  censado?: boolean;
  // identificador del barrio (mismo campo que usan los selects de barrio
  // del resto de la app).
  barrioId?: string;
  // "BARRANQUILLA" | "PUERTO_COLOMBIA" — independiente de barrioId,
  // combinable con el resto. "SIN_CIUDAD" = recicladores sin ningún barrio
  // asignado (la ciudad de un reciclador se deduce de sus barrios).
  municipio?: Municipio | "SIN_CIUDAD";
  // Coincide contra nombre, cédula, nombre de barrio asignado y nombre de
  // ruta asignada — no solo nombre/cédula como antes.
  search?: string;
}

// ============================================================
// FORMULARIO / PAYLOADS
// ============================================================

export interface RecyclerFormValues {
  tipoDocumento: TipoDocumento;
  cedula: string;
  nombreCompleto: string;
  censado: boolean;
  clasificacion: Clasificacion;
  detalleUbicacion: string;
  // Fecha de ingreso — se envía como "YYYY-MM-DD". El backend convierte a Date.
  fechaIngreso: string;
  // Se envían al backend como arrays de IDs
  barriosIds: string[];
  microrrutasIds: number[];
}

export type RecyclerCreatePayload = RecyclerFormValues;

// Confirmado: PUT /admin/recyclers/:id implementado con UpdateRecyclerDto
// (PartialType de CreateRecyclerDto). Todos los campos son opcionales.
export type RecyclerUpdatePayload = RecyclerFormValues;

// ============================================================
// HELPERS
// ============================================================

const FECHA_INGRESO_DEFAULT = new Date().toISOString().split("T")[0];

export function toRecyclerFormValues(recycler: Recycler): RecyclerFormValues {
  return {
    tipoDocumento: recycler.tipoDocumento,
    cedula: recycler.cedula,
    nombreCompleto: recycler.nombreCompleto,
    censado: recycler.censado,
    clasificacion: recycler.clasificacion,
    detalleUbicacion: recycler.detalleUbicacion ?? "",
    fechaIngreso: recycler.fechaIngreso
      ? recycler.fechaIngreso.split("T")[0]
      : FECHA_INGRESO_DEFAULT,
    // barrioId es el código que usa el <select> de barrios en el formulario.
    barriosIds: recycler.barrios.map((b) => b.barrioId),
    microrrutasIds: recycler.microrrutas.map((m) => m.id),
  };
}

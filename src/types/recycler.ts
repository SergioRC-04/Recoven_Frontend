// types/recycler.ts

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

export type RecyclerTab =
  "todos" | "con_ruta" | "sin_ruta" | "nuevos" | "a_quitar" | "desvinculados";

export const RECYCLER_TABS: { id: RecyclerTab; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "con_ruta", label: "Con Ruta" },
  { id: "sin_ruta", label: "Sin Ruta" },
  { id: "nuevos", label: "Nuevos" },
  { id: "a_quitar", label: "A Quitar" },
  { id: "desvinculados", label: "Desvinculados (Histórico)" },
];

// Los 6 reportes exportables — distintos de RecyclerTab: no incluyen
// "nuevos"/"a_quitar" (no se pidieron como export) pero sí "censados"/
// "no_censados" (que no son pestañas de la tabla, solo filtros de export).
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
  cedula: string;
  nombreCompleto: string;
  censado: boolean;
  clasificacion: Clasificacion;
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
// FILTROS (parámetros de query en GET /admin/recyclers)
// ============================================================

export interface RecyclersFilters {
  tab?: RecyclerTab;
  censado?: boolean;
  search?: string;
}

// ============================================================
// FORMULARIO / PAYLOADS
// ============================================================

export interface RecyclerFormValues {
  cedula: string;
  nombreCompleto: string;
  censado: boolean;
  clasificacion: Clasificacion;
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
    cedula: recycler.cedula,
    nombreCompleto: recycler.nombreCompleto,
    censado: recycler.censado,
    clasificacion: recycler.clasificacion,
    fechaIngreso: recycler.fechaIngreso
      ? recycler.fechaIngreso.split("T")[0]
      : FECHA_INGRESO_DEFAULT,
    // barrioId es el código que usa el <select> de barrios en el formulario.
    barriosIds: recycler.barrios.map((b) => b.barrioId),
    microrrutasIds: recycler.microrrutas.map((m) => m.id),
  };
}

// types/usuario.ts
//
// Formas confirmadas contra el modelo UsuarioMicrorruta y
// Microrruta.guiaCalles del backend (ver usuarios-microrruta.service.ts y
// microrrutas-vias.util.ts). normalizeGuiaCalles se mantiene defensivo
// igual que normalizeMicrorrutasGeoJson por si el formato cambia, aunque
// la forma real ya se conoce: array de { orden, texto, abrTexto }.

export interface UsuarioMicrorrutaProperties {
  id: number;
  microrrutaId: number;
  direccion: string;
  poliza: string;
  // Máximo 500 caracteres, validado en el formulario (ver
  // UsuarioMicrorrutaFormModal.tsx) — el backend probablemente también lo
  // valide, pero no hay confirmación todavía.
  detalles: string | null;
  createdAt?: string;
}

export interface UsuarioMicrorrutaFormValues {
  direccion: string;
  poliza: string;
  detalles: string;
}

export interface UsuarioMicrorrutaCreatePayload extends UsuarioMicrorrutaFormValues {
  microrrutaId: number;
}

export type UsuarioMicrorrutaUpdatePayload = UsuarioMicrorrutaFormValues;

export function toUsuarioMicrorrutaFormValues(
  u: UsuarioMicrorrutaProperties
): UsuarioMicrorrutaFormValues {
  return {
    direccion: u.direccion,
    poliza: u.poliza,
    detalles: u.detalles ?? "",
  };
}

// ============================================================
// GUÍA DE CALLES (ya calculada por el backend)
// ============================================================

export interface GuiaCallesPaso {
  orden: number;
  instruccion: string;
}

// Adapta la respuesta del backend a una lista de pasos numerados, sin
// asumir una forma exacta todavía: admite un array plano de strings, un
// array de objetos con distintos nombres de campo posibles, o un objeto
// envolvente con la lista en `pasos`/`guia`/`steps`. Cualquier forma no
// reconocida cae a una lista vacía (con warning) en vez de romper la
// página — mismo criterio defensivo que normalizeMicrorrutasGeoJson.
export function normalizeGuiaCalles(raw: unknown): GuiaCallesPaso[] {
  let lista: unknown[] | null = null;

  if (Array.isArray(raw)) {
    lista = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const candidata = obj.pasos ?? obj.guia ?? obj.steps ?? obj.guiaCalles;
    if (Array.isArray(candidata)) lista = candidata;
  }

  if (!lista) {
    console.warn(
      "[usuarios] La guía de calles devuelta por el backend no tiene una forma reconocida " +
        "(ni array plano ni objeto con pasos/guia/steps). Se muestra una guía vacía.",
      raw
    );
    return [];
  }

  return lista.map((item, index) => {
    if (typeof item === "string") {
      return { orden: index + 1, instruccion: item };
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const instruccion =
        obj.instruccion ?? obj.texto ?? obj.descripcion ?? obj.paso ?? obj.text ?? "";
      const orden = typeof obj.orden === "number" ? obj.orden : index + 1;
      return { orden, instruccion: String(instruccion) };
    }
    return { orden: index + 1, instruccion: String(item) };
  });
}

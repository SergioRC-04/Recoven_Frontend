// components/admin/RecyclerFormModal.tsx
import { useEffect, useState, type FormEvent } from "react";
import { FaTimes, FaSpinner, FaRecycle } from "react-icons/fa";
import { createRecycler, updateRecycler, exportarCertificado } from "../../services/recyclers";
import { descargarBlob } from "../../lib/descargarBlob";
import { getMicrorrutasList } from "../../services/microrutas";
import { getBarriosList } from "../../services/geo";
import type { Barrio } from "../../types/geo";
import {
  CLASIFICACION_LABELS,
  TIPO_DOCUMENTO_LABELS,
  toRecyclerFormValues,
  type Clasificacion,
  type Recycler,
  type RecyclerFormValues,
  type TipoDocumento,
} from "../../types/recycler";

type RecyclerFormModalProps =
  | { mode: "create"; onClose: () => void; onSaved: () => void }
  | { mode: "edit"; recycler: Recycler; onClose: () => void; onSaved: () => void };

const FECHA_INGRESO_DEFAULT = new Date().toISOString().split("T")[0];

const EMPTY_VALUES: RecyclerFormValues = {
  tipoDocumento: "CEDULA_CIUDADANIA",
  cedula: "",
  nombreCompleto: "",
  censado: false,
  clasificacion: "NUEVO",
  detalleUbicacion: "",
  fechaIngreso: FECHA_INGRESO_DEFAULT,
  barriosIds: [],
  microrrutasIds: [],
};

export default function RecyclerFormModal(props: RecyclerFormModalProps) {
  const { mode, onClose, onSaved } = props;
  const initial = props.mode === "edit" ? toRecyclerFormValues(props.recycler) : EMPTY_VALUES;

  const [values, setValues] = useState<RecyclerFormValues>(initial);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [microrrutas, setMicrorrutas] = useState<{ id: number; nombre: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [barriosData, microrrutasData] = await Promise.all([
          getBarriosList(),
          getMicrorrutasList(),
        ]);
        const barriosOrdenados = [...barriosData].sort((a, b) =>
          a.nombre_barrio.localeCompare(b.nombre_barrio, "es")
        );
        const microrrutasOrdenadas = [...microrrutasData].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es")
        );
        setBarrios(barriosOrdenados);
        setMicrorrutas(microrrutasOrdenadas);
      } catch (err) {
        console.error("Error cargando opciones del formulario:", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  const update = <K extends keyof RecyclerFormValues>(key: K, value: RecyclerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  // Handlers para checkboxes de barrios y microrrutas (toggle)
  const toggleBarrio = (id: string) => {
    setValues((prev) => {
      const current = prev.barriosIds;
      const index = current.indexOf(id);
      if (index >= 0) {
        return { ...prev, barriosIds: current.filter((b) => b !== id) };
      } else {
        return { ...prev, barriosIds: [...current, id] };
      }
    });
  };

  const toggleMicrorruta = (id: number) => {
    setValues((prev) => {
      const current = prev.microrrutasIds;
      const index = current.indexOf(id);
      if (index >= 0) {
        return { ...prev, microrrutasIds: current.filter((m) => m !== id) };
      } else {
        return { ...prev, microrrutasIds: [...current, id] };
      }
    });
  };

  const descargarCertificado = async (id: number, nombreCompleto: string) => {
    try {
      const blob = await exportarCertificado(id);
      descargarBlob(blob, `certificado-${nombreCompleto.replace(/\s+/g, "_")}.pdf`);
    } catch (error) {
      console.error("Error descargando certificado:", error);
      alert("No se pudo descargar el certificado.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.cedula.trim() || !values.nombreCompleto.trim()) {
      setError("Cédula y nombre completo son obligatorios.");
      return;
    }
    setLoading(true);

    let creado: Recycler | null = null;
    try {
      if (props.mode === "edit") {
        await updateRecycler(props.recycler.id, values);
      } else {
        creado = await createRecycler(values);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el reciclador.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onSaved();
    onClose();

    if (creado) {
      if (
        confirm(
          `Reciclador creado correctamente. ¿Deseas descargar su certificado de vinculación ahora?`
        )
      ) {
        await descargarCertificado(creado.id, creado.nombreCompleto);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FaRecycle className="text-emerald-600" />
            {mode === "edit" ? "Editar Reciclador" : "Nuevo Reciclador"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-bold text-gray-700">Tipo de documento</label>
              <select
                value={values.tipoDocumento}
                onChange={(e) => update("tipoDocumento", e.target.value as TipoDocumento)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(TIPO_DOCUMENTO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Número de documento</label>
              <input
                type="text"
                required
                value={values.cedula}
                onChange={(e) => update("cedula", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-gray-700">Nombre completo</label>
              <input
                type="text"
                required
                value={values.nombreCompleto}
                onChange={(e) => update("nombreCompleto", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">Clasificación</label>
              <select
                value={values.clasificacion}
                onChange={(e) => update("clasificacion", e.target.value as Clasificacion)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(CLASIFICACION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700">Fecha de ingreso</label>
              <input
                type="date"
                required
                value={values.fechaIngreso}
                onChange={(e) => update("fechaIngreso", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="censado"
                checked={values.censado}
                onChange={(e) => update("censado", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="censado" className="text-sm font-bold text-gray-700">
                Censado
              </label>
            </div>
          </div>

          {loadingOptions ? (
            <div className="py-4 text-center text-sm text-gray-400">
              <FaSpinner className="mr-2 inline animate-spin" /> Cargando barrios y rutas...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Barrios: lista de checkboxes con scroll */}
              <div>
                <label className="block text-sm font-bold text-gray-700">Barrios asignados</label>
                <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-300 p-2">
                  {barrios.map((b) => (
                    <label
                      key={b.identificador}
                      className="flex items-center gap-2 py-1 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={values.barriosIds.includes(b.identificador)}
                        onChange={() => toggleBarrio(b.identificador)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{b.nombre_barrio}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Haz clic en cada barrio para seleccionarlo o deseleccionarlo.
                </p>
              </div>

              {/* Microrrutas: lista de checkboxes con scroll */}
              <div>
                <label className="block text-sm font-bold text-gray-700">
                  Microrrutas asignadas
                </label>
                <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-300 p-2">
                  {microrrutas.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 py-1 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={values.microrrutasIds.includes(m.id)}
                        onChange={() => toggleMicrorruta(m.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{m.nombre}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Haz clic en cada microrruta para seleccionarla o deseleccionarla.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700">
              Detalle adicional de ubicación
            </label>
            <input
              type="text"
              maxLength={255}
              value={values.detalleUbicacion}
              onChange={(e) => update("detalleUbicacion", e.target.value)}
              placeholder='Ej: "Solo el Conjunto Villa Alegre" o "Sector Juan Mina, no pertenece a ningún barrio formal"'
              className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Opcional — solo para aclarar algo que los barrios asignados arriba no alcanzan a
              precisar (un conjunto o edificio específico, un sector fuera de los barrios formales,
              etc.).
            </p>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-200 px-6 py-2 font-bold text-gray-700 transition hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-70"
            >
              {loading ? <FaSpinner className="animate-spin" /> : null}
              {mode === "edit" ? "Guardar Cambios" : "Crear Reciclador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

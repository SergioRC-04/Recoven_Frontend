// components/admin/MicrorrutaFormModal.tsx
import { useState, type FormEvent, type ReactNode } from "react";
import { FaTimes, FaSpinner, FaRoute } from "react-icons/fa";
import { createMicrorruta, updateMicrorruta } from "../../services/microrutas";
import {
  TIPO_MICRORRUTA_LABELS,
  TIPO_BARRIDO_LABELS,
  ESTACION_TRANSFERENCIA_LABELS,
  DIAS_SEMANA,
  DIA_EVENTUAL,
  CAMPO_AYUDA,
  requiereHorariosYDirecciones,
  requiereDistanciasViales,
  aplicaTipoBarrido,
  type LineStringGeoJson,
  type MicrorrutaFormValues,
} from "../../types/microrruta";
import FieldHelp from "./FieldHelp";

type MicrorrutaFormModalProps =
  | {
      mode: "create";
      geojson: LineStringGeoJson;
      // Distancia total del trazo dibujado (km), calculada con ol/sphere al
      // terminar de dibujar. "Distancia pavimentada" se deriva de este valor
      // (total - no pavimentada) — no se guarda de forma independiente.
      distanciaTotalKm: number;
      onClose: () => void;
      onSaved: () => void;
    }
  | {
      mode: "edit";
      microrrutaId: number;
      initialValues: MicrorrutaFormValues;
      onClose: () => void;
      onSaved: () => void;
    };

const EMPTY_VALUES: MicrorrutaFormValues = {
  nombre: "",
  tipo: 6, // Recolección de residuos aprovechables — la más usada, por defecto
  fechaOperacion: new Date().toISOString().split("T")[0],
  dirInicio: "",
  horaInicio: "",
  dirFin: "",
  horaFin: "",
  distPavimentada: 0,
  distNoPavimentada: 0,
  frecuencia: 1,
  diasFrecuencia: "",
  estacionTransferencia: 2,
  tipoBarrido: 1,
};

function parseDias(diasFrecuencia: string): Set<number> {
  return new Set(
    diasFrecuencia
      .split("-")
      .map((d) => parseInt(d, 10))
      .filter((d) => !isNaN(d))
  );
}

// Label con ícono de ayuda inline, para no repetir el mismo markup 13 veces.
function FieldLabel({ children, help }: { children: ReactNode; help: string }) {
  return (
    <label className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
      {children}
      <FieldHelp text={help} />
    </label>
  );
}

export default function MicrorrutaFormModal(props: MicrorrutaFormModalProps) {
  const { mode, onClose, onSaved } = props;
  const initial = props.mode === "edit" ? props.initialValues : EMPTY_VALUES;

  const [values, setValues] = useState<MicrorrutaFormValues>(initial);
  const [dias, setDias] = useState<Set<number>>(parseDias(initial.diasFrecuencia));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tres reglas independientes del SUI (ver types/microrruta.ts para el
  // texto exacto de la resolución de cada una):
  const sinHorariosNiDirecciones = !requiereHorariosYDirecciones(values.tipo); // solo tipo 4 y 5
  const sinDistanciasViales = !requiereDistanciasViales(values.tipo); // tipo 3, 4 y 5
  const mostrarTipoBarrido = aplicaTipoBarrido(values.tipo); // solo tipo 2 y 3
  const esEventual = dias.has(DIA_EVENTUAL);

  // Al crear, conocemos la distancia total real del trazo (calculada al
  // dibujar). "Pavimentada" se deriva de ese total en vez de guardarse por
  // separado en el estado: pavimentada = total - no_pavimentada. Se calcula
  // aquí, durante el render, en vez de sincronizarla con un efecto — es la
  // misma lección que ya aplicamos con los filtros de localidad/barrio: no
  // usar un efecto para una derivación síncrona que no depende de nada
  // asíncrono.
  const distanciaTotalKm = props.mode === "create" ? props.distanciaTotalKm : null;
  const distPavimentadaDerivada =
    distanciaTotalKm !== null
      ? Math.max(0, Math.round((distanciaTotalKm - values.distNoPavimentada) * 100) / 100)
      : values.distPavimentada;

  const update = <K extends keyof MicrorrutaFormValues>(key: K, value: MicrorrutaFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDia = (dia: number) => {
    setDias((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (dias.size === 0) {
      setError("Seleccione al menos un día de frecuencia (o Eventual).");
      return;
    }

    const diasFrecuencia = Array.from(dias)
      .sort((a, b) => a - b)
      .join("-");

    const payload = {
      ...values,
      diasFrecuencia,
      dirInicio: sinHorariosNiDirecciones ? "" : values.dirInicio,
      horaInicio: sinHorariosNiDirecciones ? "" : values.horaInicio,
      dirFin: sinHorariosNiDirecciones ? "" : values.dirFin,
      horaFin: sinHorariosNiDirecciones ? "" : values.horaFin,
      distPavimentada: sinDistanciasViales ? 0 : distPavimentadaDerivada,
      distNoPavimentada: sinDistanciasViales ? 0 : values.distNoPavimentada,
      // Tipo de barrido (campo 13 del SUI) solo aplica a tipo 2 y 3 — para
      // el resto se envía null, no un valor por defecto que en el reporte
      // Excel se vería como un dato real cuando en realidad no aplica.
      tipoBarrido: mostrarTipoBarrido ? values.tipoBarrido : null,
    };

    setLoading(true);
    try {
      if (props.mode === "edit") {
        await updateMicrorruta(props.microrrutaId, payload);
      } else {
        await createMicrorruta({ ...payload, geojson: props.geojson });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar la microrruta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FaRoute className="text-emerald-600" />
            {mode === "edit" ? "Editar Microrruta" : "Nueva Microrruta"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes className="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel help={CAMPO_AYUDA.nombre}>Nombre (único)</FieldLabel>
              <input
                type="text"
                required
                value={values.nombre}
                onChange={(e) => update("nombre", e.target.value)}
                placeholder="MR-RECOLECCION-01"
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <FieldLabel help={CAMPO_AYUDA.tipo}>Tipo</FieldLabel>
              <select
                value={values.tipo}
                onChange={(e) => update("tipo", parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(TIPO_MICRORRUTA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value}. {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel help={CAMPO_AYUDA.fechaOperacion}>Fecha de operación</FieldLabel>
              <input
                type="date"
                required
                value={values.fechaOperacion}
                onChange={(e) => update("fechaOperacion", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {sinHorariosNiDirecciones && (
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
              Este tipo no requiere direcciones ni horas de recorrido — esos campos se deshabilitan
              y se guardan vacíos.
            </p>
          )}
          {sinDistanciasViales && (
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
              Este tipo no requiere distancias de vía — se guardan en 0.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel help={CAMPO_AYUDA.dirInicio}>Dirección de inicio</FieldLabel>
              <input
                type="text"
                disabled={sinHorariosNiDirecciones}
                value={values.dirInicio}
                onChange={(e) => update("dirInicio", e.target.value)}
                placeholder="Calle 45 # 43-10"
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <FieldLabel help={CAMPO_AYUDA.horaInicio}>Hora de inicio</FieldLabel>
              <input
                type="time"
                disabled={sinHorariosNiDirecciones}
                value={values.horaInicio}
                onChange={(e) => update("horaInicio", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <FieldLabel help={CAMPO_AYUDA.dirFin}>Dirección de fin</FieldLabel>
              <input
                type="text"
                disabled={sinHorariosNiDirecciones}
                value={values.dirFin}
                onChange={(e) => update("dirFin", e.target.value)}
                placeholder="Calle 45 # 50-20"
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <FieldLabel help={CAMPO_AYUDA.horaFin}>Hora de fin</FieldLabel>
              <input
                type="time"
                disabled={sinHorariosNiDirecciones}
                value={values.horaFin}
                onChange={(e) => update("horaFin", e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            {!sinDistanciasViales && distanciaTotalKm !== null && (
              <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-800 sm:col-span-2">
                Distancia total del trazo dibujado: {distanciaTotalKm.toFixed(2)} km. La distancia
                pavimentada se calcula automáticamente como el total menos lo que indiques en no
                pavimentada.
              </p>
            )}

            <div>
              <FieldLabel help={CAMPO_AYUDA.distPavimentada}>
                Distancia pavimentada (km)
                {distanciaTotalKm !== null && !sinDistanciasViales && (
                  <span className="font-normal text-gray-400"> — calculada</span>
                )}
              </FieldLabel>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={sinDistanciasViales || distanciaTotalKm !== null}
                value={sinDistanciasViales ? 0 : distPavimentadaDerivada}
                onChange={(e) => update("distPavimentada", parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>
            <div>
              <FieldLabel help={CAMPO_AYUDA.distNoPavimentada}>
                Distancia no pavimentada (km)
              </FieldLabel>
              <input
                type="number"
                step="0.01"
                min="0"
                max={distanciaTotalKm ?? undefined}
                disabled={sinDistanciasViales}
                value={sinDistanciasViales ? 0 : values.distNoPavimentada}
                onChange={(e) => {
                  const raw = parseFloat(e.target.value) || 0;
                  const clamped =
                    distanciaTotalKm !== null
                      ? Math.max(0, Math.min(raw, distanciaTotalKm))
                      : Math.max(0, raw);
                  update("distNoPavimentada", clamped);
                }}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div>
              <FieldLabel help={CAMPO_AYUDA.frecuencia}>Frecuencia (veces por semana)</FieldLabel>
              <input
                type="number"
                min="0"
                step={esEventual ? "0.1" : "1"}
                required
                value={values.frecuencia}
                onChange={(e) => update("frecuencia", parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {esEventual && (
                <p className="mt-1 text-xs text-gray-400">
                  Frecuencia Eventual: se admiten valores decimales.
                </p>
              )}
            </div>
            <div>
              <FieldLabel help={CAMPO_AYUDA.tipoBarrido}>Tipo de barrido</FieldLabel>
              <select
                value={values.tipoBarrido}
                disabled={!mostrarTipoBarrido}
                onChange={(e) => update("tipoBarrido", parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
              >
                {Object.entries(TIPO_BARRIDO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {!mostrarTipoBarrido && (
                <p className="mt-1 text-xs text-gray-400">
                  Solo aplica para tipo 2 (Barrido y limpieza) o 3 (Limpieza de playas).
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <FieldLabel help={CAMPO_AYUDA.estacionTransferencia}>
                Estación de transferencia
              </FieldLabel>
              <select
                value={values.estacionTransferencia}
                onChange={(e) => update("estacionTransferencia", parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-xl border border-gray-300 p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(ESTACION_TRANSFERENCIA_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <FieldLabel help={CAMPO_AYUDA.diasFrecuencia}>Días de frecuencia</FieldLabel>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.value}
                  type="button"
                  title={dia.full}
                  onClick={() => toggleDia(dia.value)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                    dias.has(dia.value)
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {dia.label}
                </button>
              ))}
              <button
                type="button"
                title="Eventual — sin días fijos"
                onClick={() => toggleDia(DIA_EVENTUAL)}
                className={`flex h-10 items-center justify-center rounded-full px-3 text-xs font-bold transition ${
                  esEventual
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                Eventual
              </button>
            </div>
            {dias.size > 0 && (
              <p className="mt-1.5 text-xs text-gray-400">
                Se guardará como:{" "}
                {Array.from(dias)
                  .sort((a, b) => a - b)
                  .join("-")}
              </p>
            )}
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
              {mode === "edit" ? "Guardar Cambios" : "Crear Microrruta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

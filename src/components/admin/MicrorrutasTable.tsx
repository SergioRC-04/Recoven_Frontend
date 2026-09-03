// components/admin/MicrorrutasTable.tsx
import {
  FaEdit,
  FaTrash,
  FaDrawPolygon,
  FaCheckCircle,
  FaFilePdf,
  FaSpinner,
} from "react-icons/fa";
import { formatearDiasFrecuenciaCorto, type MicrorrutaProperties } from "../../types/microrruta";

// Formatea la fecha directo desde el texto ISO, sin construir un objeto
// Date — new Date(iso).toLocaleDateString() convierte a la zona horaria
// local, y una fecha en UTC medianoche (como llega del backend) cae en el
// día anterior en Colombia (UTC-5). Como este campo es una fecha de
// calendario, no un instante preciso, se evita ese corrimiento formateando
// el texto tal cual — mismo enfoque que ya usa toMicrorrutaFormValues().
function formatearFecha(fechaISO: string): string {
  const [fecha] = fechaISO.split("T");
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

interface MicrorrutasTableProps {
  microrrutas: MicrorrutaProperties[];
  editingGeometriaId: number | null;
  disabled: boolean;
  // id de la microrruta cuyo PDF se está generando actualmente (muestra un
  // spinner en su fila). null = ninguna en proceso.
  generandoReporteId: number | null;
  // id de la microrruta resaltada en el mapa (clic en su trazo). null =
  // ninguna seleccionada.
  selectedId: number | null;
  // Nombre del trabajador asignado a cada microrruta, por id — resuelto en
  // el padre (misma búsqueda inversa que ya usa el generador de PDF sobre
  // la lista completa de recicladores).
  trabajadorPorMicrorrutaId: Map<number, string>;
  onEdit: (microrruta: MicrorrutaProperties) => void;
  onEditGeometria: (microrruta: MicrorrutaProperties) => void;
  onDelete: (microrruta: MicrorrutaProperties) => void;
  onGenerarReporte: (microrruta: MicrorrutaProperties) => void;
  // Clic en la fila (fuera de los botones de acción) para seleccionar esa
  // microrruta — resalta su trazo en el mapa. Clic en la ya seleccionada
  // la deselecciona (se decide en el padre, este componente solo avisa).
  onSelectRow: (microrruta: MicrorrutaProperties) => void;
}

export default function MicrorrutasTable({
  microrrutas,
  editingGeometriaId,
  disabled,
  generandoReporteId,
  selectedId,
  trabajadorPorMicrorrutaId,
  onEdit,
  onEditGeometria,
  onDelete,
  onGenerarReporte,
  onSelectRow,
}: MicrorrutasTableProps) {
  // La seleccionada se muestra primero; el resto conserva su orden
  // original. Sin selección, es exactamente el array que llegó — no se
  // reordena hasta que haya algo que traer al frente.
  const microrrutasOrdenadas = selectedId
    ? [
        ...microrrutas.filter((mr) => mr.id === selectedId),
        ...microrrutas.filter((mr) => mr.id !== selectedId),
      ]
    : microrrutas;

  const renderTrabajador = (mr: MicrorrutaProperties) => {
    const nombre = trabajadorPorMicrorrutaId.get(mr.id);
    return nombre ? nombre : <span className="text-gray-300">Sin asignar</span>;
  };

  // El barrio ya viene calculado y guardado por el backend (MicrorrutaBarrio)
  // — una ruta puede tener más de uno si cruza de un barrio a otro de
  // verdad, no solo si toca el límite de paso.
  const renderBarrio = (mr: MicrorrutaProperties) => {
    if (mr.barrios.length === 0) return <span className="text-gray-300">—</span>;
    return mr.barrios.map((b) => b.barrioNombre).join(", ");
  };

  // Botones de acción — compartidos entre la fila de tabla (desktop) y la
  // tarjeta (mobile) para no duplicar esta lógica dos veces.
  const renderAcciones = (mr: MicrorrutaProperties, isEditingThis: boolean) => (
    <>
      <button
        onClick={() => onEdit(mr)}
        disabled={disabled}
        title="Editar datos"
        className="text-blue-600 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FaEdit />
      </button>
      <button
        onClick={() => onEditGeometria(mr)}
        disabled={disabled}
        title="Editar trazo en el mapa"
        className={`transition hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-40 ${
          isEditingThis ? "text-amber-700" : "text-amber-500"
        }`}
      >
        {isEditingThis ? <FaCheckCircle /> : <FaDrawPolygon />}
      </button>
      <span className="text-xs text-gray-300">|</span>
      <button
        onClick={() => onDelete(mr)}
        disabled={disabled}
        title="Eliminar"
        className="text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FaTrash />
      </button>
      <span className="text-xs text-gray-300">|</span>
      <button
        onClick={() => onGenerarReporte(mr)}
        disabled={disabled || generandoReporteId === mr.id}
        title="Generar hoja de ruta (PDF)"
        className="text-emerald-600 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {generandoReporteId === mr.id ? <FaSpinner className="animate-spin" /> : <FaFilePdf />}
      </button>
    </>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Tabla normal — solo desde md hacia arriba */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4 text-center">Tipo</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Días</th>
              <th className="p-4">Trabajador</th>
              <th className="p-4">Barrio</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {microrrutas.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-400">
                  No hay microrrutas registradas con este filtro.
                </td>
              </tr>
            ) : (
              microrrutasOrdenadas.map((mr) => {
                const isEditingThis = editingGeometriaId === mr.id;
                const isSelected = selectedId === mr.id;
                return (
                  <tr
                    key={mr.id}
                    onClick={() => onSelectRow(mr)}
                    className={`cursor-pointer transition ${
                      isEditingThis
                        ? "bg-amber-50/70"
                        : isSelected
                          ? "bg-red-50/70 ring-1 ring-red-300 ring-inset"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="p-4 font-bold text-gray-900">{mr.nombre}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                        {mr.tipo}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {formatearFecha(mr.fechaOperacion)}
                    </td>
                    <td className="p-4 text-xs font-semibold text-gray-600">
                      {formatearDiasFrecuenciaCorto(mr.diasFrecuencia)}
                    </td>
                    <td className="max-w-40 truncate p-4 text-xs text-gray-600">
                      {renderTrabajador(mr)}
                    </td>
                    <td className="max-w-72 p-4 text-xs whitespace-normal text-gray-600">
                      {renderBarrio(mr)}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3">
                        {renderAcciones(mr, isEditingThis)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas — solo en mobile. La tarjeta completa sigue seleccionando
          la microrruta al tocarla, igual que la fila en desktop; el bloque
          de acciones lleva su propio stopPropagation por la misma razón. */}
      <div className="divide-y divide-gray-100 md:hidden">
        {microrrutas.length === 0 ? (
          <p className="py-6 text-center text-gray-400">
            No hay microrrutas registradas con este filtro.
          </p>
        ) : (
          microrrutasOrdenadas.map((mr) => {
            const isEditingThis = editingGeometriaId === mr.id;
            const isSelected = selectedId === mr.id;
            return (
              <div
                key={mr.id}
                onClick={() => onSelectRow(mr)}
                className={`cursor-pointer p-4 transition ${
                  isEditingThis
                    ? "bg-amber-50/70"
                    : isSelected
                      ? "bg-red-50/70 ring-1 ring-red-300 ring-inset"
                      : "active:bg-gray-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                    {mr.tipo}
                  </span>
                  <p className="truncate font-bold text-gray-900">{mr.nombre}</p>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>{formatearFecha(mr.fechaOperacion)}</span>
                  <span className="font-semibold text-gray-600">
                    {formatearDiasFrecuenciaCorto(mr.diasFrecuencia)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block font-bold tracking-wide text-gray-400 uppercase">
                      Trabajador
                    </span>
                    <span className="text-gray-600">{renderTrabajador(mr)}</span>
                  </div>
                  <div>
                    <span className="block font-bold tracking-wide text-gray-400 uppercase">
                      Barrio
                    </span>
                    <span className="text-gray-600">{renderBarrio(mr)}</span>
                  </div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100 pt-3"
                >
                  {renderAcciones(mr, isEditingThis)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

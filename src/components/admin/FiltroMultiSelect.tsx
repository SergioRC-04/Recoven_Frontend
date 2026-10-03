// components/admin/FiltroMultiSelect.tsx
//
// Reemplaza un <select> de una sola opción cuando el filtro debe admitir
// varias marcadas a la vez (p. ej. Clasificación: Nuevo + Regular). Visual
// y comportamiento equivalentes a un <select> (mismo trigger, se cierra al
// hacer clic afuera), pero el panel desplegado es una lista de checkboxes
// en vez de <option>.
import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

interface OpcionFiltro<T extends string> {
  value: T;
  label: string;
}

interface FiltroMultiSelectProps<T extends string> {
  label: string;
  opciones: OpcionFiltro<T>[];
  seleccionados: Set<T>;
  onChange: (nuevo: Set<T>) => void;
  disabled?: boolean;
  // Texto cuando no hay ninguna opción marcada — por convención, "ninguna
  // marcada" equivale a "sin filtrar por esto" (se ven todas), igual que
  // el "" de los <select> que reemplaza.
  textoTodas?: string;
}

export default function FiltroMultiSelect<T extends string>({
  label,
  opciones,
  seleccionados,
  onChange,
  disabled,
  textoTodas = "Todas",
}: FiltroMultiSelectProps<T>) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [abierto]);

  const toggleOpcion = (value: T) => {
    const siguiente = new Set(seleccionados);
    if (siguiente.has(value)) siguiente.delete(value);
    else siguiente.add(value);
    onChange(siguiente);
  };

  const resumen =
    seleccionados.size === 0
      ? textoTodas
      : seleccionados.size === 1
        ? opciones.find((o) => seleccionados.has(o.value))?.label ?? textoTodas
        : `${seleccionados.size} seleccionadas`;

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-bold tracking-wider text-gray-500 uppercase">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={disabled}
        className="mt-1 flex min-w-[9rem] items-center justify-between gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{resumen}</span>
        <FaChevronDown
          className={`shrink-0 text-xs transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>
      {abierto && (
        <div className="absolute left-0 z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {opciones.map((o) => (
            <label
              key={o.value}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={seleccionados.has(o.value)}
                onChange={() => toggleOpcion(o.value)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

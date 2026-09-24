// components/admin/CerrarCensoModal.tsx
import { useEffect, useState } from "react";
import { FaTimes, FaSpinner, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { previsualizarCierreCenso, cerrarCenso } from "../../services/recyclers";
import { descargarBlob } from "../../lib/descargarBlob";
import type {
  MunicipioCierre,
  CierreCensoPreview,
  CierreCensoResultado,
} from "../../types/recycler";

interface CerrarCensoModalProps {
  municipio: MunicipioCierre;
  onClose: () => void;
  // Se llama tras un cierre exitoso, para que el padre recargue la tabla.
  onCerrado: () => void;
}

const NOMBRE_CIUDAD: Record<MunicipioCierre, string> = {
  BARRANQUILLA: "Barranquilla",
  PUERTO_COLOMBIA: "Puerto Colombia",
};

/**
 * Cierre de censo de una ciudad. Solo debe hacerse cuando llegan los del
 * censo: desvincula a los recicladores "a quitar", pasa los "nuevos" a
 * "regulares" y deja censados a todos los del informe nuevo. No se puede
 * deshacer, así que exige confirmar una casilla antes de habilitar el
 * botón, y muestra antes lo que va a pasar (vista previa).
 */
export default function CerrarCensoModal({ municipio, onClose, onCerrado }: CerrarCensoModalProps) {
  const ciudad = NOMBRE_CIUDAD[municipio];
  const [preview, setPreview] = useState<CierreCensoPreview | null>(null);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);
  const [entiendo, setEntiendo] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [resultado, setResultado] = useState<CierreCensoResultado | null>(null);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    previsualizarCierreCenso(municipio)
      .then((data) => {
        if (!cancelado) setPreview(data);
      })
      .catch((err) => {
        console.error("Error cargando la vista previa del cierre de censo:", err);
        if (!cancelado) setErrorPreview("No se pudo cargar la vista previa.");
      });
    return () => {
      cancelado = true;
    };
  }, [municipio]);

  const handleCerrar = async () => {
    setCerrando(true);
    setErrorCierre(null);
    try {
      const res = await cerrarCenso(municipio);
      setResultado(res);
      onCerrado();
      // El censo ya quedó cerrado; si la descarga local falla, la copia
      // sigue en el enlace del resultado.
      try {
        const respuesta = await fetch(res.url);
        descargarBlob(await respuesta.blob(), res.nombreArchivo);
      } catch (error) {
        console.error("No se pudo descargar automáticamente el Excel del cierre:", error);
      }
    } catch (error) {
      console.error("Error cerrando el censo:", error);
      setErrorCierre(
        error instanceof Error
          ? error.message
          : "No se pudo cerrar el censo. No se aplicó ningún cambio."
      );
    } finally {
      setCerrando(false);
    }
  };

  const fila = (etiqueta: string, valor: number) => (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
      <span className="text-gray-600">{etiqueta}</span>
      <span className="font-black text-gray-900">{valor}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">Cerrar censo — {ciudad}</h2>
          <button
            onClick={onClose}
            disabled={cerrando}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {resultado ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <FaCheckCircle className="mt-0.5 shrink-0" />
              <p>
                El censo de {ciudad} quedó cerrado. Se descargó el Excel con los censados antes y
                después del cierre, y se guardó una copia.
              </p>
            </div>
            <a
              href={resultado.url}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs font-bold text-emerald-700 underline"
            >
              Abrir la copia guardada del Excel
            </a>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-600" />
              <p>
                <strong>Este cierre solo debe hacerse cuando vengan los del censo.</strong> Al
                confirmar, los recicladores <em>a quitar</em> se desvinculan, los <em>nuevos</em>{" "}
                pasan a <em>regulares</em> y todos los del informe nuevo quedan censados.{" "}
                <strong>Esta acción no se puede deshacer.</strong>
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {errorPreview ? (
                <p className="text-sm text-red-600">{errorPreview}</p>
              ) : !preview ? (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <FaSpinner className="animate-spin" /> Calculando vista previa...
                </p>
              ) : (
                <>
                  {fila("Recicladores a desvincular (a quitar)", preview.desvinculados)}
                  {fila("Nuevos que pasan a regulares", preview.nuevosARegulares)}
                  {fila("Censados antes del cierre", preview.censadosAntes)}
                  {fila("Censados después del cierre", preview.censadosDespues)}
                  {fila(
                    "Rutas que quedarían inactivas (sin reemplazo)",
                    preview.rutasQueQuedanInactivas
                  )}
                </>
              )}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={entiendo}
                onChange={(e) => setEntiendo(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red-600"
              />
              Entiendo que el cierre no se puede deshacer.
            </label>

            {errorCierre && <p className="mt-3 text-sm text-red-600">{errorCierre}</p>}

            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                disabled={cerrando}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrar}
                disabled={!entiendo || !preview || cerrando}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cerrando && <FaSpinner className="animate-spin" />}
                Cerrar censo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

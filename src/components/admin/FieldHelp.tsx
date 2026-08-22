// components/admin/FieldHelp.tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaInfoCircle } from "react-icons/fa";

interface FieldHelpProps {
  text: string;
}

const POPOVER_WIDTH = 256; // w-64
const VIEWPORT_MARGIN = 12;

/**
 * Ícono de información inline para poner junto a un <label>. Al hacer clic
 * muestra un popover con el texto de ayuda.
 *
 * El popover se renderiza en un portal a document.body y se posiciona con
 * coordenadas de viewport (position: fixed) calculadas desde el ícono, en
 * vez de vivir dentro del formulario. Así no se recorta cuando el ícono
 * está cerca del borde derecho del modal — el modal usa overflow-y-auto,
 * que en la mayoría de navegadores fuerza overflow-x a comportarse como
 * "auto" también, recortando cualquier contenido posicionado de forma
 * absoluta que se salga por los lados.
 */
export default function FieldHelp({ text }: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!open) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        const left = Math.min(
          Math.max(VIEWPORT_MARGIN, rect.left),
          window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN
        );
        setPosition({ top: rect.bottom + 6, left });
      }
    }
    setOpen((o) => !o);
  };

  // Cierra el popover si el modal (u otro contenedor) hace scroll mientras
  // está abierto, para que no quede flotando lejos de su ícono.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        onBlur={() => setOpen(false)}
        aria-label="Más información sobre este campo"
        className="text-gray-300 transition hover:text-emerald-600 focus:text-emerald-600 focus:outline-none"
      >
        <FaInfoCircle className="text-xs" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
            className="fixed z-100 rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed font-normal text-gray-600 shadow-lg"
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}

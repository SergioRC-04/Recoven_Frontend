// lib/descargarBlob.ts
//
// Descarga un Blob ya obtenido del backend como archivo — crea un enlace
// temporal, lo dispara y lo limpia. Este mismo patrón estaba duplicado en
// RecyclerFormModal.tsx y ExportarCertificadoModal.tsx; ahora los tres
// flujos de certificado de reciclador (formulario, modal de búsqueda,
// botón por fila en la tabla) usan esta única función.

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

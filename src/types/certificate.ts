export interface Certificate {
  id: number;
  empresaId: number;
  tipo: "PODA" | "RESIDUOS";
  nombreArchivo: string;
  urlArchivo?: string;
  estado: "PENDIENTE" | "ENVIADO" | "FALLIDO";
  errorDetalle?: string;
  fechaEnvio: string;
  empresa: {
    id: number;
    nombre: string;
    correo: string;
  };
}

export interface CertificateUpload {
  empresaId: number;
  tipo: "PODA" | "RESIDUOS";
  file: File;
}

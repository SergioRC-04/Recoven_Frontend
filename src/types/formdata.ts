export interface FormData {
  nombre: string;
  telefono: string;
  email: string;
  empresa: string;
  direccion: string;
  servicio: string;
  especialidad: string;
  mensaje: string;
}

export interface SubmitStatus {
  type: "idle" | "success" | "error";
  message: string;
}

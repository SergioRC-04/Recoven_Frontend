export interface Customer {
  id: number;
  nombre: string;
  correo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreate {
  nombre: string;
  correo: string;
}

export type CustomerUpdate = CustomerCreate;

import { recovenApi } from "./api";
import type { Customer, CustomerCreate, CustomerUpdate } from "../types/customer";

export async function getCustomers(): Promise<Customer[]> {
  return recovenApi.get("/customers", true);
}

export async function createCustomer(data: CustomerCreate): Promise<Customer> {
  return recovenApi.post("/customers", data, true);
}

export async function updateCustomer(id: number, data: CustomerUpdate): Promise<Customer> {
  return recovenApi.put(`/customers/${id}`, data, true);
}

export async function deleteCustomer(id: number): Promise<void> {
  return recovenApi.delete(`/customers/${id}`, undefined, true);
}

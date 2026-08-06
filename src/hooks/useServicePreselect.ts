import { useContext } from "react";
import { PreselectContext } from "../context/PreselectContext";

export function useServicePreselect() {
  const context = useContext(PreselectContext);
  if (context === undefined) {
    throw new Error("useServicePreselect must be used within a ServicePreselectProvider");
  }
  return context;
}

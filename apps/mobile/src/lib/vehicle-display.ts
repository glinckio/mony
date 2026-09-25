import type { FuelType } from "@mony/shared-types";

// Legacy `veiculo_adicionar.php` labels.
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  GASOLINE: "Gasolina",
  ETHANOL: "Etanol",
  FLEX: "Flex (Gasolina/Etanol)",
  DIESEL: "Diesel",
  ELECTRIC: "Elétrico",
  HYBRID: "Híbrido",
  CNG: "GNV (Gás Natural)",
  OTHER: "Outro",
};

// 36200 -> "36.200 km"
export function formatMileage(km: number): string {
  return `${km.toLocaleString("pt-BR")} km`;
}

// Digits only -> number; "" -> undefined (so zod reports "required").
export function parseIntegerInput(text: string): number | undefined {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

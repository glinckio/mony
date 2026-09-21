import { z } from "zod";

// Fresh-authored icon set (no legacy source to port — see
// docs/specs/categories/design.md), Ionicons keys used directly as both
// the DB value and the icon picker's identifier, so no separate
// name-mapping layer is needed on either side of the API boundary.
export const CATEGORY_ICONS = [
  "cash-outline",
  "trending-up-outline",
  "heart-outline",
  "gift-outline",
  "wallet-outline",
  "save-outline",
  "card-outline",
  "storefront-outline",
  "restaurant-outline",
  "home-outline",
  "car-outline",
  "pulse-outline",
  "school-outline",
  "game-controller-outline",
  "bag-outline",
  "shirt-outline",
  "airplane-outline",
  "bus-outline",
  "car-sport-outline",
  "medkit-outline",
  "bandage-outline",
  "book-outline",
  "laptop-outline",
  "phone-portrait-outline",
  "barbell-outline",
  "wine-outline",
  "cafe-outline",
  "happy-outline",
  "paw-outline",
  "construct-outline",
  "bulb-outline",
  "pricetag-outline",
  "briefcase-outline",
  "receipt-outline",
  "ellipsis-horizontal-outline",
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

// Shared source of truth for the color picker/default-assignment palette
// on both sides of the API boundary — see apps/api/src/categories/
// categories.service.ts and apps/mobile/src/components/ui/
// ColorSwatchPicker.tsx.
export const CATEGORY_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
] as const;

export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: categoryTypeSchema,
  color: z.string(),
  icon: z.enum(CATEGORY_ICONS),
  createdAt: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
export const createCategoryInputSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome deve ter no máximo 50 caracteres"),
  type: categoryTypeSchema,
  color: z
    .string()
    .regex(HEX_COLOR_REGEX, "Cor deve ser um hex válido, ex: #3B82F6")
    .optional(),
  icon: z.enum(CATEGORY_ICONS, { errorMap: () => ({ message: "Ícone inválido" }) }),
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Type is intentionally not editable — changing it on a category with
// existing transactions would leave those transactions' type mismatched.
export const updateCategoryInputSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(50, "Nome deve ter no máximo 50 caracteres")
    .optional(),
  color: z
    .string()
    .regex(HEX_COLOR_REGEX, "Cor deve ser um hex válido, ex: #3B82F6")
    .optional(),
  icon: z.enum(CATEGORY_ICONS, { errorMap: () => ({ message: "Ícone inválido" }) }).optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

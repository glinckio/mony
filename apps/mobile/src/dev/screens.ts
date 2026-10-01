// Screen registry for the catalog — mirrors design/telas.md → Progresso.
// Update the status here together with that file whenever a screen passes
// its visual review rounds.
export type ScreenStatus = "Pronta" | "Em revisão" | "Em progresso" | "Pendente";
export type ScreenFlow = "Dev" | "Entrada" | "Núcleo" | "Casa" | "Conta";

export interface CatalogEntry {
  id: string;
  name: string;
  flow: ScreenFlow;
  // Route in AppStackParamList (dev copies of the auth screens included).
  route: string;
  params?: Record<string, unknown>;
  // A tab inside MainTabs.
  tab?: string;
  status: ScreenStatus;
}

export const SCREENS: CatalogEntry[] = [
  {
    id: "design-system",
    name: "Design system",
    flow: "Dev",
    route: "DesignSystem",
    status: "Pronta",
  },
  { id: "home", name: "Início", flow: "Núcleo", route: "MainTabs", tab: "Home", status: "Pronta" },
  {
    id: "transactions",
    name: "Lançamentos",
    flow: "Núcleo",
    route: "MainTabs",
    tab: "Transactions",
    status: "Pronta",
  },
  {
    id: "transaction-form",
    name: "Lançamento (form)",
    flow: "Núcleo",
    route: "TransactionForm",
    status: "Pronta",
  },
  { id: "goals", name: "Metas", flow: "Núcleo", route: "MainTabs", tab: "Goals", status: "Pronta" },
  { id: "goal-form", name: "Meta (form)", flow: "Núcleo", route: "GoalForm", status: "Pronta" },
  { id: "login", name: "Entrar", flow: "Entrada", route: "Login", status: "Pronta" },
  { id: "register", name: "Criar conta", flow: "Entrada", route: "Register", status: "Pronta" },
  {
    id: "forgot",
    name: "Esqueci a senha",
    flow: "Entrada",
    route: "ForgotPassword",
    status: "Pronta",
  },
  {
    id: "reset",
    name: "Redefinir senha",
    flow: "Entrada",
    route: "ResetPassword",
    params: { email: "marina.costa@example.com" },
    status: "Pronta",
  },
  { id: "reports", name: "Relatórios", flow: "Núcleo", route: "Reports", status: "Pronta" },
  { id: "news", name: "Novidades", flow: "Conta", route: "News", status: "Pronta" },
  {
    id: "admin-news",
    name: "Gerenciar novidades",
    flow: "Conta",
    route: "AdminNews",
    status: "Pronta",
  },
  {
    id: "news-form",
    name: "Novidade (form)",
    flow: "Conta",
    route: "NewsForm",
    status: "Pronta",
  },
  { id: "debts", name: "Dívidas", flow: "Casa", route: "Debts", status: "Pronta" },
  {
    id: "debt",
    name: "Dívida (detalhe)",
    flow: "Casa",
    route: "DebtDetail",
    params: { debtId: "debt-carro" },
    status: "Pronta",
  },
  { id: "debt-form", name: "Dívida (form)", flow: "Casa", route: "DebtForm", status: "Pronta" },
  { id: "grocery", name: "Mercado", flow: "Casa", route: "Grocery", status: "Pronta" },
  {
    id: "grocery-form",
    name: "Item do mercado (form)",
    flow: "Casa",
    route: "GroceryItemForm",
    status: "Pronta",
  },
  { id: "vehicles", name: "Veículos", flow: "Casa", route: "Vehicles", status: "Pronta" },
  {
    id: "vehicle",
    name: "Veículo (detalhe)",
    flow: "Casa",
    route: "VehicleDetail",
    params: { vehicleId: "veh-renegade" },
    status: "Pronta",
  },
  {
    id: "vehicle-form",
    name: "Veículo (form)",
    flow: "Casa",
    route: "VehicleForm",
    status: "Pronta",
  },
  {
    id: "maintenance",
    name: "Manutenções",
    flow: "Casa",
    route: "Maintenance",
    params: { vehicleId: "veh-renegade" },
    status: "Em revisão",
  },
  {
    id: "maintenance-history",
    name: "Manutenções (histórico)",
    flow: "Casa",
    route: "Maintenance",
    params: { vehicleId: "veh-renegade", tab: "history" },
    status: "Em revisão",
  },
  {
    id: "maintenance-record-form",
    name: "Registrar manutenção",
    flow: "Casa",
    route: "MaintenanceRecordForm",
    params: { vehicleId: "veh-renegade", maintenanceTypeId: "mt-oil" },
    status: "Em revisão",
  },
  {
    id: "maintenance-types",
    name: "Tipos de manutenção",
    flow: "Casa",
    route: "MaintenanceTypes",
    status: "Em revisão",
  },
  {
    id: "maintenance-type-form",
    name: "Tipo de manutenção (form)",
    flow: "Casa",
    route: "MaintenanceTypeForm",
    status: "Em revisão",
  },
  { id: "more", name: "Mais", flow: "Conta", route: "MainTabs", tab: "More", status: "Pronta" },
  { id: "profile", name: "Perfil", flow: "Conta", route: "Profile", status: "Pronta" },
  {
    id: "subscription",
    name: "Assinatura",
    flow: "Conta",
    route: "Subscription",
    status: "Pronta",
  },
  {
    id: "change-password",
    name: "Alterar senha",
    flow: "Conta",
    route: "ChangePassword",
    status: "Pronta",
  },
  { id: "categories", name: "Categorias", flow: "Conta", route: "Categories", status: "Pronta" },
  {
    id: "category-form",
    name: "Categoria (form)",
    flow: "Conta",
    route: "CategoryForm",
    status: "Pronta",
  },
];

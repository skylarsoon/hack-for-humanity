import { seedExpenses, seedHouseholds, type Expense, type Household } from "./nido-data";

export interface DeliveryState {
  households: Household[];
  expenses: Expense[];
  extraSpent: number;
  extraAssisted: number;
}
export interface DeliveryAction {
  householdId: string;
  items: string[];
  usd: number;
  vendor: string;
  receipt: string;
  id: string;
  date: string;
}
export function initialDeliveryState(): DeliveryState {
  return { households: seedHouseholds(), expenses: seedExpenses(), extraSpent: 0, extraAssisted: 0 };
}
export function deliveryReducer(state: DeliveryState, action: DeliveryAction): DeliveryState {
  const household = state.households.find((h) => h.id === action.householdId);
  const items = action.items.map((i) => i.trim()).filter(Boolean);
  if (!household || !items.length || !Number.isFinite(action.usd) || action.usd < 0 || state.expenses.some((e) => e.receipt === action.receipt)) return state;
  const expense: Expense = {
    id: action.id, date: action.date, vendor: action.vendor, method: "Efectivo + Acta",
    description: items.join(", "), usd: action.usd, phase: household.phase,
    householdIds: [household.id], receipt: action.receipt,
  };
  return {
    households: state.households.map((h) => h.id === household.id ? {
      ...h, status: "delivered", delivered: Array.from(new Set([...h.delivered, ...items])),
      needs: h.needs.filter((n) => !items.includes(n)), costUsd: h.costUsd + action.usd,
    } : h),
    expenses: action.usd > 0 ? [expense, ...state.expenses] : state.expenses,
    extraSpent: state.extraSpent + action.usd,
    extraAssisted: state.extraAssisted + (household.status === "delivered" ? 0 : 1),
  };
}
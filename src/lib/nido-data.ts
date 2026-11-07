export const USD_TO_COP = 3230;
export type Currency = "COP" | "USD";
export type Lang = "es" | "en";
export type Phase = 1 | 2 | 3;
export type Status = "needs" | "progress" | "delivered";

export interface Household {
  id: string;
  name: string;
  vereda: "Resguardo Ibanacuara" | "Vereda La Maizena" | "Los Juanes";
  community: "Embera Chamí" | "Campesino";
  members: number;
  phase: Phase;
  status: Status;
  lat: number;
  lng: number;
  needs: string[];
  delivered: string[];
  costUsd: number;
  note?: string;
}

export interface Expense {
  id: string;
  date: string;
  vendor: string;
  method: "Factura" | "Nequi" | "Efectivo + Acta";
  description: string;
  usd: number;
  phase: Phase;
  householdIds: string[];
  receipt: string;
  /** Set for rows loaded from the database. */
  source?: "ai" | "manual" | "seed";
  items?: { item: string; qty: number; category: string }[];
}

export const HAZARD = { lat: 4.342, lng: -75.715 };
export const CENTER = { lat: 4.3339, lng: -75.7039 };

export const seedHouseholds = (): Household[] => [
  { id: "HH_01", name: "Familia Gómez", vereda: "Vereda La Maizena", community: "Campesino", members: 5, phase: 2, status: "progress", lat: 4.3285, lng: -75.6955, needs: ["Madera Bahareque"], delivered: ["Tejas de Zinc", "Lámpara Solar"], costUsd: 1850, note: "Casa 1 — construcción sismo-resistente en bahareque" },
  { id: "HH_02", name: "Familia Nengarabe", vereda: "Resguardo Ibanacuara", community: "Embera Chamí", members: 7, phase: 1, status: "delivered", lat: 4.3462, lng: -75.7205, needs: [], delivered: ["Tejas de Zinc", "Kit Agua/Higiene", "Lámpara Solar"], costUsd: 640 },
  { id: "HH_03", name: "Familia Queragama", vereda: "Resguardo Ibanacuara", community: "Embera Chamí", members: 6, phase: 1, status: "needs", lat: 4.3481, lng: -75.7172, needs: ["Tejas de Zinc", "Kit Agua/Higiene"], delivered: [], costUsd: 0 },
  { id: "HH_04", name: "Familia Tascón", vereda: "Resguardo Ibanacuara", community: "Embera Chamí", members: 4, phase: 3, status: "delivered", lat: 4.3445, lng: -75.7231, needs: [], delivered: ["Semillas Huerta", "Lámpara Solar"], costUsd: 210 },
  { id: "HH_05", name: "Familia Osorio", vereda: "Vereda La Maizena", community: "Campesino", members: 3, phase: 1, status: "needs", lat: 4.3301, lng: -75.6921, needs: ["Tejas de Zinc", "Lámpara Solar"], delivered: [], costUsd: 0 },
  { id: "HH_06", name: "Familia Henao", vereda: "Los Juanes", community: "Campesino", members: 5, phase: 2, status: "progress", lat: 4.3215, lng: -75.7085, needs: ["Madera Bahareque"], delivered: ["Tejas de Zinc"], costUsd: 720 },
  { id: "HH_07", name: "Familia Arce", vereda: "Los Juanes", community: "Campesino", members: 6, phase: 3, status: "needs", lat: 4.3192, lng: -75.7041, needs: ["Semillas Huerta"], delivered: ["Kit Agua/Higiene"], costUsd: 95 },
  { id: "HH_08", name: "Familia Siagama", vereda: "Resguardo Ibanacuara", community: "Embera Chamí", members: 8, phase: 1, status: "delivered", lat: 4.3499, lng: -75.7248, needs: [], delivered: ["Tejas de Zinc", "Kit Agua/Higiene", "Panel solar comunitario"], costUsd: 1320 },
];

export const seedExpenses = (): Expense[] => [
  { id: "exp_01", date: "2026-08-14", vendor: "Ferretería Pijao", method: "Factura", description: "48 tejas de zinc calibre 33 + clavos", usd: 1240, phase: 1, householdIds: ["HH_02", "HH_08", "HH_06"], receipt: "FV-00841" },
  { id: "exp_02", date: "2026-08-16", vendor: "SolarAndes Armenia", method: "Nequi", description: "Panel solar comunitario Ibanacuara + 20 lámparas", usd: 2100, phase: 1, householdIds: ["HH_08", "HH_02", "HH_04"], receipt: "NQ-3381920" },
  { id: "exp_03", date: "2026-08-22", vendor: "Aserrío La Maizena", method: "Efectivo + Acta", description: "Guadua y madera para bahareque — Casa 1", usd: 1650, phase: 2, householdIds: ["HH_01"], receipt: "ACTA-012" },
  { id: "exp_04", date: "2026-08-25", vendor: "Droguería Pijao", method: "Factura", description: "30 kits de agua e higiene", usd: 780, phase: 1, householdIds: ["HH_02", "HH_07", "HH_08"], receipt: "FV-2290" },
  { id: "exp_05", date: "2026-09-02", vendor: "Agrovivero Quindío", method: "Nequi", description: "Semillas de huerta + herramientas + materiales arte", usd: 430, phase: 3, householdIds: ["HH_04"], receipt: "NQ-3412207" },
];

export const SUPPLIES = [
  { key: "Tejas de Zinc", icon: "🏠", usd: 26 },
  { key: "Lámpara Solar", icon: "💡", usd: 35 },
  { key: "Madera Bahareque", icon: "🪵", usd: 180 },
  { key: "Kit Agua/Higiene", icon: "💧", usd: 26 },
  { key: "Semillas Huerta", icon: "🌱", usd: 15 },
  { key: "Primeros Auxilios", icon: "🩹", usd: 20 },
  { key: "Panel Solar", icon: "☀️", usd: 120 },
  { key: "Kit Esenciales", icon: "🛏️", usd: 30 },
  { key: "Recreación", icon: "🎨", usd: 25 },
  { key: "Alerta Derrumbe", icon: "⚠️", usd: 0 },
] as const;

export const PHASES: Record<Phase, { es: string; en: string; descEs: string; descEn: string }> = {
  1: { es: "Techo y Abrigo", en: "Roof & Shelter", descEs: "Censo, tejas, lámparas, kits, panel solar", descEn: "Census, zinc roofs, lamps, kits, solar panel" },
  2: { es: "Reconstrucción", en: "Reconstruction", descEs: "Mingas de sábado, bahareque, El Filo", descEn: "Saturday mingas, bahareque, El Filo works" },
  3: { es: "Sanar y Sembrar", en: "Heal & Sow", descEs: "Arte terapia, cuentos, huertas", descEn: "Art therapy, storytelling, gardens" },
};

export const TOTAL_RAISED_USD = 48500;
export const BASE_SPENT_USD = 31200;
export const BASE_ASSISTED = 52;
export const AFFECTED = 78;

export function formatMoney(usd: number, c: Currency) {
  if (c === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(usd);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(usd * USD_TO_COP);
}

export const T = {
  es: { dash: "Tablero Público de Cuentas", field: "Cuadrilla sin Señal (Móvil)", build: "Su Donación en Acción", ai: "Mesa del Coordinador IA", raised: "Fondos recaudados", spent: "Gastado con recibo verificado", assisted: "Familias atendidas", crews: "Mingas activas este sábado", households: "78 hogares afectados", ledger: "Cuentas a la Vista", all: "Todas", search: "Buscar ID de hogar o vereda…", embed: "Insertar widget" },
  en: { dash: "Public Open-Books Dashboard", field: "Offline Field Crew (Mobile)", build: "Your Donation at Work", ai: "AI Coordinator Workbench", raised: "Total funds raised", spent: "Spent on verified receipts", assisted: "Households assisted", crews: "Active Saturday minga crews", households: "78 Affected Households Status", ledger: "Open-Book Expense Ledger", all: "All", search: "Search household ID or vereda…", embed: "Embed Widget" },
};

// Browser-safe builder (construction minga) data and rules.
// Demo verification only: real access must be checked by a server before precise locations are shown.
export type JobType = "roof" | "wall" | "structure";

export interface BuilderJob {
  id: string;
  householdId: string;
  type: JobType;
  lat: number;
  lng: number;
  accessNote: string;
  scope: string;
  materials: { item: string; qty: number }[];
  crewSize: number;
}

export interface MaterialOrg {
  id: string;
  name: string;
  pickup: string;
}

export const MATERIAL_ORGS: MaterialOrg[] = [
  { id: "org_espejo", name: "Espejo de Agua", pickup: "Bodega Parque Principal, Pijao" },
  { id: "org_quindio", name: "Esto es Quindío", pickup: "Ferretería Pijao (cuenta del aliado)" },
  { id: "org_nido", name: "Alianza Nido", pickup: "Centro de acopio Vereda La Maizena" },
];

export const BUILDER_JOBS: BuilderJob[] = [
  { id: "job_01", householdId: "HH_03", type: "roof", lat: 4.34812, lng: -75.71718, accessNote: "Sendero desde la escuela del resguardo, 10 min a pie", scope: "Reemplazar 18 tejas y 2 cerchas dañadas", materials: [{ item: "Tejas de Zinc", qty: 18 }, { item: "Clavos de techo (kg)", qty: 2 }], crewSize: 4 },
  { id: "job_02", householdId: "HH_05", type: "roof", lat: 4.33011, lng: -75.69207, accessNote: "Entrada por portón verde, vía La Maizena km 3", scope: "Techo completo de cocina", materials: [{ item: "Tejas de Zinc", qty: 12 }], crewSize: 3 },
  { id: "job_03", householdId: "HH_01", type: "wall", lat: 4.32853, lng: -75.69549, accessNote: "Casa 1, frente al aserrío", scope: "Muro oriental en bahareque, 6 m", materials: [{ item: "Guadua (varas)", qty: 20 }, { item: "Tierra/boñiga para embutido (bultos)", qty: 10 }], crewSize: 6 },
  { id: "job_04", householdId: "HH_06", type: "wall", lat: 4.32148, lng: -75.70852, accessNote: "Los Juanes, después del puente de madera", scope: "Reparar grietas y repellar 2 muros", materials: [{ item: "Cal (bultos)", qty: 4 }], crewSize: 3 },
  { id: "job_05", householdId: "HH_07", type: "structure", lat: 4.31921, lng: -75.70413, accessNote: "Zona cercana a El Filo — ingresar solo con coordinador", scope: "Reforzar cimientos y columnas antes de lluvias", materials: [{ item: "Cemento (bultos)", qty: 8 }, { item: "Varilla 3/8 (unid.)", qty: 12 }], crewSize: 5 },
];

// Demo-only codes issued by coordinators.
const DEMO_CODES = new Set(["MINGA-2026", "OBRA-PIJAO"]);

export function verifyBuilder(input: { name: string; minga: string; code: string }) {
  if (input.name.trim().length < 2) return { ok: false as const, error: "Ingrese su nombre." };
  if (input.minga.trim().length < 2) return { ok: false as const, error: "Ingrese su minga u organización." };
  if (!DEMO_CODES.has(input.code.trim().toUpperCase())) return { ok: false as const, error: "Código de verificación no válido. Pídalo a su coordinador." };
  return { ok: true as const };
}

export interface MaterialRequest {
  jobId: string;
  orgId: string;
  items: { item: string; qty: number }[];
  volunteerPays: 0;
  paidBy: string;
}

// Rule: volunteers never pay for materials — the partner org covers the full cost.
export function createMaterialRequest(job: BuilderJob, orgId: string): MaterialRequest {
  const org = MATERIAL_ORGS.find((o) => o.id === orgId);
  if (!org) throw new Error("Unknown organization");
  return { jobId: job.id, orgId, items: job.materials, volunteerPays: 0, paidBy: org.name };
}

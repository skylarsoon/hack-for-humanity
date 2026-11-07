// Bilingual field survey questions from "Pijao Survey Questions" document.
export type QType = "text" | "number" | "choice";
export interface SurveyQuestion { id: string; en: string; es: string; type: QType; options?: string[] | undefined }
export interface SurveySection { key: string; title: string; questions: SurveyQuestion[] }

const YN = ["Sí / Yes", "No"];
const YNU = [...YN, "No se sabe / Unknown"];
const YNP = [...YN, "Parcial / Partial"];
const YNS = [...YN, "Programado / Scheduled"];
const q = (id: string, en: string, es: string, type: QType, options?: string[]): SurveyQuestion => ({ id, en, es, type, options });

export const GENERAL: SurveySection = {
  key: "general", title: "Preguntas generales · General", questions: [
    q("g_people", "How many people live in this household?", "¿Cuántas personas viven en este hogar?", "number"),
    q("g_home", "Is the household currently staying in its home?", "¿La familia está viviendo actualmente en su vivienda?", "choice", YN),
    q("g_relief", "Has this household received disaster relief assistance?", "¿Este hogar ha recibido ayuda después del desastre?", "choice", YNP),
  ],
};

export const SECTIONS: Record<string, SurveySection> = {
  "Tejas de Zinc": { key: "Tejas de Zinc", title: "1. Tejas de Zinc · Zinc Roofing", questions: [
    q("r1", "How much of the roof is damaged?", "¿Qué parte del techo está dañada?", "choice", ["Leve / Minor", "Moderada / Moderate", "Grave / Severe", "No se sabe / Unknown"]),
    q("r2", "Is water entering the home when it rains?", "¿Entra agua a la vivienda cuando llueve?", "choice", YNU),
    q("r3", "How many zinc roofing sheets are needed?", "¿Cuántas tejas de zinc se necesitan?", "number"),
    q("r4", "Does the household currently have a temporary roof covering?", "¿La vivienda tiene alguna cubierta temporal en el techo?", "choice", YN),
    q("r5", "Are additional materials needed to repair the roof?", "¿Se necesitan otros materiales para reparar el techo?", "text"),
    q("r6", "Has the household already received roofing materials?", "¿El hogar ya ha recibido materiales para el techo?", "choice", YNP),
  ]},
  "Lámpara Solar": { key: "Lámpara Solar", title: "2. Lámpara Solar · Solar Lamp", questions: [
    q("l1", "Does the household currently have working lighting at night?", "¿El hogar cuenta actualmente con iluminación durante la noche?", "choice", YN),
    q("l2", "Is electricity available in the home?", "¿La vivienda cuenta con servicio de electricidad?", "choice", YNP),
    q("l3", "How many solar lamps are needed?", "¿Cuántas lámparas solares se necesitan?", "number"),
    q("l4", "What would the lamps mainly be used for?", "¿Para qué se utilizarían principalmente las lámparas?", "text"),
    q("l5", "Has the household already received solar lamps?", "¿El hogar ya ha recibido lámparas solares?", "choice", YN),
  ]},
  "Madera Bahareque": { key: "Madera Bahareque", title: "3. Madera para Bahareque · Bahareque Wood", questions: [
    q("b1", "What part of the home needs reconstruction?", "¿Qué parte de la vivienda necesita reconstrucción?", "text"),
    q("b2", "What type of construction materials are needed?", "¿Qué tipo de materiales de construcción se necesitan?", "text"),
    q("b3", "What quantity of materials is estimated to be needed?", "¿Qué cantidad de materiales se estima que se necesita?", "text"),
    q("b4", "Has a qualified builder assessed the damage?", "¿Un constructor o técnico calificado ha evaluado los daños?", "choice", YNS),
    q("b5", "Is a community minga already planned for this repair?", "¿Ya hay una minga comunitaria programada para esta reparación?", "choice", [...YN, "Sin decidir / Undecided"]),
    q("b6", "Are materials currently available for the repair?", "¿Ya se cuenta con materiales para la reparación?", "choice", YNP),
  ]},
  "Kit Agua/Higiene": { key: "Kit Agua/Higiene", title: "4. Agua e Higiene · Water & Hygiene", questions: [
    q("w1", "Does the household currently have access to drinking water?", "¿El hogar tiene actualmente acceso a agua potable?", "choice", YNU),
    q("w2", "What hygiene supplies are needed?", "¿Qué productos de higiene necesita el hogar?", "text"),
    q("w3", "How many hygiene kits are requested?", "¿Cuántos kits de higiene necesita el hogar?", "number"),
    q("w4", "Does the household have a reliable way to store drinking water?", "¿El hogar tiene una forma segura de almacenar agua potable?", "choice", YN),
    q("w5", "Has the household received water or hygiene assistance recently?", "¿El hogar ha recibido recientemente ayuda con agua o productos de higiene?", "choice", YNP),
  ]},
  "Semillas Huerta": { key: "Semillas Huerta", title: "5. Semillas para Huerta · Garden Seeds", questions: [
    q("s1", "Was the household’s garden damaged by the disaster?", "¿La huerta familiar sufrió daños por el desastre?", "choice", YNU),
    q("s2", "Does the household have an area available for planting?", "¿El hogar dispone de un espacio para sembrar?", "choice", YN),
    q("s3", "What kinds of seeds or crops would the household like to grow?", "¿Qué tipos de semillas o cultivos le gustaría sembrar al hogar?", "text"),
    q("s4", "Does the household need gardening tools or materials?", "¿El hogar necesita herramientas o materiales para la huerta?", "text"),
    q("s5", "Is water available for irrigation?", "¿Hay agua disponible para el riego?", "choice", YN),
    q("s6", "Would the household like assistance restoring its garden?", "¿Le gustaría al hogar recibir apoyo para recuperar su huerta?", "choice", YN),
  ]},
  "Primeros Auxilios": { key: "Primeros Auxilios", title: "6. Primeros Auxilios · First Aid", questions: [
    q("f1", "Is anyone in the household currently requesting urgent medical assistance?", "¿Alguna persona del hogar necesita atención médica urgente en este momento?", "choice", YN),
    q("f2", "Does the household need a basic first aid kit?", "¿El hogar necesita un botiquín básico de primeros auxilios?", "choice", YN),
    q("f3", "Is there access to a nearby health service?", "¿Hay acceso a un servicio de salud cercano?", "choice", YNU),
    q("f4", "Is assistance needed to contact a healthcare professional?", "¿Se necesita ayuda para contactar a un profesional de salud?", "choice", YN),
    q("f5", "Would the household like information about available emotional support services?", "¿Le gustaría al hogar recibir información sobre servicios de apoyo emocional disponibles?", "choice", YN),
  ]},
  "Panel Solar": { key: "Panel Solar", title: "7. Panel Solar · Solar Panel", questions: [
    q("p1", "Is this request for a household or shared community facility?", "¿Esta solicitud es para un hogar o una instalación comunitaria?", "choice", ["Hogar / Household", "Comunitaria / Community"]),
    q("p2", "What is the main electricity need?", "¿Cuál es la principal necesidad de electricidad?", "text"),
    q("p3", "Is there currently a reliable power source?", "¿Existe actualmente una fuente confiable de electricidad?", "choice", [...YN, "Intermitente / Intermittent"]),
    q("p4", "Has a suitable installation location been identified?", "¿Se ha identificado un lugar adecuado para la instalación?", "choice", YNU),
    q("p5", "Has a qualified technician assessed the project?", "¿Un técnico calificado ha evaluado el proyecto?", "choice", YNS),
    q("p6", "Which community representative is coordinating this request?", "¿Qué representante comunitario coordina esta solicitud?", "text"),
  ]},
  "Kit Esenciales": { key: "Kit Esenciales", title: "8. Artículos Esenciales · Essential Supplies", questions: [
    q("e1", "What essential items does the household currently need?", "¿Qué artículos esenciales necesita actualmente el hogar?", "text"),
    q("e2", "How many people need these supplies?", "¿Cuántas personas necesitan estos artículos?", "number"),
    q("e3", "Are blankets or bedding needed?", "¿Se necesitan cobijas o ropa de cama?", "choice", YN),
    q("e4", "Are cooking or food preparation supplies needed?", "¿Se necesitan utensilios para cocinar o preparar alimentos?", "choice", YN),
    q("e5", "Has the household already received an essentials kit?", "¿El hogar ya ha recibido un kit de artículos esenciales?", "choice", YNP),
    q("e6", "Which requested items are most urgently needed?", "¿Cuáles de los artículos solicitados se necesitan con mayor urgencia?", "text"),
  ]},
  "Recreación": { key: "Recreación", title: "9. Recreación · Recreation", questions: [
    q("c1", "Would the household like information about community recreational activities?", "¿Le gustaría al hogar recibir información sobre actividades recreativas comunitarias?", "choice", YN),
    q("c2", "What types of activities would interest the household?", "¿Qué tipos de actividades le interesarían al hogar?", "text"),
    q("c3", "What materials are needed for these activities?", "¿Qué materiales se necesitan para estas actividades?", "text"),
    q("c4", "Are there barriers to participating in community activities?", "¿Existen dificultades para participar en actividades comunitarias?", "text"),
    q("c5", "Would the household like to be informed about upcoming activities?", "¿Le gustaría al hogar recibir información sobre próximas actividades?", "choice", YN),
  ]},
  "Alerta Derrumbe": { key: "Alerta Derrumbe", title: "10. Alerta de Derrumbe · Landslide Alert", questions: [
    q("a1", "Where is the reported landslide or unstable area? (optional)", "¿Dónde se encuentra el derrumbe o la zona inestable reportada? (opcional)", "text"),
    q("a2", "What type of problem has been observed?", "¿Qué tipo de problema se ha observado?", "text"),
    q("a3", "Is the route currently reported as blocked?", "¿Se ha reportado que el camino está bloqueado actualmente?", "choice", ["Bloqueado / Blocked", "Parcial / Partly blocked", "No se sabe / Unknown"]),
    q("a4", "Does this affect access to homes or community facilities?", "¿Esto afecta el acceso a viviendas o instalaciones comunitarias?", "choice", YNU),
    q("a5", "When was the issue first observed?", "¿Cuándo se observó el problema por primera vez?", "text"),
    q("a6", "Has the issue already been reported to community authorities?", "¿Ya se ha informado del problema a las autoridades comunitarias?", "choice", YNU),
  ]},
};

export function finalSection(selected: string[]): SurveySection {
  return { key: "final", title: "Preguntas finales · Final", questions: [
    q("z1", "Which requested assistance is the household’s highest priority?", "¿Cuál de las ayudas solicitadas es la más urgente para el hogar?", "choice", selected),
    q("z2", "Has any of the requested assistance already been received?", "¿Ya se ha recibido alguna de las ayudas solicitadas?", "choice", YNP),
    q("z3", "Is a follow-up visit needed?", "¿Se necesita una visita de seguimiento?", "choice", YN),
    q("z4", "Does the household agree to sharing a non-identifying summary with approved relief coordinators?", "¿Está de acuerdo el hogar con que se comparta un resumen sin datos identificatorios con coordinadores de ayuda autorizados?", "choice", YN),
    q("z5", "Is there any additional information the household would like to share? (optional)", "¿Hay alguna otra información que el hogar desee compartir? (opcional)", "text"),
  ]};
}

/** Only selected categories appear, in supply order, between general and final questions. */
export function buildSurvey(selected: string[]): SurveySection[] {
  const cats = Object.entries(SECTIONS).filter(([k]) => selected.includes(k)).map(([, s]) => s);
  return [GENERAL, ...cats, finalSection(selected)];
}

export interface SurveyQuestion {
  id: string;
  label: string;
  options?: string[];
  when?: { id: string; value: string };
}
export interface RequestSurvey { request: string; questions: SurveyQuestion[] }
export type SurveyAnswers = Record<string, string>;

function questions(prefix: string, condition: string, options: string[], followup: string, trigger: string): SurveyQuestion[] {
  return [
    { id: `${prefix}.condition`, label: condition, options },
    { id: `${prefix}.quantity`, label: "¿Cuántas unidades necesita el hogar?" },
    { id: `${prefix}.followup`, label: followup, options: ["Sí", "No", "No sabe"], when: { id: `${prefix}.condition`, value: trigger } },
  ];
}

// Eight primary supply requests; existing recreation and hazard options remain available.
export const REQUEST_SURVEYS: RequestSurvey[] = [
  { request: "Tejas de Zinc", questions: questions("roof", "¿Cuál es el estado del techo?", ["Sin techo", "Techo dañado", "Techo en buen estado"], "¿Hay una estructura segura para instalar las tejas?", "Sin techo") },
  { request: "Lámpara Solar", questions: questions("lamp", "¿Tiene iluminación por la noche?", ["No tiene", "Intermitente", "Sí tiene"], "¿Hay personas que necesitan desplazarse de noche?", "No tiene") },
  { request: "Madera Bahareque", questions: questions("wood", "¿Cuál es el estado de las paredes?", ["Colapsadas", "Dañadas", "Estables"], "¿Un técnico ha revisado la seguridad de la estructura?", "Colapsadas") },
  { request: "Kit Agua/Higiene", questions: questions("water", "¿Tiene acceso a agua potable?", ["No", "A veces", "Sí"], "¿Cuenta con un recipiente para almacenar agua de forma segura?", "No") },
  { request: "Semillas Huerta", questions: questions("garden", "¿Tiene un espacio para sembrar?", ["Sí", "No", "Compartido"], "¿Tiene acceso a agua para regar la huerta?", "Sí") },
  { request: "Primeros Auxilios", questions: questions("aid", "¿Hay alguna persona que necesita atención ahora?", ["Sí", "No", "No sabe"], "¿Ya se contactó al servicio local de salud?", "Sí") },
  { request: "Panel Solar", questions: questions("solar", "¿El hogar tiene acceso a electricidad?", ["No", "Intermitente", "Sí"], "¿Un técnico ha identificado un lugar seguro para el panel?", "No") },
  { request: "Kit Esenciales", questions: questions("essentials", "¿Tiene un lugar seco para dormir?", ["No", "Parcialmente", "Sí"], "¿Se necesita coordinar alojamiento temporal?", "No") },
  { request: "Recreación", questions: questions("play", "¿Hay un espacio comunitario seguro para actividades?", ["Sí", "No", "No sabe"], "¿Hay una persona adulta disponible para acompañar las actividades?", "Sí") },
  { request: "Alerta Derrumbe", questions: [
    { id: "hazard.condition", label: "¿Se observan grietas nuevas o movimiento del terreno?", options: ["Sí", "No", "No sabe"] },
    { id: "hazard.followup", label: "¿Se notificó a la autoridad local de gestión del riesgo?", options: ["Sí", "No"], when: { id: "hazard.condition", value: "Sí" } },
  ] },
];

export function personalizedSurvey(requests: string[]): RequestSurvey[] {
  return REQUEST_SURVEYS.filter((survey) => requests.includes(survey.request));
}
export function visibleQuestions(survey: RequestSurvey, answers: SurveyAnswers) {
  return survey.questions.filter((q) => !q.when || answers[q.when.id] === q.when.value);
}
export function cleanSurveyAnswers(requests: string[], answers: SurveyAnswers): SurveyAnswers {
  return Object.fromEntries(personalizedSurvey(requests).flatMap((survey) => visibleQuestions(survey, answers).filter((q) => answers[q.id] !== undefined).map((q) => [q.id, answers[q.id]])));
}
export function surveyComplete(requests: string[], answers: SurveyAnswers): boolean {
  const surveys = personalizedSurvey(requests);
  return surveys.length > 0 && surveys.every((survey) => visibleQuestions(survey, answers).every((q) => q.options ? q.options.includes(answers[q.id]) : Number.isInteger(Number(answers[q.id])) && Number(answers[q.id]) > 0 && Number(answers[q.id]) <= 999));
}
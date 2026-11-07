export function matchesPublicHousehold(household: { id: string; vereda: string }, query: string) {
  return `${household.id} ${household.vereda}`.toLowerCase().includes(query.trim().toLowerCase());
}
export function publicHouseholdId(id: string) {
  return id.replace(/^fam_/i, "HH_");
}

export function matchesPublicHousehold(household: { id: string; vereda: string }, query: string) {
  return `${publicHouseholdId(household.id)} ${household.vereda}`.toLowerCase().includes(query.trim().toLowerCase());
}
export function fieldHouseholdIds(households: { id: string }[], addedIds: string[]) {
  return Array.from(new Set([...households.map(({ id }) => id), ...addedIds]));
}

export function validateFieldHouseholdId(value: string, existingIds: string[]) {
  const id = value.trim().toLowerCase();
  if (!/^fam_\d{2,8}$/.test(id)) {
    return { error: "Use el formato fam_09: solo un código numérico, sin nombres." };
  }
  if (existingIds.includes(id)) return { error: "Este ID ya está listado. Selecciónelo arriba." };
  return { id };
}
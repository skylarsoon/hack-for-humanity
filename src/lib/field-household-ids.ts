export function fieldHouseholdIds(households: { id: string }[], addedIds: string[]) {
  return Array.from(new Set([...households.map(({ id }) => id), ...addedIds]));
}

export function validateFieldHouseholdId(value: string, existingIds: string[]) {
  const id = value.trim().toUpperCase();
  if (!/^HH_\d{2,8}$/.test(id)) {
    return { error: "Use el formato HH_09: solo un código numérico, sin nombres." };
  }
  if (existingIds.includes(id)) return { error: "Este ID ya está listado. Selecciónelo arriba." };
  return { id };
}
/** Field crews survey families in person, so the mobile screen may show "ID · surname". Never use this on public views. */
export function fieldHouseholdLabel(id: string, households: { id: string; name: string }[], addedNames: Record<string, string>) {
  const name = households.find((h) => h.id === id)?.name ?? addedNames[id];
  const surname = name?.replace(/^Familia\s+/i, "").trim();
  return surname ? `${id} · ${surname}` : id;
}

export function validateFieldSurname(value: string) {
  const s = value.trim();
  if (!s) return { surname: "" };
  if (!/^[\p{L}' -]{2,40}$/u.test(s)) return { error: "Solo el apellido de la familia, sin números ni datos de contacto." };
  return { surname: s };
}

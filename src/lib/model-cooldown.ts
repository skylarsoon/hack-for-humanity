// Remembers models that just failed so later requests skip them instead of hammering an overloaded or unavailable model.
export const BUSY_COOLDOWN_MS = 20_000;
export const MISSING_COOLDOWN_MS = 10 * 60_000;

export function createCooldown(now: () => number = Date.now) {
  const until = new Map<string, number>();
  return {
    mark(model: string, ms: number) {
      until.set(model, Math.max(until.get(model) ?? 0, now() + ms));
    },
    isCooling(model: string) {
      return (until.get(model) ?? 0) > now();
    },
    /** Models to try now, in order. */
    available(models: string[]) {
      return models.filter((m) => !(until.get(m) !== undefined && until.get(m)! > now()));
    },
  };
}

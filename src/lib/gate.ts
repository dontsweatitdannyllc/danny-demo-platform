const FREE_VIEWS = parseInt(process.env.PAYWALL_FREE_VIEWS || '2', 10);
const COOLDOWN_HOURS = parseInt(process.env.PAYWALL_COOLDOWN_HOURS || '24', 10);

export function gateConfig() {
  return {
    FREE_VIEWS,
    COOLDOWN_HOURS,
    cooldownMs: COOLDOWN_HOURS * 60 * 60 * 1000,
  };
}

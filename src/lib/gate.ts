const FREE_PREVIEW_HOURS = parseInt(process.env.PAYWALL_FREE_PREVIEW_HOURS || '24', 10);

export function gateConfig() {
  return {
    FREE_PREVIEW_HOURS,
    freePreviewMs: FREE_PREVIEW_HOURS * 60 * 60 * 1000,
  };
}

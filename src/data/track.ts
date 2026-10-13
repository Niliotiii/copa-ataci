// Wrapper fino sobre o tracker do Umami (window.umami, injetado por /script.js).
// Seguro de chamar mesmo que o script não tenha carregado (ad-blocker, offline):
// nesse caso vira um no-op silencioso.
export function trackEvent(
  eventName: string,
  eventData?: Record<string, unknown>,
): void {
  try {
    window.umami?.track(eventName, eventData);
  } catch {
    // Nunca deixa a telemetria quebrar a UI.
  }
}

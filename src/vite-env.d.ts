/// <reference types="vite/client" />

// Tracker do Umami, injetado por /script.js no index.html (window.umami).
// Fica opcional porque o script pode não ter carregado (ad-blocker, offline, etc.).
interface Window {
  umami?: {
    track: (
      eventName: string,
      eventData?: Record<string, unknown>,
    ) => void
  }
}

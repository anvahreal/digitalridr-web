type MetaPixelParameters = Record<string, unknown>;
type MetaPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

const CONSENT_STORAGE_KEY = "digital-ridr-analytics-consent";
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "1079733164560342";

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}

export function hasAnalyticsConsent() {
  return typeof window !== "undefined" && localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted";
}

/** Loads and initializes Meta Pixel after a visitor has opted in to analytics cookies. */
export function initializeMetaPixel() {
  if (!hasAnalyticsConsent()) return;

  if (window.fbq) {
    window.fbq("consent", "grant");
    window.fbq("track", "PageView");
    return;
  }

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue?.push(args);
    }
  }) as MetaPixelFunction;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq ??= fbq;

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
}

/** Stops future Meta Pixel events when consent is withdrawn. */
export function revokeMetaPixelConsent() {
  window.fbq?.("consent", "revoke");
}

/** Sends a standard Meta Pixel event only after analytics consent has been granted. */
export function trackMetaEvent(eventName: string, parameters?: MetaPixelParameters) {
  if (!hasAnalyticsConsent()) return;

  if (parameters) {
    window.fbq?.("track", eventName, parameters);
    return;
  }

  window.fbq?.("track", eventName);
}

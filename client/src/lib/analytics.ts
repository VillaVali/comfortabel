type UmamiWindow = Window & {
  umami?: {
    track: (
      eventName: string,
      eventData?: Record<string, string | number | boolean>
    ) => unknown;
  };
};

type AnalyticsEvent = {
  eventName: string;
  eventData?: Record<string, string | number | boolean>;
};

const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.replace(
  /\/+$/,
  ""
);
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
const pendingEvents: AnalyticsEvent[] = [];

function flushPendingEvents(): void {
  const analytics = (window as UmamiWindow).umami;
  if (!analytics) return;

  for (const event of pendingEvents.splice(0)) {
    analytics.track(event.eventName, event.eventData);
  }
}

function initializeAnalytics(): void {
  if (
    !analyticsEndpoint ||
    !analyticsWebsiteId ||
    typeof document === "undefined"
  ) {
    return;
  }

  if (document.querySelector('script[data-mijncomfortabel-analytics="true"]')) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = `${analyticsEndpoint}/umami`;
  script.dataset.websiteId = analyticsWebsiteId;
  script.dataset.mijncomfortabelAnalytics = "true";
  script.addEventListener("load", flushPendingEvents, { once: true });
  document.head.appendChild(script);
}

initializeAnalytics();

export function trackEvent(
  eventName: string,
  eventData?: Record<string, string | number | boolean>
): void {
  try {
    const analytics = (window as UmamiWindow).umami;
    if (analytics) {
      analytics.track(eventName, eventData);
    } else if (analyticsEndpoint && analyticsWebsiteId) {
      pendingEvents.push({ eventName, eventData });
    }
  } catch {
    // Analytics must never interrupt the user journey.
  }
}

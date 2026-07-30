export type Founding100Attribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPath?: string;
};

const STORAGE_KEY = "mc_founding100_attribution";

function clean(value: string | null, max = 200): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

export function captureFounding100Attribution(): Founding100Attribution {
  const params = new URLSearchParams(window.location.search);
  const incoming: Founding100Attribution = {
    utmSource: clean(params.get("utm_source")),
    utmMedium: clean(params.get("utm_medium")),
    utmCampaign: clean(params.get("utm_campaign")),
    utmTerm: clean(params.get("utm_term")),
    utmContent: clean(params.get("utm_content")),
    referrer: clean(document.referrer, 2000),
    landingPath: clean(
      `${window.location.pathname}${window.location.search}`,
      500
    ),
  };

  try {
    const previous = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || "{}"
    ) as Founding100Attribution;
    const merged = {
      ...previous,
      ...Object.fromEntries(
        Object.entries(incoming).filter(([, value]) => Boolean(value))
      ),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return incoming;
  }
}

export function getFounding100Attribution(): Founding100Attribution {
  try {
    return JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || "{}"
    ) as Founding100Attribution;
  } catch {
    return {};
  }
}

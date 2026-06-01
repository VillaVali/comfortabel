export const COOKIE_NAME = "mc_session";

export const APP_NAME = "MijnComfortabel";

// ─── Subscription Tiers ───────────────────────────────────────────────────────

export type SubscriptionTier = "free" | "digital" | "basis" | "plus" | "premium";

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  "free", "digital", "basis", "plus", "premium",
];

export const SUBSCRIPTION_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  digital: "Digital",
  basis: "Basis",
  plus: "Plus",
  premium: "Premium",
};

export const SUBSCRIPTION_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  digital: 9,
  basis: 19,
  plus: 39,
  premium: 79,
};

export const SUBSCRIPTION_COLORS: Record<SubscriptionTier, string> = {
  free: "#64748b",
  digital: "#2563eb",
  basis: "#0891b2",
  plus: "#7c3aed",
  premium: "#C9A84C",
};

export const SUBSCRIPTION_DESCRIPTIONS: Record<SubscriptionTier, string> = {
  free: "Basisinzicht in uw woning — gratis voor altijd",
  digital: "Digitaal woningdossier met documentopslag",
  basis: "Professionele 0-meting en Woningpaspoort™",
  plus: "Volledig onderhoudsbeheer en meerjarenplanning",
  premium: "Alles inbegrepen — inclusief jaarlijkse inspectie",
};

// Feature flags per tier — true = beschikbaar
export type FeatureKey =
  | "woningpaspoort"       // Woningpaspoort™ basisgegevens
  | "woningScore"          // Woning Score™ A-E
  | "documenten"           // Documenten uploaden/bekijken
  | "onderhoud"            // Onderhoudspunten bekijken
  | "planning"             // Meerjarenplanning
  | "pdfRapport"           // PDF-rapport downloaden
  | "nulmeting"            // 0-meting / inspectie
  | "urgentieAlerts"       // Urgentie-meldingen
  | "prioriteitsOnderhoud" // Prioriteit onderhoudspunten
  | "kostenOverzicht"      // Kostenoverzicht
  | "jaarlijkseInspectie"  // Jaarlijkse inspectie inbegrepen
  | "directContact";       // Direct contact met Comfortabel

export const PLAN_FEATURES: Record<SubscriptionTier, Record<FeatureKey, boolean>> = {
  free: {
    woningpaspoort: true,
    woningScore: false,
    documenten: false,
    onderhoud: false,
    planning: false,
    pdfRapport: false,
    nulmeting: false,
    urgentieAlerts: false,
    prioriteitsOnderhoud: false,
    kostenOverzicht: false,
    jaarlijkseInspectie: false,
    directContact: false,
  },
  digital: {
    woningpaspoort: true,
    woningScore: false,
    documenten: true,
    onderhoud: false,
    planning: false,
    pdfRapport: false,
    nulmeting: false,
    urgentieAlerts: false,
    prioriteitsOnderhoud: false,
    kostenOverzicht: false,
    jaarlijkseInspectie: false,
    directContact: false,
  },
  basis: {
    woningpaspoort: true,
    woningScore: true,
    documenten: true,
    onderhoud: true,
    planning: false,
    pdfRapport: true,
    nulmeting: true,
    urgentieAlerts: true,
    prioriteitsOnderhoud: false,
    kostenOverzicht: false,
    jaarlijkseInspectie: false,
    directContact: false,
  },
  plus: {
    woningpaspoort: true,
    woningScore: true,
    documenten: true,
    onderhoud: true,
    planning: true,
    pdfRapport: true,
    nulmeting: true,
    urgentieAlerts: true,
    prioriteitsOnderhoud: true,
    kostenOverzicht: true,
    jaarlijkseInspectie: false,
    directContact: false,
  },
  premium: {
    woningpaspoort: true,
    woningScore: true,
    documenten: true,
    onderhoud: true,
    planning: true,
    pdfRapport: true,
    nulmeting: true,
    urgentieAlerts: true,
    prioriteitsOnderhoud: true,
    kostenOverzicht: true,
    jaarlijkseInspectie: true,
    directContact: true,
  },
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  woningpaspoort: "Woningpaspoort™ basisgegevens",
  woningScore: "Woning Score™ (A–E)",
  documenten: "Digitale documentenmap",
  onderhoud: "Onderhoudspunten",
  planning: "Meerjarenplanning (MJOP)",
  pdfRapport: "PDF-rapport downloaden",
  nulmeting: "Professionele 0-meting",
  urgentieAlerts: "Urgentie-meldingen",
  prioriteitsOnderhoud: "Prioriteit & kostenoverzicht",
  kostenOverzicht: "Volledig kostenoverzicht",
  jaarlijkseInspectie: "Jaarlijkse inspectie inbegrepen",
  directContact: "Direct contact met Comfortabel",
};

// ─── Woning Score ─────────────────────────────────────────────────────────────

export const GRADE_LABELS: Record<string, string> = {
  A: "Uitstekend onderhouden",
  B: "Goed onderhouden",
  C: "Aandacht nodig",
  D: "Verhoogd risico",
  E: "Achterstallig onderhoud",
};

export const GRADE_COLORS: Record<string, string> = {
  A: "#16a34a",
  B: "#4ade80",
  C: "#facc15",
  D: "#f97316",
  E: "#ef4444",
};

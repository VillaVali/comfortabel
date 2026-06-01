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
  digital: 9.95,
  basis: 49,
  plus: 89,
  premium: 149,
};

export const SUBSCRIPTION_COLORS: Record<SubscriptionTier, string> = {
  free: "#64748b",
  digital: "#2563eb",
  basis: "#0891b2",
  plus: "#7c3aed",
  premium: "#C9A84C",
};

export const SUBSCRIPTION_DESCRIPTIONS: Record<SubscriptionTier, string> = {
  free: "Beperkt woning- of bedrijfspaspoort — gratis voor altijd",
  digital: "Uitgebreid digitaal woningdossier met slimme herinneringen",
  basis: "1 inspectiebezoek per jaar + jaarlijks onderhoudsrapport",
  plus: "2 bezoeken, 6 onderhoudsuren en WhatsApp-ondersteuning",
  premium: "4 bezoeken, 12 uren en een vast technisch aanspreekpunt",
};

// Feature flags per tier — true = beschikbaar
export type FeatureKey =
  | "paspoortBeperkt"        // Beperkt woning-/bedrijfspaspoort
  | "paspoortUitgebreid"     // Uitgebreid woning-/bedrijfspaspoort
  | "documentenBeperkt"      // Beperkte documentenkluis
  | "documentenUitgebreid"   // Meer documentopslag
  | "fotoUploadBeperkt"      // Beperkte foto-upload
  | "onderhoudskalender"     // Basis onderhoudskalender
  | "comfortabelScore"       // Comfortabel Score
  | "aiHuismeesterBeperkt"   // Beperkte AI Huismeester
  | "aiHuismeesterUitgebreid"// Uitgebreide AI Huismeester
  | "garantiebeheer"         // Garantiebeheer
  | "onderhoudsarchief"      // Onderhoudsarchief
  | "onderhoudsherinneringen"// Slimme onderhoudsherinneringen
  | "exportDossier"          // Export woningdossier
  | "prioriteitOfferte"      // Prioriteit bij offerteaanvragen
  | "inspectiebezoek1"       // 1 inspectiebezoek per jaar
  | "inspectiebezoek2"       // 2 inspectiebezoeken per jaar
  | "inspectiebezoek4"       // 4 inspectiebezoeken per jaar
  | "jaarlijksRapport"       // Jaarlijks onderhoudsrapport
  | "onderhoudsplanning"     // Onderhoudsplanning
  | "kortingArbeid"          // Korting op arbeid
  | "kortingMateriaal"       // Korting op materiaalopslag
  | "voorrangPlanning"       // Voorrang bij reguliere planning
  | "onderhoudsuren6"        // 6 onderhoudsuren per jaar
  | "onderhoudsuren12"       // 12 onderhoudsuren per jaar
  | "whatsappSupport"        // WhatsApp ondersteuning
  | "calamiteitencoord"      // Calamiteitencoördinatie
  | "actiefOpvolging"        // Actieve opvolging aandachtspunten
  | "prioriteitCalamiteiten" // Prioriteit bij calamiteiten
  | "vasteContactpersoon"    // Vast technisch aanspreekpunt
  | "budgetplanning";        // Onderhoudsbudgetplanning

export const PLAN_FEATURES: Record<SubscriptionTier, Record<FeatureKey, boolean>> = {
  free: {
    paspoortBeperkt: true,
    paspoortUitgebreid: false,
    documentenBeperkt: true,
    documentenUitgebreid: false,
    fotoUploadBeperkt: true,
    onderhoudskalender: true,
    comfortabelScore: true,
    aiHuismeesterBeperkt: true,
    aiHuismeesterUitgebreid: false,
    garantiebeheer: false,
    onderhoudsarchief: false,
    onderhoudsherinneringen: false,
    exportDossier: false,
    prioriteitOfferte: false,
    inspectiebezoek1: false,
    inspectiebezoek2: false,
    inspectiebezoek4: false,
    jaarlijksRapport: false,
    onderhoudsplanning: false,
    kortingArbeid: false,
    kortingMateriaal: false,
    voorrangPlanning: false,
    onderhoudsuren6: false,
    onderhoudsuren12: false,
    whatsappSupport: false,
    calamiteitencoord: false,
    actiefOpvolging: false,
    prioriteitCalamiteiten: false,
    vasteContactpersoon: false,
    budgetplanning: false,
  },
  digital: {
    paspoortBeperkt: true,
    paspoortUitgebreid: true,
    documentenBeperkt: true,
    documentenUitgebreid: true,
    fotoUploadBeperkt: true,
    onderhoudskalender: true,
    comfortabelScore: true,
    aiHuismeesterBeperkt: true,
    aiHuismeesterUitgebreid: true,
    garantiebeheer: true,
    onderhoudsarchief: true,
    onderhoudsherinneringen: true,
    exportDossier: true,
    prioriteitOfferte: true,
    inspectiebezoek1: false,
    inspectiebezoek2: false,
    inspectiebezoek4: false,
    jaarlijksRapport: false,
    onderhoudsplanning: false,
    kortingArbeid: false,
    kortingMateriaal: false,
    voorrangPlanning: false,
    onderhoudsuren6: false,
    onderhoudsuren12: false,
    whatsappSupport: false,
    calamiteitencoord: false,
    actiefOpvolging: false,
    prioriteitCalamiteiten: false,
    vasteContactpersoon: false,
    budgetplanning: false,
  },
  basis: {
    paspoortBeperkt: true,
    paspoortUitgebreid: true,
    documentenBeperkt: true,
    documentenUitgebreid: true,
    fotoUploadBeperkt: true,
    onderhoudskalender: true,
    comfortabelScore: true,
    aiHuismeesterBeperkt: true,
    aiHuismeesterUitgebreid: true,
    garantiebeheer: true,
    onderhoudsarchief: true,
    onderhoudsherinneringen: true,
    exportDossier: true,
    prioriteitOfferte: true,
    inspectiebezoek1: true,
    inspectiebezoek2: false,
    inspectiebezoek4: false,
    jaarlijksRapport: true,
    onderhoudsplanning: true,
    kortingArbeid: true,
    kortingMateriaal: true,
    voorrangPlanning: true,
    onderhoudsuren6: false,
    onderhoudsuren12: false,
    whatsappSupport: false,
    calamiteitencoord: false,
    actiefOpvolging: false,
    prioriteitCalamiteiten: false,
    vasteContactpersoon: false,
    budgetplanning: false,
  },
  plus: {
    paspoortBeperkt: true,
    paspoortUitgebreid: true,
    documentenBeperkt: true,
    documentenUitgebreid: true,
    fotoUploadBeperkt: true,
    onderhoudskalender: true,
    comfortabelScore: true,
    aiHuismeesterBeperkt: true,
    aiHuismeesterUitgebreid: true,
    garantiebeheer: true,
    onderhoudsarchief: true,
    onderhoudsherinneringen: true,
    exportDossier: true,
    prioriteitOfferte: true,
    inspectiebezoek1: true,
    inspectiebezoek2: true,
    inspectiebezoek4: false,
    jaarlijksRapport: true,
    onderhoudsplanning: true,
    kortingArbeid: true,
    kortingMateriaal: true,
    voorrangPlanning: true,
    onderhoudsuren6: true,
    onderhoudsuren12: false,
    whatsappSupport: true,
    calamiteitencoord: true,
    actiefOpvolging: true,
    prioriteitCalamiteiten: false,
    vasteContactpersoon: false,
    budgetplanning: false,
  },
  premium: {
    paspoortBeperkt: true,
    paspoortUitgebreid: true,
    documentenBeperkt: true,
    documentenUitgebreid: true,
    fotoUploadBeperkt: true,
    onderhoudskalender: true,
    comfortabelScore: true,
    aiHuismeesterBeperkt: true,
    aiHuismeesterUitgebreid: true,
    garantiebeheer: true,
    onderhoudsarchief: true,
    onderhoudsherinneringen: true,
    exportDossier: true,
    prioriteitOfferte: true,
    inspectiebezoek1: true,
    inspectiebezoek2: true,
    inspectiebezoek4: true,
    jaarlijksRapport: true,
    onderhoudsplanning: true,
    kortingArbeid: true,
    kortingMateriaal: true,
    voorrangPlanning: true,
    onderhoudsuren6: true,
    onderhoudsuren12: true,
    whatsappSupport: true,
    calamiteitencoord: true,
    actiefOpvolging: true,
    prioriteitCalamiteiten: true,
    vasteContactpersoon: true,
    budgetplanning: true,
  },
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  paspoortBeperkt: "Beperkt woning- of bedrijfspaspoort",
  paspoortUitgebreid: "Uitgebreid woning- of bedrijfspaspoort",
  documentenBeperkt: "Beperkte documentenkluis",
  documentenUitgebreid: "Meer documentopslag",
  fotoUploadBeperkt: "Beperkte foto-upload",
  onderhoudskalender: "Basis onderhoudskalender",
  comfortabelScore: "Comfortabel Score",
  aiHuismeesterBeperkt: "Beperkte AI Huismeester",
  aiHuismeesterUitgebreid: "Uitgebreide AI Huismeester",
  garantiebeheer: "Garantiebeheer",
  onderhoudsarchief: "Onderhoudsarchief",
  onderhoudsherinneringen: "Slimme onderhoudsherinneringen",
  exportDossier: "Export woningdossier",
  prioriteitOfferte: "Prioriteit bij offerteaanvragen",
  inspectiebezoek1: "1 inspectiebezoek per jaar",
  inspectiebezoek2: "2 inspectiebezoeken per jaar",
  inspectiebezoek4: "4 inspectiebezoeken per jaar",
  jaarlijksRapport: "Jaarlijks onderhoudsrapport",
  onderhoudsplanning: "Onderhoudsplanning",
  kortingArbeid: "Korting op arbeid",
  kortingMateriaal: "Korting op materiaalopslag",
  voorrangPlanning: "Voorrang bij reguliere planning",
  onderhoudsuren6: "6 onderhoudsuren per jaar",
  onderhoudsuren12: "12 onderhoudsuren per jaar",
  whatsappSupport: "WhatsApp ondersteuning",
  calamiteitencoord: "Calamiteitencoördinatie",
  actiefOpvolging: "Actieve opvolging aandachtspunten",
  prioriteitCalamiteiten: "Prioriteit bij calamiteiten",
  vasteContactpersoon: "Vast technisch aanspreekpunt",
  budgetplanning: "Onderhoudsbudgetplanning",
};

// Feature order for comparison table
export const FEATURE_ORDER: FeatureKey[] = [
  "paspoortBeperkt",
  "paspoortUitgebreid",
  "documentenBeperkt",
  "documentenUitgebreid",
  "fotoUploadBeperkt",
  "onderhoudskalender",
  "comfortabelScore",
  "aiHuismeesterBeperkt",
  "aiHuismeesterUitgebreid",
  "garantiebeheer",
  "onderhoudsarchief",
  "onderhoudsherinneringen",
  "exportDossier",
  "prioriteitOfferte",
  "inspectiebezoek1",
  "inspectiebezoek2",
  "inspectiebezoek4",
  "jaarlijksRapport",
  "onderhoudsplanning",
  "kortingArbeid",
  "kortingMateriaal",
  "voorrangPlanning",
  "onderhoudsuren6",
  "onderhoudsuren12",
  "whatsappSupport",
  "calamiteitencoord",
  "actiefOpvolging",
  "prioriteitCalamiteiten",
  "vasteContactpersoon",
  "budgetplanning",
];

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

import { useParams } from "wouter";
import ClientLayout from "../../components/ClientLayout";
import { trpc } from "../../lib/trpc";
import WoningScore, { ScoreBar } from "../../components/WoningScore";
import {
  Home,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Leaf,
  Euro,
  Star,
  Globe,
  Bot,
} from "lucide-react";
import { useState } from "react";
import DocumentsPanel from "../../components/DocumentsPanel";
import {
  PLAN_FEATURES, SUBSCRIPTION_LABELS, SUBSCRIPTION_COLORS,
  SUBSCRIPTION_PRICES, type SubscriptionTier,
} from "@shared/const";
import { Lock, ArrowUpRight, PencilLine } from "lucide-react";
import ChangeRequestDialog from "../../components/ChangeRequestDialog";

// Field category mirrors the server-side FIELD_CATEGORY (single source of truth
// in server/lib/passport.ts). A = system/official, B = validated → both LOCKED
// for the client (require a change request). Keep this in sync with the server.
const CLIENT_FIELD_CATEGORY: Record<string, "A" | "B"> = {
  // Category A — system / official identity (mirror of server FIELD_CATEGORY)
  street: "A", houseNumber: "A", postalCode: "A", city: "A", addition: "A", houseLetter: "A",
  bagId: "A", bagObjectId: "A", bagNumberDesignationId: "A", normalizedAddressKey: "A",
  surfaceM2: "A", buildYear: "A", propertyType: "A",
  wozValue: "A", wozYear: "A", kadastraleAanduiding: "A", buurtCode: "A", wijk: "A",
  ownershipType: "A", isMonument: "A", monumentType: "A", hasErfpacht: "A", erfpachtCanon: "A",
  // Category B — Comfortabel-validated
  energyLabel: "B", addressValidationStatus: "B", status: "B",
};

function LockedFeature({ tier, feature }: { tier: SubscriptionTier; feature: string }) {
  const upgradeTier = tier === "free" ? "digital" : tier === "digital" ? "basis" : tier === "basis" ? "plus" : "premium";
  const color = SUBSCRIPTION_COLORS[upgradeTier];
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="font-semibold text-slate-700 mb-2">{feature} niet beschikbaar</h3>
      <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
        Upgrade naar <strong style={{ color }}>{SUBSCRIPTION_LABELS[upgradeTier]}</strong> om
        toegang te krijgen tot deze functie.
      </p>
      <a
        href="/abonnementen"
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        Bekijk pakketten
        <ArrowUpRight className="w-4 h-4" />
      </a>
    </div>
  );
}

export default function ClientProperty() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);
  const [activeTab, setActiveTab] = useState<"paspoort" | "onderhoud" | "planning" | "documenten" | "downloads">("paspoort");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [crField, setCrField] = useState<{ field: string; label: string; current: string; category: "A" | "B" } | null>(null);

  const { data: property } = trpc.properties.get.useQuery({ id: propertyId });
  const { data: myRequests = [] } = trpc.changeRequests.listMine.useQuery({ propertyId });
  const { data: inspections = [] } = trpc.inspections.listByProperty.useQuery({ propertyId });
  const { data: issues = [] } = trpc.maintenance.listIssues.useQuery({ propertyId });
  const { data: planning = [] } = trpc.maintenance.listPlanning.useQuery({ propertyId });

  const downloadReport = () => {
    window.open(`/api/reports/woningpaspoort/${propertyId}`, "_blank");
  };

  const downloadAiReport = async (type: string) => {
    setGeneratingReport(type);
    try {
      window.open(`/api/reports/${type}/${propertyId}`, "_blank");
    } finally {
      setTimeout(() => setGeneratingReport(null), 3000);
    }
  };

  const latestInspection = inspections.find((i) => i.status === "afgerond");
  const openIssues = issues.filter((i) => i.status !== "afgerond");
  const urgentIssues = openIssues.filter((i) => i.priority === "urgent");

  // Feature flags based on subscription tier
  const tier = (property?.subscriptionType ?? "free") as SubscriptionTier;
  const features = PLAN_FEATURES[tier];

  const openRequests = myRequests.filter((r) => r.status === "open");

  // Optie A: while a self-created property awaits Comfortabel validation, the
  // value features (score, reports, Mati) are locked for the client.
  const awaitingValidation = property?.status === "wacht_op_validatie";

  if (!property) {
    return (
      <ClientLayout title="Woning" backHref="/mijn">
        <div className="text-center py-16 text-slate-400">Woning niet gevonden</div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout
      title={`${property.street} ${property.houseNumber}, ${property.city}`}
      backHref="/mijn"
    >
      {/* Alert banner for urgent issues */}
      {urgentIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-sm">
              {urgentIssues.length} urgent{urgentIssues.length !== 1 ? "e" : ""} onderhoudspunt
              {urgentIssues.length !== 1 ? "en" : ""}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Neem contact op met Comfortabel voor directe actie.
            </p>
          </div>
        </div>
      )}

      {/* Optie A: awaiting-validation banner */}
      {awaitingValidation && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800 text-sm">In behandeling — wacht op validatie</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              U kunt uw dossier alvast aanvullen. Comfortabel valideert uw woning (0-meting); daarna
              worden uw Woning Score™, rapporten en Mati vrijgegeven.
            </p>
          </div>
        </div>
      )}

      {/* Subscription badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: `${SUBSCRIPTION_COLORS[tier]}20`,
            color: SUBSCRIPTION_COLORS[tier],
          }}
        >
          {SUBSCRIPTION_LABELS[tier]}
          {SUBSCRIPTION_PRICES[tier] > 0 ? ` • €${SUBSCRIPTION_PRICES[tier]}/mnd` : " • Gratis"}
        </span>
        <div className="flex items-center gap-2">
        {awaitingValidation ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 cursor-not-allowed"
            title="Mati is beschikbaar na validatie"
          >
            <Lock className="w-3.5 h-3.5" />
            Mati
          </span>
        ) : (
          <a
            href={`/mijn/woning/${propertyId}/huismeester`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] hover:bg-[#1E3A5F]/20 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            Mati
          </a>
        )}
        <a
          href="/abonnementen"
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
        >
          Pakket wijzigen
          <ArrowUpRight className="w-3 h-3" />
        </a>
        </div>
      </div>

      {/* Score card — gated for woningScore */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Woning Score™</h2>
          <div className="flex items-center gap-3">
            {latestInspection && (
              <span className="text-xs text-slate-400">
                Inspectie: {new Date(latestInspection.inspectionDate).toLocaleDateString("nl-NL")}
              </span>
            )}
            {features.jaarlijksRapport && !awaitingValidation && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-1.5 text-xs text-[#1E3A5F] border border-[#1E3A5F]/20 px-3 py-1.5 rounded-lg hover:bg-[#1E3A5F]/5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Rapport
              </button>
            )}
          </div>
        </div>
        {awaitingValidation ? (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
              <Clock className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-500 text-center max-w-xs">
              Uw Woning Score™ wordt bepaald na de validatie/0-meting door Comfortabel.
            </p>
          </div>
        ) : features.comfortabelScore ? (
          <WoningScore
            grade={latestInspection?.woningGrade as any}
            totalScore={latestInspection?.totalScore}
            size="lg"
          />
        ) : (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <Lock className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 mb-3">Woning Score™ is beschikbaar vanaf <strong>Basis</strong></p>
            <a href="/abonnementen" className="text-xs text-[#1E3A5F] font-semibold hover:underline flex items-center gap-1">
              Upgrade <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        )}
        {features.comfortabelScore && latestInspection && latestInspection.status === "afgerond" && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScoreBar score={latestInspection.scoreInstallaties} label="Installaties" />
            <ScoreBar score={latestInspection.scoreBouwkundig} label="Bouwkundig" />
            <ScoreBar score={latestInspection.scoreVeiligheid} label="Veiligheid" />
            <ScoreBar score={latestInspection.scoreVochtVentilatie} label="Vocht & Ventilatie" />
            <ScoreBar score={latestInspection.scoreEnergie} label="Energie" />
          </div>
        )}
        {latestInspection?.summary && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Samenvatting inspectie</p>
            <p className="text-sm text-slate-700">{latestInspection.summary}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {[
          { id: "paspoort", label: "Woningpaspoort", icon: Home },
          { id: "onderhoud", label: `Onderhoud ${openIssues.length > 0 ? `(${openIssues.length})` : ""}`, icon: AlertTriangle },
          { id: "planning", label: "Planning", icon: Calendar },
          { id: "documenten", label: "Documenten", icon: FileText },
          { id: "downloads", label: "Downloads", icon: Download },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-[#1E3A5F] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "paspoort" && (
        <div className="space-y-4">

          {openRequests.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-0.5">
                  {openRequests.length} correctieverzoek{openRequests.length > 1 ? "en" : ""} in behandeling
                </p>
                <p className="text-amber-700 text-xs">
                  Comfortabel controleert uw voorstel{openRequests.length > 1 ? "len" : ""} (o.a.{" "}
                  {openRequests.map((r) => r.fieldName).join(", ")}) en past de gegevens aan zodra gevalideerd.
                </p>
              </div>
            </div>
          )}

          {/* ── Blok 1: Basisidentiteit (altijd zichtbaar) ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Home className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">Basisidentiteit</h3>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
                <Lock className="w-3 h-3" /> = gevalideerd, alleen via correctieverzoek
              </span>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {([
                ["Straat", property.street, "street"],
                ["Huisnummer", property.houseNumber, "houseNumber"],
                ["Postcode", property.postalCode, "postalCode"],
                ["Plaats", property.city, "city"],
                ["Woningtype", property.propertyType, "propertyType"],
                ["Bouwjaar", property.buildYear, "buildYear"],
                ["Oppervlakte", property.surfaceM2 ? `${property.surfaceM2} m²` : null, "surfaceM2"],
                ["Bewoners", property.residents, "residents"],
                ["Energielabel", property.energyLabel, "energyLabel"],
                ["Eigendomsvorm", property.ownershipType ? ({
                  volle_eigendom: "Volle eigendom",
                  erfpacht: "Erfpacht",
                  appartementsrecht: "Appartementsrecht",
                  opstalrecht: "Opstalrecht",
                  onbekend: "Onbekend",
                } as Record<string,string>)[property.ownershipType] : null, "ownershipType"],
                ["Kadastrale aanduiding", property.kadastraleAanduiding, "kadastraleAanduiding"],
                ["Wijk", property.wijk, "wijk"],
                ["BAG-gebruiksfunctie", property.bestemmingCategory, "bestemmingCategory"],
              ] as [string, unknown, string][]).filter(([, v]) => v != null && v !== "").map(([label, value, field]) => {
                const cat = CLIENT_FIELD_CATEGORY[field];
                return (
                  <div key={label} className="group">
                    <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                      {label}
                      {cat && <Lock className="w-3 h-3 text-slate-300" />}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 capitalize">{String(value)}</p>
                      {cat && (
                        <button
                          onClick={() => setCrField({ field, label, current: String(value), category: cat })}
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] text-[#1E3A5F] hover:underline"
                          title="Correctie aanvragen"
                        >
                          <PencilLine className="w-3 h-3" /> Correctie
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {property.isMonument && (
                <div className="col-span-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    ⚠️ Beschermd monument
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Blok 2: Waarde & Financieel (Digital+) ── */}
          {features.paspoortUitgebreid ? (
            (property.wozValue || property.purchasePrice || property.vveContribution || property.mortgageProvider) ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-slate-400 text-sm">€</span>
                  <h3 className="font-semibold text-slate-800 text-sm">Waarde & Financieel</h3>
                </div>
                <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {([
                    ["WOZ-waarde", property.wozValue ? `€${property.wozValue.toLocaleString("nl-NL")}${property.wozYear ? ` (${property.wozYear})` : ""}` : null, "wozValue"],
                    ["Koopsom", property.purchasePrice ? `€${property.purchasePrice.toLocaleString("nl-NL")}${property.purchaseYear ? ` (${property.purchaseYear})` : ""}` : null, "purchasePrice"],
                    ["VvE-bijdrage", property.vveContribution ? `€${property.vveContribution}/mnd` : null, "vveContribution"],
                    ["Hypotheekverstrekker", property.mortgageProvider, "mortgageProvider"],
                    ["Erfpachtcanon", property.erfpachtCanon ? `€${property.erfpachtCanon}/jr` : null, "erfpachtCanon"],
                    ["Opstalverzekering", property.insuranceExpiry ? `Vervalt ${new Date(property.insuranceExpiry).toLocaleDateString("nl-NL")}` : null, "insuranceExpiry"],
                  ] as [string, unknown, string][]).filter(([, v]) => v != null && v !== "").map(([label, value, field]) => {
                    const cat = CLIENT_FIELD_CATEGORY[field];
                    return (
                      <div key={label} className="group">
                        <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                          {label}
                          {cat && <Lock className="w-3 h-3 text-slate-300" />}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800">{String(value)}</p>
                          {cat && (
                            <button
                              onClick={() => setCrField({ field, label, current: String(value), category: cat })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] text-[#1E3A5F] hover:underline"
                              title="Correctie aanvragen"
                            >
                              <PencilLine className="w-3 h-3" /> Correctie
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 flex items-center gap-4">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">Waarde & Financieel</p>
                <p className="text-xs text-slate-400">Beschikbaar vanaf <strong>Digital</strong></p>
              </div>
              <a href="/abonnementen" className="text-xs text-[#1E3A5F] font-semibold hover:underline flex items-center gap-1">
                Upgrade <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* ── Blok 3: Juridisch & Omgeving (Digital+) ── */}
          {features.paspoortUitgebreid && (property.monumentType || property.bestemmingUrl || property.hasErfpacht || property.hasBeslag || property.buurtCode) ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-800 text-sm">Juridisch & Omgeving</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {([
                  ["Monumentstatus", property.monumentType && property.monumentType !== "geen" ? ({
                    rijksmonument: "Rijksmonument",
                    gemeentelijk: "Gemeentelijk monument",
                  } as Record<string,string>)[property.monumentType] : null, "monumentType"],
                  ["CBS buurtcode", property.buurtCode, "buurtCode"],
                ] as [string, unknown, string][]).filter(([, v]) => v != null && v !== "").map(([label, value, field]) => {
                  const cat = CLIENT_FIELD_CATEGORY[field];
                  return (
                    <div key={label} className="group">
                      <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                        {label}
                        {cat && <Lock className="w-3 h-3 text-slate-300" />}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{String(value)}</p>
                        {cat && (
                          <button
                            onClick={() => setCrField({ field, label, current: String(value), category: cat })}
                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] text-[#1E3A5F] hover:underline"
                            title="Correctie aanvragen"
                          >
                            <PencilLine className="w-3 h-3" /> Correctie
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {property.bestemmingUrl && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400 mb-0.5">Omgevingsloket</p>
                    <a href={property.bestemmingUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-[#1E3A5F] font-medium hover:underline flex items-center gap-1">
                      Bekijk bestemmingsplan <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="col-span-2 flex flex-wrap gap-2 mt-1">
                  {property.hasErfpacht && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Erfpacht</span>
                  )}
                  {property.hasBeslag && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">Beslag/hypotheekrecht</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Blok 4: Technische Kenmerken (Basis+) ── */}
          {features.paspoortUitgebreid && (property.foundationType || property.roofType || property.heatingSystem || property.glazingType || property.hasSolarPanels) ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-800 text-sm">Technische Kenmerken</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ["Fundering", property.foundationType],
                    ["Dak", property.roofType ? `${property.roofType.replace("_", " ")}${property.roofMaterial ? ` (${property.roofMaterial})` : ""}` : null],
                    ["Buitenmuur", property.wallType],
                    ["Verwarming", property.heatingSystem ? `${property.heatingSystem.replace("_", " ")}${property.heatingYear ? ` (${property.heatingYear})` : ""}` : null],
                    ["Warm water", property.hotWaterSystem],
                    ["Beglazing", property.glazingType ? property.glazingType.replace("_", "+") : null],
                  ].filter(([, v]) => v != null && v !== "" && v !== "onbekend").map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="font-medium text-slate-800 capitalize">{String(value)}</p>
                    </div>
                  ))}
                </div>
                {/* Isolatie */}
                {(property.roofInsulation || property.wallInsulation || property.floorInsulation) && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Isolatie</p>
                    <div className="flex flex-wrap gap-2">
                      {["Dak", property.roofInsulation, "Muur", property.wallInsulation, "Vloer", property.floorInsulation]
                        .reduce<[string, string][]>((acc, _, i, arr) => i % 2 === 0 ? [...acc, [arr[i] as string, arr[i+1] as string]] : acc, [])
                        .filter(([, v]) => v && v !== "onbekend")
                        .map(([label, value]) => (
                          <span key={label} className={`text-xs px-2.5 py-1 rounded-full border ${
                            value === "aanwezig" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            value === "deels" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>{label}: {value}</span>
                        ))
                      }
                    </div>
                  </div>
                )}
                {/* Installaties */}
                <div className="flex flex-wrap gap-2">
                  {property.hasSolarPanels && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                      ☀️ Zonnepanelen{property.solarPanelCount ? ` (${property.solarPanelCount}x)` : ""}
                    </span>
                  )}
                  {property.hasEVCharger && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      ⚡ Laadpaal
                    </span>
                  )}
                  {property.hasGasConnection === false && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✅ Aardgasvrij
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Blok 5: Verduurzaming (Digital+) ── */}
          {features.paspoortUitgebreid && (property.targetEnergyLabel || property.gasVrijDoeljaar || property.sustainabilityMeasures) ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="text-slate-400 text-sm">🌱</span>
                <h3 className="font-semibold text-slate-800 text-sm">Verduurzaming</h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex items-center gap-6">
                  {property.energyLabel && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Huidig label</p>
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold text-white text-sm" style={{
                        backgroundColor: { "A+++": "#00a651", "A++": "#00a651", "A+": "#00a651", "A": "#00a651", "B": "#50b848", "C": "#bed630", "D": "#ffd800", "E": "#f7941d", "F": "#f15a24", "G": "#ed1c24" }[property.energyLabel] ?? "#94a3b8"
                      }}>{property.energyLabel}</span>
                    </div>
                  )}
                  {property.targetEnergyLabel && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Streef-label</p>
                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold text-white text-sm border-2 border-dashed border-slate-300" style={{
                        backgroundColor: { "A+++": "#00a651", "A++": "#00a651", "A+": "#00a651", "A": "#00a651", "B": "#50b848", "C": "#bed630", "D": "#ffd800", "E": "#f7941d", "F": "#f15a24", "G": "#ed1c24" }[property.targetEnergyLabel] ?? "#94a3b8"
                      }}>{property.targetEnergyLabel}</span>
                    </div>
                  )}
                  {property.gasVrijDoeljaar && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Aardgasvrij doeljaar</p>
                      <p className="font-bold text-slate-800">{property.gasVrijDoeljaar}</p>
                    </div>
                  )}
                </div>
                {property.sustainabilityMeasures && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Genomen maatregelen</p>
                    <div className="flex flex-wrap gap-1.5">
                      {property.sustainabilityMeasures.split(",").map((m: string) => m.trim()).filter(Boolean).map((m: string) => (
                        <span key={m} className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {property.subsidiesApplied && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Subsidies</p>
                    <div className="flex flex-wrap gap-1.5">
                      {property.subsidiesApplied.split(",").map((s: string) => s.trim()).filter(Boolean).map((s: string) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* ── Inspectiehistorie ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">Inspectiehistorie</h3>
            </div>
            {inspections.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nog geen inspecties uitgevoerd</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {inspections.map((insp) => (
                  <div key={insp.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      insp.status === "afgerond" ? "bg-emerald-500" : "bg-amber-400"
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 capitalize">{insp.type}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(insp.inspectionDate).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                    {insp.woningGrade && (
                      <WoningScore grade={insp.woningGrade as any} size="sm" showLabel={false} />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      insp.status === "afgerond" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {insp.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "onderhoud" && (
        <div className="space-y-3">
          {!features.onderhoudsarchief && (
            <LockedFeature tier={tier} feature="Onderhoudsbeheer" />
          )}
          {features.onderhoudsarchief && (
            <div className="space-y-3">
              {openIssues.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 text-center py-14">
                  <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-1">Alles in orde</h3>
                  <p className="text-sm text-slate-400">Geen open onderhoudspunten</p>
                </div>
              ) : (
                openIssues.map((issue) => {
                  const priorityColor =
                    issue.priority === "urgent"
                      ? "border-red-200 bg-red-50"
                      : issue.priority === "hoog"
                      ? "border-orange-200 bg-orange-50"
                      : "border-slate-200 bg-white";
                  const priorityTextColor =
                    issue.priority === "urgent"
                      ? "text-red-700"
                      : issue.priority === "hoog"
                      ? "text-orange-700"
                      : "text-slate-600";
                  return (
                    <div key={issue.id} className={`rounded-2xl border p-5 ${priorityColor}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${priorityTextColor}`}>
                              {issue.priority}
                            </span>
                            {issue.category && (
                              <span className="text-xs text-slate-400">· {issue.category}</span>
                            )}
                          </div>
                          <h4 className="font-semibold text-slate-800">{issue.title}</h4>
                          {issue.description && (
                            <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            issue.status === "in_behandeling"
                              ? "bg-orange-100 text-orange-700"
                              : issue.status === "gepland"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-white text-slate-500 border border-slate-200"
                          }`}
                        >
                          {issue.status.replace("_", " ")}
                        </span>
                      </div>
                      {issue.estimatedCost && (
                        <p className="text-xs text-slate-500 mt-2">
                          Geschatte kosten: €{issue.estimatedCost.toLocaleString("nl-NL")}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
              {issues.filter((i) => i.status === "afgerond").length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <h3 className="font-medium text-slate-600 text-sm">
                      Afgerond ({issues.filter((i) => i.status === "afgerond").length})
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {issues.filter((i) => i.status === "afgerond").map((issue) => (
                      <div key={issue.id} className="px-5 py-3 flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <p className="text-sm text-slate-600 line-through">{issue.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "planning" && (
        <div>
          {!features.onderhoudsplanning && (
            <LockedFeature tier={tier} feature="Meerjarenplanning" />
          )}
          {features.onderhoudsplanning && (
            <div>
              {planning.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 text-center py-14">
                  <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Nog geen onderhoud gepland</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Onderhoudsplanning</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {planning.map((p) => (
                      <div key={p.id} className="px-5 py-4 flex items-start gap-4">
                        <div className="w-14 flex-shrink-0 text-center">
                          <span className="text-lg font-bold text-[#1E3A5F]">{p.plannedYear || "?"}</span>
                          <p className="text-xs text-slate-400 capitalize">{p.horizon}</p>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{p.title}</p>
                          {p.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{p.description}</p>
                          )}
                          {p.category && (
                            <span className="text-xs text-slate-400 mt-1 inline-block">{p.category}</span>
                          )}
                        </div>
                        {p.estimatedCost && (
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-slate-800">
                              €{p.estimatedCost.toLocaleString("nl-NL")}
                            </p>
                            <p className="text-xs text-slate-400">geschat</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "documenten" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          {features.documentenBeperkt ? (
            <DocumentsPanel propertyId={propertyId} isAdmin={false} />
          ) : (
            <LockedFeature tier={tier} feature="Documentenmap" />
          )}
        </div>
      )}

      {activeTab === "downloads" && (
        <div className="space-y-5">

          {/* Gratis openbare downloads */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Gratis openbare bronnen</h3>
              <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Altijd gratis</span>
            </div>
            <div className="divide-y divide-slate-50">
              {[
                {
                  name: "BAG Viewer — Gebouwkenmerken",
                  desc: "Bouwjaar, oppervlakte, gebruiksfunctie en status via de Basisregistratie Adressen en Gebouwen",
                  url: `https://bagviewer.kadaster.nl/lvbag/bag-viewer/#?searchQuery=${encodeURIComponent(`${property.street} ${property.houseNumber}, ${property.city}`)}`,
                  icon: "🏛️",
                },
                {
                  name: "WOZ-waardeloket — Actuele WOZ-waarde",
                  desc: "Officiële WOZ-waarde van uw woning, inclusief historische waarden",
                  url: `https://www.wozwaardeloket.nl/index.jsp?zoekopdracht=${encodeURIComponent(`${property.street} ${property.houseNumber}, ${property.postalCode}`)}`,
                  icon: "💰",
                },
                {
                  name: "EP-Online — Energielabel",
                  desc: "Officieel geregistreerd energielabel van uw woning via RVO",
                  url: `https://www.ep-online.nl/ep-online/zoek-energielabel?adres=${encodeURIComponent(`${property.street} ${property.houseNumber}`)}&postcode=${encodeURIComponent(property.postalCode || "")}`,
                  icon: "⚡",
                },
                {
                  name: "Kadaster — Perceelkaart",
                  desc: "Kadastrale perceelgrenzen, eigendomsinformatie en kadastraal nummer",
                  url: `https://www.kadaster.nl/zakelijk/producten/woning/woningrapport`,
                  icon: "📐",
                },
                {
                  name: "Omgevingsloket — Bestemmingsplan",
                  desc: "Bestemmingsplan, omgevingsvergunningen en bouwmogelijkheden in uw omgeving",
                  url: `https://omgevingswet.overheid.nl/regels-op-de-kaart/viewer/view?locatie=${encodeURIComponent(`${property.street} ${property.houseNumber}, ${property.city}`)}`,
                  icon: "🗺️",
                },
                {
                  name: "CBS Buurtstatistieken",
                  desc: "Demografische en economische statistieken van uw buurt",
                  url: `https://www.cbs.nl/nl-nl/visualisaties/dashboard-bevolking/regionaal/buurt`,
                  icon: "📊",
                },
                {
                  name: "Rijksmonumentenregister",
                  desc: "Controleer of uw woning een rijks- of gemeentelijk monument is",
                  url: `https://monumentenregister.cultureelerfgoed.nl/`,
                  icon: "🏛️",
                },
                {
                  name: "RVO ISDE Subsidiewijzer",
                  desc: "Bereken welke subsidies beschikbaar zijn voor isolatie en duurzame energie",
                  url: `https://www.rvo.nl/subsidies-financiering/isde`,
                  icon: "💶",
                },
              ].map((item) => (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm group-hover:text-[#1E3A5F] transition-colors">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-[#1E3A5F] flex-shrink-0 mt-1 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* AI-gegenereerde rapporten */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-slate-800 text-sm">AI-rapporten op basis van uw Woningpaspoort™</h3>
            </div>
            <div className="divide-y divide-slate-50">

              {/* Woningpaspoort PDF */}
              <div className="flex items-start gap-4 px-5 py-4">
                <span className="text-xl flex-shrink-0 mt-0.5">📋</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">Woningpaspoort™ PDF</p>
                  <p className="text-xs text-slate-500 mt-0.5">Volledig woningdossier met alle 5 blokken, Comfortabel Score™ en onderhoudsoverzicht</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Basis+</span>
                  </div>
                </div>
                {features.jaarlijksRapport ? (
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1E3A5F] px-4 py-2 rounded-lg hover:bg-[#2d5a8e] transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                ) : (
                  <a href="/abonnementen" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                    Upgrade
                  </a>
                )}
              </div>

              {/* Verduurzamingsadvies */}
              <div className="flex items-start gap-4 px-5 py-4">
                <span className="text-xl flex-shrink-0 mt-0.5">🌱</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">Verduurzamingsadvies Rapport</p>
                  <p className="text-xs text-slate-500 mt-0.5">AI-gegenereerd persoonlijk advies: top 5 maatregelen, terugverdientijden, aardgasvrij-scenario</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Digital+</span>
                    <span className="text-xs text-slate-400">~30 sec generatietijd</span>
                  </div>
                </div>
                {features.exportDossier ? (
                  <button
                    onClick={() => downloadAiReport("verduurzaming")}
                    disabled={generatingReport === "verduurzaming"}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex-shrink-0 disabled:opacity-60"
                  >
                    {generatingReport === "verduurzaming" ? (
                      <><Clock className="w-3.5 h-3.5 animate-spin" />Genereren...</>
                    ) : (
                      <><Leaf className="w-3.5 h-3.5" />Download PDF</>
                    )}
                  </button>
                ) : (
                  <a href="/abonnementen" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                    Upgrade
                  </a>
                )}
              </div>

              {/* Jaarlijks Onderhoudsrapport */}
              <div className="flex items-start gap-4 px-5 py-4">
                <span className="text-xl flex-shrink-0 mt-0.5">🔧</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">Jaarlijks Onderhoudsrapport</p>
                  <p className="text-xs text-slate-500 mt-0.5">Overzicht van alle open en afgeronde onderhoudspunten, prioriteiten, kosten en meerjarenplanning</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Basis+</span>
                  </div>
                </div>
                {features.jaarlijksRapport ? (
                  <a
                    href={`/api/reports/onderhoudsrapport/${property.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1E3A5F] px-4 py-2 rounded-lg hover:bg-[#2d5a8e] transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                ) : (
                  <a href="/abonnementen" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                    Upgrade
                  </a>
                )}
              </div>

              {/* Technisch Inspectierapport */}
              <div className="flex items-start gap-4 px-5 py-4">
                <span className="text-xl flex-shrink-0 mt-0.5">🔍</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">Technisch Inspectierapport</p>
                  <p className="text-xs text-slate-500 mt-0.5">Gedetailleerd inspectierapport met Comfortabel Score™, scores per categorie en bevindingen per onderdeel</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">Basis+</span>
                  </div>
                </div>
                {features.jaarlijksRapport ? (
                  <a
                    href={`/api/reports/inspectierapport/${property.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                ) : (
                  <a href="/abonnementen" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                    Upgrade
                  </a>
                )}
              </div>

              {/* Subsidie Berekening */}
              <div className="flex items-start gap-4 px-5 py-4">
                <span className="text-xl flex-shrink-0 mt-0.5">💶</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">Subsidie Berekening Rapport</p>
                  <p className="text-xs text-slate-500 mt-0.5">Overzicht van alle beschikbare subsidies (ISDE, SEEH, SVn) met bedragen en aanvraaginstructies</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Digital+</span>
                    <span className="text-xs text-slate-400">~30 sec generatietijd</span>
                  </div>
                </div>
                {features.exportDossier ? (
                  <button
                    onClick={() => downloadAiReport("subsidies")}
                    disabled={generatingReport === "subsidies"}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-60"
                  >
                    {generatingReport === "subsidies" ? (
                      <><Clock className="w-3.5 h-3.5 animate-spin" />Genereren...</>
                    ) : (
                      <><Euro className="w-3.5 h-3.5" />Download PDF</>
                    )}
                  </button>
                ) : (
                  <a href="/abonnementen" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0">
                    <Lock className="w-3.5 h-3.5" />
                    Upgrade
                  </a>
                )}
              </div>

            </div>
          </div>

          {/* Toekomstige rapporten */}
          <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Binnenkort beschikbaar</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: "📊", name: "Woningwaarde Analyse", tier: "Plus" },
                { icon: "📅", name: "Meerjarenonderhoudsplan (MJOP)", tier: "Plus" },
                { icon: "🏠", name: "Verkoopgereed Dossier", tier: "Plus" },
                { icon: "🏢", name: "VvE Rapportage Pakket", tier: "Premium" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-600">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.tier}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {crField && (
        <ChangeRequestDialog
          propertyId={propertyId}
          fieldName={crField.field}
          fieldLabel={crField.label}
          currentValue={crField.current}
          category={crField.category}
          onClose={() => setCrField(null)}
        />
      )}
    </ClientLayout>
  );
}

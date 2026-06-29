import ClientLayout from "../../components/ClientLayout";
import { trpc } from "../../lib/trpc";
import WoningScore from "../../components/WoningScore";
import { Home, ArrowRight, ClipboardCheck, AlertTriangle, Plus, FileText, Zap, Clock } from "lucide-react";
import {
  SUBSCRIPTION_LABELS, SUBSCRIPTION_COLORS, type SubscriptionTier,
} from "@shared/const";

export default function ClientDashboard() {
  const { data: properties = [], isLoading } = trpc.properties.myProperties.useQuery();
  const { data: pendingClaims = [] } = trpc.passport.myPendingClaims.useQuery();

  return (
    <ClientLayout title="Mijn woningen">
      {pendingClaims.length > 0 && (
        <div className="mb-5 space-y-3">
          {pendingClaims.map((c) => (
            <div
              key={c.memberId}
              className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl"
            >
              <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Aanvraag in behandeling: {c.street} {c.houseNumber}, {c.city}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Uw koppelingsverzoek wordt door Comfortabel gecontroleerd. U krijgt toegang tot de
                  woninggegevens zodra de aanvraag is bevestigd.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-5" />
              <div className="h-10 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="max-w-md mx-auto py-12">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#1E3A5F]/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Home className="w-10 h-10 text-[#1E3A5F]" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Voeg uw eerste woning toe</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Maak een Woningpaspoort™ aan en krijg direct toegang tot alle woninggegevens, gratis deeplinks en Mati, jouw digitale woonvriend.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-8">
            {[
              { icon: FileText, title: "Woningpaspoort™", desc: "Alle gegevens op één plek" },
              { icon: Zap, title: "Gratis deeplinks", desc: "BAG, WOZ, Energielabel, Kadaster" },
              { icon: Home, title: "Onderhoudskalender", desc: "Nooit meer een moment missen" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#1E3A5F]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{title}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="/mijn/onboarding"
            className="w-full py-3 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.97] text-sm"
          >
            <Plus className="w-4 h-4" />
            Woning toevoegen
          </a>
        </div>
      ) : (
        <>
          <p className="text-slate-500 text-sm mb-5">
            Welkom terug. Hieronder vindt u een overzicht van uw{" "}
            {properties.length === 1 ? "woning" : `${properties.length} woningen`}.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </>
      )}
    </ClientLayout>
  );
}

function PropertyCard({ property }: { property: any }) {
  const { data: inspections = [] } = trpc.inspections.listByProperty.useQuery({
    propertyId: property.id,
  });
  const { data: issues = [] } = trpc.maintenance.listIssues.useQuery({
    propertyId: property.id,
  });

  const latestInspection = inspections.find((i) => i.status === "afgerond");
  const openIssues = issues.filter((i) => i.status !== "afgerond");
  const urgentIssues = issues.filter((i) => i.priority === "urgent" && i.status !== "afgerond");

  return (
    <a
      href={`/mijn/woning/${property.id}`}
      className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-[#1E3A5F]/20 transition-all group block"
    >
      {/* Address */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Home className="w-5 h-5 text-[#1E3A5F]" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">
            {property.street} {property.houseNumber}
          </h3>
          <p className="text-sm text-slate-500">
            {property.postalCode} {property.city}
          </p>
        </div>
      </div>

      {/* Score */}
      <div className="mb-4">
        <WoningScore
          grade={latestInspection?.woningGrade as any}
          totalScore={latestInspection?.totalScore}
          size="sm"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {latestInspection ? (
          <span className="flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Inspectie: {new Date(latestInspection.inspectionDate).toLocaleDateString("nl-NL")}
          </span>
        ) : (
          <span className="text-slate-400">Nog geen inspectie</span>
        )}
        {openIssues.length > 0 && (
          <span
            className={`flex items-center gap-1 ml-auto ${
              urgentIssues.length > 0 ? "text-red-600" : "text-amber-600"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {openIssues.length} punt{openIssues.length !== 1 ? "en" : ""}
          </span>
        )}
        <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-[#1E3A5F] transition-colors" />
      </div>

      {/* Subscription badge */}
      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
        {property.subscriptionType ? (
          <span
            className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: `${SUBSCRIPTION_COLORS[property.subscriptionType as SubscriptionTier]}18`,
              color: SUBSCRIPTION_COLORS[property.subscriptionType as SubscriptionTier],
            }}
          >
            {SUBSCRIPTION_LABELS[property.subscriptionType as SubscriptionTier]}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Geen pakket</span>
        )}
      </div>
    </a>
  );
}

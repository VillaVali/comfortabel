import ClientLayout from "../../components/ClientLayout";
import { trpc } from "../../lib/trpc";
import WoningScore from "../../components/WoningScore";
import { Home, ArrowRight, ClipboardCheck, AlertTriangle } from "lucide-react";
import {
  SUBSCRIPTION_LABELS, SUBSCRIPTION_COLORS, type SubscriptionTier,
} from "@shared/const";

export default function ClientDashboard() {
  const { data: properties = [], isLoading } = trpc.properties.myProperties.useQuery();

  return (
    <ClientLayout title="Mijn woningen">
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
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Nog geen woningen</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Uw woning is nog niet toegevoegd aan het portaal. Neem contact op met Comfortabel om uw woning te registreren.
          </p>
          <a
            href="mailto:info@comfortabel.nl"
            className="inline-block mt-5 text-sm text-[#1E3A5F] font-medium hover:underline"
          >
            Contact opnemen →
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

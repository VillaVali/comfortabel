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
} from "lucide-react";
import { useState } from "react";
import DocumentsPanel from "../../components/DocumentsPanel";

export default function ClientProperty() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);
  const [activeTab, setActiveTab] = useState<"paspoort" | "onderhoud" | "planning" | "documenten">("paspoort");

  const { data: property } = trpc.properties.get.useQuery({ id: propertyId });
  const { data: inspections = [] } = trpc.inspections.listByProperty.useQuery({ propertyId });
  const { data: issues = [] } = trpc.maintenance.listIssues.useQuery({ propertyId });
  const { data: planning = [] } = trpc.maintenance.listPlanning.useQuery({ propertyId });

  const downloadReport = () => {
    window.open(`/api/reports/woningpaspoort/${propertyId}`, "_blank");
  };

  const latestInspection = inspections.find((i) => i.status === "afgerond");
  const openIssues = issues.filter((i) => i.status !== "afgerond");
  const urgentIssues = openIssues.filter((i) => i.priority === "urgent");

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

      {/* Score card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Woning Score™</h2>
          <div className="flex items-center gap-3">
            {latestInspection && (
              <span className="text-xs text-slate-400">
                Inspectie: {new Date(latestInspection.inspectionDate).toLocaleDateString("nl-NL")}
              </span>
            )}
            <button
              onClick={downloadReport}
              className="flex items-center gap-1.5 text-xs text-[#1E3A5F] border border-[#1E3A5F]/20 px-3 py-1.5 rounded-lg hover:bg-[#1E3A5F]/5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Rapport
            </button>
          </div>
        </div>
        <WoningScore
          grade={latestInspection?.woningGrade as any}
          totalScore={latestInspection?.totalScore}
          size="lg"
        />
        {latestInspection && latestInspection.status === "afgerond" && (
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
          {/* Property info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Woninggegevens</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Adres", `${property.street} ${property.houseNumber}`],
                ["Postcode & Stad", `${property.postalCode} ${property.city}`],
                ["Type woning", property.propertyType],
                ["Bouwjaar", property.buildYear],
                ["Oppervlakte", property.surfaceM2 ? `${property.surfaceM2} m²` : null],
                ["Bewoners", property.residents],
                ["Energielabel", property.energyLabel],
                ["Abonnement", property.subscriptionType],
              ].map(([label, value]) =>
                value ? (
                  <div key={label as string}>
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="font-medium text-slate-800 capitalize">{String(value)}</p>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Inspection history */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Inspectiehistorie</h3>
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
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        insp.status === "afgerond" ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 capitalize">{insp.type}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(insp.inspectionDate).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                    {insp.woningGrade && (
                      <WoningScore grade={insp.woningGrade as any} size="sm" showLabel={false} />
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        insp.status === "afgerond"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
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

          {/* Resolved issues */}
          {issues.filter((i) => i.status === "afgerond").length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-medium text-slate-600 text-sm">
                  Afgerond ({issues.filter((i) => i.status === "afgerond").length})
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {issues
                  .filter((i) => i.status === "afgerond")
                  .map((issue) => (
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

      {activeTab === "planning" && (
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

      {activeTab === "documenten" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <DocumentsPanel propertyId={propertyId} isAdmin={false} />
        </div>
      )}
    </ClientLayout>
  );
}

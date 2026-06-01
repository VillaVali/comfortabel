import { useState } from "react";
import DocumentsPanel from "../../components/DocumentsPanel";
import { useParams } from "wouter";
import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import WoningScore, { ScoreBar } from "../../components/WoningScore";
import {
  ClipboardCheck,
  Plus,
  ArrowRight,
  Home,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  FileText,
} from "lucide-react";

export default function AdminPropertyDetail() {
  const params = useParams<{ id: string }>();
  const propertyId = Number(params.id);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "normaal" as "laag" | "normaal" | "hoog" | "urgent",
    estimatedCost: "",
  });

  const { data: property } = trpc.properties.get.useQuery({ id: propertyId });
  const { data: inspections = [], refetch: refetchInspections } = trpc.inspections.listByProperty.useQuery({ propertyId });
  const { data: issues = [], refetch: refetchIssues } = trpc.maintenance.listIssues.useQuery({ propertyId });
  const { data: planning = [] } = trpc.maintenance.listPlanning.useQuery({ propertyId });

  const createInspection = trpc.inspections.create.useMutation({
    onSuccess: (data) => {
      toast.success("0-meting aangemaakt");
      refetchInspections();
      window.location.href = `/admin/inspections/${data.id}`;
    },
    onError: (e) => toast.error(e.message),
  });

  const createIssue = trpc.maintenance.createIssue.useMutation({
    onSuccess: () => {
      toast.success("Onderhoudspunt aangemaakt");
      setShowIssueModal(false);
      setIssueForm({ title: "", description: "", category: "", priority: "normaal", estimatedCost: "" });
      refetchIssues();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateIssue = trpc.maintenance.updateIssue.useMutation({
    onSuccess: () => { toast.success("Bijgewerkt"); refetchIssues(); },
  });

  const latestInspection = inspections[0];

  const priorityConfig = {
    laag: { color: "text-slate-500", bg: "bg-slate-50", label: "Laag" },
    normaal: { color: "text-blue-600", bg: "bg-blue-50", label: "Normaal" },
    hoog: { color: "text-orange-600", bg: "bg-orange-50", label: "Hoog" },
    urgent: { color: "text-red-600", bg: "bg-red-50", label: "Urgent" },
  };

  const statusConfig = {
    open: { color: "text-red-600", bg: "bg-red-50", icon: AlertTriangle, label: "Open" },
    in_behandeling: { color: "text-orange-600", bg: "bg-orange-50", icon: Clock, label: "In behandeling" },
    gepland: { color: "text-blue-600", bg: "bg-blue-50", icon: Clock, label: "Gepland" },
    afgerond: { color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle, label: "Afgerond" },
  };

  if (!property) {
    return (
      <AdminLayout title="Woning">
        <div className="text-center py-16 text-slate-400">Woning niet gevonden</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${property.street} ${property.houseNumber}, ${property.city}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: property info + score */}
        <div className="space-y-5">
          {/* Property info */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Home className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {property.street} {property.houseNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {property.postalCode} {property.city}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Type", property.propertyType],
                ["Bouwjaar", property.buildYear],
                ["Oppervlakte", property.surfaceM2 ? `${property.surfaceM2} m²` : null],
                ["Bewoners", property.residents],
                ["Energielabel", property.energyLabel],
                ["Abonnement", property.subscriptionType],
              ].map(([label, value]) =>
                value ? (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-800 font-medium capitalize">{String(value)}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Woning Score */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-800 text-sm mb-4">Woning Score™</h3>
            <WoningScore
              grade={latestInspection?.woningGrade as any}
              totalScore={latestInspection?.totalScore}
              size="lg"
            />
            {latestInspection && latestInspection.status === "afgerond" && (
              <div className="mt-4 space-y-2">
                <ScoreBar score={latestInspection.scoreInstallaties} label="Installaties" />
                <ScoreBar score={latestInspection.scoreBouwkundig} label="Bouwkundig" />
                <ScoreBar score={latestInspection.scoreVeiligheid} label="Veiligheid" />
                <ScoreBar score={latestInspection.scoreVochtVentilatie} label="Vocht & Ventilatie" />
                <ScoreBar score={latestInspection.scoreEnergie} label="Energie" />
              </div>
            )}
          </div>
        </div>

        {/* Right column: inspections + issues */}
        <div className="lg:col-span-2 space-y-5">
          {/* Inspections */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Inspecties & 0-metingen</h2>
              <button
                onClick={() => createInspection.mutate({ propertyId, type: "nulmeting" })}
                disabled={createInspection.isPending}
                className="flex items-center gap-1.5 bg-[#1E3A5F] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#2a4f7a] disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5" />
                {createInspection.isPending ? "Aanmaken..." : "Nieuwe 0-meting"}
              </button>
            </div>
            {inspections.length === 0 ? (
              <div className="text-center py-10">
                <ClipboardCheck className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nog geen inspecties</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {inspections.map((insp) => (
                  <a
                    key={insp.id}
                    href={`/admin/inspections/${insp.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ClipboardCheck className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 capitalize">{insp.type}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(insp.inspectionDate).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {insp.woningGrade && (
                        <WoningScore grade={insp.woningGrade as any} size="sm" showLabel={false} />
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          insp.status === "afgerond"
                            ? "bg-emerald-50 text-emerald-700"
                            : insp.status === "in_uitvoering"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {insp.status.replace("_", " ")}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Maintenance issues */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Onderhoudspunten
                {issues.filter((i) => i.status !== "afgerond").length > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                    {issues.filter((i) => i.status !== "afgerond").length} open
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Toevoegen
              </button>
            </div>
            {issues.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Geen open punten</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {issues.map((issue) => {
                  const pCfg = priorityConfig[issue.priority];
                  const sCfg = statusConfig[issue.status];
                  const SIcon = sCfg.icon;
                  return (
                    <div key={issue.id} className="px-5 py-3.5 flex items-start gap-3">
                      <SIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sCfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{issue.title}</p>
                        {issue.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{issue.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${pCfg.bg} ${pCfg.color}`}>
                            {pCfg.label}
                          </span>
                          {issue.estimatedCost && (
                            <span className="text-xs text-slate-400">
                              ~€{issue.estimatedCost.toLocaleString("nl-NL")}
                            </span>
                          )}
                        </div>
                      </div>
                      <select
                        value={issue.status}
                        onChange={(e) =>
                          updateIssue.mutate({ id: issue.id, status: e.target.value as any })
                        }
                        className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 focus:outline-none flex-shrink-0"
                      >
                        <option value="open">Open</option>
                        <option value="in_behandeling">In behandeling</option>
                        <option value="gepland">Gepland</option>
                        <option value="afgerond">Afgerond</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Planning */}
          {planning.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Toekomstig onderhoud</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {planning.map((p) => (
                  <div key={p.id} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="w-10 text-center">
                      <span className="text-sm font-bold text-[#1E3A5F]">{p.plannedYear || "?"}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{p.title}</p>
                      {p.category && <p className="text-xs text-slate-500">{p.category}</p>}
                    </div>
                    {p.estimatedCost && (
                      <span className="text-sm font-medium text-slate-700">
                        €{p.estimatedCost.toLocaleString("nl-NL")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Documenten</h2>
            </div>
            <div className="p-5">
              <DocumentsPanel propertyId={propertyId} isAdmin={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Issue modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Onderhoudspunt toevoegen</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!issueForm.title) return toast.error("Titel is verplicht");
                createIssue.mutate({
                  propertyId,
                  title: issueForm.title,
                  description: issueForm.description || undefined,
                  category: issueForm.category || undefined,
                  priority: issueForm.priority,
                  estimatedCost: issueForm.estimatedCost ? Number(issueForm.estimatedCost) : undefined,
                });
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titel <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={issueForm.title}
                  onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Omschrijving</label>
                <textarea
                  rows={2}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categorie</label>
                  <input
                    type="text"
                    placeholder="bijv. Dak, CV, Elektra"
                    value={issueForm.category}
                    onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prioriteit</label>
                  <select
                    value={issueForm.priority}
                    onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  >
                    <option value="laag">Laag</option>
                    <option value="normaal">Normaal</option>
                    <option value="hoog">Hoog</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Geschatte kosten (€)</label>
                <input
                  type="number"
                  min="0"
                  value={issueForm.estimatedCost}
                  onChange={(e) => setIssueForm({ ...issueForm, estimatedCost: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={createIssue.isPending}
                  className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7a] disabled:opacity-60"
                >
                  {createIssue.isPending ? "Opslaan..." : "Toevoegen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

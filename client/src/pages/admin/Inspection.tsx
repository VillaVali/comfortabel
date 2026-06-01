import { useState, useMemo } from "react";
import { useParams } from "wouter";
import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, AlertTriangle, Minus, HelpCircle, ChevronDown, ChevronRight, Save } from "lucide-react";

type AnswerType = "goed" | "aandacht" | "urgent" | "nvt" | "onbekend";

const answerConfig: Record<AnswerType, { label: string; color: string; bg: string; icon: any }> = {
  goed: { label: "Goed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  aandacht: { label: "Aandacht", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertCircle },
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertTriangle },
  nvt: { label: "N.v.t.", color: "text-slate-500", bg: "bg-slate-50 border-slate-200", icon: Minus },
  onbekend: { label: "Onbekend", color: "text-slate-400", bg: "bg-white border-slate-200", icon: HelpCircle },
};

export default function AdminInspection() {
  const params = useParams<{ id: string }>();
  const inspectionId = Number(params.id);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState({
    scoreInstallaties: "",
    scoreBouwkundig: "",
    scoreVeiligheid: "",
    scoreVochtVentilatie: "",
    scoreEnergie: "",
    summary: "",
  });
  const [showFinalize, setShowFinalize] = useState(false);

  const { data: inspection, refetch: refetchInspection } = trpc.inspections.get.useQuery({ id: inspectionId });
  const { data: items = [], refetch: refetchItems } = trpc.inspections.getItems.useQuery({ inspectionId });

  const updateItem = trpc.inspections.updateItem.useMutation({
    onSuccess: () => refetchItems(),
    onError: (e) => toast.error(e.message),
  });

  const finalize = trpc.inspections.finalize.useMutation({
    onSuccess: (data) => {
      toast.success(`0-meting afgerond! Woning Score: ${data.woningGrade} (${data.totalScore}/100)`);
      setShowFinalize(false);
      refetchInspection();
    },
    onError: (e) => toast.error(e.message),
  });

  // Group items by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach((item) => {
      const cat = item.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return map;
  }, [items]);

  // Auto-calculate scores from answers
  const autoScores = useMemo(() => {
    const calc = (category: string) => {
      const catItems = grouped.get(category) || [];
      if (catItems.length === 0) return null;
      const answered = catItems.filter((i) => i.answer !== "nvt" && i.answer !== "onbekend");
      if (answered.length === 0) return null;
      const score = answered.reduce((acc, item) => {
        if (item.answer === "goed") return acc + 100;
        if (item.answer === "aandacht") return acc + 50;
        if (item.answer === "urgent") return acc + 0;
        return acc;
      }, 0);
      return Math.round(score / answered.length);
    };
    return {
      scoreInstallaties: calc("Installaties"),
      scoreBouwkundig: calc("Bouwkundig"),
      scoreVeiligheid: calc("Veiligheid"),
      scoreVochtVentilatie: calc("Vocht & Ventilatie"),
      scoreEnergie: calc("Energie"),
    };
  }, [grouped]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finalize.mutate({
      id: inspectionId,
      summary: scores.summary || undefined,
      scoreInstallaties: autoScores.scoreInstallaties ?? undefined,
      scoreBouwkundig: autoScores.scoreBouwkundig ?? undefined,
      scoreVeiligheid: autoScores.scoreVeiligheid ?? undefined,
      scoreVochtVentilatie: autoScores.scoreVochtVentilatie ?? undefined,
      scoreEnergie: autoScores.scoreEnergie ?? undefined,
    });
  };

  const totalAnswered = items.filter((i) => i.answer !== "onbekend").length;
  const progress = items.length > 0 ? Math.round((totalAnswered / items.length) * 100) : 0;

  const urgentCount = items.filter((i) => i.answer === "urgent").length;
  const aandachtCount = items.filter((i) => i.answer === "aandacht").length;

  if (!inspection) {
    return (
      <AdminLayout title="0-meting">
        <div className="text-center py-16 text-slate-400">Inspectie niet gevonden</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`0-meting #${inspectionId}`}>
      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-slate-800">
              {inspection.type.charAt(0).toUpperCase() + inspection.type.slice(1)} —{" "}
              <span
                className={`text-sm ${
                  inspection.status === "afgerond"
                    ? "text-emerald-600"
                    : inspection.status === "in_uitvoering"
                    ? "text-orange-600"
                    : "text-slate-500"
                }`}
              >
                {inspection.status.replace("_", " ")}
              </span>
            </h2>
            <p className="text-sm text-slate-500">
              {new Date(inspection.inspectionDate).toLocaleDateString("nl-NL")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#1E3A5F]">{progress}%</p>
            <p className="text-xs text-slate-500">{totalAnswered}/{items.length} ingevuld</p>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1E3A5F] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-3">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              {urgentCount} urgent
            </span>
          )}
          {aandachtCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="w-3.5 h-3.5" />
              {aandachtCount} aandacht
            </span>
          )}
          {inspection.status !== "afgerond" && (
            <button
              onClick={() => setShowFinalize(true)}
              className="ml-auto flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Afronden & score berekenen
            </button>
          )}
          {inspection.status === "afgerond" && inspection.woningGrade && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-slate-600">Woning Score™:</span>
              <span
                className="text-lg font-black px-3 py-1 rounded-lg"
                style={{
                  background:
                    inspection.woningGrade === "A"
                      ? "#dcfce7"
                      : inspection.woningGrade === "B"
                      ? "#f0fdf4"
                      : inspection.woningGrade === "C"
                      ? "#fefce8"
                      : inspection.woningGrade === "D"
                      ? "#fff7ed"
                      : "#fef2f2",
                  color:
                    inspection.woningGrade === "A"
                      ? "#16a34a"
                      : inspection.woningGrade === "B"
                      ? "#4ade80"
                      : inspection.woningGrade === "C"
                      ? "#eab308"
                      : inspection.woningGrade === "D"
                      ? "#f97316"
                      : "#ef4444",
                }}
              >
                {inspection.woningGrade}
              </span>
              <span className="text-sm text-slate-500">{inspection.totalScore}/100</span>
            </div>
          )}
        </div>
      </div>

      {/* Checklist by category */}
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([category, catItems]) => {
          const isExpanded = expandedCategories.has(category);
          const catAnswered = catItems.filter((i) => i.answer !== "onbekend").length;
          const catUrgent = catItems.filter((i) => i.answer === "urgent").length;
          const catAandacht = catItems.filter((i) => i.answer === "aandacht").length;

          return (
            <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="font-semibold text-slate-800 flex-1">{category}</span>
                <div className="flex items-center gap-2">
                  {catUrgent > 0 && (
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                      {catUrgent} urgent
                    </span>
                  )}
                  {catAandacht > 0 && (
                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                      {catAandacht} aandacht
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {catAnswered}/{catItems.length}
                  </span>
                  {autoScores[`score${category.replace(" & ", "").replace(" ", "")}` as keyof typeof autoScores] !== null && (
                    <span className="text-xs font-bold text-[#1E3A5F] bg-[#1E3A5F]/10 px-2 py-0.5 rounded-full">
                      {autoScores[`score${category.replace(" & ", "").replace(" ", "")}` as keyof typeof autoScores]}/100
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {catItems.map((item) => (
                    <div key={item.id} className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          {item.subcategory && (
                            <p className="text-xs text-slate-400 mb-0.5">{item.subcategory}</p>
                          )}
                          <p className="text-sm text-slate-800">{item.question}</p>
                          {item.notes && (
                            <p className="text-xs text-slate-500 mt-1 italic">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {(["goed", "aandacht", "urgent", "nvt"] as AnswerType[]).map((ans) => {
                            const cfg = answerConfig[ans];
                            const Icon = cfg.icon;
                            const isSelected = item.answer === ans;
                            return (
                              <button
                                key={ans}
                                onClick={() =>
                                  updateItem.mutate({ id: item.id, answer: ans })
                                }
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                  isSelected
                                    ? `${cfg.bg} ${cfg.color} border-current`
                                    : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{cfg.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {item.answer !== "onbekend" && item.answer !== "goed" && item.answer !== "nvt" && (
                        <div className="mt-2 ml-0">
                          <input
                            type="text"
                            placeholder="Notitie toevoegen..."
                            defaultValue={item.notes || ""}
                            onBlur={(e) => {
                              if (e.target.value !== (item.notes || "")) {
                                updateItem.mutate({ id: item.id, notes: e.target.value });
                              }
                            }}
                            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]/20 text-slate-600 placeholder-slate-300"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Finalize modal */}
      {showFinalize && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">0-meting afronden</h2>
              <p className="text-sm text-slate-500 mt-1">
                Scores worden automatisch berekend op basis van de ingevulde checklist.
              </p>
            </div>
            <form onSubmit={handleFinalizeSubmit} className="p-6 space-y-4">
              {/* Auto scores preview */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                  Berekende scores
                </p>
                {[
                  ["Installaties", autoScores.scoreInstallaties],
                  ["Bouwkundig", autoScores.scoreBouwkundig],
                  ["Veiligheid", autoScores.scoreVeiligheid],
                  ["Vocht & Ventilatie", autoScores.scoreVochtVentilatie],
                  ["Energie", autoScores.scoreEnergie],
                ].map(([label, score]) => (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-800">
                      {score !== null ? `${score}/100` : "—"}
                    </span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-sm font-bold">
                  <span className="text-slate-700">Totaalscore</span>
                  <span className="text-[#1E3A5F]">
                    {(() => {
                      const s = [
                        autoScores.scoreInstallaties,
                        autoScores.scoreBouwkundig,
                        autoScores.scoreVeiligheid,
                        autoScores.scoreVochtVentilatie,
                        autoScores.scoreEnergie,
                      ].filter((x): x is number => x !== null);
                      if (s.length === 0) return "—";
                      const avg = Math.round(s.reduce((a, b) => a + b, 0) / s.length);
                      const grade =
                        avg >= 85 ? "A" : avg >= 70 ? "B" : avg >= 55 ? "C" : avg >= 40 ? "D" : "E";
                      return `${avg}/100 → ${grade}`;
                    })()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Samenvatting</label>
                <textarea
                  rows={3}
                  placeholder="Algemene bevindingen van de inspectie..."
                  value={scores.summary}
                  onChange={(e) => setScores({ ...scores, summary: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFinalize(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={finalize.isPending}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                  {finalize.isPending ? "Afronden..." : "Afronden & opslaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

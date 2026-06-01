const GRADE_CONFIG = {
  A: { color: "#16a34a", bg: "#dcfce7", label: "Uitstekend", description: "Woning is goed onderhouden" },
  B: { color: "#4ade80", bg: "#f0fdf4", label: "Goed", description: "Kleine aandachtspunten" },
  C: { color: "#eab308", bg: "#fefce8", label: "Aandacht nodig", description: "Meerdere punten vereisen actie" },
  D: { color: "#f97316", bg: "#fff7ed", label: "Verhoogd risico", description: "Urgente punten aanwezig" },
  E: { color: "#ef4444", bg: "#fef2f2", label: "Achterstallig", description: "Directe actie vereist" },
};

interface WoningScoreProps {
  grade?: "A" | "B" | "C" | "D" | "E" | null;
  totalScore?: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function WoningScore({
  grade,
  totalScore,
  size = "md",
  showLabel = true,
}: WoningScoreProps) {
  if (!grade) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`rounded-lg bg-slate-100 text-slate-400 font-bold flex items-center justify-center ${
            size === "sm" ? "w-8 h-8 text-sm" : size === "lg" ? "w-16 h-16 text-3xl" : "w-12 h-12 text-xl"
          }`}
        >
          ?
        </div>
        {showLabel && <span className="text-slate-400 text-sm">Nog niet beoordeeld</span>}
      </div>
    );
  }

  const config = GRADE_CONFIG[grade];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`rounded-xl font-black flex items-center justify-center flex-shrink-0 ${
          size === "sm" ? "w-8 h-8 text-sm" : size === "lg" ? "w-16 h-16 text-3xl" : "w-12 h-12 text-2xl"
        }`}
        style={{ background: config.bg, color: config.color, border: `2px solid ${config.color}` }}
      >
        {grade}
      </div>
      {showLabel && (
        <div>
          <p className="font-semibold text-slate-800" style={{ color: config.color }}>
            {config.label}
          </p>
          <p className="text-xs text-slate-500">{config.description}</p>
          {totalScore !== undefined && totalScore !== null && (
            <p className="text-xs text-slate-400 mt-0.5">Score: {totalScore}/100</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ScoreBar({ score, label }: { score?: number | null; label: string }) {
  const pct = score ?? 0;
  const color =
    pct >= 85 ? "#16a34a" : pct >= 70 ? "#4ade80" : pct >= 55 ? "#eab308" : pct >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">{score !== null && score !== undefined ? `${score}/100` : "—"}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

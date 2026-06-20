import { useState } from "react";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Lock, X, Loader2, ShieldCheck } from "lucide-react";

/**
 * Dialog for requesting a correction to a LOCKED (category A/B) passport field.
 * The client never edits these fields directly — Comfortabel validates the
 * proposal (against BAG / 0-meting) before it is applied. This mirrors the
 * server-side rule that user-provided data must always be checked.
 */
export default function ChangeRequestDialog({
  propertyId,
  fieldName,
  fieldLabel,
  currentValue,
  category,
  onClose,
  onSubmitted,
}: {
  propertyId: number;
  fieldName: string;
  fieldLabel: string;
  currentValue: string;
  category: "A" | "B";
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [proposed, setProposed] = useState("");
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();
  const create = trpc.changeRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Correctieverzoek ingediend. Comfortabel controleert dit.");
      utils.changeRequests.listMine.invalidate();
      onSubmitted?.();
      onClose();
    },
    onError: (e) => toast.error(e.message || "Verzoek indienen mislukt"),
  });

  const catLabel = category === "A" ? "Officiële brongegevens (BAG/Kadaster)" : "Door Comfortabel gevalideerd";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        style={{ transformOrigin: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#1E3A5F]" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Correctie aanvragen</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />
            <span>
              <strong>{fieldLabel}</strong> is een beschermd veld ({catLabel}). U kunt het niet
              zelf wijzigen — uw voorstel wordt door Comfortabel gecontroleerd voordat het wordt
              doorgevoerd.
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Huidige waarde</label>
            <p className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
              {currentValue || "—"}
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Voorgestelde waarde</label>
            <input
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder="Wat zou de juiste waarde moeten zijn?"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">Toelichting (optioneel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Bijv. bron of reden van de correctie"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Annuleren
          </button>
          <button
            disabled={!proposed.trim() || create.isPending}
            onClick={() =>
              create.mutate({ propertyId, fieldName, proposedValue: proposed.trim(), note: note.trim() || undefined })
            }
            className="px-4 py-2 text-sm font-semibold text-white bg-[#1E3A5F] rounded-lg hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-2"
            style={{ transition: "transform 160ms cubic-bezier(0.23,1,0.32,1)" }}
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Verzoek indienen
          </button>
        </div>
      </div>
    </div>
  );
}

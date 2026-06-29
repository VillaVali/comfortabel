import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import {
  CalendarCheck, Phone, MapPin, Clock, CheckCircle2, XCircle,
  Loader2, MessageSquare, User
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  aangevraagd: "Aangevraagd",
  ingepland: "Ingepland",
  uitgevoerd: "Uitgevoerd",
  geannuleerd: "Geannuleerd",
};

const STATUS_COLORS: Record<string, string> = {
  aangevraagd: "bg-amber-100 text-amber-700",
  ingepland: "bg-blue-100 text-blue-700",
  uitgevoerd: "bg-green-100 text-green-700",
  geannuleerd: "bg-slate-100 text-slate-500",
};

export default function AdminZeroMeasurements() {
  const { data: requests = [], isLoading, refetch } = trpc.passport.listZeroMeasurements.useQuery();

  const updateStatus = trpc.passport.updateZeroMeasurementStatus.useMutation({
    onSuccess: () => { toast.success("Status bijgewerkt"); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AdminLayout title="0-meting aanvragen">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </AdminLayout>
    );
  }

  const pending = requests.filter((r: { status: string }) => r.status === "aangevraagd");
  const scheduled = requests.filter((r: { status: string }) => r.status === "ingepland");
  const done = requests.filter((r: { status: string }) => r.status === "uitgevoerd" || r.status === "geannuleerd");

  return (
    <AdminLayout title="0-meting aanvragen">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aangevraagd", count: pending.length, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Ingepland", count: scheduled.length, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Uitgevoerd", count: requests.filter((r: { status: string }) => r.status === "uitgevoerd").length, color: "text-green-600", bg: "bg-green-50" },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <CalendarCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nog geen 0-meting aanvragen</p>
          </div>
        ) : (
          <>
            {/* Pending + scheduled */}
            {[...pending, ...scheduled].length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Actief ({[...pending, ...scheduled].length})
                </h2>
                <div className="space-y-3">
                  {[...pending, ...scheduled].map((req) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onStatusChange={(status) => updateStatus.mutate({ id: req.id, status })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Done */}
            {done.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Afgerond / geannuleerd ({done.length})
                </h2>
                <div className="space-y-3">
                  {done.map((req) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onStatusChange={(status) => updateStatus.mutate({ id: req.id, status })}
                      isPending={updateStatus.isPending}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

type ZeroMeasurementStatus = "aangevraagd" | "ingepland" | "uitgevoerd" | "geannuleerd";

function RequestCard({
  req,
  onStatusChange,
  isPending,
}: {
  req: {
    id: number;
    status: ZeroMeasurementStatus;
    phone: string;
    preferredDate: string | null;
    notes: string | null;
    createdAt: Date;
    street?: string | null;
    houseNumber?: string | null;
    city?: string | null;
    userName?: string | null;
    userEmail?: string | null;
  };
  onStatusChange: (status: ZeroMeasurementStatus) => void;
  isPending: boolean;
}) {
  const address = [req.street, req.houseNumber, req.city]
    .filter(Boolean).join(" ");

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status] ?? "bg-slate-100 text-slate-500"}`}>
              {STATUS_LABELS[req.status] ?? req.status}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(req.createdAt).toLocaleDateString("nl-NL")}
            </span>
          </div>
          {address && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {address}
            </div>
          )}
          {req.userName && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <User className="w-3 h-3" />
              {req.userName} {req.userEmail ? `— ${req.userEmail}` : ""}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-600 mb-4">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <a href={`tel:${req.phone}`} className="hover:text-[#1E3A5F] hover:underline">{req.phone}</a>
        </div>
        {req.preferredDate && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Voorkeur: {new Date(req.preferredDate).toLocaleDateString("nl-NL")}
          </div>
        )}
        {req.notes && (
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            {req.notes}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {req.status === "aangevraagd" && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange("ingepland")}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Inplannen
          </button>
          <button
            onClick={() => onStatusChange("geannuleerd")}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition disabled:opacity-60"
          >
            <XCircle className="w-3.5 h-3.5" />
            Annuleren
          </button>
        </div>
      )}
      {req.status === "ingepland" && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange("uitgevoerd")}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-60"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Markeer als uitgevoerd
          </button>
          <button
            onClick={() => onStatusChange("geannuleerd")}
            disabled={isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition disabled:opacity-60"
          >
            <XCircle className="w-3.5 h-3.5" />
            Annuleren
          </button>
        </div>
      )}
    </div>
  );
}

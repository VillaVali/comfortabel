import { useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, Check, X, FileEdit, Loader2, Home, User, AlertTriangle, BadgeCheck,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  user: "Klant",
  comfortabel_employee: "Medewerker",
  manager: "Manager",
  admin: "Beheerder",
};

const CLAIM_ROLES = [
  { value: "owner", label: "Eigenaar" },
  { value: "tenant", label: "Huurder" },
  { value: "partner", label: "Partner" },
  { value: "business_manager", label: "Zakelijk beheerder" },
] as const;

export default function AdminValidation() {
  return (
    <AdminLayout title="Beheer & validatie">
      <ValidationSections />
    </AdminLayout>
  );
}

function ValidationSections() {
  const { isManager } = useAuth();
  return (
    <div className="space-y-8 max-w-5xl">
      <PendingValidationSection />
      <ClaimsSection />
      <ChangeRequestsSection />
      {/* Role management is restricted to managers/admins, mirroring the
          server-side managerProcedure on users.setRole. */}
      {isManager && <RolesSection />}
    </div>
  );
}

// ── New properties awaiting validation (Optie A) ────────────────────────────

function PendingValidationSection() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.passport.listPendingValidation.useQuery();

  const validate = trpc.passport.validateProperty.useMutation({
    onSuccess: () => {
      toast.success("Woning gevalideerd — score, rapporten en Mati zijn nu vrijgegeven.");
      utils.passport.listPendingValidation.invalidate();
    },
    onError: (e) => toast.error(e.message || "Valideren mislukt"),
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
          <BadgeCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Nieuwe woningen — wacht op validatie</h2>
        {items.length > 0 && (
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {items.length}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Door klanten zelf aangemaakte woningen. De eigenaar kan het dossier alvast invullen, maar
        Woning Score™, rapporten en Mati blijven vergrendeld tot u valideert (na 0-meting/controle).
      </p>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Geen woningen die op validatie wachten.</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.propertyId} className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Home className="w-4 h-4 text-slate-400" />
                  {p.street} {p.houseNumber}, {p.postalCode} {p.city}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {p.ownerName || "Onbekend"} {p.ownerEmail ? <span className="text-slate-400">({p.ownerEmail})</span> : null}
                  {p.propertyType ? <span className="text-slate-400">· {p.propertyType}</span> : null}
                </p>
              </div>
              <button
                onClick={() => validate.mutate({ propertyId: p.propertyId })}
                disabled={validate.isPending}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition active:scale-[0.97] disabled:opacity-60"
              >
                <BadgeCheck className="w-4 h-4" /> Valideren &amp; vrijgeven
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Pending claims ────────────────────────────────────────────────────────────

function ClaimsSection() {
  const utils = trpc.useUtils();
  const { data: claims = [], isLoading } = trpc.passport.listClaims.useQuery();
  const [roleChoice, setRoleChoice] = useState<Record<number, string>>({});

  const confirm = trpc.passport.confirmClaim.useMutation({
    onSuccess: () => {
      toast.success("Aanvraag bevestigd — gebruiker heeft nu toegang.");
      utils.passport.listClaims.invalidate();
    },
    onError: (e) => toast.error(e.message || "Bevestigen mislukt"),
  });
  const revoke = trpc.passport.revokeMember.useMutation({
    onSuccess: () => {
      toast.success("Aanvraag afgewezen.");
      utils.passport.listClaims.invalidate();
    },
    onError: (e) => toast.error(e.message || "Afwijzen mislukt"),
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Openstaande koppelingsverzoeken</h2>
        {claims.length > 0 && (
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            {claims.length}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Controleer of de aanvrager daadwerkelijk recht heeft op toegang voordat u bevestigt. Pas na
        bevestiging krijgt de gebruiker inzage in de woninggegevens.
      </p>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : claims.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Geen openstaande verzoeken.</p>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <div key={c.memberId} className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  {c.userName} <span className="text-slate-400 font-normal">({c.userEmail})</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  {c.street} {c.houseNumber}, {c.postalCode} {c.city}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={roleChoice[c.memberId] ?? "owner"}
                  onChange={(e) => setRoleChoice((s) => ({ ...s, [c.memberId]: e.target.value }))}
                  className="px-2.5 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {CLAIM_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    confirm.mutate({ memberId: c.memberId, role: (roleChoice[c.memberId] ?? "owner") as any })
                  }
                  disabled={confirm.isPending}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition active:scale-[0.97] disabled:opacity-60"
                >
                  <Check className="w-4 h-4" /> Bevestig
                </button>
                <button
                  onClick={() => revoke.mutate({ memberId: c.memberId })}
                  disabled={revoke.isPending}
                  className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg flex items-center gap-1.5 transition active:scale-[0.97] disabled:opacity-60"
                >
                  <X className="w-4 h-4" /> Wijs af
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Change requests ─────────────────────────────────────────────────────────

function ChangeRequestsSection() {
  const utils = trpc.useUtils();
  const { data: requests = [], isLoading } = trpc.changeRequests.listOpen.useQuery();

  const approve = trpc.changeRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Wijziging goedgekeurd en toegepast.");
      utils.changeRequests.listOpen.invalidate();
    },
    onError: (e) => toast.error(e.message || "Goedkeuren mislukt"),
  });
  const reject = trpc.changeRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Wijzigverzoek afgewezen.");
      utils.changeRequests.listOpen.invalidate();
    },
    onError: (e) => toast.error(e.message || "Afwijzen mislukt"),
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileEdit className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Wijzigverzoeken (gevalideerde velden)</h2>
        {requests.length > 0 && (
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            {requests.length}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Wijzigingen aan beschermde velden (officiële/gevalideerde gegevens). Controleer de
        voorgestelde waarde tegen de bron (BAG, WOZ, 0-meting) voordat u goedkeurt.
      </p>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : requests.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">Geen openstaande wijzigverzoeken.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                  Categorie {r.fieldCategory}
                </span>
                <span className="text-sm font-semibold text-slate-800">{r.fieldName}</span>
                <span className="text-xs text-slate-400 ml-auto">woning #{r.propertyId}</span>
              </div>
              <div className="flex items-center gap-3 text-sm mb-2">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-0.5">Huidige waarde</p>
                  <p className="font-mono text-slate-700 bg-white border border-slate-200 rounded px-2 py-1">
                    {r.currentValue || "—"}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-0.5">Voorgestelde waarde</p>
                  <p className="font-mono text-slate-900 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                    {r.proposedValue || "—"}
                  </p>
                </div>
              </div>
              {r.note && (
                <p className="text-xs text-amber-700 flex items-start gap-1.5 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {r.note}
                </p>
              )}
              <p className="text-xs text-slate-400 mb-3">
                Aangevraagd door {r.requesterName} ({r.requesterEmail})
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approve.mutate({ id: r.id })}
                  disabled={approve.isPending}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition active:scale-[0.97] disabled:opacity-60"
                >
                  <Check className="w-4 h-4" /> Goedkeuren
                </button>
                <button
                  onClick={() => reject.mutate({ id: r.id })}
                  disabled={reject.isPending}
                  className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg flex items-center gap-1.5 transition active:scale-[0.97] disabled:opacity-60"
                >
                  <X className="w-4 h-4" /> Afwijzen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Role management ───────────────────────────────────────────────────────────

function RolesSection() {
  const utils = trpc.useUtils();
  const { isManager } = useAuth();
  const { data: users = [], isLoading } = trpc.users.list.useQuery(undefined, { enabled: isManager });
  const setRole = trpc.users.setRole.useMutation({
    onSuccess: () => {
      toast.success("Rol bijgewerkt.");
      utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Rol wijzigen mislukt"),
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-[#1E3A5F]" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Rolbeheer</h2>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Alleen Beheerders en Managers mogen gebruikers beheren. Medewerkers kunnen claims en
        wijzigverzoeken behandelen, maar geen rollen toewijzen.
      </p>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#1E3A5F] font-bold text-xs flex-shrink-0">
                {u.name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <span className="text-xs text-slate-500 hidden sm:block">{ROLE_LABELS[u.role] ?? u.role}</span>
              <select
                value={u.role}
                onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as any })}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { useState } from "react";
import { useParams } from "wouter";
import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import { Home, Plus, X, ArrowRight, Link, User } from "lucide-react";

interface PropertyForm {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  buildYear: string;
  propertyType: string;
  surfaceM2: string;
  subscriptionType: string;
}

const emptyPropertyForm: PropertyForm = {
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  buildYear: "",
  propertyType: "tussenwoning",
  surfaceM2: "",
  subscriptionType: "basis",
};

export default function AdminCustomerDetail() {
  const params = useParams<{ id: string }>();
  const customerId = Number(params.id);

  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [propertyForm, setPropertyForm] = useState<PropertyForm>(emptyPropertyForm);
  const [linkUserId, setLinkUserId] = useState("");

  const { data: customer, refetch: refetchCustomer } = trpc.customers.get.useQuery({ id: customerId });
  const { data: properties = [], refetch: refetchProperties } = trpc.properties.listByCustomer.useQuery({ customerId });
  const { data: allUsers = [] } = trpc.users.list.useQuery();

  const createProperty = trpc.properties.create.useMutation({
    onSuccess: () => {
      toast.success("Woning aangemaakt");
      setShowPropertyModal(false);
      setPropertyForm(emptyPropertyForm);
      refetchProperties();
    },
    onError: (e) => toast.error(e.message),
  });

  const linkUser = trpc.users.linkToCustomer.useMutation({
    onSuccess: () => {
      toast.success("Gebruiker gekoppeld");
      setShowLinkModal(false);
      refetchCustomer();
    },
    onError: (e) => toast.error(e.message),
  });

  const handlePropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyForm.street || !propertyForm.houseNumber || !propertyForm.postalCode || !propertyForm.city) {
      return toast.error("Vul alle verplichte velden in");
    }
    createProperty.mutate({
      customerId,
      street: propertyForm.street,
      houseNumber: propertyForm.houseNumber,
      postalCode: propertyForm.postalCode,
      city: propertyForm.city,
      buildYear: propertyForm.buildYear ? Number(propertyForm.buildYear) : undefined,
      propertyType: propertyForm.propertyType as any,
      surfaceM2: propertyForm.surfaceM2 ? Number(propertyForm.surfaceM2) : undefined,
      subscriptionType: propertyForm.subscriptionType as any,
    });
  };

  if (!customer) {
    return (
      <AdminLayout title="Klant">
        <div className="text-center py-16 text-slate-400">Klant niet gevonden</div>
      </AdminLayout>
    );
  }

  const displayName =
    customer.type === "bedrijf" || customer.type === "vastgoed"
      ? customer.companyName
      : `${customer.firstName || ""} ${customer.lastName || ""}`.trim();

  const linkedUser = allUsers.find((u) => u.id === customer.userId);

  return (
    <AdminLayout title={displayName || "Klant"}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#1E3A5F] flex items-center justify-center text-white font-bold text-lg">
                {(displayName || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">{displayName || "—"}</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    customer.type === "particulier"
                      ? "bg-blue-50 text-blue-700"
                      : customer.type === "bedrijf"
                      ? "bg-purple-50 text-purple-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {customer.type}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">E-mail</span>
                <span className="text-slate-800 font-medium">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefoon</span>
                  <span className="text-slate-800">{customer.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className={customer.isActive ? "text-emerald-600" : "text-slate-400"}>
                  {customer.isActive ? "Actief" : "Inactief"}
                </span>
              </div>
            </div>
            {customer.notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Notities</p>
                <p className="text-sm text-slate-700">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Linked user */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-800 text-sm">Portaal toegang</h3>
              <button
                onClick={() => setShowLinkModal(true)}
                className="text-xs text-[#1E3A5F] hover:underline flex items-center gap-1"
              >
                <Link className="w-3 h-3" />
                Koppelen
              </button>
            </div>
            {linkedUser ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                  {(linkedUser.name || "?").charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{linkedUser.name}</p>
                  <p className="text-xs text-slate-400">{linkedUser.email}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <User className="w-6 h-6 text-slate-200 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Geen gebruiker gekoppeld</p>
                <p className="text-xs text-slate-400">Klant kan nog niet inloggen</p>
              </div>
            )}
          </div>
        </div>

        {/* Properties */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Woningen ({properties.length})</h2>
              <button
                onClick={() => setShowPropertyModal(true)}
                className="flex items-center gap-1.5 bg-[#1E3A5F] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#2a4f7a] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Woning toevoegen
              </button>
            </div>

            {properties.length === 0 ? (
              <div className="text-center py-12">
                <Home className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nog geen woningen</p>
                <button
                  onClick={() => setShowPropertyModal(true)}
                  className="mt-2 text-xs text-[#1E3A5F] hover:underline"
                >
                  Eerste woning toevoegen →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {properties.map((p) => (
                  <a
                    key={p.id}
                    href={`/admin/properties/${p.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Home className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {p.street} {p.houseNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.postalCode} {p.city}
                        {p.buildYear ? ` · Bouwjaar ${p.buildYear}` : ""}
                        {p.surfaceM2 ? ` · ${p.surfaceM2} m²` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full">
                        {p.subscriptionType}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Modal */}
      {showPropertyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-800">Woning toevoegen</h2>
              <button onClick={() => setShowPropertyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePropertySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Straat <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={propertyForm.street}
                    onChange={(e) => setPropertyForm({ ...propertyForm, street: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Huisnr. <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={propertyForm.houseNumber}
                    onChange={(e) => setPropertyForm({ ...propertyForm, houseNumber: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Postcode <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={propertyForm.postalCode}
                    onChange={(e) => setPropertyForm({ ...propertyForm, postalCode: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stad <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={propertyForm.city}
                    onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bouwjaar</label>
                  <input
                    type="number"
                    min="1800"
                    max="2025"
                    value={propertyForm.buildYear}
                    onChange={(e) => setPropertyForm({ ...propertyForm, buildYear: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Oppervlakte (m²)</label>
                  <input
                    type="number"
                    value={propertyForm.surfaceM2}
                    onChange={(e) => setPropertyForm({ ...propertyForm, surfaceM2: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type woning</label>
                  <select
                    value={propertyForm.propertyType}
                    onChange={(e) => setPropertyForm({ ...propertyForm, propertyType: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  >
                    {["tussenwoning", "hoekwoning", "vrijstaand", "appartement", "bedrijfspand", "overig"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Abonnement</label>
                  <select
                    value={propertyForm.subscriptionType}
                    onChange={(e) => setPropertyForm({ ...propertyForm, subscriptionType: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  >
                    {["basis", "plus", "premium", "vve", "verhuur"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPropertyModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={createProperty.isPending}
                  className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7a] disabled:opacity-60"
                >
                  {createProperty.isPending ? "Opslaan..." : "Woning aanmaken"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link user modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Gebruiker koppelen</h2>
              <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Koppel een bestaande gebruiker aan deze klant zodat zij kunnen inloggen op het portaal.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gebruiker</label>
                <select
                  value={linkUserId}
                  onChange={(e) => setLinkUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                >
                  <option value="">Selecteer gebruiker...</option>
                  {allUsers.filter(u => u.role === "user").map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email || `User #${u.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Annuleren
                </button>
                <button
                  disabled={!linkUserId || linkUser.isPending}
                  onClick={() => linkUser.mutate({ userId: Number(linkUserId), customerId })}
                  className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7a] disabled:opacity-60"
                >
                  {linkUser.isPending ? "Koppelen..." : "Koppelen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

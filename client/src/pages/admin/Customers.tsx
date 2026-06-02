import { useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import { Plus, Search, ArrowRight, X, Users, Download } from "lucide-react";

type CustomerType = "particulier" | "bedrijf" | "vastgoed";

interface CustomerForm {
  type: CustomerType;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyForm: CustomerForm = {
  type: "particulier",
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  notes: "",
};

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const { data: customers = [], refetch } = trpc.customers.list.useQuery();
  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Klant aangemaakt");
      setShowModal(false);
      setForm(emptyForm);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.firstName || "").toLowerCase().includes(q) ||
      (c.lastName || "").toLowerCase().includes(q) ||
      (c.companyName || "").toLowerCase().includes(q)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return toast.error("E-mailadres is verplicht");
    createMutation.mutate({
      type: form.type,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      companyName: form.companyName || undefined,
      email: form.email,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <AdminLayout title="Klanten">
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Zoek klant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = [
                ["Naam", "E-mail", "Type", "Telefoon", "Status"],
                ...customers.map((c) => [
                  c.type === "bedrijf" || c.type === "vastgoed"
                    ? (c.companyName || "")
                    : `${c.firstName || ""} ${c.lastName || ""}`.trim(),
                  c.email,
                  c.type,
                  c.phone || "",
                  c.isActive ? "Actief" : "Inactief",
                ]),
              ];
              const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `klanten-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a4f7a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nieuwe klant
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Geen klanten gevonden</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 text-sm text-[#1E3A5F] hover:underline"
            >
              Eerste klant toevoegen →
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Naam</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">E-mail</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Telefoon</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(c.firstName || c.companyName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {c.type === "bedrijf" || c.type === "vastgoed"
                            ? c.companyName
                            : `${c.firstName || ""} ${c.lastName || ""}`.trim() || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        c.type === "particulier"
                          ? "bg-blue-50 text-blue-700"
                          : c.type === "bedrijf"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{c.email}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{c.phone || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.isActive ? "Actief" : "Inactief"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <a
                      href={`/admin/customers/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs text-[#1E3A5F] hover:underline"
                    >
                      Details
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Nieuwe klant</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type klant</label>
                <div className="flex gap-2">
                  {(["particulier", "bedrijf", "vastgoed"] as CustomerType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.type === t
                          ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-[#1E3A5F]"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name fields */}
              {form.type === "particulier" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Voornaam</label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Achternaam</label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bedrijfsnaam</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  E-mailadres <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefoonnummer</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notities</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-[#1E3A5F] text-white rounded-lg text-sm font-medium hover:bg-[#2a4f7a] transition-colors disabled:opacity-60"
                >
                  {createMutation.isPending ? "Opslaan..." : "Klant aanmaken"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

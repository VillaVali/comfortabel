import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Home, ArrowRight, Search } from "lucide-react";
import { useState } from "react";

export default function AdminProperties() {
  const [search, setSearch] = useState("");
  const { data: properties = [] } = trpc.properties.list.useQuery();

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.street.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.postalCode.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout title="Woningen">
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Zoek woning..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 w-64"
          />
        </div>
        <p className="text-sm text-slate-500">{filtered.length} woningen</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Home className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">Geen woningen gevonden</p>
            <p className="text-xs text-slate-400 mt-1">Voeg woningen toe via een klantprofiel</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Adres</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Abonnement</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Bouwjaar</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Energie</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Home className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {p.street} {p.houseNumber}
                        </p>
                        <p className="text-xs text-slate-500">
                          {p.postalCode} {p.city}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600 capitalize">{p.propertyType || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2.5 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full font-medium">
                      {p.subscriptionType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{p.buildYear || "—"}</td>
                  <td className="px-5 py-3.5">
                    {p.energyLabel ? (
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                        {p.energyLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <a
                      href={`/admin/properties/${p.id}`}
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
    </AdminLayout>
  );
}

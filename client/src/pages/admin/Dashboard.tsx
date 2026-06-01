import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { Users, Home, ClipboardCheck, AlertTriangle, ArrowRight, Plus } from "lucide-react";

export default function AdminDashboard() {
  const { data: customers = [] } = trpc.customers.list.useQuery();
  const { data: properties = [] } = trpc.properties.list.useQuery();
  const { data: allUsers = [] } = trpc.users.list.useQuery();

  const activeCustomers = customers.filter((c) => c.isActive);
  const activeProperties = properties.filter((p) => p.subscriptionActive);

  const stats = [
    {
      label: "Actieve klanten",
      value: activeCustomers.length,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/admin/customers",
    },
    {
      label: "Woningen",
      value: activeProperties.length,
      icon: Home,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/admin/properties",
    },
    {
      label: "Gebruikers",
      value: allUsers.length,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/admin/users",
    },
  ];

  const recentCustomers = customers.slice(0, 5);

  return (
    <AdminLayout title="Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {stats.map((s) => (
          <a
            key={s.label}
            href={s.href}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-slate-800">{s.value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </a>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Snelle acties</h2>
          <div className="space-y-2">
            <a
              href="/admin/customers"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-[#1E3A5F]" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-[#1E3A5F]">
                Nieuwe klant toevoegen
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-[#1E3A5F]" />
            </a>
            <a
              href="/admin/properties"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-[#1E3A5F]" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-[#1E3A5F]">
                Woning toevoegen
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-[#1E3A5F]" />
            </a>
            <a
              href="/admin/properties"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-[#1E3A5F]" />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-[#1E3A5F]">
                0-meting starten
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-[#1E3A5F]" />
            </a>
          </div>
        </div>

        {/* Recent customers */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Recente klanten</h2>
            <a href="/admin/customers" className="text-xs text-[#1E3A5F] hover:underline">
              Alle klanten
            </a>
          </div>
          {recentCustomers.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nog geen klanten</p>
              <a href="/admin/customers" className="text-xs text-[#1E3A5F] hover:underline mt-1 inline-block">
                Eerste klant toevoegen →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCustomers.map((c) => (
                <a
                  key={c.id}
                  href={`/admin/customers/${c.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(c.firstName || c.companyName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {c.type === "bedrijf" || c.type === "vastgoed"
                        ? c.companyName
                        : `${c.firstName || ""} ${c.lastName || ""}`.trim()}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{c.email}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      c.type === "particulier"
                        ? "bg-blue-50 text-blue-600"
                        : c.type === "bedrijf"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {c.type}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

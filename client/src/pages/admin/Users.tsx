import { useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import { Shield, User, Clock, Plus, X, Eye, EyeOff, UserCheck, UserX, Star } from "lucide-react";

export default function AdminUsers() {
  const { data: users = [], refetch } = trpc.users.list.useQuery();

  const setRole = trpc.users.setRole.useMutation({
    onSuccess: () => { toast.success("Rol bijgewerkt"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const setActive = trpc.users.setActive.useMutation({
    onSuccess: () => { toast.success("Status bijgewerkt"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Gebruiker aangemaakt");
      setShowForm(false);
      setFormData({ name: "", email: "", password: "", role: "user" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error("Vul alle verplichte velden in");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }
    createUser.mutate(formData);
  };

  return (
    <AdminLayout title="Gebruikers">
      {/* Header with create button */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          Beheer alle gebruikersaccounts voor het portaal.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Annuleren" : "Nieuwe gebruiker"}
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Nieuwe gebruiker aanmaken</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Naam *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Voor- en achternaam"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">E-mailadres *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="naam@voorbeeld.nl"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Wachtwoord * (min. 8 tekens)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Tijdelijk wachtwoord"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "user" | "admin" })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F]"
              >
                <option value="user">Klant (portaal toegang)</option>
                <option value="admin">Beheerder (volledige toegang)</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormData({ name: "", email: "", password: "", role: "user" }); }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={createUser.isPending}
                className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#162d4a] transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {createUser.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Aanmaken
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400">Nog geen gebruikers</p>
            <p className="text-xs text-slate-400 mt-1">Klik op "Nieuwe gebruiker" om de eerste gebruiker aan te maken</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Gebruiker</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Rol</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Laatste login</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">Aangemeld</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          u.role === "admin"
                            ? "bg-[#1E3A5F] text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {(u.name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-800">{u.name || "—"}</p>
                          {u.isFoundingMember && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                              <Star className="w-2.5 h-2.5" />
                              Founding
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                        u.role === "admin"
                          ? "bg-[#1E3A5F]/10 text-[#1E3A5F]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {u.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {u.role === "admin" ? "Beheerder" : "Klant"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                        u.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      {u.isActive ? "Actief" : "Inactief"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {u.lastSignedIn ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(u.lastSignedIn).toLocaleDateString("nl-NL")}
                      </div>
                    ) : (
                      <span className="text-slate-300">Nooit</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as "user" | "admin" })}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1E3A5F]/20"
                      >
                        <option value="user">Klant</option>
                        <option value="admin">Beheerder</option>
                      </select>
                      <button
                        onClick={() => setActive.mutate({ id: u.id, isActive: !u.isActive })}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          u.isActive
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-green-200 text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {u.isActive ? "Deactiveren" : "Activeren"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Klanten koppelen:</strong> Ga naar een klantprofiel en klik op "Koppelen" om een gebruiker te koppelen aan een klant. Zo krijgen klanten toegang tot hun eigen woningportaal.
        </p>
      </div>
    </AdminLayout>
  );
}

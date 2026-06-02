import { useAuth } from "../hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Home,
  LogOut,
  Building2,
  ChevronRight,
  Shield,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Klanten", icon: Users },
  { href: "/admin/properties", label: "Woningen", icon: Home },
  { href: "/admin/users", label: "Gebruikers", icon: Shield },
];

export default function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/login");
    }
  }, [loading, isAdmin]);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Laden...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center mb-1">
          <img
            src="/manus-storage/comfortabel-logo_8c90d4c3.png"
            alt="Comfortabel"
            className="h-8 w-auto object-contain brightness-0 invert"
          />
        </div>
        <span className="text-xs text-white/50 uppercase tracking-widest">Beheer</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </a>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#1E3A5F] font-bold text-sm flex-shrink-0">
            {user?.name?.charAt(0) || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || "Beheerder"}</p>
            <p className="text-xs text-white/50 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-3 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          Uitloggen
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="w-64 bg-[#1E3A5F] text-white flex-col fixed h-full z-20 hidden lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#1E3A5F] text-white flex flex-col z-40 lg:hidden transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white rounded-lg"
          aria-label="Sluit menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        {/* Mobile top bar */}
        <header className="bg-[#1E3A5F] text-white flex items-center gap-3 px-4 py-3 lg:hidden sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center flex-1">
            <img
              src="/manus-storage/comfortabel-logo_8c90d4c3.png"
              alt="Comfortabel"
              className="h-7 w-auto object-contain brightness-0 invert"
            />
          </div>
          <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#1E3A5F] font-bold text-xs">
            {user?.name?.charAt(0) || "A"}
          </div>
        </header>

        {/* Desktop page title */}
        {title && (
          <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10 hidden lg:block">
            <h1 className="text-xl font-semibold text-[#1E3A5F]">{title}</h1>
          </header>
        )}

        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

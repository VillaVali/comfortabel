import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Building2, LogOut, Home, ChevronLeft, Bot, User } from "lucide-react";

export default function ClientLayout({
  children,
  title,
  backHref,
}: {
  children: React.ReactNode;
  title?: string;
  backHref?: string;
}) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [loading, isAuthenticated]);

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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top navigation */}
      <header className="bg-[#1E3A5F] text-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {backHref ? (
              <a
                href={backHref}
                className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors min-h-[44px] pr-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Terug</span>
              </a>
            ) : (
              <div className="flex items-center">
                <img
                  src="/manus-storage/comfortabel-logo_8c90d4c3.png"
                  alt="Comfortabel"
                  className="h-7 w-auto object-contain brightness-0 invert"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop nav links */}
            <a
              href="/mijn"
              className="hidden sm:flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
            >
              <Home className="w-4 h-4" />
              Mijn woningen
            </a>
            <a
              href="/mijn/profiel"
              className="hidden sm:flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
            >
              <User className="w-4 h-4" />
              Profiel
            </a>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#1E3A5F] font-bold text-xs">
                {user?.name?.charAt(0) || "K"}
              </div>
              <span className="text-sm text-white/80 hidden md:block">{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors min-h-[44px] min-w-[44px] justify-center"
              aria-label="Uitloggen"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {title && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <h1 className="text-lg font-semibold text-[#1E3A5F]">{title}</h1>
          </div>
        </div>
      )}

      {/* Main content — extra bottom padding on mobile for bottom nav */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-24 sm:pb-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex sm:hidden z-20 safe-area-inset-bottom">
        <a
          href="/mijn"
          className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[56px] text-xs font-medium transition-colors ${
            location === "/mijn" ? "text-[#1E3A5F]" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Home className={`w-5 h-5 mb-1 ${location === "/mijn" ? "text-[#C9A84C]" : ""}`} />
          Woningen
        </a>
        <a
          href={location.includes("/mijn/woning/") ? `${location.split("/huismeester")[0]}/huismeester` : "/mijn"}
          className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[56px] text-xs font-medium transition-colors ${
            location.includes("/huismeester") ? "text-[#1E3A5F]" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Bot className={`w-5 h-5 mb-1 ${location.includes("/huismeester") ? "text-[#C9A84C]" : ""}`} />
          Huismeester
        </a>
        <a
          href="/mijn/profiel"
          className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[56px] text-xs font-medium transition-colors ${
            location === "/mijn/profiel" ? "text-[#1E3A5F]" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <User className={`w-5 h-5 mb-1 ${location === "/mijn/profiel" ? "text-[#C9A84C]" : ""}`} />
          Profiel
        </a>
        <button
          onClick={logout}
          className="flex-1 flex flex-col items-center justify-center py-3 min-h-[56px] text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
        >
          <LogOut className="w-5 h-5 mb-1" />
          Uitloggen
        </button>
      </nav>
    </div>
  );
}

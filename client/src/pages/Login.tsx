import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Loader2 } from "lucide-react";

export default function Login() {
  const { login, isAuthenticated, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      window.location.href = user.role === "admin" ? "/admin" : "/mijn";
    }
  }, [loading, isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // on success: useEffect redirect handles it
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#0f2340] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Building2 className="w-9 h-9 text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">MijnComfortabel</h1>
          <p className="text-sm text-white/60 mt-1">Grip op je woning. Rust in je hoofd.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Inloggen</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                required
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-medium rounded-lg text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Inloggen...
                </>
              ) : (
                "Inloggen"
              )}
            </button>
          </form>

          <div className="flex flex-col items-center gap-2 mt-6">
            <a href="/wachtwoord-vergeten" className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline">
              Wachtwoord vergeten?
            </a>
            <p className="text-xs text-gray-400">
              Nog geen account?{" "}
              <a href="/registreren" className="text-[#C9A84C] hover:text-[#b8943d] font-medium transition-colors">
                Gratis aanmelden
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          © {new Date().getFullYear()} Comfortabel® — Alle rechten voorbehouden
        </p>
      </div>
    </div>
  );
}

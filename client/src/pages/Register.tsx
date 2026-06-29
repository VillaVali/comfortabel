import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Register() {
  const { register, isAuthenticated, user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Read invite token from URL query param
  const inviteToken = new URLSearchParams(window.location.search).get("invite") || "";

  useEffect(() => {
    if (inviteToken) {
      // Pre-fill email from invite if provided in URL
      const inviteEmail = new URLSearchParams(window.location.search).get("email");
      if (inviteEmail) setEmail(decodeURIComponent(inviteEmail));
    }
  }, [inviteToken]);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      window.location.href = "/mijn/onboarding";
    }
  }, [loading, isAuthenticated, user]);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthLabel = ["", "Zwak", "Matig", "Goed", "Sterk"][passwordStrength];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-green-500"][passwordStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens bevatten");
      return;
    }

    setSubmitting(true);
    const result = await register(name, email, password, inviteToken || undefined);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#0f2340] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/manus-storage/comfortabel-logo_8c90d4c3.png"
              alt="Comfortabel — zorgeloos wonen"
              className="h-14 w-auto object-contain brightness-0 invert"
            />
          </div>
          <p className="text-sm text-white/60 mt-1">Grip op je woning. Rust in je hoofd.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Account aanmaken</h2>
          <p className="text-sm text-gray-500 mb-6">Start gratis — geen creditcard vereist</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volledige naam</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jan de Vries"
                required
                autoFocus
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimaal 8 tekens"
                  required
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength ? strengthColor : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord bevestigen</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Herhaal wachtwoord"
                  required
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition"
                />
                {passwordConfirm.length > 0 && password === passwordConfirm && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
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
                  Account aanmaken...
                </>
              ) : (
                "Gratis account aanmaken"
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">Wat u krijgt met een gratis account:</p>
            <div className="space-y-1.5">
              {[
                "Woningpaspoort™ aanmaken",
                "Directe links naar BAG, WOZ en Energielabel",
                "Basis onderhoudskalender",
                "Mati — jouw digitale woonvriend (3 vragen/maand)",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A84C] flex-shrink-0" />
                  <span className="text-xs text-gray-600">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-5">
            Al een account?{" "}
            <Link href="/login" className="text-[#1E3A5F] font-medium hover:underline">
              Inloggen
            </Link>
          </p>
          <p className="text-xs text-gray-300 text-center mt-3">
            Door u aan te melden gaat u akkoord met onze{" "}
            <a href="/algemene-voorwaarden" className="text-gray-400 hover:text-gray-600 underline">Algemene Voorwaarden</a>{" "}
            en{" "}
            <a href="/privacy" className="text-gray-400 hover:text-gray-600 underline">Privacyverklaring</a>.
          </p>
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          © {new Date().getFullYear()} Comfortabel® — Alle rechten voorbehouden
        </p>
      </div>
    </div>
  );
}

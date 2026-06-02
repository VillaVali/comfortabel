import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, CheckCircle, Home, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Extract token from URL query string
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens bevatten");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset mislukt");
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch {
      setError("Verbindingsfout. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>
                Ongeldige resetlink. Vraag een nieuwe aan via{" "}
                <Link href="/wachtwoord-vergeten">
                  <span className="underline cursor-pointer">wachtwoord vergeten</span>
                </Link>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/">
            <div className="inline-flex items-center gap-2 text-stone-800 hover:text-stone-600 transition-colors">
              <Home className="w-5 h-5" />
              <span className="font-semibold text-lg">MijnComfortabel™</span>
            </div>
          </Link>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-2">
              <KeyRound className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-stone-800">
              Nieuw wachtwoord
            </CardTitle>
            <CardDescription className="text-center text-stone-500">
              Kies een nieuw wachtwoord voor uw account
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="text-center text-stone-700 font-medium">Wachtwoord gewijzigd!</p>
                <p className="text-center text-stone-500 text-sm">
                  U wordt doorgestuurd naar de inlogpagina...
                </p>
                <Link href="/login">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                    Direct inloggen
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-stone-700">Nieuw wachtwoord</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimaal 8 tekens"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="border-stone-200 focus:border-amber-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-stone-700">Bevestig wachtwoord</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Herhaal uw wachtwoord"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-stone-200 focus:border-amber-400"
                  />
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= level * 3
                              ? level <= 1 ? "bg-red-400" : level <= 2 ? "bg-amber-400" : level <= 3 ? "bg-yellow-400" : "bg-green-400"
                              : "bg-stone-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-stone-400">
                      {password.length < 8 ? "Te kort" : password.length < 12 ? "Acceptabel" : "Sterk wachtwoord"}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? "Bezig..." : "Wachtwoord opslaan"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

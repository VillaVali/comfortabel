import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle, Home } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verzoek mislukt");
      } else {
        setSuccess(true);
        // In development mode, the server returns the reset URL directly
        if (data.resetUrl) setResetUrl(data.resetUrl);
      }
    } catch {
      setError("Verbindingsfout. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto mb-2">
              <Mail className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center text-stone-800">
              Wachtwoord vergeten
            </CardTitle>
            <CardDescription className="text-center text-stone-500">
              Voer uw e-mailadres in en wij sturen u een resetlink
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <p className="text-center text-stone-700 font-medium">Verzoek ontvangen</p>
                  <p className="text-center text-stone-500 text-sm">
                    Als dit e-mailadres bij ons bekend is, wordt een resetlink aangemaakt.
                    Neem contact op met de beheerder via{" "}
                    <a href="mailto:info@villavali.nl" className="text-amber-600 hover:underline">
                      info@villavali.nl
                    </a>{" "}
                    om de link te ontvangen.
                  </p>
                </div>

                {/* Development helper: show reset URL directly */}
                {resetUrl && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-xs break-all">
                      <strong>Demo-modus resetlink:</strong>{" "}
                      <a href={resetUrl} className="text-amber-700 hover:underline">
                        {resetUrl}
                      </a>
                    </AlertDescription>
                  </Alert>
                )}

                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Terug naar inloggen
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
                  <Label htmlFor="email" className="text-stone-700">E-mailadres</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="uw@emailadres.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="border-stone-200 focus:border-amber-400"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? "Bezig..." : "Resetlink aanvragen"}
                </Button>

                <div className="text-center">
                  <Link href="/login">
                    <span className="text-sm text-stone-500 hover:text-stone-700 cursor-pointer inline-flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" />
                      Terug naar inloggen
                    </span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

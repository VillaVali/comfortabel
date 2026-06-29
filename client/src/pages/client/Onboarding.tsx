import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Building2, Home, MapPin, Calendar, Ruler, Users,
  Zap, ChevronRight, Loader2, CheckCircle2, ArrowRight, Phone, Star
} from "lucide-react";

// Must stay in sync with the server enum in passport.createOrClaim
// (tussenwoning | hoekwoning | vrijstaand | appartement | bedrijfspand | overig).
const PROPERTY_TYPES = [
  { value: "tussenwoning", label: "Tussenwoning" },
  { value: "hoekwoning", label: "Hoekwoning" },
  { value: "vrijstaand", label: "Vrijstaande woning" },
  { value: "appartement", label: "Appartement" },
  { value: "bedrijfspand", label: "Bedrijfspand" },
  { value: "overig", label: "Overig" },
];

/** Valid Dutch postal code: 4 digits (first non-zero) + 2 letters, spacing/casing ignored. */
function isValidDutchPostalCode(raw: string): boolean {
  const cleaned = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[1-9]\d{3}[A-Z]{2}$/.test(cleaned);
}

const ENERGY_LABELS = ["A+++", "A++", "A+", "A", "B", "C", "D", "E", "F", "G", "Onbekend"];

type Step = "welkom" | "woning" | "details" | "nulmeting" | "klaar" | "claim";

export default function ClientOnboarding() {
  const { user, loading, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>("welkom");

  // Form state
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("tussenwoning");
  const [buildYear, setBuildYear] = useState("");
  const [area, setArea] = useState("");
  const [residents, setResidents] = useState("2");
  const [energyLabel, setEnergyLabel] = useState("Onbekend");
  const [error, setError] = useState("");
  const [createdPropertyId, setCreatedPropertyId] = useState<number | null>(null);
  const [isFoundingMember, setIsFoundingMember] = useState(false);
  // 0-meting form
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [measurementNotes, setMeasurementNotes] = useState("");
  const [measurementRequested, setMeasurementRequested] = useState(false);

  const utils = trpc.useUtils();

  const completeOnboarding = trpc.passport.completeOnboarding.useMutation({
    onSuccess: (data) => {
      setIsFoundingMember(data.isFoundingMember);
      utils.auth.me.invalidate();
    },
  });

  const requestZeroMeasurement = trpc.passport.requestZeroMeasurement.useMutation({
    onSuccess: () => {
      setMeasurementRequested(true);
      // Complete onboarding after requesting 0-meting
      completeOnboarding.mutate();
      setStep("klaar");
    },
    onError: (err: { message?: string }) => {
      setError(err.message || "Er ging iets mis bij de aanvraag.");
    },
  });

  const createProperty = trpc.passport.createOrClaim.useMutation({
    onSuccess: (data: { outcome: string; propertyId: number }) => {
      setCreatedPropertyId(data.propertyId);
      utils.properties.myProperties.invalidate();
      utils.passport.myPassports.invalidate();
      utils.passport.myPendingClaims.invalidate();
      if (data.outcome === "created" || data.outcome === "already_member") {
        // After creating a property, go to 0-meting request step
        setStep("nulmeting");
      } else {
        // claim_pending — complete onboarding and go to claim screen
        completeOnboarding.mutate();
        setStep("claim");
      }
    },
    onError: (err: { message?: string }) => {
      setError(err.message || "Er ging iets mis. Probeer opnieuw.");
    },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  const handleCreateProperty = async () => {
    setError("");
    if (!street || !houseNumber || !postalCode || !city) {
      setError("Vul minimaal het adres in");
      return;
    }
    createProperty.mutate({
      street,
      houseNumber,
      postalCode,
      city,
      propertyType: propertyType as any,
      buildYear: buildYear ? parseInt(buildYear) : undefined,
      surfaceM2: area ? parseFloat(area) : undefined,
      residents: residents ? parseInt(residents) : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0f2340] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-3">
            <Building2 className="w-8 h-8 text-[#C9A84C]" />
          </div>
          <h1 className="text-xl font-bold text-white">MijnComfortabel</h1>
        </div>

        {/* Progress */}
        {step !== "klaar" && (
          <div className="flex items-center justify-center gap-2 mb-6">
                    {(["welkom", "woning", "details", "nulmeting"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? "bg-[#C9A84C] text-white"
                      : ["welkom", "woning", "details", "nulmeting"].indexOf(step) > i
                      ? "bg-green-500 text-white"
                      : "bg-white/20 text-white/50"
                  }`}
                >
                  {["welkom", "woning", "details", "nulmeting"].indexOf(step) > i ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 3 && <div className="w-8 h-0.5 bg-white/20" />}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* ── Stap 1: Welkom ── */}
          {step === "welkom" && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1E3A5F]/10 rounded-2xl mb-4">
                  <Home className="w-9 h-9 text-[#1E3A5F]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Welkom{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  U bent succesvol aangemeld bij MijnComfortabel™. Laten we beginnen met het aanmaken van uw Woningpaspoort™.
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { icon: Home, title: "Woningpaspoort™", desc: "Alle gegevens van uw woning op één plek" },
                  { icon: Zap, title: "Gratis deeplinks", desc: "Direct naar BAG, WOZ, Energielabel en meer" },
                  { icon: Calendar, title: "Onderhoudskalender", desc: "Nooit meer een onderhoudsmoment missen" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 p-3 bg-[#F5F7FA] rounded-xl">
                    <div className="w-8 h-8 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#1E3A5F]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep("woning")}
                className="w-full py-3 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.97]"
              >
                Woning toevoegen
                <ArrowRight className="w-4 h-4" />
              </button>


            </div>
          )}

          {/* ── Stap 2: Adres ── */}
          {step === "woning" && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#1E3A5F]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Adres van uw woning</h2>
                  <p className="text-xs text-gray-500">Stap 1 van 2</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Straatnaam</label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Hoofdstraat"
                      autoFocus
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Huisnr.</label>
                    <input
                      type="text"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      placeholder="12A"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                      placeholder="1234 AB"
                      maxLength={7}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stad / Gemeente</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Amsterdam"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Woningtype</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition bg-white"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("welkom")}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Terug
                </button>
                <button
                  onClick={() => {
                    if (!street || !houseNumber || !postalCode || !city) {
                      setError("Vul alle adresvelden in");
                      return;
                    }
                    if (!isValidDutchPostalCode(postalCode)) {
                      setError("Ongeldige postcode. Gebruik het formaat 1234 AB.");
                      return;
                    }
                    setError("");
                    setStep("details");
                  }}
                  className="flex-1 py-2.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.97]"
                >
                  Volgende
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Stap 3: Details ── */}
          {step === "details" && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-[#1E3A5F]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Woningdetails</h2>
                  <p className="text-xs text-gray-500">Stap 2 van 2 — optioneel, later aan te vullen</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      Bouwjaar
                    </label>
                    <input
                      type="number"
                      value={buildYear}
                      onChange={(e) => setBuildYear(e.target.value)}
                      placeholder="1975"
                      min={1800}
                      max={new Date().getFullYear()}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Ruler className="w-3.5 h-3.5 inline mr-1" />
                      Oppervlakte (m²)
                    </label>
                    <input
                      type="number"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="95"
                      min={10}
                      max={10000}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      Aantal bewoners
                    </label>
                    <select
                      value={residents}
                      onChange={(e) => setResidents(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition bg-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "persoon" : "personen"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Zap className="w-3.5 h-3.5 inline mr-1" />
                      Energielabel
                    </label>
                    <select
                      value={energyLabel}
                      onChange={(e) => setEnergyLabel(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition bg-white"
                    >
                      {ENERGY_LABELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep("woning")}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Terug
                </button>
                <button
                  onClick={handleCreateProperty}
                  disabled={createProperty.isPending}
                  className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#b8943f] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.97] disabled:opacity-60"
                >
                  {createProperty.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Aanmaken...
                    </>
                  ) : (
                    <>
                      Paspoort aanmaken
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Stap 4: 0-meting aanvragen ── */}
          {step === "nulmeting" && (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#C9A84C]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">0-meting aanvragen</h2>
                  <p className="text-xs text-gray-500">Stap 4 van 4 — uw woning professioneel in kaart laten brengen</p>
                </div>
              </div>

              <div className="p-3 bg-[#1E3A5F]/5 border border-[#1E3A5F]/10 rounded-lg text-xs text-[#1E3A5F] mb-5 leading-relaxed">
                <strong>Wat is de 0-meting?</strong> Een Comfortabel-adviseur bezoekt uw woning en vult samen met u het volledige WoningPaspoort™ in. Na de meting worden uw Woning Score™ en Mati’s analyses beschikbaar.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-3.5 h-3.5 inline mr-1" />
                    Telefoonnummer
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06-12345678"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Voorkeursdatum
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opmerkingen (optioneel)</label>
                  <textarea
                    value={measurementNotes}
                    onChange={(e) => setMeasurementNotes(e.target.value)}
                    placeholder="Bijv. beschikbaarheid, toegang, specifieke vragen..."
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] transition resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    // Skip 0-meting, complete onboarding and go to portaal
                    completeOnboarding.mutate();
                    setStep("klaar");
                  }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Later plannen
                </button>
                <button
                  onClick={() => {
                    setError("");
                    if (!phone) { setError("Vul uw telefoonnummer in"); return; }
                    if (!preferredDate) { setError("Kies een voorkeursdatum"); return; }
                    if (!createdPropertyId) return;
                    requestZeroMeasurement.mutate({
                      propertyId: createdPropertyId,
                      phone,
                      preferredDate,
                      notes: measurementNotes || undefined,
                    });
                  }}
                  disabled={requestZeroMeasurement.isPending}
                  className="flex-1 py-2.5 bg-[#C9A84C] hover:bg-[#b8943f] text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition active:scale-[0.97] disabled:opacity-60"
                >
                  {requestZeroMeasurement.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Aanvragen...</>
                  ) : (
                    <>0-meting aanvragen<CheckCircle2 className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Stap 5b: Claim ingediend (adres bestaat al) ── */}
          {step === "claim" && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-5">
                <CheckCircle2 className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Aanvraag ontvangen</h2>
              <p className="text-gray-600 text-sm mb-2">
                Voor <strong>{street} {houseNumber}, {city}</strong> bestaat al een Woningpaspoort™.
              </p>
              <p className="text-gray-500 text-xs mb-4 leading-relaxed">
                Uw verzoek om aan deze woning gekoppeld te worden is ingediend. Een medewerker van
                Comfortabel controleert uw aanvraag. <strong>U krijgt pas toegang tot de woninggegevens
                nadat de aanvraag is bevestigd.</strong> Dit beschermt de privacy van de huidige eigenaar.
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-6 text-left">
                <strong>Status:</strong> In behandeling — wacht op bevestiging door Comfortabel.
              </div>
              <button
                onClick={() => { window.location.href = "/mijn"; }}
                className="w-full py-3 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.97]"
              >
                Naar mijn portaal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Stap 5: Klaar ── */}
          {step === "klaar" && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Onboarding voltooid!</h2>
              <p className="text-gray-500 text-sm mb-2">
                <strong>{street} {houseNumber}, {city}</strong> is toegevoegd aan uw portaal.
              </p>

              {isFoundingMember && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full text-xs font-semibold text-[#C9A84C] mb-4">
                  <Star className="w-3.5 h-3.5" />
                  Founding Member — u behoort tot de eerste 100!
                </div>
              )}

              {measurementRequested ? (
                <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                  Uw 0-meting is aangevraagd. Een Comfortabel-adviseur neemt contact op om de afspraak te bevestigen.
                </p>
              ) : (
                <p className="text-gray-400 text-xs mb-6">
                  U kunt het paspoort nu verder aanvullen. Vraag een 0-meting aan via uw woning-dashboard.
                </p>
              )}

              <div className="space-y-3">
                {createdPropertyId && (
                  <button
                    onClick={() => { window.location.href = `/mijn/woning/${createdPropertyId}`; }}
                    className="w-full py-3 bg-[#1E3A5F] hover:bg-[#162d4a] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.97]"
                  >
                    Paspoort bekijken
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => { window.location.href = "/mijn"; }}
                  className="w-full py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  Naar mijn woningen
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          © {new Date().getFullYear()} Comfortabel® — Alle rechten voorbehouden
        </p>
      </div>
    </div>
  );
}

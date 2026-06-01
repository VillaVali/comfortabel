import {
  Building2, ArrowRight, Check, X, Star, FileText, Wrench, ClipboardCheck,
} from "lucide-react";
import {
  SUBSCRIPTION_TIERS, SUBSCRIPTION_LABELS, SUBSCRIPTION_PRICES,
  SUBSCRIPTION_DESCRIPTIONS, SUBSCRIPTION_COLORS, PLAN_FEATURES,
  FEATURE_LABELS, FEATURE_ORDER, type SubscriptionTier,
} from "@shared/const";

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  free: <Building2 className="w-5 h-5" />,
  digital: <FileText className="w-5 h-5" />,
  basis: <ClipboardCheck className="w-5 h-5" />,
  plus: <Wrench className="w-5 h-5" />,
  premium: <Star className="w-5 h-5" />,
};

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0f2340] text-white">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#C9A84C]" />
          <span className="font-bold text-lg tracking-tight">MijnComfortabel</span>
        </a>
        <a
          href="/login"
          className="flex items-center gap-2 bg-[#C9A84C] text-[#1E3A5F] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#d4b55a] transition-colors"
        >
          Inloggen
          <ArrowRight className="w-4 h-4" />
        </a>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Kies het pakket dat bij u past
        </h1>
        <p className="text-white/60 max-w-xl mx-auto">
          Van gratis basisinzicht tot volledig ontzorgd onderhoud. Altijd opzegbaar,
          geen verborgen kosten.
        </p>
      </section>

      {/* Tier cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const isPremium = tier === "premium";
            const isPlus = tier === "plus";
            const color = SUBSCRIPTION_COLORS[tier];
            const price = SUBSCRIPTION_PRICES[tier];

            return (
              <div
                key={tier}
                className={`relative rounded-2xl p-5 flex flex-col border ${
                  isPremium
                    ? "bg-[#C9A84C]/10 border-[#C9A84C]/40 ring-1 ring-[#C9A84C]/30"
                    : isPlus
                    ? "bg-white/10 border-white/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {isPremium && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#C9A84C] text-[#1E3A5F] text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      Meest compleet
                    </span>
                  </div>
                )}

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${color}25`, color }}
                >
                  {TIER_ICONS[tier]}
                </div>
                <h3 className="font-bold text-white text-lg mb-1">{SUBSCRIPTION_LABELS[tier]}</h3>
                <p className="text-xs text-white/50 mb-4 leading-snug">{SUBSCRIPTION_DESCRIPTIONS[tier]}</p>

                <div className="mb-5">
                  {price === 0 ? (
                    <span className="text-3xl font-bold text-white">Gratis</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">€{Number.isInteger(price) ? price : price.toFixed(2).replace(".", ",")}</span>
                      <span className="text-white/50 text-sm">/mnd</span>
                    </div>
                  )}
                  {price > 0 && (
                    <p className="text-xs text-white/40 mt-1">excl. btw, per woning</p>
                  )}
                </div>

                <a
                  href="/login"
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all mt-auto ${
                    isPremium
                      ? "bg-[#C9A84C] text-[#1E3A5F] hover:bg-[#d4b55a]"
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                  }`}
                >
                  {price === 0 ? "Gratis starten" : "Aan de slag"}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Volledige vergelijking</h2>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-white/60 font-medium w-48">Functie</th>
                {SUBSCRIPTION_TIERS.map((tier) => (
                  <th key={tier} className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${SUBSCRIPTION_COLORS[tier]}25`,
                          color: SUBSCRIPTION_COLORS[tier],
                        }}
                      >
                        {SUBSCRIPTION_LABELS[tier]}
                      </span>
                      <span className="text-white/50 text-xs">
                        {SUBSCRIPTION_PRICES[tier] === 0
                          ? "Gratis"
                          : `€${Number.isInteger(SUBSCRIPTION_PRICES[tier]) ? SUBSCRIPTION_PRICES[tier] : SUBSCRIPTION_PRICES[tier].toFixed(2).replace(".", ",")}/mnd`}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ORDER.map((feature, idx) => (
                <tr
                  key={feature}
                  className={`border-b border-white/5 ${
                    idx % 2 === 0 ? "bg-white/[0.02]" : ""
                  }`}
                >
                  <td className="p-4 text-white/70">{FEATURE_LABELS[feature]}</td>
                  {SUBSCRIPTION_TIERS.map((tier) => {
                    const hasFeature = PLAN_FEATURES[tier][feature];
                    return (
                      <td key={tier} className="p-4 text-center">
                        {hasFeature ? (
                          <Check
                            className="w-4 h-4 mx-auto"
                            style={{ color: SUBSCRIPTION_COLORS[tier] }}
                          />
                        ) : (
                          <X className="w-4 h-4 mx-auto text-white/20" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10">
                <td className="p-4" />
                {SUBSCRIPTION_TIERS.map((tier) => {
                  const isPremium = tier === "premium";
                  const price = SUBSCRIPTION_PRICES[tier];
                  return (
                    <td key={tier} className="p-4 text-center">
                      <a
                        href="/login"
                        className={`inline-block px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isPremium
                            ? "bg-[#C9A84C] text-[#1E3A5F] hover:bg-[#d4b55a]"
                            : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                        }`}
                      >
                        {price === 0 ? "Gratis" : "Starten"}
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* FAQ / Info */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Veelgestelde vragen</h2>
        <div className="space-y-4">
          {[
            {
              q: "Kan ik op elk moment opzeggen?",
              a: "Ja, alle betaalde abonnementen zijn maandelijks opzegbaar. Bij opzegging behoudt u toegang tot het einde van de betaalde periode.",
            },
            {
              q: "Wat is inbegrepen bij het Free pakket?",
              a: "Het Free pakket geeft u toegang tot de basisgegevens van uw Woningpaspoort™: adres, bouwjaar, woningtype en oppervlakte. Scores, documenten en onderhoud zijn niet inbegrepen.",
            },
            {
              q: "Hoe werkt de jaarlijkse inspectie bij Premium?",
              a: "Bij het Premium pakket stuurt Comfortabel jaarlijks een inspecteur langs voor een volledige 0-meting. De resultaten worden direct in uw portaal verwerkt.",
            },
            {
              q: "Kan ik upgraden of downgraden?",
              a: "Ja, u kunt op elk moment van pakket wisselen. Uw Comfortabel-adviseur past het abonnement voor u aan.",
            },
          ].map((faq) => (
            <div key={faq.q} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-white/40 text-sm">
        © {new Date().getFullYear()} Comfortabel® — Villa Vali Bouwgroep | MijnComfortabel is een besloten portaal
      </footer>
    </div>
  );
}

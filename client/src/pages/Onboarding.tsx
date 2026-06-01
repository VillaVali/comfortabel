import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  Building2, ArrowRight, Check, Star, FileText, Wrench, ClipboardCheck,
} from "lucide-react";
import {
  SUBSCRIPTION_TIERS, SUBSCRIPTION_LABELS, SUBSCRIPTION_PRICES,
  SUBSCRIPTION_DESCRIPTIONS, SUBSCRIPTION_COLORS, type SubscriptionTier,
} from "@shared/const";

const TIER_HIGHLIGHTS: Record<SubscriptionTier, string[]> = {
  free: ["Woningpaspoort™ basisgegevens", "Adres & bouwjaar", "Gratis voor altijd"],
  digital: ["Alles van Free", "Digitale documentenmap", "Documenten uploaden & delen"],
  basis: ["Alles van Digital", "Woning Score™ (A–E)", "Professionele 0-meting", "PDF-rapport downloaden"],
  plus: ["Alles van Basis", "Meerjarenplanning (MJOP)", "Prioriteit & kostenoverzicht"],
  premium: ["Alles van Plus", "Jaarlijkse inspectie inbegrepen", "Direct contact met Comfortabel"],
};

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  free: <Building2 className="w-5 h-5" />,
  digital: <FileText className="w-5 h-5" />,
  basis: <ClipboardCheck className="w-5 h-5" />,
  plus: <Wrench className="w-5 h-5" />,
  premium: <Star className="w-5 h-5" />,
};

export default function Onboarding() {
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0f2340] text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-[#C9A84C]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#C9A84C]" />
          </div>
          <h1 className="text-3xl font-bold mb-3">
            Welkom bij MijnComfortabel™
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-white/60 max-w-lg mx-auto">
            Uw account is aangemaakt. Uw Comfortabel-adviseur heeft uw woning al voor u
            ingesteld. Hieronder ziet u welk pakket actief is voor uw woning.
          </p>
        </div>

        {/* Tier overview */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-5 text-center">
            Beschikbare pakketten
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const isPremium = tier === "premium";
              const color = SUBSCRIPTION_COLORS[tier];
              const price = SUBSCRIPTION_PRICES[tier];
              const highlights = TIER_HIGHLIGHTS[tier];

              return (
                <div
                  key={tier}
                  className={`relative rounded-2xl p-4 flex flex-col border ${
                    isPremium
                      ? "bg-[#C9A84C]/10 border-[#C9A84C]/40"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {isPremium && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="bg-[#C9A84C] text-[#1E3A5F] text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        Meest compleet
                      </span>
                    </div>
                  )}

                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${color}25`, color }}
                  >
                    {TIER_ICONS[tier]}
                  </div>
                  <h3 className="font-bold text-white text-sm mb-0.5">{SUBSCRIPTION_LABELS[tier]}</h3>
                  <div className="mb-3">
                    {price === 0 ? (
                      <span className="text-lg font-bold text-white">Gratis</span>
                    ) : (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-lg font-bold text-white">€{price}</span>
                        <span className="text-white/40 text-xs">/mnd</span>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-1 flex-1">
                    {highlights.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs text-white/60">
                        <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3">
          <a
            href="/mijn"
            className="inline-flex items-center gap-2 bg-[#C9A84C] text-[#1E3A5F] px-8 py-3.5 rounded-xl font-bold hover:bg-[#d4b55a] transition-all hover:scale-105 active:scale-95"
          >
            Naar mijn woningportaal
            <ArrowRight className="w-5 h-5" />
          </a>
          <div>
            <a
              href="/abonnementen"
              className="text-white/50 hover:text-white text-sm transition-colors"
            >
              Meer informatie over pakketten
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

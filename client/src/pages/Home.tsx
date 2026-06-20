import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  Building2, Shield, ClipboardCheck, BarChart3, ArrowRight, Star,
  Check, FileText, Wrench, Zap,
} from "lucide-react";
import {
  SUBSCRIPTION_TIERS, SUBSCRIPTION_LABELS, SUBSCRIPTION_PRICES,
  SUBSCRIPTION_DESCRIPTIONS, SUBSCRIPTION_COLORS,
  type SubscriptionTier,
} from "@shared/const";

const TIER_HIGHLIGHTS: Record<SubscriptionTier, string[]> = {
  free: ["Woningpaspoort\u2122 basisgegevens", "Adres & bouwjaar", "Gratis voor altijd"],
  digital: ["Alles van Free", "Digitale documentenmap", "Documenten uploaden & delen"],
  basis: ["Alles van Digital", "Woning Score\u2122 (A\u2013E)", "Professionele 0-meting", "PDF-rapport downloaden", "Urgentie-meldingen"],
  plus: ["Alles van Basis", "Meerjarenplanning (MJOP)", "Prioriteit & kostenoverzicht", "Volledig kostenoverzicht"],
  premium: ["Alles van Plus", "Jaarlijkse inspectie inbegrepen", "Direct contact met Comfortabel", "Prioritaire service"],
};

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  free: <Building2 className="w-5 h-5" />,
  digital: <FileText className="w-5 h-5" />,
  basis: <ClipboardCheck className="w-5 h-5" />,
  plus: <Wrench className="w-5 h-5" />,
  premium: <Star className="w-5 h-5" />,
};

export default function Home() {
  const { loading, isAuthenticated, isStaff } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (isStaff) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/mijn";
      }
    }
  }, [loading, isAuthenticated, isStaff]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#0f2340] text-white">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center">
          <img
            src="/manus-storage/comfortabel-logo_8c90d4c3.png"
            alt="Comfortabel — zorgeloos wonen"
            className="h-10 w-auto object-contain brightness-0 invert"
          />
        </div>
        <nav className="flex items-center gap-4">
          <a
            href="/abonnementen"
            className="text-white/70 hover:text-white text-sm transition-colors hidden sm:block"
          >
            Abonnementen
          </a>
          <a
            href="/login"
            className="flex items-center gap-2 bg-[#C9A84C] text-[#1E3A5F] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#d4b55a] transition-colors"
          >
            Inloggen
            <ArrowRight className="w-4 h-4" />
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
          <Star className="w-3.5 h-3.5 text-[#C9A84C]" />
          Uw persoonlijk woningportaal
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          Grip op uw woning.
          <br />
          <span className="text-[#C9A84C]">Rust in uw hoofd.</span>
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
          MijnComfortabel geeft u een compleet overzicht van de staat van uw woning, 
          uw onderhoudspunten en uw Comfortabel Woningpaspoort™ — altijd inzichtelijk, 
          altijd up-to-date.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-[#C9A84C] text-[#1E3A5F] px-8 py-3.5 rounded-xl font-bold text-base hover:bg-[#d4b55a] transition-all hover:scale-105 active:scale-95"
          >
            Toegang tot mijn portaal
            <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="/abonnementen"
            className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-white/20 transition-all border border-white/20"
          >
            Bekijk abonnementen
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-white mb-10">
          Alles over uw woning op één plek
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: ClipboardCheck,
              title: "Woningpaspoort™",
              desc: "Een compleet digitaal dossier van uw woning met alle technische informatie, keuringen en onderhoud.",
            },
            {
              icon: BarChart3,
              title: "Woning Score™",
              desc: "Uw woning krijgt een objectieve score van A t/m E op basis van een professionele 0-meting door Comfortabel.",
            },
            {
              icon: Shield,
              title: "Onderhoudsbeheer",
              desc: "Alle open punten, geplande werkzaamheden en historisch onderhoud overzichtelijk op één plek.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
              <div className="w-10 h-10 bg-[#C9A84C]/20 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm text-white/80 mb-4">
            <Zap className="w-3.5 h-3.5 text-[#C9A84C]" />
            Kies uw pakket
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Van gratis tot volledig ontzorgd
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Begin gratis en schakel op wanneer u meer inzicht en service nodig heeft.
            Geen verplichtingen, altijd opzegbaar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SUBSCRIPTION_TIERS.map((tier) => {
            const isPremium = tier === "premium";
            const isPlus = tier === "plus";
            const color = SUBSCRIPTION_COLORS[tier];
            const highlights = TIER_HIGHLIGHTS[tier];
            const price = SUBSCRIPTION_PRICES[tier];
            return (
              <div
                key={tier}
                className={`relative rounded-2xl p-5 flex flex-col border transition-all ${
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
                <div className="mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${color}25`, color }}
                  >
                    {TIER_ICONS[tier]}
                  </div>
                  <h3 className="font-bold text-white text-base">{SUBSCRIPTION_LABELS[tier]}</h3>
                  <p className="text-xs text-white/50 mt-0.5 leading-snug">{SUBSCRIPTION_DESCRIPTIONS[tier]}</p>
                </div>
                <div className="mb-4">
                  {price === 0 ? (
                    <span className="text-2xl font-bold text-white">Gratis</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">&euro;{Number.isInteger(price) ? price : price.toFixed(2).replace(".", ",")}</span>
                      <span className="text-white/50 text-xs">/mnd</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1 mb-5">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-white/70">
                      <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="/login"
                  className={`w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
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

        <div className="text-center mt-8">
          <a
            href="/abonnementen"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
          >
            Volledige vergelijking bekijken
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-white/40 text-sm">
        <p>© {new Date().getFullYear()} Comfortabel® — Villa Vali Bouwgroep</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="/privacy" className="hover:text-white/70 transition underline">Privacyverklaring</a>
          <span>·</span>
          <a href="/algemene-voorwaarden" className="hover:text-white/70 transition underline">Algemene Voorwaarden</a>
          <span>·</span>
          <a href="/abonnementen" className="hover:text-white/70 transition underline">Abonnementen</a>
        </div>
      </footer>
    </div>
  );
}

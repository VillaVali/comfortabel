import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Building2, Shield, ClipboardCheck, BarChart3, ArrowRight, Star } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (isAdmin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/mijn";
      }
    }
  }, [loading, isAuthenticated, isAdmin]);

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
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#C9A84C]" />
          <span className="font-bold text-lg tracking-tight">MijnComfortabel</span>
        </div>
        <a
          href="/login"
          className="flex items-center gap-2 bg-[#C9A84C] text-[#1E3A5F] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#d4b55a] transition-colors"
        >
          Inloggen
          <ArrowRight className="w-4 h-4" />
        </a>
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
        <a
          href="/login"
          className="inline-flex items-center gap-2 bg-[#C9A84C] text-[#1E3A5F] px-8 py-3.5 rounded-xl font-bold text-base hover:bg-[#d4b55a] transition-all hover:scale-105 active:scale-95"
        >
          Toegang tot mijn portaal
          <ArrowRight className="w-5 h-5" />
        </a>
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

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-white/40 text-sm">
        © {new Date().getFullYear()} Comfortabel® — Villa Vali Bouwgroep | MijnComfortabel is een besloten portaal
      </footer>
    </div>
  );
}

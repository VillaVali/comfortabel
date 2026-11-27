import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { setPageMetadata } from "@/lib/pageMetadata";

export default function Founding100Thanks() {
  useEffect(() => {
    const restoreMetadata = setPageMetadata({
      title: "Aanmelding ontvangen | Founding 100",
      description: "Je aanmelding voor de Founding 100-pilot is ontvangen.",
      canonicalUrl: "https://mijncomfortabel.nl/founding-100/bedankt",
    });
    try {
      const completed =
        sessionStorage.getItem("mc_founding100_submission_complete") === "1";
      const alreadyTracked =
        sessionStorage.getItem("mc_founding100_thank_you_tracked") === "1";
      if (completed && !alreadyTracked) {
        trackEvent("founding100_thank_you_view");
        sessionStorage.setItem("mc_founding100_thank_you_tracked", "1");
      }
    } catch {}
    return restoreMetadata;
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#172A46] px-5 py-12 text-white">
      <div className="absolute -left-28 top-12 h-80 w-80 rounded-full bg-[#C9A84C]/15 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#5E8D72]/20 blur-3xl" />

      <main className="relative w-full max-w-2xl rounded-[30px] border border-white/10 bg-white/[0.07] p-7 text-center shadow-2xl backdrop-blur sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C9A84C] text-[#172A46]">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-[#D8BE75]">
          Aanmelding ontvangen
        </p>
        <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
          Fijn dat je wilt meebouwen
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/68">
          We hebben je aanmelding ontvangen. Je krijgt een bevestiging per
          e-mail en we bekijken iedere aanmelding persoonlijk.
        </p>

        <div className="mt-9 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <Mail className="h-5 w-5 text-[#D8BE75]" />
            <h2 className="mt-3 font-bold">Controleer je inbox</h2>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Geen mail gezien? Kijk voor de zekerheid ook even tussen je
              ongewenste berichten.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
            <Sparkles className="h-5 w-5 text-[#D8BE75]" />
            <h2 className="mt-3 font-bold">Persoonlijke opvolging</h2>
            <p className="mt-1 text-sm leading-6 text-white/55">
              Aanmelding is nog geen automatische toelating. We nemen contact op
              over de volgende stap.
            </p>
          </div>
        </div>

        <a
          href="/"
          className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-6 py-3 font-bold text-[#172A46] transition hover:bg-[#D8BE75]"
        >
          Terug naar MijnComfortabel
          <ArrowRight className="h-4 w-4" />
        </a>
      </main>
    </div>
  );
}

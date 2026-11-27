import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  HeartHandshake,
  Home,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  captureFounding100Attribution,
  getFounding100Attribution,
} from "@/lib/attribution";
import { trackEvent } from "@/lib/analytics";
import { setPageMetadata } from "@/lib/pageMetadata";
import { FOUNDING_DISCOUNT_PERCENT, SUBSCRIPTION_PRICES } from "@shared/const";

type FormState = {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  message: string;
  privacyAccepted: boolean;
  contactConsent: boolean;
  marketingOptIn: boolean;
  company: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  postalCode: "",
  message: "",
  privacyAccepted: false,
  contactConsent: false,
  marketingOptIn: false,
  company: "",
};

const benefits = [
  {
    icon: Home,
    title: "Persoonlijke start",
    description:
      "We helpen je persoonlijk om je Woningpaspoort te activeren en goed in te vullen.",
  },
  {
    icon: Sparkles,
    title: "MijnComfortabel + MATI",
    description:
      "Je krijgt gratis toegang tot de pilotfunctionaliteiten en kunt MATI in de praktijk testen.",
  },
  {
    icon: MessageCircle,
    title: "Jouw ervaring telt",
    description:
      "Je feedback helpt bepalen wat duidelijker, slimmer en vooral comfortabeler kan.",
  },
];

const regularDigitalPrice = SUBSCRIPTION_PRICES.digital;
const foundingDigitalPrice =
  regularDigitalPrice * (1 - FOUNDING_DISCOUNT_PERCENT / 100);
const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export default function Founding100() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formStarted = useRef(false);

  useEffect(() => {
    captureFounding100Attribution();
    trackEvent("founding100_view");
    return setPageMetadata({
      title: "Founding 100-pilot | MijnComfortabel",
      description:
        "Word één van maximaal 100 pilotdeelnemers en bouw mee aan MijnComfortabel en MATI.",
      canonicalUrl: "https://mijncomfortabel.nl/founding-100",
    });
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (!formStarted.current) {
      formStarted.current = true;
      trackEvent("founding100_form_start");
    }
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (form.name.trim().length < 2) {
      setError("Vul je naam in.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Vul een geldig e-mailadres in.");
      return;
    }

    if (!form.privacyAccepted) {
      setError(
        "Bevestig dat we je gegevens mogen gebruiken om je aanmelding te behandelen."
      );
      return;
    }

    if (!form.contactConsent) {
      setError(
        "Geef toestemming om per e-mail en, als je een telefoonnummer invult, telefonisch contact op te nemen."
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/founding-100", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          attribution: getFounding100Attribution(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Aanmelden is niet gelukt.");
      }

      trackEvent("founding100_submit_success");
      try {
        sessionStorage.setItem("mc_founding100_submission_complete", "1");
      } catch {}
      const isLocalPreview = ["localhost", "127.0.0.1"].includes(
        window.location.hostname
      );
      window.location.assign(
        import.meta.env.PROD && !isLocalPreview
          ? "https://mijncomfortabel.nl/founding-100/bedankt"
          : "/founding-100/bedankt"
      );
    } catch (submitError) {
      trackEvent("founding100_submit_error");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Aanmelden is niet gelukt. Probeer het opnieuw."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#172A46]">
      <header className="border-b border-[#172A46]/10 bg-[#F7F5EF]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" aria-label="Terug naar MijnComfortabel">
            <span className="flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-[#172A46]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#172A46] text-white">
                <Home className="h-4 w-4" aria-hidden="true" />
              </span>
              Comfortabel
            </span>
          </a>
          <a
            href="/login"
            className="text-sm font-semibold text-[#172A46]/70 transition hover:text-[#172A46]"
          >
            <span className="hidden sm:inline">Al een account? </span>
            Inloggen
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute -right-28 top-14 h-80 w-80 rounded-full bg-[#C9A84C]/15 blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-[#5E8D72]/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-20">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/35 bg-white/70 px-4 py-2 text-sm font-semibold text-[#79621F]">
                <HeartHandshake className="h-4 w-4" />
                Gratis pilot · maximaal 100 deelnemers
              </div>
              <h1 className="max-w-3xl font-serif text-5xl font-bold leading-[1.03] tracking-tight text-[#172A46] sm:text-6xl">
                Word één van de{" "}
                <span className="text-[#A27E24]">Founding 100</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#172A46]/72 sm:text-xl">
                Bouw samen met ons aan MijnComfortabel en MATI. Je krijgt
                persoonlijke hulp bij je Woningpaspoort, test de pilot gratis en
                helpt ons van een goed idee een bijzonder prettig woonmaatje te
                maken.
              </p>
              <div className="mt-8 grid gap-3 text-sm text-[#172A46]/80 sm:grid-cols-2">
                {[
                  "Gratis deelname aan de pilot",
                  "Persoonlijke begeleiding",
                  "Geen betaalverplichting achteraf",
                  "Levenslang 50% korting bij doorgaan",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5E8D72]/15">
                      <Check className="h-3.5 w-3.5 text-[#3C6A51]" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              id="aanmelden"
              className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_24px_70px_rgba(23,42,70,0.14)] sm:p-9"
            >
              <div className="mb-7">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A27E24]">
                  Meld je aan
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#172A46]">
                  Misschien staat jouw voordeur straks vooraan
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#172A46]/60">
                  Aanmelden is vrijblijvend. We bekijken iedere aanmelding
                  persoonlijk.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Naam *
                  </label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={event => update("name", event.target.value)}
                    required
                    autoComplete="name"
                    className="w-full rounded-xl border border-[#172A46]/15 bg-[#FCFBF8] px-4 py-3 text-base outline-none transition focus:border-[#A27E24] focus:ring-4 focus:ring-[#C9A84C]/15"
                    placeholder="Je volledige naam"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    E-mailadres *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={event => update("email", event.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#172A46]/15 bg-[#FCFBF8] px-4 py-3 text-base outline-none transition focus:border-[#A27E24] focus:ring-4 focus:ring-[#C9A84C]/15"
                    placeholder="naam@voorbeeld.nl"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-semibold"
                    >
                      Telefoon{" "}
                      <span className="font-normal text-[#172A46]/45">
                        optioneel
                      </span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={event => update("phone", event.target.value)}
                      autoComplete="tel"
                      className="w-full rounded-xl border border-[#172A46]/15 bg-[#FCFBF8] px-4 py-3 text-base outline-none transition focus:border-[#A27E24] focus:ring-4 focus:ring-[#C9A84C]/15"
                      placeholder="06 12345678"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="postalCode"
                      className="mb-1.5 block text-sm font-semibold"
                    >
                      Postcode{" "}
                      <span className="font-normal text-[#172A46]/45">
                        optioneel
                      </span>
                    </label>
                    <input
                      id="postalCode"
                      value={form.postalCode}
                      onChange={event =>
                        update("postalCode", event.target.value)
                      }
                      autoComplete="postal-code"
                      className="w-full rounded-xl border border-[#172A46]/15 bg-[#FCFBF8] px-4 py-3 text-base uppercase outline-none transition focus:border-[#A27E24] focus:ring-4 focus:ring-[#C9A84C]/15"
                      placeholder="1234 AB"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    Wat wil je graag comfortabeler maken?{" "}
                    <span className="font-normal text-[#172A46]/45">
                      optioneel
                    </span>
                  </label>
                  <textarea
                    id="message"
                    value={form.message}
                    onChange={event => update("message", event.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-[#172A46]/15 bg-[#FCFBF8] px-4 py-3 text-base outline-none transition focus:border-[#A27E24] focus:ring-4 focus:ring-[#C9A84C]/15"
                    placeholder="Vertel kort iets over je woning of verwachting"
                  />
                </div>

                <div
                  className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
                  aria-hidden="true"
                >
                  <label htmlFor="company">Bedrijfsnaam</label>
                  <input
                    id="company"
                    value={form.company}
                    onChange={event => update("company", event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#172A46]/72">
                  <input
                    type="checkbox"
                    checked={form.privacyAccepted}
                    onChange={event =>
                      update("privacyAccepted", event.target.checked)
                    }
                    required
                    className="mt-0.5 h-4 w-4 rounded border-[#172A46]/25 accent-[#172A46]"
                  />
                  <span>
                    Ik geef toestemming om mijn gegevens te gebruiken voor mijn
                    aanmelding en persoonlijke opvolging. Lees de{" "}
                    <a href="/privacy" className="font-semibold underline">
                      privacyverklaring
                    </a>
                    .
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#172A46]/72">
                  <input
                    type="checkbox"
                    checked={form.contactConsent}
                    onChange={event =>
                      update("contactConsent", event.target.checked)
                    }
                    required
                    className="mt-0.5 h-4 w-4 rounded border-[#172A46]/25 accent-[#172A46]"
                  />
                  <span>
                    Ik geef toestemming om over deze aanmelding per e-mail en,
                    als ik mijn telefoonnummer invul, telefonisch contact met
                    mij op te nemen.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#172A46]/72">
                  <input
                    type="checkbox"
                    checked={form.marketingOptIn}
                    onChange={event =>
                      update("marketingOptIn", event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-[#172A46]/25 accent-[#172A46]"
                  />
                  <span>
                    Houd mij ook op de hoogte van relevante ontwikkelingen rond
                    MijnComfortabel.
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172A46] px-5 py-3.5 font-bold text-white transition hover:bg-[#223B60] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aanmelding versturen…
                    </>
                  ) : (
                    <>
                      Ik wil meedoen
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs leading-5 text-[#172A46]/45">
                  Aanmelding is geen automatische toelating. We nemen
                  persoonlijk contact op.
                </p>
              </form>
            </div>
          </div>
        </section>

        <section className="bg-[#172A46] py-20 text-white">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D8BE75]">
                Samen ontwikkelen
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
                Geen testpanel op afstand, maar echte mensen met echte woningen
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/65">
                We willen begrijpen wat jij nodig hebt om grip op onderhoud te
                krijgen. Daarom combineren we technologie met persoonlijke
                begeleiding. Ja, zelfs software voelt beter als iemand af en toe
                vraagt: “Lukt het een beetje?”
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.055] p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C9A84C]/15">
                    <Icon className="h-5 w-5 text-[#D8BE75]" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A27E24]">
                De Founding-belofte
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold">
                Vrij om te testen. Vrij om te kiezen.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#172A46]/70">
                Deelname aan de pilot is gratis. Na afloop bepaal je zelf of je
                MijnComfortabel wilt blijven gebruiken. Geen automatische
                omzetting, geen kleine lettertjes met een vergrootglas erbij.
              </p>
            </div>
            <div className="rounded-3xl border border-[#C9A84C]/25 bg-white p-7 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#C9A84C]/15">
                  <ShieldCheck className="h-6 w-6 text-[#8B6D20]" />
                </span>
                <div>
                  <h3 className="text-xl font-bold">
                    50% blijvende Founding-korting
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#172A46]/68">
                    Founding Members die doorgaan ontvangen levenslang 50%
                    korting op het reguliere digitale basisabonnement voor
                    digitaal preventief woningonderhoud, zolang het abonnement
                    onafgebroken actief is.
                  </p>
                  <p className="mt-3 rounded-xl bg-[#F7F5EF] px-4 py-3 text-sm font-semibold text-[#172A46]">
                    Huidig regulier tarief: {euro.format(regularDigitalPrice)}{" "}
                    per maand · indicatief Founding-tarief:{" "}
                    {euro.format(foundingDigitalPrice)} per maand
                  </p>
                  <p className="mt-3 text-xs leading-5 text-[#172A46]/48">
                    De korting geldt niet voor fysieke inspecties, materialen,
                    werkzaamheden, partnerdiensten of toekomstige
                    premiumproducten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[#172A46]/10 bg-[#F7F5EF]">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A27E24]">
              Voorwaarden in gewone mensentaal
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold">
              Dit spreken we met elkaar af
            </h2>
            <ul className="mt-7 space-y-4 text-sm leading-6 text-[#172A46]/70">
              {[
                `De korting is ${FOUNDING_DISCOUNT_PERCENT}% van het op dat moment geldende reguliere digitale basisabonnement.`,
                "De korting blijft actief zolang het abonnement onafgebroken doorloopt.",
                "Bij beëindiging of langdurige betalingsachterstand vervalt de Founding Member-korting.",
                "De korting is persoonsgebonden en niet overdraagbaar.",
                "Bij verhuizing mag de korting mee naar een andere woning binnen hetzelfde persoonlijke account.",
                "Fysieke inspecties, onderhoudswerkzaamheden, materialen, spoeddiensten, partnerdiensten en toekomstige premiumproducten vallen niet automatisch onder de korting.",
                "De gratis pilot is vrijblijvend en functies kunnen tijdens de testperiode wijzigen of tijdelijk niet beschikbaar zijn.",
              ].map(condition => (
                <li key={condition} className="flex items-start gap-3">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#5E8D72]" />
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-[#172A46]/10 bg-white py-16">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="flex items-start gap-4">
              <Wrench className="mt-1 h-6 w-6 shrink-0 text-[#A27E24]" />
              <div>
                <h2 className="text-xl font-bold">
                  Een pilot mag soms nog een beetje kraken
                </h2>
                <p className="mt-3 leading-7 text-[#172A46]/65">
                  Deelname betekent niet dat alle functies direct foutloos
                  werken. Feedback, testen en samen verbeteren zijn juist
                  onderdeel van de pilot. We beloven dus geen perfect huis op
                  dag één — wel dat we luisteren als er ergens een digitaal
                  plankje piept.
                </p>
                <p className="mt-4 text-sm leading-6 text-[#172A46]/55">
                  MijnComfortabel en MATI bieden onderhoudsinzicht en advies,
                  maar vervangen geen officiële bouwkundige keuring,
                  veiligheidskeuring of specialistische inspectie.
                </p>
              </div>
            </div>
            <a
              href="#aanmelden"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-6 py-3 font-bold text-[#172A46] transition hover:bg-[#D8BE75]"
            >
              Meld je aan voor de Founding 100
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#172A46]/10 bg-[#F7F5EF] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-sm text-[#172A46]/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} Comfortabel®</p>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-[#172A46]">
              Privacy
            </a>
            <a href="/algemene-voorwaarden" className="hover:text-[#172A46]">
              Voorwaarden
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

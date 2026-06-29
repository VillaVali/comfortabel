import { Link } from "wouter";
import { Building2, ArrowLeft, FileText } from "lucide-react";

export default function AlgemeneVoorwaarden() {
  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[#1E3A5F] hover:opacity-80 transition">
            <Building2 className="w-6 h-6 text-[#C9A84C]" />
            <span className="font-bold text-lg">MijnComfortabel</span>
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Algemene Voorwaarden</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#1E3A5F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E3A5F]">Algemene Voorwaarden</h1>
              <p className="text-sm text-gray-500">Laatste update: 1 juni 2026 — Versie 1.0</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 1 — Definities</h2>
              <p className="text-gray-700">In deze algemene voorwaarden wordt verstaan onder:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2 mt-2">
                <li><strong>Comfortabel:</strong> Comfortabel B.V., aanbieder van het platform MijnComfortabel™</li>
                <li><strong>Platform:</strong> het digitale woningbeheerplatform MijnComfortabel™, bereikbaar via mijncomfortabel.nl</li>
                <li><strong>Gebruiker:</strong> de natuurlijke persoon of rechtspersoon die een account aanmaakt op het platform</li>
                <li><strong>Abonnement:</strong> het door de gebruiker gekozen pakket (Free, Digital, Basis, Plus of Premium)</li>
                <li><strong>Mati:</strong> de AI-gestuurde digitale assistent (“digitale woonvriend”) binnen het platform die woningadvies geeft</li>
                <li><strong>Woningpaspoort™:</strong> het digitale dossier van een woning binnen het platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 2 — Toepasselijkheid</h2>
              <p className="text-gray-700">
                Deze algemene voorwaarden zijn van toepassing op alle overeenkomsten tussen Comfortabel en gebruikers van het platform. Door een account aan te maken of gebruik te maken van het platform, aanvaardt de gebruiker deze voorwaarden. Afwijkende voorwaarden zijn slechts geldig indien schriftelijk overeengekomen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 3 — Het platform en diensten</h2>
              <p className="text-gray-700 mb-2">
                Comfortabel biedt via het platform de volgende diensten aan:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Digitaal woningbeheer en Woningpaspoort™</li>
                <li>Onderhoudsbeheer en meerjarenplanning</li>
                <li>Mati (AI-assistent) voor woningadvies (afhankelijk van abonnement)</li>
                <li>Genereren van PDF-rapporten over de woning</li>
                <li>Verduurzamingsadvies en subsidie-informatie</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Comfortabel streeft naar een zo hoog mogelijke beschikbaarheid van het platform, maar garandeert geen ononderbroken toegang. Onderhoud en updates kunnen tijdelijk leiden tot beperkte beschikbaarheid.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 4 — Abonnementen en betaling</h2>
              <p className="text-gray-700 mb-2">
                Het platform biedt vijf abonnementsvormen:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1E3A5F]/5">
                      <th className="text-left p-2 font-semibold text-[#1E3A5F]">Pakket</th>
                      <th className="text-left p-2 font-semibold text-[#1E3A5F]">Prijs</th>
                      <th className="text-left p-2 font-semibold text-[#1E3A5F]">Facturering</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr><td className="p-2 text-gray-700">Free</td><td className="p-2 text-gray-700">€0</td><td className="p-2 text-gray-700">Geen</td></tr>
                    <tr><td className="p-2 text-gray-700">Digital</td><td className="p-2 text-gray-700">€9,95/mnd</td><td className="p-2 text-gray-700">Maandelijks per woning</td></tr>
                    <tr><td className="p-2 text-gray-700">Basis</td><td className="p-2 text-gray-700">€49/mnd</td><td className="p-2 text-gray-700">Maandelijks per woning</td></tr>
                    <tr><td className="p-2 text-gray-700">Plus</td><td className="p-2 text-gray-700">€89/mnd</td><td className="p-2 text-gray-700">Maandelijks per woning</td></tr>
                    <tr><td className="p-2 text-gray-700">Premium</td><td className="p-2 text-gray-700">€149/mnd</td><td className="p-2 text-gray-700">Maandelijks per woning</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-700 mt-3">
                Alle prijzen zijn inclusief BTW. Betaling vindt plaats via de door Comfortabel aangeboden betaalmethoden. Bij niet-tijdige betaling behoudt Comfortabel zich het recht voor de toegang tot het platform te beperken of te beëindigen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 5 — Mati (AI-assistent) — Disclaimer</h2>
              <p className="text-gray-700">
                Mati, de AI-assistent binnen het platform, genereert adviezen op basis van de door de gebruiker ingevoerde woninggegevens en algemene kennis. De adviezen zijn informatief van aard en vormen <strong>geen</strong> professioneel bouwkundig, juridisch of financieel advies. Comfortabel is niet aansprakelijk voor schade die voortvloeit uit het handelen op basis van adviezen van Mati.
              </p>
              <p className="text-gray-700 mt-2">
                Voor ingrijpende beslissingen over uw woning raadt Comfortabel aan een gecertificeerde bouwkundige, energieadviseur of andere relevante professional te raadplegen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 6 — Verplichtingen gebruiker</h2>
              <p className="text-gray-700">De gebruiker is verplicht:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2 mt-2">
                <li>Correcte en actuele gegevens in te voeren in het platform</li>
                <li>Zijn inloggegevens vertrouwelijk te houden</li>
                <li>Het platform niet te gebruiken voor onrechtmatige doeleinden</li>
                <li>Geen handelingen te verrichten die de werking van het platform kunnen verstoren</li>
                <li>Comfortabel onmiddellijk te informeren bij ongeautoriseerd gebruik van zijn account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 7 — Intellectueel eigendom</h2>
              <p className="text-gray-700">
                Alle rechten van intellectueel eigendom met betrekking tot het platform, inclusief de namen MijnComfortabel™, Woningpaspoort™, Woning Score™ en Mati, berusten bij Comfortabel. Het is gebruikers niet toegestaan deze te gebruiken zonder voorafgaande schriftelijke toestemming.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 8 — Aansprakelijkheid</h2>
              <p className="text-gray-700">
                Comfortabel is niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst. De aansprakelijkheid van Comfortabel is in alle gevallen beperkt tot het bedrag dat de gebruiker in de drie maanden voorafgaand aan het schadeveroorzakende feit heeft betaald voor het abonnement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 9 — Opzegging</h2>
              <p className="text-gray-700">
                De gebruiker kan zijn abonnement op elk moment opzeggen. Na opzegging blijft het abonnement actief tot het einde van de lopende betaalperiode. Het Free-abonnement kan op elk moment worden beëindigd door het account te verwijderen. Comfortabel kan een account beëindigen bij schending van deze voorwaarden.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 10 — Wijzigingen</h2>
              <p className="text-gray-700">
                Comfortabel behoudt zich het recht voor deze voorwaarden te wijzigen. Gebruikers worden minimaal 30 dagen van tevoren geïnformeerd over wezenlijke wijzigingen. Voortgezet gebruik van het platform na de ingangsdatum van de wijzigingen geldt als aanvaarding.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 11 — Toepasselijk recht en geschillen</h2>
              <p className="text-gray-700">
                Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement waar Comfortabel B.V. is gevestigd, tenzij dwingende wetgeving een andere rechter aanwijst.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">Artikel 12 — Contact</h2>
              <p className="text-gray-700">
                Voor vragen over deze voorwaarden kunt u contact opnemen via <a href="mailto:info@mijncomfortabel.nl" className="text-[#1E3A5F] underline">info@mijncomfortabel.nl</a>.
              </p>
            </section>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#1E3A5F] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar homepage
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-[#1E3A5F] hover:underline"
            >
              Bekijk ook onze Privacyverklaring →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

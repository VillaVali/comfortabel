import { Link } from "wouter";
import { Building2, ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
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
          <span className="text-sm text-gray-500">Privacyverklaring</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#1E3A5F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E3A5F]">Privacyverklaring</h1>
              <p className="text-sm text-gray-500">Laatste update: 1 juni 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">1. Wie zijn wij?</h2>
              <p className="text-gray-700">
                MijnComfortabel™ is een dienst van Comfortabel B.V., gevestigd in Nederland. Wij bieden een digitaal woningbeheerplatform waarmee eigenaren inzicht krijgen in de staat, het onderhoud en de verduurzaming van hun woning. U kunt ons bereiken via <a href="mailto:info@mijncomfortabel.nl" className="text-[#1E3A5F] underline">info@mijncomfortabel.nl</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">2. Welke gegevens verwerken wij?</h2>
              <p className="text-gray-700 mb-3">Wij verwerken de volgende categorieën persoonsgegevens:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li><strong>Accountgegevens:</strong> naam, e-mailadres, wachtwoord (versleuteld opgeslagen)</li>
                <li><strong>Woninggegevens:</strong> adres, bouwjaar, type woning, technische kenmerken, energielabel, WOZ-waarde</li>
                <li><strong>Gebruiksgegevens:</strong> inlogmomenten, gebruik van de AI Huismeester, gedownloade rapporten</li>
                <li><strong>Communicatiegegevens:</strong> berichten aan de AI Huismeester (opgeslagen voor gespreksgeschiedenis)</li>
                <li><strong>Financiële gegevens:</strong> abonnementsinformatie (geen betaalgegevens — wij verwerken geen creditcardnummers)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">3. Waarvoor gebruiken wij uw gegevens?</h2>
              <p className="text-gray-700 mb-3">Wij gebruiken uw gegevens voor de volgende doeleinden:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li>Het leveren en verbeteren van onze diensten (uitvoering overeenkomst)</li>
                <li>Het genereren van gepersonaliseerde woningadviezen via de AI Huismeester</li>
                <li>Het opstellen van PDF-rapporten over uw woning</li>
                <li>Communicatie over uw account en abonnement</li>
                <li>Naleving van wettelijke verplichtingen</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">4. Grondslag voor verwerking</h2>
              <p className="text-gray-700">
                Wij verwerken uw persoonsgegevens op basis van:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2 mt-2">
                <li><strong>Uitvoering van de overeenkomst:</strong> voor het leveren van de dienst</li>
                <li><strong>Gerechtvaardigd belang:</strong> voor het verbeteren van onze diensten en beveiliging</li>
                <li><strong>Wettelijke verplichting:</strong> waar de wet dit vereist</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">5. Hoe lang bewaren wij uw gegevens?</h2>
              <p className="text-gray-700">
                Wij bewaren uw persoonsgegevens niet langer dan noodzakelijk voor de doeleinden waarvoor ze zijn verzameld. Accountgegevens worden bewaard zolang uw account actief is. Na beëindiging van uw account worden gegevens binnen 90 dagen verwijderd, tenzij wettelijke bewaarplichten anders vereisen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">6. Delen wij uw gegevens?</h2>
              <p className="text-gray-700">
                Wij verkopen uw persoonsgegevens nooit aan derden. Wij kunnen gegevens delen met:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2 mt-2">
                <li><strong>Verwerkers:</strong> technische dienstverleners die ons platform ondersteunen (hosting, database, AI-diensten), gebonden aan verwerkersovereenkomsten</li>
                <li><strong>Wettelijke autoriteiten:</strong> indien wettelijk verplicht</li>
              </ul>
              <p className="text-gray-700 mt-3">
                AI-gesprekken worden verwerkt door een externe AI-dienstverlener. Uw woninggegevens worden als context meegegeven aan het AI-model om relevante antwoorden te genereren. Deze gegevens worden niet gebruikt voor het trainen van AI-modellen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">7. Beveiliging</h2>
              <p className="text-gray-700">
                Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beveiligen tegen verlies, ongeautoriseerde toegang of openbaarmaking. Dit omvat versleuteling van wachtwoorden (bcrypt), beveiligde HTTPS-verbindingen en toegangscontrole op basis van rollen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">8. Uw rechten (AVG)</h2>
              <p className="text-gray-700 mb-3">Op grond van de Algemene Verordening Gegevensbescherming (AVG) heeft u de volgende rechten:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2">
                <li><strong>Recht op inzage:</strong> u kunt opvragen welke gegevens wij van u hebben</li>
                <li><strong>Recht op rectificatie:</strong> u kunt onjuiste gegevens laten corrigeren</li>
                <li><strong>Recht op verwijdering:</strong> u kunt verzoeken uw gegevens te verwijderen</li>
                <li><strong>Recht op beperking:</strong> u kunt de verwerking laten beperken</li>
                <li><strong>Recht op overdraagbaarheid:</strong> u kunt uw gegevens in een gangbaar formaat opvragen</li>
                <li><strong>Recht van bezwaar:</strong> u kunt bezwaar maken tegen verwerking op basis van gerechtvaardigd belang</li>
              </ul>
              <p className="text-gray-700 mt-3">
                Om uw rechten uit te oefenen, kunt u contact opnemen via <a href="mailto:privacy@mijncomfortabel.nl" className="text-[#1E3A5F] underline">privacy@mijncomfortabel.nl</a>. Wij reageren binnen 30 dagen.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">9. Klachten</h2>
              <p className="text-gray-700">
                Als u een klacht heeft over de verwerking van uw persoonsgegevens, kunt u contact opnemen met ons via bovenstaand e-mailadres. U heeft ook het recht om een klacht in te dienen bij de Autoriteit Persoonsgegevens via <a href="https://www.autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="text-[#1E3A5F] underline">www.autoriteitpersoonsgegevens.nl</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#1E3A5F] mb-3">10. Wijzigingen</h2>
              <p className="text-gray-700">
                Wij kunnen deze privacyverklaring van tijd tot tijd bijwerken. De meest recente versie is altijd beschikbaar op onze website. Bij wezenlijke wijzigingen informeren wij u via e-mail of via een melding in uw account.
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
              href="/algemene-voorwaarden"
              className="text-sm text-[#1E3A5F] hover:underline"
            >
              Bekijk ook onze Algemene Voorwaarden →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

# MijnComfortabel 1.0 — Analyse, Datamodel en Ontwerp

Dit document beschrijft de oorzaak van de gemelde bug, het herziene datamodel, de rechtenstructuur, de account- en beheerflows, het migratieplan voor bestaande records en het verplichte testplan. Het is opgesteld vóór implementatie, zodat de kern eerst inhoudelijk wordt vastgesteld voordat er gebouwd wordt.

---

## 1. Analyse van de huidige bug

De melding luidt dat een WoningPaspoort dat door een klant wordt aangemaakt niet hetzelfde is als een WoningPaspoort dat door beheer wordt aangemaakt. De analyse van de productiedatabase bevestigt dit en legt de exacte oorzaak bloot.

In het huidige datamodel hangt een woning (`properties`) altijd aan een klant (`customers`) via `properties.customerId`. Een klant hangt op zijn beurt optioneel aan een gebruiker via `customers.userId`. Er is geen enkele relatie tussen een woning en een fysiek adres als zelfstandig gegeven. Het paspoort is dus in werkelijkheid **klantgebonden**, niet **adresgebonden**. Dat is de kern van het probleem.

De data toont drie afzonderlijke woningrecords voor exact hetzelfde fysieke adres "Top Naeffstraat 21, Zaandam":

| Property | Customer | customer.userId | customer.createdBy | Ontstaan via |
|----------|----------|-----------------|--------------------|--------------| 
| 60001 | 90001 | 90001 (gekoppelde gebruiker) | NULL | Zelfregistratie door klant |
| 90001 | 120001 | **NULL** | 1 (admin) | Aangemaakt door beheer |
| 120001 | 150001 | 120001 (gekoppelde gebruiker) | 120001 | Zelfregistratie door klant |

Hieruit blijken twee structurele defecten. Ten eerste ontbreekt elke vorm van duplicaatpreventie: hetzelfde adres kan onbeperkt opnieuw worden aangemaakt, zowel door klanten als door beheer, zonder dat het systeem dit signaleert. Ten tweede ontstaat het verschil tussen een klant- en een beheer-paspoort doordat beheer een klantrecord aanmaakt **zonder** `userId` (er is immers nog geen portaalgebruiker), terwijl een zelfregistrerende klant juist wél een `userId` krijgt maar geen `createdBy`. Het gevolg is dat een door beheer aangemaakt paspoort door geen enkele klant in het portaal zichtbaar is, omdat de koppeling tussen woning en gebruiker uitsluitend loopt via `customers.userId` — en die is leeg.

Het verschil ontstaat dus niet in de gegevens van de woning zelf, maar in de **koppelketen** woning → klant → gebruiker. Die keten is fragiel omdat zij één-op-één is en afhankelijk van wie het record toevallig heeft aangemaakt. Zodra dezelfde woning langs twee wegen wordt ingevoerd, ontstaan twee niet-verbonden eilanden.

---

## 2. Oplossing: het herziene datamodel

De oplossing volgt het principe uit de opdracht: het WoningPaspoort wordt **adresgebonden** en het Eigen Huis Dossier wordt **persoonsgebonden**, met een expliciete koppeltabel daartussen die meerdere gebruikers met verschillende rollen aan één paspoort verbindt.

Het nieuwe model introduceert een genormaliseerd adres als sleutel van het paspoort. Elk WoningPaspoort krijgt een genormaliseerde adressleutel die wordt opgebouwd uit postcode, huisnummer en toevoeging (en in de toekomst een BAG-identificatie). Op deze sleutel komt een uniciteitsbeperking, zodat de database zelf afdwingt dat één adres maximaal één paspoort heeft. Daarmee wordt duplicaatpreventie een eigenschap van het datamodel en niet langer iets dat in applicatiecode "onthouden" moet worden.

De koppeling tussen gebruikers en paspoorten verloopt voortaan via een aparte koppeltabel `propertyMembers`. Elke regel verbindt één gebruiker met één paspoort en legt daarbij de rol vast (eigenaar, huurder, partner, zakelijke klant, Comfortabel-medewerker, beheerder). Hierdoor kan één paspoort meerdere gebruikers hebben en kan één gebruiker meerdere paspoorten in zijn dossier hebben. Het maakt voor het paspoort niet meer uit of het door een klant of door beheer is aangemaakt — beide gevallen resulteren in exact hetzelfde recordtype, en de koppeling aan personen gebeurt los daarvan via de koppeltabel.

Of een gebruiker een paspoort ziet, hangt voortaan uitsluitend af van het bestaan van een regel in `propertyMembers`. De oude, fragiele afhankelijkheid van `customers.userId` vervalt daarmee voor de zichtbaarheidslogica. De `customers`-tabel blijft bestaan voor klantadministratie (naam, type, contactgegevens), maar is niet langer de drager van de eigendomsrelatie tot een woning.

Tot slot wordt elk dataveld geclassificeerd naar herkomst en wijzigbaarheid, zodat vergrendeling en wijzigverzoeken consistent kunnen worden afgedwongen. De drie categorieën worden in paragraaf 4 uitgewerkt.

### Nieuwe en gewijzigde tabellen

De volgende tabellen worden toegevoegd of aangepast. Bestaande velden van `properties` blijven behouden; alleen de relatiestructuur en enkele sleutelvelden veranderen.

| Tabel | Wijziging | Doel |
|-------|-----------|------|
| `properties` | Toevoegen van `addressKey` (uniek), `bagId`, `addition`, `status`, `createdByRole` | Adresgebonden maken + duplicaatpreventie + validatiestatus |
| `propertyMembers` | Nieuw | Koppelt gebruikers aan paspoorten met een rol; vervangt `customers.userId` als eigendomsdrager |
| `changeRequests` | Nieuw | Wijzigverzoeken van klanten op vergrendelde velden, met goedkeuring/afwijzing door beheer |
| `users` | Uitbreiden enum `role` met `medewerker` en `beheerder` naast `user` en `admin` | Fijnmazigere rechten |

De `addressKey` wordt deterministisch opgebouwd, bijvoorbeeld als `1507XW-21` (postcode zonder spatie, huisnummer, eventueel toevoeging). Deze sleutel is genormaliseerd (hoofdletters, geen spaties) zodat "1507 XW 21" en "1507XW21" tot exact dezelfde sleutel leiden en als duplicaat worden herkend.

---

## 3. Rolstructuur

De opdracht benoemt zeven rollen. Deze worden als volgt verdeeld over twee dimensies: de accountrol op gebruikersniveau (`users.role`) en de rol binnen een specifiek paspoort (`propertyMembers.role`). Deze scheiding is belangrijk, omdat dezelfde persoon eigenaar kan zijn van het ene paspoort en partner van het andere, terwijl zijn accountrol gelijk blijft.

| Rol | Niveau | Beschrijving |
|-----|--------|--------------|
| Admin | Account (`users.role = admin`) | Volledige systeemtoegang, beheer van alle paspoorten en gebruikers |
| Beheerder | Account (`users.role = beheerder`) | Beheer van toegewezen paspoorten, validatie, correctie, samenvoegen |
| Comfortabel-medewerker | Account (`users.role = medewerker`) | Inspecties uitvoeren, gevalideerde data invoeren, geen gebruikersbeheer |
| Klant/eigenaar | Paspoort (`propertyMembers.role = eigenaar`) | Eigen klantdata beheren, vergrendelde velden alleen via wijzigverzoek |
| Huurder | Paspoort (`propertyMembers.role = huurder`) | Beperkte inzage, eigen documenten toevoegen, geen woningkenmerken wijzigen |
| Partner/mede-gebruiker | Paspoort (`propertyMembers.role = partner`) | Gelijk aan eigenaar qua inzage, klantdata beheren |
| Zakelijke klant | Paspoort (`propertyMembers.role = zakelijk`) | Meerdere paspoorten beheren, klantdata beheren |

---

## 4. Dataclassificatie en rechtenmatrix

Elk veld in het paspoort valt in één van drie categorieën. De categorie bepaalt wie het mag wijzigen en of een wijzigverzoek nodig is.

**Categorie A — Systeemdata / officiële data.** Hieronder vallen het adres, BAG-gegevens, bouwjaar, woningtype en gebruiksoppervlakte. Deze gegevens zijn afkomstig uit officiële registraties en mogen niet vrij door de klant worden gewijzigd. Een klant kan hiervoor uitsluitend een wijzigverzoek indienen; beheer voert de correctie door.

**Categorie B — Gevalideerde Comfortabel-data.** Hieronder vallen de technische staat, inspectieresultaten, onderhoudsadvies, risico-inschatting en installatiegegevens. Deze gegevens worden uitsluitend door beheer, beheerders of Comfortabel-medewerkers ingevoerd en gewijzigd. Voor de klant zijn ze alleen-lezen.

**Categorie C — Klantdata.** Hieronder vallen foto's, facturen, garantiebewijzen, handleidingen, eigen opmerkingen en onderhoudsverzoeken. Deze gegevens mag de klant zelf toevoegen, wijzigen en deels verwijderen.

De resulterende rechtenmatrix:

| Actie | Categorie A (systeem) | Categorie B (gevalideerd) | Categorie C (klant) |
|-------|----------------------|---------------------------|---------------------|
| Klant/eigenaar — bekijken | Ja | Ja | Ja |
| Klant/eigenaar — wijzigen | Nee, alleen via wijzigverzoek | Nee | Ja |
| Klant/eigenaar — toevoegen | Nee | Nee | Ja |
| Klant/eigenaar — verwijderen | Nee | Nee | Ja (eigen items) |
| Huurder — bekijken | Ja | Ja | Eigen items |
| Huurder — wijzigen | Nee | Nee | Eigen items |
| Medewerker — wijzigen | Nee | Ja | Ja |
| Beheerder / Admin — wijzigen | Ja | Ja | Ja |
| Beheerder / Admin — wijzigverzoek behandelen | Ja | Ja | n.v.t. |

Voor beheer wordt per veld of per blok een **status** getoond: concept, ingevuld, gevalideerd of aandacht nodig. Voor de klant wordt visueel onderscheid gemaakt tussen velden die hij zelf kan aanpassen, velden die alleen Comfortabel kan wijzigen, en officiële data.

---

## 5. Accountflow 1.0

De registratie- en koppelflow wordt zo ingericht dat het adres centraal staat en duplicaten onmogelijk zijn. De stappen zijn als volgt. De gebruiker registreert een account met naam, e-mailadres en wachtwoord. Vervolgens vult de gebruiker het adres in van de woning. Het systeem normaliseert dit adres tot een adressleutel en controleert of er al een WoningPaspoort met die sleutel bestaat.

Bestaat het paspoort nog niet, dan wordt een nieuw WoningPaspoort aangemaakt met status "concept" en wordt de gebruiker als `eigenaar` aan dit paspoort gekoppeld via `propertyMembers`. Bestaat het paspoort al, dan wordt de gebruiker niet opnieuw een paspoort aangemaakt, maar gekoppeld aan het bestaande paspoort. Of die koppeling automatisch als eigenaar gebeurt of eerst ter goedkeuring aan beheer wordt voorgelegd, is een beleidskeuze; in 1.0 wordt de gebruiker gekoppeld als aanvrager met een door beheer te bevestigen rol, om te voorkomen dat een willekeurige registrant zich zonder controle aan andermans woning koppelt.

In beide gevallen wordt voor de gebruiker automatisch een Eigen Huis Dossier beschikbaar, dat eenvoudigweg de verzameling is van paspoorten waaraan de gebruiker via `propertyMembers` is gekoppeld. Er is geen apart dossierrecord nodig; het dossier is de gepersonaliseerde weergave van de koppelingen.

---

## 6. Beheerflow 1.0

Beheer beschikt over een volledige set bewerkingen op paspoorten en gebruikers. Beheer kan een WoningPaspoort aanmaken; dankzij het gedeelde recordtype is dit exact hetzelfde paspoort als een door een klant aangemaakt exemplaar. Beheer kan gebruikers aan een paspoort koppelen en daarbij hun rol bepalen. Beheer kan categorie-A- en categorie-B-gegevens valideren en corrigeren. Beheer kan dubbele paspoorten samenvoegen, waarbij de koppelingen, documenten, inspecties en onderhoudspunten van het ene paspoort worden overgezet naar het andere en het lege paspoort wordt verwijderd. Beheer kan gebruikers deactiveren of, indien nodig, verwijderen, en kan rollen van gekoppelde gebruikers wijzigen.

---

## 7. Wijzigverzoeken

Voor vergrendelde gegevens (categorie A en B) kan een klant geen directe wijziging doorvoeren, maar een wijzigverzoek indienen. Een wijzigverzoek legt vast welk veld het betreft, de huidige waarde, de voorgestelde waarde en een toelichting. Beheer ziet de openstaande verzoeken, kan ze goedkeuren — waarna de wijziging automatisch wordt doorgevoerd — of afwijzen met een reden. Alle verzoeken worden gelogd, zodat er een controleerbaar spoor is van wie wat wanneer heeft aangevraagd en besloten.

---

## 8. Migratieplan voor bestaande records

De productiedatabase bevat reeds dubbele en losgekoppelde records die schoongemaakt moeten worden. Het migratieplan verloopt in vier stappen en wordt uitgevoerd binnen één transactie waar mogelijk, met een back-up vooraf.

Eerst wordt voor elke bestaande woning een `addressKey` berekend uit postcode en huisnummer. Vervolgens worden woningen met dezelfde sleutel geïdentificeerd als duplicaten. Voor het adres "Top Naeffstraat 21, Zaandam" betekent dit dat de drie records (60001, 90001, 120001) worden samengevoegd tot één canoniek paspoort. Het meest complete record wordt als canoniek gekozen; de overige worden samengevoegd en hun gekoppelde gegevens worden overgezet.

Daarna worden voor alle bestaande gebruiker-woningrelaties regels in `propertyMembers` aangemaakt: elke klant die via `customers.userId` aan een woning hing, wordt nu als `eigenaar` aan het canonieke paspoort gekoppeld. Records die door beheer waren aangemaakt zonder gekoppelde gebruiker behouden hun gegevens en kunnen later door beheer aan de juiste gebruiker worden gekoppeld. Tot slot wordt de uniciteitsbeperking op `addressKey` geactiveerd, nadat de duplicaten zijn opgeschoond, zodat toekomstige duplicaten onmogelijk worden.

---

## 9. Testplan

De volgende twaalf scenario's worden als geautomatiseerde tests vastgelegd en moeten alle slagen voordat de versie als stabiel wordt beschouwd.

| # | Scenario | Verwachte uitkomst |
|---|----------|--------------------|
| 1 | Klant maakt nieuw account aan | Account aangemaakt, kan inloggen |
| 2 | Klant maakt nieuw adres aan | Nieuw paspoort met status concept, klant gekoppeld als eigenaar |
| 3 | Klant vult bestaand adres in | Geen nieuw paspoort; koppelverzoek aan bestaand paspoort |
| 4 | Beheer maakt hetzelfde adres aan | Systeem herkent duplicaat, biedt koppelen i.p.v. nieuw |
| 5 | Duplicate prevention | Tweede insert met gelijke addressKey wordt geweigerd |
| 6 | Koppeling gebruiker aan bestaand paspoort | propertyMembers-regel toegevoegd, paspoort blijft één |
| 7 | Beheer wijzigt categorie-A/B-data | Wijziging doorgevoerd, status naar gevalideerd |
| 8 | Klant probeert vergrendelde data te wijzigen | Geweigerd met FORBIDDEN, wijzigverzoek aangeboden |
| 9 | Klant uploadt documenten (categorie C) | Toegestaan en zichtbaar in dossier |
| 10 | Beheer valideert gegevens | Status verandert naar gevalideerd |
| 11 | Gebruiker deactiveren / verwijderen | Toegang vervalt, paspoort blijft bestaan |
| 12 | WoningPaspoort samenvoegen | Eén canoniek paspoort, alle koppelingen behouden |

---

## 10. Volgorde van uitvoering

Conform de opdracht wordt eerst de kern gebouwd en pas daarna styling toegepast. De volgorde is: datamodel en migratie, vervolgens de backend met de gedeelde create-flow, duplicaatpreventie en rechtenprocedures, daarna de account- en beheerflows, vervolgens de wijzigverzoeken, dan de UI met de rechtenmatrix en veldvergrendeling, en als laatste de geautomatiseerde tests. Cosmetische verbeteringen blijven achterwege tot deze kern aantoonbaar stabiel is.

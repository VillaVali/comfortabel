# MijnComfortabel — Database Schema v1.0

**Versie:** 1.0  
**Datum:** 30 juni 2026  
**Database:** MySQL / TiDB (Drizzle ORM)  
**Tabellen:** 20  
**Status:** Productie-gereed (livegang 1 juli 2026)

---

## Inhoudsopgave

1. [Architectuurprincipes](#1-architectuurprincipes)
2. [Tabeloverzicht](#2-tabeloverzicht)
3. [Kern-entiteiten](#3-kern-entiteiten)
4. [Woning-gerelateerde tabellen](#4-woning-gerelateerde-tabellen)
5. [Inspectie & Onderhoud](#5-inspectie--onderhoud)
6. [Communicatie & Documenten](#6-communicatie--documenten)
7. [Auth & Beveiliging](#7-auth--beveiliging)
8. [Marketing & Groei](#8-marketing--groei)
9. [Stubs (Fase 1.x)](#9-stubs-fase-1x)
10. [Trojan Horse — Centrale Datapunt-architectuur](#10-trojan-horse--centrale-datapunt-architectuur)
11. [Toegangsmodel & Beveiliging](#11-toegangsmodel--beveiliging)
12. [Enums Overzicht](#12-enums-overzicht)
13. [Fase 2 Migratiepad](#13-fase-2-migratiepad)

---

## 1. Architectuurprincipes

MijnComfortabel v1.0 is gebouwd op vier architectuurprincipes die de database-structuur bepalen.

**Adres als primaire identiteit.** Een WoningPaspoort is gebonden aan een fysiek adres, niet aan een klant of gebruiker. De `normalizedAddressKey` (formaat: `POSTCODE-HUISNR[-TOEVOEGING]`, hoofdletters, geen spaties) is uniek per woning en voorkomt duplicaten. Dit maakt het mogelijk dat meerdere gebruikers toegang vragen tot hetzelfde paspoort, en dat een paspoort overdraagbaar is bij eigendomsoverdracht.

**Scheiding van rollen op twee niveaus.** Gebruikers hebben een account-niveau rol (`users.role`) voor platformtoegang, en een woning-niveau rol (`propertyMembers.role`) voor toegang tot specifieke woningen. Deze scheiding maakt het mogelijk dat een medewerker van Comfortabel alle woningen ziet zonder eigenaar te zijn, terwijl een klant alleen zijn eigen woningen ziet.

**Dataveldcategorieën A/B/C.** Woningvelden zijn ingedeeld in drie categorieën die bepalen wie ze mag wijzigen: categorie A (systeemdata, alleen Comfortabel), categorie B (gevalideerde data, alleen via wijzigverzoek), categorie C (vrije velden, klant mag zelf wijzigen). Wijzigverzoeken op A/B-velden worden bijgehouden in `changeRequests`.

**Trojan Horse datapunt-model.** Naast de gestructureerde `properties`-tabel bestaat de `propertyDataPoints`-tabel die elk gegeven als een afzonderlijk datapunt opslaat met herkomst, betrouwbaarheid en verificatiestatus. In v1.0 wordt deze tabel parallel gevuld (sync-on-write). In Fase 2 wordt de UI omgebouwd om rechtstreeks op datapunten te werken.

---

## 2. Tabeloverzicht

| Tabel | Categorie | Rijen verwacht (100 users) | Fase 2 status |
|-------|-----------|---------------------------|---------------|
| `users` | Auth | 100–200 | Permanent |
| `customers` | Kern | 100–200 | Permanent |
| `properties` | Kern | 100–300 | Legacy na Fase 2 |
| `propertyMembers` | Kern | 200–600 | Permanent |
| `propertyDataPoints` | Trojan Horse | 10.000–50.000 | **Primaire bron Fase 2** |
| `inspections` | Inspectie | 50–200 | Permanent |
| `inspectionItems` | Inspectie | 2.000–10.000 | Permanent |
| `maintenanceIssues` | Onderhoud | 200–1.000 | Permanent |
| `maintenancePlanning` | Onderhoud | 100–500 | Permanent |
| `documents` | Documenten | 500–2.000 | Permanent |
| `chatMessages` | Mati | 1.000–10.000 | Permanent |
| `aiChatUsage` | Mati | 100–300 | Permanent |
| `zeroMeasurementRequests` | Intake | 50–200 | Permanent |
| `changeRequests` | Beheer | 50–500 | Permanent |
| `auditLog` | Beheer | 1.000–10.000 | Permanent |
| `invitations` | Auth | 100–300 | Permanent |
| `passwordResetTokens` | Auth | 50–200 | Permanent |
| `emailLogs` | Marketing | 500–2.000 | Permanent |
| `referralCodes` | Marketing | 100–200 | Permanent |
| `userProfile` | Stub | 50–100 | Uitbreiden Fase 1.x |
| `consents` | Stub | 100–300 | Uitbreiden Fase 1.x |
| `notifications` | Stub | 0 | Uitbreiden Fase 1.x |
| `dossierNotes` | Stub | 0 | Uitbreiden Fase 1.x |

---

## 3. Kern-entiteiten

### `users` — Gebruikersaccounts

De centrale authenticatie-tabel. Elke persoon die inlogt heeft één `users`-record. Account-niveau rollen bepalen platformtoegang; woning-niveau toegang loopt via `propertyMembers`.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `id` | int PK | Auto-increment |
| `email` | varchar(320) UNIQUE | Login-identifier |
| `passwordHash` | varchar(255) | bcrypt hash |
| `role` | enum | `user` \| `comfortabel_employee` \| `manager` \| `admin` |
| `isFoundingMember` | boolean | Eerste 100 gebruikers — krijgen Founding-prijs |
| `onboardingCompletedAt` | timestamp | Null = onboarding niet afgerond → route-guard actief |
| `openId` | varchar(64) | Legacy OAuth-kolom, niet meer in gebruik |

**Architectuurkeuze:** `openId` is behouden voor DB-compatibiliteit maar niet meer in gebruik. De nieuwe auth werkt op email + wachtwoord met JWT-sessiecookies.

---

### `customers` — Klantprofielen

Een klantprofiel is een administratieve laag bovenop een gebruikersaccount. Het is mogelijk dat een klant bestaat zonder gebruikersaccount (aangemaakt door een medewerker), of dat een gebruikersaccount later aan een klantprofiel gekoppeld wordt.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `userId` | int FK → users | Nullable: klant kan bestaan zonder account |
| `type` | enum | `particulier` \| `bedrijf` \| `vastgoed` |
| `createdBy` | int FK → users | Medewerker die de klant aanmaakte |

---

### `properties` — WoningPaspoorten

De centrale woning-tabel met 70+ kolommen verdeeld over 5 blokken:

- **Blok 1 — Basisidentiteit:** adres, BAG-koppeling, status, type, oppervlak
- **Blok 2 — Waarde & Financieel:** WOZ, koopsom, VvE, hypotheek, erfpacht, verzekering
- **Blok 3 — Juridisch & Omgeving:** eigendomsvorm, kadaster, monument, bestemming, buurt
- **Blok 4 — Technische Kenmerken:** fundering, dak, muur, verwarming, isolatie, installaties
- **Blok 5 — Verduurzaming & Ambities:** doelenergie, aardgasvrij, subsidies

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `normalizedAddressKey` | varchar(64) UNIQUE | Duplicaatpreventie: `1234AB-10-A` |
| `status` | enum | `wacht_op_validatie` \| `concept` \| `ingevuld` \| `gevalideerd` \| `aandacht` |
| `subscriptionType` | enum | `free` \| `digital` \| `basis` \| `plus` \| `premium` \| `founding` |
| `addressValidationStatus` | enum | `unvalidated` \| `validated` \| `manual` \| `conflict` |

**Architectuurkeuze:** `customerId` is nullable gemaakt in v1.0. Een paspoort is adres-gebonden, niet klant-gebonden. De koppeling via `propertyMembers` is de primaire toegangsroute.

**Validatiepoort:** woningen met `status = 'wacht_op_validatie'` hebben geen toegang tot Woning Score, PDF-rapporten en Mati. Dit wordt gehandhaafd via de centrale helper `canUseValidatedFeatures()` in `server/lib/passport.ts`.

---

### `propertyMembers` — Woning-lidmaatschappen

Koppeltabel tussen gebruikers en woningen. Één woning kan meerdere leden hebben (eigenaar, huurder, partner, medewerker). Één gebruiker kan lid zijn van meerdere woningen.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `role` | enum | `pending_applicant` \| `owner` \| `tenant` \| `partner` \| `business_manager` \| `comfortabel_employee` \| `manager` \| `admin` |
| `status` | enum | `pending` \| `active` \| `revoked` |
| `confirmedBy` | int FK → users | Medewerker die het lidmaatschap bevestigde |

**Toegangsregel:** `pending_applicant` heeft geen toegang tot gevoelige data. Alleen `status = 'active'` geeft volledige toegang. Claims op bestaande adressen starten als `pending_applicant`; zelf-aangemaakte woningen starten als `owner` + `active` maar met woning-status `wacht_op_validatie`.

---

## 4. Woning-gerelateerde tabellen

### `changeRequests` — Wijzigverzoeken

Klanten kunnen categorie A/B velden niet direct wijzigen. Ze dienen een wijzigverzoek in dat door een medewerker beoordeeld wordt.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `fieldCategory` | enum | `A` (systeemdata) \| `B` (gevalideerde data) |
| `status` | enum | `open` \| `approved` \| `rejected` |

### `zeroMeasurementRequests` — 0-meting aanvragen

Aanvragen voor een fysieke 0-meting, ingediend via de onboarding of het portaal.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `status` | enum | `aangevraagd` \| `ingepland` \| `uitgevoerd` \| `geannuleerd` |
| `preferredDate` | varchar(30) | ISO-datumstring (klant-voorkeur) |

---

## 5. Inspectie & Onderhoud

### `inspections` — Inspecties / 0-metingen

Elke fysieke inspectie of 0-meting wordt als één record opgeslagen met vijf deelscores en een totaalscore.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `type` | enum | `nulmeting` \| `jaarlijks` \| `tussentijds` \| `calamiteit` |
| `woningGrade` | enum | `A` t/m `E` (eindcijfer) |
| `totalScore` | int | 0–100 samengestelde score |

### `inspectionItems` — Checklist-antwoorden

Individuele antwoorden per inspectievraag. Gekoppeld aan een inspectie.

### `maintenanceIssues` — Onderhoudspunten

Concrete problemen of aandachtspunten, met prioriteit en status.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `priority` | enum | `laag` \| `normaal` \| `hoog` \| `urgent` |
| `status` | enum | `open` \| `in_behandeling` \| `gepland` \| `afgerond` |

### `maintenancePlanning` — Onderhoudsplanning (MJOP)

Toekomstig gepland onderhoud met horizon en kostenraming.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `horizon` | enum | `1jaar` \| `3jaar` \| `5jaar` \| `10jaar` \| `mjop` |

---

## 6. Communicatie & Documenten

### `documents` — Documenten & Foto's

Bestanden gekoppeld aan een woning of inspectie. Bytes worden opgeslagen in S3; alleen de URL/key staat in de database.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `type` | enum | `rapport` \| `offerte` \| `factuur` \| `keuring` \| `foto` \| `overig` |
| `fileUrl` | text | S3-URL (`/manus-storage/...`) |
| `fileKey` | text | S3-sleutel voor referentie |

### `chatMessages` — Mati-gesprekken

Gespreksgeschiedenis per woning per gebruiker. Wordt als context meegegeven aan Mati.

### `aiChatUsage` — AI-quotum tracking

Bijhoudt hoeveel vragen een gebruiker per maand stelt aan Mati (voor Free-tier limiet).

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `monthYear` | varchar(7) | Formaat: `2026-07` |
| `questionCount` | int | Teller per maand |

---

## 7. Auth & Beveiliging

### `passwordResetTokens` — Wachtwoord-reset

Tijdelijke tokens voor wachtwoord-reset via e-mail. Token verloopt na 1 uur.

### `invitations` — Klant-uitnodigingen

Medewerkers kunnen klanten uitnodigen om toegang te krijgen tot hun portaal. Token verloopt na 7 dagen.

### `auditLog` — Auditlogboek

Elke significante actie (aanmaken, wijzigen, bevestigen, verwijderen) wordt gelogd met actor, entiteit en voor/na-waarden.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `action` | varchar(64) | Bijv. `property.create`, `member.confirm`, `field.update` |
| `entityType` | varchar(64) | Bijv. `property`, `propertyMember`, `user` |
| `previousValue` | text | JSON snapshot van de oude waarde |
| `newValue` | text | JSON snapshot van de nieuwe waarde |

---

## 8. Marketing & Groei

### `emailLogs` — E-mail tracking

Bijhoudt welke e-mails (welkom, dag 3, dag 7, dag 14, dag 30, maandelijkse score) naar welke gebruiker zijn gestuurd, inclusief Resend message ID voor delivery tracking.

### `referralCodes` — Referral-systeem

Elke gebruiker krijgt één unieke referralcode. Bijhoudt wie via welke code is aangemeld.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `code` | varchar(20) UNIQUE | Formaat: `COMF-A3X9` |
| `referredBy` | int FK → users | Wie heeft deze gebruiker uitgenodigd |
| `referralCount` | int | Hoeveel mensen via deze code |

---

## 9. Stubs (Fase 1.x)

De volgende tabellen zijn aangemaakt maar nog niet volledig in gebruik. Ze zijn bewust als stub opgenomen zodat de schema-structuur klopt voor toekomstige uitbreiding.

| Tabel | Doel | Fase |
|-------|------|------|
| `userProfile` | Aanvullende persoonsgegevens (telefoon, geboortejaar, contactvoorkeur) | 1.x |
| `consents` | AVG-toestemmingen per type (data delen, marketing, AI-verwerking) | 1.x |
| `notifications` | In-app meldingen voor klanten | 1.x |
| `dossierNotes` | Persoonlijke notities, niet gebonden aan één woning | 1.x |

---

## 10. Trojan Horse — Centrale Datapunt-architectuur

### Achtergrond

In v1.0 is een centrale `propertyDataPoints`-tabel toegevoegd als voorbereiding op Fase 2. De bestaande `properties`-tabel blijft de primaire databron voor de huidige UI; `propertyDataPoints` wordt parallel gevuld via een sync-helper (`server/lib/datapoints.ts`).

### Datapunt-structuur

Elk datapunt vertegenwoordigt één gegeven van een woning met volledige herkomst- en betrouwbaarheidsinformatie.

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| `category` | varchar(64) | Bijv. `technisch`, `waarde_financieel`, `juridisch_omgeving` |
| `component` | varchar(100) | Veldnaam, bijv. `heatingSystem`, `buildYear` |
| `value` | text | Waarde als tekst (consumer cast naar juist type) |
| `source` | enum | `klant` \| `telefoon_intake` \| `ai` \| `foto` \| `comfortabel` \| `specialist` \| `bag` \| `import` |
| `confidence` | int (0–100) | 50 = klant-opgave, 80 = foto-analyse, 100 = fysiek geverifieerd |
| `verificationStatus` | enum | `unverified` \| `self_reported` \| `photo_verified` \| `physically_verified` \| `ai_inferred` |
| `linkedPhotoIds` | text (JSON) | Gekoppelde foto-IDs als bewijs |
| `linkedDocumentIds` | text (JSON) | Gekoppelde document-IDs |
| `riskScore` | int (0–100) | Risicowaarde (Fase 2+) |
| `urgencyScore` | int (0–100) | Urgentiewaarde (Fase 2+) |
| `aiNotes` | text | Mati's observaties over dit datapunt (Fase 3+) |
| `aiFlags` | text (JSON) | `{ missing, inconsistent, followUpQuestion }` (Fase 3+) |

### Sync-logica (v1.0)

Bij elke `createOrClaim` (nieuwe woning) en `property.update` (veldwijziging) worden de gewijzigde velden parallel weggeschreven naar `propertyDataPoints`. De sync is fire-and-forget: een fout in de sync blokkeert nooit de hoofdwrite. Betrouwbaarheid wordt automatisch bepaald: klant = 50, staff = 80, specialist/comfortabel = 100.

### Categorieën

| Categorie | Omschrijving | Properties-blok |
|-----------|-------------|-----------------|
| `identiteit` | Adres, type, oppervlak, bouwjaar | Blok 1 |
| `waarde_financieel` | WOZ, koopsom, VvE, hypotheek | Blok 2 |
| `juridisch_omgeving` | Eigendomsvorm, kadaster, monument | Blok 3 |
| `technisch` | Fundering, dak, verwarming, isolatie | Blok 4 |
| `verduurzaming` | Energielabel, zonnepanelen, doelen | Blok 5 |
| `dossier` | Documenten, notities | Eigen Huis Dossier |
| `inspectie` | Inspectieresultaten | Inspecties |
| `onderhoud` | Onderhoudspunten en planning | Onderhoud |
| `ai_analyse` | Mati-analyses en aanbevelingen | Fase 3+ |

---

## 11. Toegangsmodel & Beveiliging

### Dataveldcategorieën

| Categorie | Wie mag schrijven | Voorbeeld |
|-----------|------------------|-----------|
| **A — Systeemdata** | Alleen Comfortabel (admin/manager) | BAG-ID, normalizedAddressKey, woningGrade |
| **B — Gevalideerde data** | Via wijzigverzoek (changeRequests) | Bouwjaar, oppervlak, eigendomsvorm |
| **C — Vrije velden** | Klant zelf (active member) | Notities, verduurzamingsambities, bewoners |

### Validatiepoort (woning-status)

Woningen met `status = 'wacht_op_validatie'` hebben geen toegang tot:
- Woning Score (PDF-rapport)
- Alle vijf PDF-routes (`/api/pdf/*`)
- Mati-chat (`/api/chat`)

Gehandhaafd via `canUseValidatedFeatures(status, userRole)` in `server/lib/passport.ts`. Staff heeft altijd toegang.

### Membership-toegang

`canAccessSensitiveData(member)` controleert: `member.status === 'active'`. Pending en revoked leden zien geen gevoelige data.

---

## 12. Enums Overzicht

| Tabel.kolom | Waarden |
|-------------|---------|
| `users.role` | `user`, `comfortabel_employee`, `manager`, `admin` |
| `customers.type` | `particulier`, `bedrijf`, `vastgoed` |
| `properties.status` | `wacht_op_validatie`, `concept`, `ingevuld`, `gevalideerd`, `aandacht` |
| `properties.subscriptionType` | `free`, `digital`, `basis`, `plus`, `premium`, `founding` |
| `properties.propertyType` | `tussenwoning`, `hoekwoning`, `vrijstaand`, `appartement`, `bedrijfspand`, `overig` |
| `properties.energyLabel` | `A+++`, `A++`, `A+`, `A`, `B`, `C`, `D`, `E`, `F`, `G` |
| `properties.ownershipType` | `volle_eigendom`, `erfpacht`, `appartementsrecht`, `opstalrecht`, `onbekend` |
| `properties.heatingSystem` | `cv_ketel`, `warmtepomp`, `stadsverwarming`, `elektrisch`, `geen`, `onbekend` |
| `propertyMembers.role` | `pending_applicant`, `owner`, `tenant`, `partner`, `business_manager`, `comfortabel_employee`, `manager`, `admin` |
| `propertyMembers.status` | `pending`, `active`, `revoked` |
| `inspections.type` | `nulmeting`, `jaarlijks`, `tussentijds`, `calamiteit` |
| `inspections.woningGrade` | `A`, `B`, `C`, `D`, `E` |
| `maintenanceIssues.priority` | `laag`, `normaal`, `hoog`, `urgent` |
| `propertyDataPoints.source` | `klant`, `telefoon_intake`, `ai`, `foto`, `comfortabel`, `specialist`, `bag`, `import` |
| `propertyDataPoints.verificationStatus` | `unverified`, `self_reported`, `photo_verified`, `physically_verified`, `ai_inferred` |
| `zeroMeasurementRequests.status` | `aangevraagd`, `ingepland`, `uitgevoerd`, `geannuleerd` |

---

## 13. Fase 2 Migratiepad

Zie `ROADMAP-fase2-datapunt-ui.md` voor het volledige plan. Samenvatting:

1. **Sprint 2A** — Eenmalige migratie van `properties`-data naar `propertyDataPoints` (script)
2. **Sprint 2B** — Nieuwe tRPC-procedures die rechtstreeks op datapunten werken
3. **Sprint 2C** — UI-refactor: dynamische datapunt-renderer vervangt formulieren
4. **Sprint 2D** — Mati krijgt datapunten als context (per datapunt: ontbrekend/inconsistent/vervolgvraag)

Na Fase 2 is `properties` een archief/legacy-tabel en is `propertyDataPoints` de primaire databron.

**Trigger:** 100 succesvolle onboardings + gebruikersdata over invoergedrag.

---

*Gegenereerd op 30 juni 2026 | MijnComfortabel v1.0 | Manus (CTO-rol)*

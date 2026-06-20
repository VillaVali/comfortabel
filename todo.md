# MijnComfortabel — TODO

## Fase 1: Overzichtspagina (product overview)
- [x] Volledige product overview pagina met alle 17 secties
- [x] Comfortabel Woningpaspoort™ sectie toegevoegd
- [x] Sidebar navigatie met alle secties
- [x] Woning Score™ A-E visualisatie

## Fase 2: Full-stack testversie (echte app)
- [x] Full-stack upgrade: Express backend + tRPC + database
- [x] Database schema: users, customers, properties, inspections, inspectionItems, maintenanceIssues, maintenancePlanning, documents
- [x] Database tabellen aangemaakt via migrate script
- [x] JWT-based authenticatie (Manus OAuth)
- [x] Admin dashboard met statistieken
- [x] Klantenbeheer (CRUD): toevoegen, bewerken, verwijderen
- [x] Woningbeheer (CRUD): toevoegen, bewerken per klant
- [x] 0-meting formulier met 22 standaard checklistitems (5 categorieën)
- [x] Inspectie finaliseren met score berekening en Woning Score™ grade
- [x] Klantportaal: inloggen, woningen bekijken
- [x] Klantportaal: Woningpaspoort™ met tabs (paspoort, onderhoud, planning)
- [x] Onderhoudspunten per woning (priority, status, kosten)
- [x] Onderhoudsplanning per woning (horizon, jaar, kosten)
- [x] PDF/HTML rapport export (Woningpaspoort™)
- [x] 5 demo-woningen met testdata (klanten, inspecties, onderhoud, planning)
- [x] Gebruikersbeheer (admin): rollen instellen, klant koppelen
- [x] Concurrent dev server (backend + frontend)
- [x] TypeScript errors opgelost
- [x] 13 vitest tests geslaagd

## Fase 3: Testfase verbeteringen (to do)
- [x] OAuth login flow gefixed (URL formaat + callback + productie routing)
- [ ] Klant koppelen aan portaalgebruiker via email-uitnodiging
- [ ] E-mail versturen vanuit het systeem (rapport, uitnodiging)
- [ ] Checklist per klanttype (particulier/bedrijf/vastgoed) uitbreiden
- [ ] Foto's uploaden bij onderhoudspunten
- [ ] Notificaties bij urgente onderhoudspunten
- [ ] Exporteer klantlijst als CSV
- [ ] Abonnementsbeheer per woning

## Fase 4: Eigen login systeem (email + wachtwoord)
- [x] Database: passwordHash + isActive kolom toegevoegd aan users tabel
- [x] Backend: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me routes
- [x] Backend: JWT sessie-cookie (httpOnly, secure, werkt in productie)
- [x] Frontend: login pagina (email + wachtwoord formulier)
- [x] Frontend: useAuth hook vervangen door eigen sessie-check (fetch-based)
- [x] Admin: gebruikersbeheer (aanmaken met naam/email/wachtwoord/rol, deactiveren)
- [x] Eerste admin account aangemaakt: admin@comfortabel.nl
- [x] TypeScript check: geen fouten
- [x] 13 vitest tests geslaagd

## Fase 5: Documentupload
- [x] Backend: upload endpoint POST /api/upload (multipart, S3 opslag)
- [x] Backend: tRPC documents.list, documents.delete procedures
- [x] Frontend: documentupload UI in klantprofiel (admin)
- [x] Frontend: documentupload UI in woningpagina (admin)
- [x] Frontend: documenten bekijken/downloaden in klantportaal

## Fase 6: Mobiele app (PWA) + mobiele UI
- [x] PWA manifest.json met naam, iconen, thema-kleur
- [x] Service worker voor offline caching (vite-plugin-pwa)
- [x] iOS meta tags (apple-touch-icon, apple-mobile-web-app-capable)
- [x] Installatie-prompt component (Android Chrome + iOS instructies)
- [x] Mobiele navigatie: bottom navigation bar voor klantportaal
- [x] Responsive AdminLayout: sidebar inklapbaar op mobiel (hamburger menu)
- [x] Touch-vriendelijke knoppen en lijstitems (min 44px touch target)
- [x] Mobiele login pagina (al responsive, geen wijzigingen nodig)

## Fase 7: Abonnementsstructuur (Free / Digital / Basis / Plus / Premium)
- [x] Database: subscriptionType enum uitgebreid naar 5 tiers (free, digital, basis, plus, premium)
- [x] Database: subscriptionStartDate en subscriptionEndDate kolommen toegevoegd
- [x] Backend: subscription feature-flags helper (welke features per tier)
- [x] Backend: tRPC subscriptions router (getTier, setTier, getStats)
- [x] Shared: PLAN_FEATURES constante met feature-matrix per tier (12 features)
- [x] Shared: SUBSCRIPTION_LABELS, SUBSCRIPTION_PRICES, SUBSCRIPTION_COLORS, SUBSCRIPTION_DESCRIPTIONS
- [x] Homepage: pricing-sectie met 5 pakketten en CTA
- [x] Pricing-pagina (/abonnementen): volledige vergelijkingstabel + FAQ
- [x] Admin PropertyDetail: abonnement-kaart met tier-selector en actieve badge
- [x] Client portal: tier-gekleurde badges op woningkaarten (Dashboard)
- [x] Client portal: pakketbadge + upgrade-link in woningpagina header
- [x] Client portal: Woning Score™ vergrendeld voor free/digital
- [x] Client portal: Documenten tab vergrendeld voor free
- [x] Client portal: Planning tab vergrendeld voor free/digital/basis
- [x] Client portal: PDF-rapport download vergrendeld voor free/digital
- [x] Client portal: LockedFeature component met upgrade-prompt
- [x] Onboarding: welkomstpagina (/welkom) met pakketoverzicht
- [x] Tests: 6 nieuwe subscription unit tests (19 totaal, alle geslaagd)
- [x] TypeScript: geen fouten

## Fase 8: Woningpaspoort™ Uitbreiding (6 blokken)
- [x] Schema: Blok 2 velden — wozValue, wozYear, purchasePrice, purchaseYear, vveContribution, mortgageProvider, erfpachtCanon, insuranceExpiry
- [x] Schema: Blok 3 velden — ownershipType, kadastraleAanduiding, isMonument, hasErfpacht, bestemmingUrl, bestemmingCategory, hasBeslag
- [x] Schema: Blok 4 velden — foundationType, roofType, roofMaterial, wallType, heatingSystem, heatingYear, hotWaterSystem, hasSolarPanels, solarPanelCount, solarPanelYear, hasEVCharger, hasGasConnection, glazingType, wallInsulation, roofInsulation, floorInsulation
- [x] Schema: Blok 5 velden — targetEnergyLabel, gasVrijDoeljaar, sustainabilityMeasures, subsidiesApplied
- [x] Database migratie uitgevoerd (38 nieuwe velden)
- [x] Backend: properties.get en properties.update procedures uitgebreid
- [x] Admin PropertyDetail: 5 bewerkbare tabbladen (Basisidentiteit, Waarde & Financieel, Juridisch & Omgeving, Technische Kenmerken, Verduurzaming)
- [x] Client paspoort-tab: volledig herbouwd met alle 5 blokken en tier-gating
- [x] Demo-data: Patrick Valpoort (Basis, tussenwoning 1965) en Manon (Digital, appartement 1987) — alle blokken gevuld
- [x] TypeScript: geen fouten, 19 tests geslaagd

## Fase 9: Product Roadmap + USP-features Implementatie

### Roadmap document
- [x] Strategisch roadmap document: v1.0 lancering + groeifases per 25 abonnees
- [x] Feature-overzicht per abonnementstier (Free t/m Premium)
- [x] Technische implementatievolgorde vastgelegd

### USP-features Implementatie (Laag 1)
- [x] Woningpaspoort™ PDF-download: HTML-naar-PDF rendering via Puppeteer
- [x] PDF-download knop in client portaal (paspoort-tab + downloads-tab)
- [x] Verduurzamingsadvies rapport: LLM-gegenereerd op basis van paspoortdata
- [x] Subsidie Berekening rapport: LLM-gegenereerd met ISDE-kengetallen
- [x] Gratis deeplinks sectie: BAG, WOZ, EP-Online, Omgevingsloket, Kadaster, CBS, Rijksmonumenten, RVO ISDE
- [x] Downloads-tab in client portaal met overzicht van alle beschikbare downloads
- [x] TypeScript: geen fouten, 19 tests geslaagd

## Fase 10: v1.0 Lancering — Zelfregistratie + Woning + AI Huismeester + PDF's

### Stap 1: Zelfregistratie
- [x] Backend: POST /api/auth/register route (naam, email, wachtwoord, bcrypt hash)
- [x] Backend: validatie — email al in gebruik, wachtwoord minimaal 8 tekens
- [x] Frontend: /registreren pagina met formulier (naam, email, wachtwoord, herhaal wachtwoord)
- [x] Frontend: link van login naar registreren en vice versa
- [x] Na registratie: automatisch inloggen + redirect naar onboarding
- [x] Nieuw account krijgt standaard rol 'user' en Free-abonnement

### Stap 2: Woning toevoegen door klant
- [x] Backend: properties.createOwn procedure — klant voegt eigen woning toe
- [x] Backend: klant ziet alleen eigen woningen (userId-check)
- [x] Frontend: onboarding-flow na eerste login — stap 1: woning toevoegen
- [x] Frontend: woning-toevoegen formulier in client portaal (adres, type, bouwjaar, m²)
- [x] Frontend: lege staat in client dashboard met CTA "Voeg uw eerste woning toe"

### Stap 3: AI Huismeester
- [x] Backend: tRPC aiHuismeester.chat procedure (streaming, paspoortcontext)
- [x] Backend: chat-history opslaan per woning per gebruiker (schema uitbreiden)
- [x] Frontend: AI Huismeester tab in client portaal per woning
- [x] Frontend: chatinterface met berichtgeschiedenis, invoerveld, streaming responses
- [x] Frontend: tier-gating — Free max 3 vragen/maand, Digital+ onbeperkt
- [x] Frontend: vraagenteller voor Free-gebruikers

### Stap 4: PDF-rapporten
- [x] Backend: /api/pdf/onderhoud/:propertyId — Jaarlijks Onderhoudsrapport PDF
- [x] Backend: /api/pdf/inspectie/:propertyId — Technisch Inspectierapport PDF
- [x] Frontend: download-knoppen in Downloads-tab voor beide rapporten

### Stap 5: Wachtwoord vergeten / reset
- [x] Backend: POST /api/auth/forgot-password (genereert reset-token, slaat op in DB)
- [x] Backend: POST /api/auth/reset-password (valideert token, update wachtwoord)
- [x] Database: passwordResetToken + passwordResetExpiry kolommen op users tabel
- [x] Frontend: /wachtwoord-vergeten pagina
- [x] Frontend: /wachtwoord-reset?token=... pagina
- [x] Frontend: link "Wachtwoord vergeten?" op login pagina

## Fase 11: Beveiliging + Juridisch + Admin Stats

### Beveiliging (Ownership checks)
- [x] Backend: inspections.listByProperty — ownership check voor niet-admin gebruikers
- [x] Backend: maintenance.listIssues — ownership check voor niet-admin gebruikers
- [x] Backend: maintenance.listPlanning — ownership check voor niet-admin gebruikers
- [x] Backend: documents.list — ownership check voor niet-admin gebruikers

### AI Huismeester persistentie + quota
- [x] Database: chatMessages tabel aangemaakt (history per woning per gebruiker)
- [x] Database: aiChatUsage tabel aangemaakt (maandelijkse quota tracking)
- [x] Backend: chat history opslaan bij elke vraag/antwoord
- [x] Backend: Free-tier maandlimiet (3 vragen/maand) gehandhaafd server-side
- [x] Frontend: chat history laden bij openen van AI Huismeester
- [x] Frontend: vraagenteller tonen voor Free-tier gebruikers
- [x] Frontend: limiet-bereikt banner met upgrade-CTA

### Juridisch (AVG/GDPR)
- [x] Privacyverklaring pagina (/privacy) — volledig AVG-conform
- [x] Algemene Voorwaarden pagina (/algemene-voorwaarden) — met prijstabel en AI disclaimer
- [x] Footer homepage: links naar Privacyverklaring + Algemene Voorwaarden
- [x] Registratiepagina: akkoord-tekst met links naar Voorwaarden en Privacy

### Admin Dashboard
- [x] Abonnementen overzicht widget: actieve woningen per tier + geschatte MRR
- [x] Tests: 27 vitest tests geslaagd (inclusief AI quota tests)
- [x] TypeScript: geen fouten

## Fase 12: Resend E-mail Integratie

- [x] Resend API key valideren via test
- [x] E-mail helper server/email.ts bouwen (sendEmail wrapper via Resend)
- [x] E-mail template: wachtwoord reset (HTML + tekst)
- [x] E-mail template: klant uitnodiging portaal (HTML + tekst)
- [x] Wachtwoord reset flow: daadwerkelijk e-mail versturen via Resend
- [x] Klant uitnodiging: admin kan e-mail sturen naar klant met portaallink
- [x] Backend: invitations tabel + invite procedure
- [x] Frontend: uitnodigingsknop in admin klantdetail
- [ ] Overige Fase 3: foto's uploaden bij onderhoudspunten
- [ ] Overige Fase 3: notificaties bij urgente onderhoudspunten
- [x] Overige Fase 3: exporteer klantlijst als CSV
- [ ] Overige Fase 3: abonnementsbeheer per woning (upgrade/downgrade UI)
- [x] Tests: Resend integratie valideren (33 tests geslaagd)
- [x] TypeScript: geen fouten

## Fase 13: E-mail Marketing & Activatie Engine

### Database
- [ ] Database: emailLogs tabel (bijhouden welke e-mails verstuurd zijn per gebruiker + dag)
- [ ] Database: referralCodes tabel (unieke activatiecodes per lid, tracking wie wie uitnodigde)

### Welkomstsequentie (geautomatiseerde e-mailflow)
- [ ] E-mail dag 0: welkomstmail met persoonlijke activatiecode + CTA woning toevoegen
- [ ] E-mail dag 3: "Uw dossier is X% compleet" — dossier volledigheid stimuleren
- [ ] E-mail dag 7: gepersonaliseerde AI Huismeester tip op basis van woningtype/bouwjaar
- [ ] E-mail dag 14: woningscore update + vergelijking met gemiddelde
- [ ] E-mail dag 30: maandelijkse samenvatting + referral uitnodiging

### Dossier volledigheid score
- [ ] Backend: berekening dossier-volledigheid per woning (% velden ingevuld, 0-100)
- [ ] Frontend: volledigheidsbar in client dashboard per woning
- [ ] Backend: procedure om volledigheidspercentage op te halen

### Referral / activatiecodes
- [ ] Backend: unieke referralcode genereren bij registratie (bijv. COMF-A3X9)
- [ ] Backend: referral tracking — wie heeft wie uitgenodigd, conversie bijhouden
- [ ] Frontend: "Nodig een vriend uit" sectie in client portaal met persoonlijke code
- [ ] Frontend: activatiecode zichtbaar op dashboard met kopieerknop + deel-link

### Scheduled e-mail jobs (Heartbeat)
- [ ] Heartbeat job: dagelijks controleren welke gebruikers dag 3/7/14/30 e-mail moeten ontvangen
- [ ] Heartbeat job: maandelijkse woningscore update e-mail naar alle actieve gebruikers

### Admin marketing dashboard
- [ ] Admin: activatie-funnel widget (aangemeld → woning toegevoegd → actief na 7 dagen)
- [ ] Admin: referral leaderboard (wie heeft meeste leden aangebracht)
- [ ] Admin: e-mail log overzicht (welke e-mails verstuurd per gebruiker)

## Fase 14: MijnComfortabel 1.0 — Datamodel, Rechten & Accountflow herziening

### Analyse (bug: klant-paspoort != beheer-paspoort)
- [ ] Database analyseren: properties/customers/users tabellen + foreign keys
- [ ] Create-flows vergelijken: klant-zelfregistratie vs beheer-aanmaak
- [ ] Exact lokaliseren waar het verschil ontstaat (ownership/userId/createdBy)
- [ ] Analyse documenteren

### Datamodel
- [x] WoningPaspoort adresgebonden maken (uniek op postcode + huisnummer + toevoeging)
- [x] Duplicate prevention op adres (DB unique constraint + applicatie-check)
- [x] Koppeltabel propertyMembers met rol (owner/tenant/partner/business_manager/comfortabel_employee/manager/admin)
- [x] Datavelden classificeren: A systeemdata, B gevalideerde data, C klantdata
- [x] Wijzigverzoeken tabel (changeRequests)

### Database migratie
- [x] Nieuwe tabellen aanmaken via migratie (propertyMembers, changeRequests, auditLog)
- [x] Bestaande properties migreren naar nieuwe structuur (normalizedAddressKey backfill + owner-memberships)
- [x] Dubbele/foutieve records opschonen (Top Naeffstraat 21: 3 -> 1 canoniek)

### Backend
- [x] Unified create-flow: passport.createOrClaim (klant en beheer identiek)
- [x] Adres duplicate-check procedure (normalizedAddressKey)
- [x] Rolgebaseerde procedures (staffProcedure / managerProcedure + membership checks)
- [x] Veld-vergrendeling: categorie A/B server-side FORBIDDEN voor klant
- [x] Wijzigverzoeken API: indienen, goedkeuren, afwijzen
- [x] Beheer: paspoorten samenvoegen (migratie), claim bevestigen/intrekken, rol wijzigen

### Accountflow 1.0
- [ ] Registratie -> adres invullen -> duplicate check -> koppelen of nieuw paspoort
- [ ] Automatisch Eigen Huis Dossier aanmaken en koppelen aan paspoort

### UI
- [x] Klant onboarding: createOrClaim flow met claim-scherm bij bestaand adres
- [x] Klant dashboard: statusbanner voor lopende koppelingsverzoeken
- [x] Admin /admin/validatie: claims bevestigen/afwijzen, wijzigverzoeken, rolbeheer
- [x] Veld-vergrendeling visueel (slotjes op gevalideerde/systeemvelden)
- [x] Wijzigverzoek-knop bij vergrendelde velden in paspoort-tab

### Testplan (verplicht, alle 12 scenario's)
- [x] klant maakt nieuw account aan (scenarios.test.ts #1)
- [x] klant maakt nieuw adres aan (scenarios.test.ts #2)
- [x] klant vult bestaand adres in (koppeling) (scenarios.test.ts #3)
- [x] beheer maakt hetzelfde adres aan (duplicate prevention) (scenarios.test.ts #4)
- [x] koppeling gebruiker aan bestaand WoningPaspoort (scenarios.test.ts #5)
- [x] beheer wijzigt data (scenarios.test.ts #6)
- [x] klant probeert vergrendelde data te wijzigen (geweigerd) (scenarios.test.ts #7)
- [x] klant uploadt documenten (toegang) (scenarios.test.ts #8)
- [x] beheer valideert gegevens (scenarios.test.ts #9)
- [x] gebruiker deactiveren (scenarios.test.ts #10)
- [x] gebruiker verwijderen (scenarios.test.ts #11)
- [x] WoningPaspoort samenvoegen (scenarios.test.ts #12)
- [x] TypeScript: geen fouten

## Fase 14b: Aanscherpingen vóór implementatie (akkoord klant)

### Datamodel hardening
- [x] properties: BAG-velden — bagId, bagObjectId, bagNumberDesignationId, addition, houseLetter
- [x] properties: normalizedAddressKey (uniek), addressValidationStatus, addressSource
- [x] properties: status (concept/ingevuld/gevalideerd/aandacht), createdByRole
- [x] propertyMembers rollen: pending_applicant, owner, tenant, partner, business_manager, comfortabel_employee, manager, admin
- [x] users.role enum: user, comfortabel_employee, manager, admin
- [x] auditLog tabel: actorUserId, action, entityType, entityId, previousValue, newValue, ipAddress, createdAt
- [ ] Toekomststubs: userProfile, consents, notifications, dossierNotes (niet in deze iteratie — subscriptions bestaat al)

### Pending-claim regel (HARD)
- [x] Bestaand adres -> rol pending_applicant, GEEN toegang tot gevoelige woningdata/documenten/inspecties
- [x] Beheer moet claim + rol expliciet bevestigen voordat toegang vrijkomt
- [x] UI-tekst: "Voor dit adres bestaat al een Woningpaspoort. Uw aanvraag is ingediend. Comfortabel controleert de koppeling."

### Server-side + DB autorisatie (3 lagen)
- [x] Autorisatie server-side in tRPC procedures (niet alleen frontend visibility)
- [x] Categorie A/B mutaties door klant -> keihard FORBIDDEN op API-niveau
- [x] Database unique constraint op normalizedAddressKey

### Test-first (vóór backend)
- [x] Test: zelfde adres verschillend getypt -> 1 genormaliseerde sleutel
- [x] Test: beheer maakt hetzelfde adres aan als klant -> duplicaat herkend (decideCreateOrClaim)
- [x] Test: bestaande adresclaim geeft GEEN directe toegang (canAccessSensitiveData)
- [x] Test: klant kan categorie A/B NIET wijzigen (canMutateField/requiresChangeRequest)
- [x] Test: medewerker kan GEEN gebruikers beheren (canManageUsers)
- [x] Test: samenvoegen behoudt het rijkste record (computeCanonicalScore/pickCanonical)
- [ ] Test: deactiveren/verwijderen gebruiker (gepland volgende iteratie)

### Migratie hardening
- [x] canonicalRecordScore = velden + documenten + users + inspecties + recentheid
- [x] Dry-run rapport, merge-lijst, conflictenlijst gegenereerd (scripts/migrate-addresses.mjs)
- [x] Conflicten niet stilzwijgend overschreven: status 'aandacht' + changeRequest voor validatie
- [x] Logging oude id -> nieuwe id (ID-mapping in rapport)
- [ ] Registraties tijdelijk blokkeren tijdens live migratie (niet nodig: gefaseerde uitrol op testdata)

### Volgorde
- [ ] Styling/cosmetica pas NA aantoonbaar stabiele kern

### Consistentie 3-lagen handhaving (afronding stabiele kern)
- [x] Beheer-aanmaak (properties.create) gebruikt zelfde dupcheck + normalizedAddressKey als klant (createOrClaim)
- [x] Legacy createOwn gedeprecieerd (geen achterdeur zonder dupcheck)
- [x] Woning-gebonden endpoints via gedeelde assertPropertyAccess (membership + staf + legacy-brug)
- [x] chat.ts (history + streaming) via canUserAccessProperty i.p.v. customers.userId-check
- [x] pdf.ts (5 rapporten) via canUserAccessProperty
- [x] properties.update = staffProcedure met categorie A/B-lock + audit per veld
- [x] Gebruikersbeheer (setRole/create/list/setActive) = managerProcedure
- [x] useAuth: 4 rollen + isStaff/isManager flags
- [x] AdminLayout: staf-toegang, "Gebruikers" alleen voor managers
- [x] Validation: rolbeheer-sectie alleen voor managers (mirror van backend)
- [x] Home redirect: staf -> /admin
- [x] FIELD_CATEGORY verplaatst naar pure passport.ts (single source of truth) + unit tests
- [x] Test: A/B-veldlock end-to-end per rol (9 nieuwe tests, 72 totaal groen)

### Bekende aandachtspunten (apart van deze opdracht)
- [ ] pdf.ts gebruikt puppeteer-core (browser-binary) — werkt niet in Autoscale Node-only deploy; alternatief nodig vóór publicatie
- [x] Veld-vergrendeling visueel (slotjes) in paspoort-tab
- [x] Wijzigverzoek-knop bij vergrendelde velden in klant-UI (ChangeRequestDialog + statusbanner + listMine)

### Integratietests (caller-niveau, echte procedures)
- [x] In-memory FakeDb + gemockte drizzle-operatoren (server/test/fakeDb.ts)
- [x] integration.test.ts: createOrClaim create/claim/no-access, admin duplicate CONFLICT, confirmClaim grants access, manager A/B write, employee A/B FORBIDDEN, changeRequest approve/reject, setActive revoke, delete anonymize
- [x] Bug gevonden+gefixt: surfaceM2/buildYear/propertyType + WOZ/kadaster/eigendom waren NIET beschermd -> nu categorie A (BAG-regel)
- [x] Client CLIENT_FIELD_CATEGORY gelijkgetrokken met server FIELD_CATEGORY
- [x] 100/100 tests groen, TypeScript foutloos

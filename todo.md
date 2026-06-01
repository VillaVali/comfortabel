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

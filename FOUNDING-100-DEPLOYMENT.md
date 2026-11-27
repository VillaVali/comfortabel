# Founding 100: deploymenthandleiding

Deze feature blijft lokaal en gebruikt standaard een veilige mock. Publiceer pas
nadat alle eerder blootgestelde credentials zijn vervangen.

## Environment variables

Stel deze waarden in via de beveiligde omgeving van Manus of de uiteindelijke
hostingprovider. Zet geen waarden in Git, documentatie, logs of frontendcode.

Server:

- `NODE_ENV`
- `PORT`
- `TRUST_PROXY`
- `DATABASE_URL`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `LEAD_NOTIFICATION_EMAIL`
- `PUBLIC_APP_URL`
- `FOUNDING100_STORAGE_MODE`
- `FOUNDING100_EMAIL_MODE`
- `LOCAL_STATIC_PREVIEW` (alleen lokaal)

Frontend:

- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`

Productie vereist:

- `FOUNDING100_STORAGE_MODE=database`
- `FOUNDING100_EMAIL_MODE=live`
- `PUBLIC_APP_URL` als de publieke HTTPS-origin
- een `JWT_SECRET` van minimaal 32 tekens

Gebruik lokaal geen productiecredentials. Zonder configuratie kiest de
Founding 100-route automatisch voor in-memory mockopslag en worden alle
e-mails uitgeschakeld.

Voor een credentialvrije lokale preview van de vooraf gebouwde frontend gebruik
je `NODE_ENV=development` en `LOCAL_STATIC_PREVIEW=1`.

## Database

De migratie `drizzle/migrations/0012_founding_100_leads.sql` maakt de tabel
`founding100Leads`. Deze bevat:

- lead- en statusvelden;
- afzonderlijke tijdstippen voor privacy- en contacttoestemming;
- optionele marketingtoestemming;
- UTM-attributie en referrer;
- verzendstatussen voor bevestiging en interne notificatie.

Voer de migratie eerst op staging uit. Maak vooraf een databaseback-up en
controleer daarna tabelstructuur, unieke e-mailindex en schrijfrechten. Voer
geen `db:push` uit tegen productie zonder de gegenereerde SQL te beoordelen.

## Staging

1. Roteer database-, JWT-, Resend- en Manus Forge-credentials.
2. Controleer dat `.project-config.json` en lokale `.env`-bestanden niet worden
   gevolgd door Git.
3. Stel staging-environmentvariabelen beveiligd in.
4. Gebruik een afzonderlijke stagingdatabase en een Resend-key met alleen
   verzendrechten.
5. Voer migratie `0012_founding_100_leads.sql` uit.
6. Bouw en start de applicatie met productie-instellingen.
7. Test één herkenbare staginginschrijving.
8. Controleer databaseopslag, beide toestemmingen, UTM-velden, e-mailbezorging,
   auditlog en analytics.

## Productie

1. Laat de featurebranch technisch en zakelijk beoordelen in een draft-PR.
2. Controleer dat staging volledig is goedgekeurd.
3. Maak een actuele databaseback-up.
4. Stel de geroteerde productievariabelen in.
5. Voer migratie `0012_founding_100_leads.sql` uit.
6. Deploy eerst zonder verkeer om startup- en healthchecks te controleren.
7. Controleer `/founding-100` en `/founding-100/bedankt`.
8. Doe één gecontroleerde productieinschrijving.
9. Controleer leadopslag, bevestigingsmail, interne notificatie en
   conversie-event.
10. Start pas daarna de pilotcampagne.

## Testchecklist

- Desktop- en mobiele layout, inclusief 375 px breedte.
- Alle CTA's gaan naar het formulier of een geldige interne route.
- Naam, geldig e-mailadres, privacytoestemming en contacttoestemming zijn
  verplicht.
- Telefoon, postcode, toelichting en marketingtoestemming blijven optioneel.
- Honeypot en rate limiting werken.
- UTM source, medium, campaign, term, content, referrer en landing path worden
  opgeslagen.
- Fouten tonen geen stacktraces, credentials of persoonsgegevens.
- Succes leidt naar `/founding-100/bedankt`.
- Canonical-, Open Graph- en paginametadata verwijzen naar
  `https://mijncomfortabel.nl/founding-100`.
- Typecheck, tests en productiebuild slagen.
- Browserconsole bevat geen applicatiefouten.

## Rollback

1. Stop de campagne en zet verkeer terug naar de vorige applicatieversie.
2. Deploy de laatste bekende goede Git-commit.
3. Laat de nieuwe tabel staan als al leads zijn ontvangen; verwijder geen
   productiegegevens tijdens een applicatierollback.
4. Zet de Founding 100-route tijdelijk uit of laat hem een nette
   niet-beschikbaarmelding tonen.
5. Trek bij mogelijk credentialmisbruik de betreffende key onmiddellijk in.
6. Onderzoek logs zonder gevoelige waarden of volledige leadgegevens te
   kopiëren.
7. Herstel pas na een gecontroleerde fix en nieuwe stagingtest.

## Git-commando's voor latere publicatie

Voer deze commando's uit vanuit een schone checkout:

```bash
git switch feature/founding-100-landing-page
git status --short
git fetch origin
git rebase origin/main
git push --set-upstream origin feature/founding-100-landing-page
gh pr create --draft \
  --base main \
  --head feature/founding-100-landing-page \
  --title "feat: add Founding 100 lead generation landing page"
```

Controleer vóór de push altijd opnieuw `git diff origin/main...HEAD`,
`git status --short` en de secretscan.

## Openstaande beveiligingsacties

- Roteer `DATABASE_URL` en de gelijkwaardige oude
  `DRIZZLE_DATABASE_URL`-credential.
- Roteer `JWT_SECRET`; bestaande sessies worden daardoor ongeldig.
- Roteer `RESEND_API_KEY` en beperk de nieuwe key tot verzendrechten.
- Laat Manus `BUILT_IN_FORGE_API_KEY` vernieuwen.
- Beoordeel en vernieuw `VITE_FRONTEND_FORGE_API_KEY`; een `VITE_`-waarde is
  zichtbaar in de browser en mag geen geheime bevoegdheden hebben.
- Verwijder `.project-config.json` uit de branch en, na beoordeling, uit
  bereikbare Git-historie.
- Controleer CI-logs, eerdere builds en gedeelde documentatie op oude waarden.

## Tijdelijke lokale onderdelen

`server/founding100.mock.ts` bewaart lokale testinschrijvingen uitsluitend in
het geheugen van het Node-proces. Er wordt lokaal geen database, e-mailprovider,
notificatieprovider of externe productie-API gebruikt. De mock wordt vóór
productie vervangen door `FOUNDING100_STORAGE_MODE=database`; e-mail wordt pas
actief met `FOUNDING100_EMAIL_MODE=live`.

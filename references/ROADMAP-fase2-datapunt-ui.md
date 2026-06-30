# Roadmap Fase 2 — UI-refactor naar centraal datapunt-model

**Status:** Gepland. Starten na 100 succesvolle onboardings.
**Trigger:** Zodra 100 Founding Members succesvol onboard zijn én de data laat zien hoe gebruikers de invoer ervaren.

---

## Achtergrond

In Fase 1 (livegang 1 juli) is de "Trojan Horse" aanpak geïmplementeerd:
- De `propertyDataPoints`-tabel staat klaar in de database met het volledige datapunt-model.
- Elke property-write wordt automatisch gesynchroniseerd naar datapunten (fire-and-forget).
- De UI blijft ongewijzigd (formulieren/tabbladen) — dit is bewust.

In Fase 2 wordt de UI omgebouwd zodat deze rechtstreeks op de `propertyDataPoints`-tabel werkt.

---

## Doelstelling Fase 2

Bouw het platform niet langer rondom tabbladen en formulieren, maar rondom het centrale datapunt-model. De UI (WoningPaspoort, Eigen Huis Dossier, Mati, rapportages) wordt een weergave van dezelfde onderliggende dataset.

---

## Wat er al staat (Fase 1 legacy)

| Component | Fase 1 staat | Fase 2 doel |
|-----------|-------------|-------------|
| `propertyDataPoints` tabel | ✅ Aanwezig, volledig schema | Primaire data-bron |
| Sync-helper (`server/lib/datapoints.ts`) | ✅ Actief bij elke write | Verwijderen na migratie |
| `properties` tabel | ✅ Primaire bron | Archief/legacy na migratie |
| UI formulieren | ✅ Werken op `properties` | Omgebouwd naar datapunt-renderer |

---

## Datapunt-model (al geïmplementeerd in schema)

Elk datapunt heeft:
- `id`, `propertyId`, `category`, `component`, `label`
- `value` (text — cast op basis van component), `unit`
- `source` (klant / telefoon_intake / ai / foto / comfortabel / specialist / bag / import)
- `confidence` (0–100)
- `verificationStatus` (unverified / self_reported / photo_verified / physically_verified / ai_inferred)
- `linkedPhotoIds`, `linkedDocumentIds` (JSON arrays)
- `maintenanceStatus`, `riskScore`, `urgencyScore`
- `aiNotes`, `aiFlags` (voor Mati Fase 3+)
- `createdBy`, `createdAt`, `updatedAt`, `verifiedAt`, `verifiedBy`

---

## Drie intakevormen (Fase 2 klaar voor alle drie)

1. **Zelfinvullen door klant** — huidige formulieren worden datapunt-invoer
2. **Telefonische intake** (Comfortabel Intake Team) — medewerker vult datapunten in met `source: "telefoon_intake"`, `confidence: 70`
3. **Fysieke verificatie** (0-meting) — medewerker/specialist verhoogt `confidence` naar 100, zet `verificationStatus: "physically_verified"`

---

## Toekomstige gebruik van dezelfde dataset

- WoningPaspoort
- Eigen Huis Dossier
- Onderhoudsrapportages
- Mati AI-adviezen (per datapunt: ontbrekend signaleren, inconsistenties, vervolgvragen)
- Verzekerings- en taxatiekoppelingen
- Verkoopdossiers
- Toekomstige API-koppelingen

---

## Implementatieplan Fase 2 (globaal)

### Sprint 2A — Data-migratie (1 week)
- Migreer bestaande `properties`-data naar `propertyDataPoints` (eenmalige script)
- Verifieer dat alle datapunten correct zijn gesynchroniseerd
- Schakel de sync-helper uit (niet meer nodig)

### Sprint 2B — Server-laag (1 week)
- Nieuwe tRPC-procedures die rechtstreeks op `propertyDataPoints` werken
- `getPropertyDataPoints(propertyId)` — gegroepeerd per categorie
- `upsertDataPoint(propertyId, component, value, source)` — universele schrijf-procedure
- Compleetheidsscore herberekenen op basis van datapunten

### Sprint 2C — UI-refactor (2 weken)
- Dynamische datapunt-renderer: één component dat elk datapunt weergeeft
- Betrouwbaarheidsindicator per datapunt (bron-badge + confidence-bar)
- Foto-koppeling per datapunt (bewijs-upload)
- Admin-view: datapunten per bron filteren, verificatie-workflow

### Sprint 2D — Mati-integratie (1 week)
- Mati krijgt de datapunten als context (niet de ruwe `properties`-tabel)
- Per datapunt: ontbrekende info signaleren, inconsistenties herkennen
- Vervolgvragen genereren op basis van lage confidence of ontbrekende datapunten

---

## Geschatte investering Fase 2

| Sprint | Duur | Manus-credits |
|--------|------|--------------|
| 2A Data-migratie | 1 week | ~300 |
| 2B Server-laag | 1 week | ~400 |
| 2C UI-refactor | 2 weken | ~800 |
| 2D Mati-integratie | 1 week | ~300 |
| **Totaal** | **5 weken** | **~1.800** |

---

## Voorwaarden voor start Fase 2

- [ ] 100 Founding Members succesvol onboard
- [ ] Gebruikersdata beschikbaar over hoe klanten de invoer ervaren
- [ ] Manus-credits verhoogd (aanbeveling: 20.000+/maand bij 30+ actieve gebruikers)
- [ ] Besluit over telefonisch intake-team (zie `ROADMAP-telefoon-intake.md`)

---

*Vastgelegd op 30 juni 2026 door Manus (CTO-rol MijnComfortabel)*

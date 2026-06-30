# Roadmap — Schaalbare Telefonische Intake (Fase 2+)

**Status:** Idee vastgelegd. **Niet ontwikkelen** vóór v1.0 stabiel draait en de eerste 100 gebruikers succesvol zijn onboard.

---

## Visie

Het WoningPaspoort moet uiteindelijk volledig op afstand kunnen worden aangemaakt via een telefonisch intakegesprek van circa 15–30 minuten. Een fysieke 0-meting wordt daarmee een optionele premiumdienst in plaats van de standaard onboarding.

---

## Gewenste Workflow

1. Klant meldt zich aan via MijnComfortabel.
2. Klant plant automatisch een telefonische intake (zelfservice via agenda-koppeling).
3. Een medewerker van het **Comfortabel Intake Team** (bijv. vanuit Suriname) belt de klant.
4. Tijdens het gesprek worden alle tabbladen van het WoningPaspoort systematisch ingevuld via een slim belscript — ondersteund door Mati met vervolgvragen en kwaliteitscontroles.
5. Na afloop ontvangt de klant automatisch een foto-opdracht: circa 10–15 standaardfoto's via smartphone.
6. Mati analyseert de gegevens en foto's, controleert op inconsistenties, vult ontbrekende informatie aan en genereert een compleet WoningPaspoort, Woning Score™, onderhoudsplan en adviezen.

---

## Ontwikkelpunten

### Belscript
- Volledig belscript dat alle onderdelen van het WoningPaspoort afdekt (alle tabbladen).
- AI-ondersteuning voor de medewerker: live vervolgvragen, kwaliteitscontroles, ontbrekende velden signaleren.
- Medewerkers functioneren als **digitale woningcoaches**, niet als verkopers.

### Foto-opdracht (standaard set)
Circa 10–15 verplichte foto's, waaronder:
- Voorgevel
- Achtergevel
- Meterkast (elektrisch + gas)
- CV-installatie
- Keuken
- Badkamer
- Dak (indien toegankelijk)
- Rookmelders
- Kruipluik / ondervloer
- Zolder

Automatische controle: zijn alle vereiste foto's aanwezig en van voldoende kwaliteit? Zo niet → Mati stuurt gerichte vervolgverzoeken.

### AI-verwerking (Mati — Laag 3)
- Foto-analyse: herkenning van installaties, bouwkundige staat, zichtbare gebreken.
- Inconsistentiedetectie: bijv. bouwjaar vs. aanwezige installaties.
- Aanvullen ontbrekende gegevens op basis van BAG-data en foto-analyse.
- Genereren van WoningPaspoort, score, onderhoudsplan en adviezen.

---

## Schaalbaarheid

| Schaal | Aanpak |
|--------|--------|
| 0–100 gebruikers | Handmatige 0-meting + digitale onboarding (v1.0) |
| 100–1.000 | Telefonische intake + foto-opdracht (Fase 2) |
| 1.000–10.000 | Intake Team schalen + AI-kwaliteitscontrole geautomatiseerd |
| 10.000–100.000+ | Volledig AI-gedreven intake, menselijke review alleen bij uitzonderingen |

**Doelstelling Intake Team:**
- 15–20 complete WoningPaspoorten per medewerker per dag.
- Mogelijkheid om honderdduizenden woningen per jaar te verwerken.
- Fysieke inspecties uitsluitend wanneer AI of de klant daar aanleiding toe geeft.

---

## Afhankelijkheden voor Fase 2

- [ ] v1.0 stabiel live met eerste 100 gebruikers
- [ ] Belscript ontwikkeld en getest met intern team
- [ ] Agenda-koppeling voor zelfservice intake-planning (bijv. Calendly of eigen module)
- [ ] Foto-upload flow voor klanten (A3 — al gebouwd in v1.0)
- [ ] AI foto-analyse (Mati Laag 2) gevalideerd op pilotdata
- [ ] Intake Team getraind en operationeel

---

## Notitie voor Manus

> Herinner Patrick aan dit roadmap-item zodra v1.0 stabiel draait en de eerste 50+ gebruikers actief zijn. Stel dan voor een Fase 2-sprint te plannen voor de telefonische intake.

---

*Vastgelegd: 30 juni 2026 | Auteur: Patrick Valpoort / Manus CTO-sessie*

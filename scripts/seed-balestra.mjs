/**
 * Seed script: Walter & Gemma Balestra demo environment
 * De Noord 9, Ilpendam — Premium Pilot Relatie
 *
 * Actual DB column names (camelCase as used by Drizzle):
 * users: id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn, passwordHash, isActive
 * customers: id, userId, type, firstName, lastName, companyName, email, phone, notes, isActive, createdAt, updatedAt, createdBy
 * properties: id, customerId, street, houseNumber, postalCode, city, buildYear, propertyType, surfaceM2, residents, energyLabel, subscriptionType, subscriptionActive, lastInspectionDate, nextInspectionDate, photoUrl, notes, createdAt, updatedAt
 * maintenanceIssues: id, propertyId, inspectionId, title, description, category, priority, status, dueDate, resolvedAt, estimatedCost, notes, createdAt, updatedAt
 * maintenancePlanning: id, propertyId, title, description, category, plannedYear, horizon, estimatedCost, status, createdAt
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const walterHash = await bcrypt.hash("Comfortabel2025!", 12);
  const gemmaHash  = await bcrypt.hash("Comfortabel2025!", 12);

  // ─── 1. Users ─────────────────────────────────────────────────────────────
  await conn.execute(
    `INSERT INTO users (name, email, passwordHash, role, isActive, createdAt)
     VALUES (?, ?, ?, 'user', 1, NOW())
     ON DUPLICATE KEY UPDATE name = VALUES(name), isActive = 1, passwordHash = VALUES(passwordHash)`,
    ["Walter Balestra", "balestra@zorgdomein.nl", walterHash]
  );

  await conn.execute(
    `INSERT INTO users (name, email, passwordHash, role, isActive, createdAt)
     VALUES (?, ?, ?, 'admin', 1, NOW())
     ON DUPLICATE KEY UPDATE name = VALUES(name), isActive = 1, passwordHash = VALUES(passwordHash)`,
    ["Gemma Balestra", "gemma@zorgdomein.nl", gemmaHash]
  );

  const [[walterUser]] = await conn.execute(
    "SELECT id FROM users WHERE email = ?", ["balestra@zorgdomein.nl"]
  );
  const walterId = walterUser.id;
  console.log(`✅ Gebruikers: Walter (id=${walterId}), Gemma`);

  // ─── 2. Customer ──────────────────────────────────────────────────────────
  // customers has: userId, type, firstName, lastName, companyName, email, phone, notes, isActive, createdAt
  const [custResult] = await conn.execute(
    `INSERT INTO customers (userId, type, firstName, lastName, companyName, email, phone, notes, isActive, createdAt)
     VALUES (?, 'particulier', ?, ?, ?, ?, ?, ?, 1, NOW())`,
    [
      walterId,
      "Walter",
      "Balestra",
      "Walter & Gemma Balestra",
      "balestra@zorgdomein.nl",
      null,
      "Premium Pilot Relatie. Relatiebeheerder: Patrick Valpoort. Klant sinds 2026. Eerste groep bewoners die deelnemen aan de ontwikkeling van het MijnComfortabel-concept.",
    ]
  );
  const customerId = custResult.insertId;
  console.log(`✅ Klant aangemaakt: id=${customerId}`);

  // ─── 3. Property ──────────────────────────────────────────────────────────
  // properties: customerId, street, houseNumber, postalCode, city, buildYear, propertyType, surfaceM2, energyLabel, subscriptionType, subscriptionActive, notes
  const [propResult] = await conn.execute(
    `INSERT INTO properties (customerId, street, houseNumber, postalCode, city, buildYear, propertyType, surfaceM2, energyLabel, subscriptionType, subscriptionActive, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'premium', 1, ?, NOW())`,
    [
      customerId,
      "De Noord",
      "9",
      "1452 PS",
      "Ilpendam",
      1910,
      "vrijstaand",
      394,
      "D",
      "Vrijstaande landelijke woning. Perceeloppervlakte: 913 m². Kadastrale aanduiding: WTL00-E-1358. Gemeente Waterland, Noord-Holland. Technische staat: Goed met aandachtspunten. Status: Actieve optimalisatie. Pilotklant MijnComfortabel™.",
    ]
  );
  const propertyId = propResult.insertId;
  console.log(`✅ Woning aangemaakt: id=${propertyId}`);

  // ─── 4. Maintenance issues ────────────────────────────────────────────────
  // maintenanceIssues: propertyId, title, description, category, priority, status, notes, createdAt
  const issues = [
    ["Badkamerherstel: constructieve verzakkingen vloer",
     "Tijdens inspectie bleek dat meerdere vloerbalken waren doorgezakt. Extra herstelwerkzaamheden uitgevoerd om constructieve stabiliteit van de badkamer te waarborgen. Risico op scheurvorming, loslatend tegelwerk en wateraccumulatie voorkomen door vroegtijdig ingrijpen.",
     "Bouwkundig", "hoog", "afgerond"],
    ["Kleine renovatie badkamer",
     "Herstel en verbetering van afwerking na constructief herstel. Controle leidingwerk en waterdichtheid uitgevoerd. Optimalisatie douchegedeelte.",
     "Sanitair", "normaal", "afgerond"],
    ["Douchethermostaat: schade en verminderde functionaliteit",
     "Schade aan douchethermostaat geconstateerd. Controle op lekkage en aansluitingen uitgevoerd. Hersteld en opgenomen in onderhoudshistorie voor toekomstige monitoring.",
     "Installaties", "normaal", "afgerond"],
    ["Preventieve controle waterleidingen",
     "Waterleidingen gecontroleerd als onderdeel van preventief onderhoudsprogramma. Geen bijzonderheden.",
     "Sanitair", "laag", "afgerond"],
    ["Preventieve controle afvoeren",
     "Afvoeren gecontroleerd. Geen bijzonderheden geconstateerd.",
     "Sanitair", "laag", "afgerond"],
    ["Preventieve controle sanitair en kraanwerk",
     "Sanitair gecontroleerd. Kraanwerk geïnspecteerd. Alles in orde.",
     "Sanitair", "laag", "afgerond"],
    ["Tuinrenovatie: herinrichting buitenruimte",
     "De buitenruimte wordt momenteel volledig gerenoveerd. Werkzaamheden: herinrichting tuin, verbetering uitstraling woning, optimalisatie gebruiksruimte, toekomstbestendig onderhoudsplan buitenruimte. Na oplevering wordt tuin toegevoegd aan digitaal woningpaspoort met fotoregistratie en onderhoudskalender.",
     "Buitenruimte", "normaal", "in_behandeling"],
    ["Ventilatie badkamer: monitoring aanbevolen",
     "Ventilatieprestaties badkamer dienen gemonitord te worden. Jaarlijkse controle aanbevolen. Risico: laag tot gemiddeld.",
     "Installaties", "normaal", "open"],
    ["Kitnaden natte ruimtes: periodieke controle",
     "Kitnaden in badkamer en andere natte ruimtes vereisen periodieke controle. Jaarlijkse inspectie aanbevolen.",
     "Bouwkundig", "laag", "open"],
  ];

  for (const [title, description, category, priority, status] of issues) {
    await conn.execute(
      `INSERT INTO maintenanceIssues (propertyId, title, description, category, priority, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [propertyId, title, description, category, priority, status]
    );
  }
  console.log(`✅ ${issues.length} onderhoudspunten aangemaakt`);

  // ─── 5. Planning items ────────────────────────────────────────────────────
  // maintenancePlanning: propertyId, title, description, category, plannedYear, horizon, estimatedCost, status, createdAt
  const planningItems = [
    ["Afronding tuinrenovatie", "Afronden van de lopende tuinrenovatie en vastleggen eindrapportage tuin in digitaal woningpaspoort.", "Buitenruimte", 2026, "1jaar", "gepland"],
    ["Eindrapportage tuin vastleggen", "Fotoregistratie, onderhoudskalender en meerjarenonderhoudsplanning buitenruimte documenteren na oplevering tuinrenovatie.", "Documentatie", 2026, "1jaar", "gepland"],
    ["Controle ventilatie badkamer", "Jaarlijkse controle ventilatieprestaties badkamer. Meting luchtkwaliteit en doorstroming.", "Installaties", 2026, "1jaar", "gepland"],
    ["Controle kitnaden natte ruimtes", "Jaarlijkse inspectie kitnaden badkamer en andere natte ruimtes. Indien nodig herkit uitvoeren.", "Bouwkundig", 2026, "1jaar", "gepland"],
    ["Actualisatie woningfoto's", "Bijwerken van het digitale woningarchief met actuele foto's na afronding werkzaamheden.", "Documentatie", 2026, "1jaar", "gepland"],
    ["Aanvulling digitaal woningarchief", "Aanvullen van het woningpaspoort met ontbrekende technische documentatie en historische gegevens.", "Documentatie", 2026, "1jaar", "gepland"],
    ["Jaarlijkse woningcontrole 2027", "Jaarlijkse professionele woningcontrole door Comfortabel. Volledige inspectie van alle installaties en bouwkundige staat.", "Inspectie", 2027, "3jaar", "gepland"],
    ["Vochtmeting badkamer 2027", "Jaarlijkse vochtmeting badkamer als onderdeel van preventief onderhoudsplan.", "Sanitair", 2027, "3jaar", "gepland"],
    ["Kitwerk badkamer 2027", "Jaarlijkse controle en eventuele vervanging kitwerk badkamer.", "Sanitair", 2027, "3jaar", "gepland"],
  ];

  for (const [title, description, category, year, horizon, status] of planningItems) {
    await conn.execute(
      `INSERT INTO maintenancePlanning (propertyId, title, description, category, plannedYear, horizon, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [propertyId, title, description, category, year, horizon, status]
    );
  }
  console.log(`✅ ${planningItems.length} planningsitems aangemaakt`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n🏠 Demo-omgeving Balestra succesvol aangemaakt:");
  console.log(`   Klant ID:    ${customerId}`);
  console.log(`   Woning ID:   ${propertyId}`);
  console.log(`   Walter ID:   ${walterId}`);
  console.log(`   Login Walter: balestra@zorgdomein.nl — klantportaal`);
  console.log(`   Login Gemma:  gemma@zorgdomein.nl   — beheerprofiel (admin)`);
  console.log(`   Wachtwoord:   Comfortabel2025! (beide accounts)`);

} catch (err) {
  console.error("❌ Fout:", err.message);
  throw err;
} finally {
  await conn.end();
}

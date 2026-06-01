/**
 * Fresh seed: admin info@villavali.nl + 2 demo users with properties
 * - Patrick Valpoort — Top Naeffstraat 21
 * - Manon — Cor Bruijnweg 94
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── Wachtwoorden hashen ────────────────────────────────────────────────────────
const adminHash   = await bcrypt.hash("Comfortabel2025!", 12);
const patrickHash = await bcrypt.hash("Comfortabel2025!", 12);
const manonHash   = await bcrypt.hash("Comfortabel2025!", 12);

// ── Admin: info@villavali.nl ───────────────────────────────────────────────────
await conn.execute(
  `INSERT INTO users (name, email, passwordHash, role, isActive, createdAt, updatedAt, lastSignedIn)
   VALUES (?, ?, ?, 'admin', 1, NOW(), NOW(), NOW())
   ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), isActive = 1`,
  ["Villa Vali Admin", "info@villavali.nl", adminHash]
);
const [[adminRow]] = await conn.execute(`SELECT id FROM users WHERE email = ?`, ["info@villavali.nl"]);
console.log(`✅ Admin aangemaakt: info@villavali.nl (id=${adminRow.id})`);

// ── Patrick Valpoort ──────────────────────────────────────────────────────────
await conn.execute(
  `INSERT INTO users (name, email, passwordHash, role, isActive, createdAt, updatedAt, lastSignedIn)
   VALUES (?, ?, ?, 'user', 1, NOW(), NOW(), NOW())
   ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), isActive = 1`,
  ["Patrick Valpoort", "patrick@valpoort.nl", patrickHash]
);
const [[patrickRow]] = await conn.execute(`SELECT id FROM users WHERE email = ?`, ["patrick@valpoort.nl"]);
const patrickId = patrickRow.id;
console.log(`✅ Gebruiker aangemaakt: patrick@valpoort.nl (id=${patrickId})`);

// Klantprofiel Patrick
await conn.execute(
  `INSERT INTO customers (userId, type, firstName, lastName, email, phone, isActive, createdAt, updatedAt)
   VALUES (?, 'particulier', 'Patrick', 'Valpoort', 'patrick@valpoort.nl', '06-11223344', 1, NOW(), NOW())`,
  [patrickId]
);
const [[patrickCustomer]] = await conn.execute(`SELECT id FROM customers WHERE userId = ?`, [patrickId]);
const patrickCustomerId = patrickCustomer.id;

// Woning Patrick: Top Naeffstraat 21
const [patrickPropResult] = await conn.execute(
  `INSERT INTO properties (customerId, street, houseNumber, postalCode, city, buildYear, propertyType, surfaceM2, residents, energyLabel, subscriptionType, subscriptionActive, createdAt, updatedAt)
   VALUES (?, 'Top Naeffstraat', '21', '1062 HX', 'Amsterdam', 1987, 'tussenwoning', 112, 3, 'C', 'basis', 1, NOW(), NOW())`,
  [patrickCustomerId]
);
const patrickPropertyId = patrickPropResult.insertId;
console.log(`✅ Woning aangemaakt: Top Naeffstraat 21, Amsterdam (id=${patrickPropertyId})`);

// Inspectie Patrick
await conn.execute(
  `INSERT INTO inspections (propertyId, type, status, inspectionDate, scoreInstallaties, scoreBouwkundig, scoreVeiligheid, scoreVochtVentilatie, scoreEnergie, totalScore, woningGrade, summary, createdAt, updatedAt)
   VALUES (?, 'nulmeting', 'afgerond', NOW(), 68, 72, 85, 55, 62, 68, 'C', 'Woning in redelijke staat. CV-ketel nadert einde levensduur (2027). Dakgoten aan vervanging toe. Rookmelders aanwezig en werkend. Energielabel C — isolatie dak aanbevolen.', NOW(), NOW())`,
  [patrickPropertyId]
);

// Onderhoudspunten Patrick
const patrickIssues = [
  ["CV-ketel vervangen", "Ketel is 16 jaar oud, verwacht einde levensduur 2027", "Installaties", "hoog", "open", 3400],
  ["Dakgoten reinigen en herstellen", "Dakgoten verstopt en plaatselijk losgeraakt", "Bouwkundig", "normaal", "gepland", 320],
  ["Schilderwerk kozijnen voorzijde", "Verf bladdert op 3 kozijnen aan de straatzijde", "Bouwkundig", "laag", "open", 750],
  ["Dakisolatie verbeteren", "Geen dakisolatie aanwezig, aanbevolen voor energielabel B", "Energie", "normaal", "open", 4200],
];
for (const [title, description, category, priority, status, estimatedCost] of patrickIssues) {
  await conn.execute(
    `INSERT INTO maintenanceIssues (propertyId, title, description, category, priority, status, estimatedCost, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [patrickPropertyId, title, description, category, priority, status, estimatedCost]
  );
}
console.log(`✅ ${patrickIssues.length} onderhoudspunten Patrick aangemaakt`);

// Planning Patrick
const patrickPlanning = [
  ["CV-ketel vervangen", "Installaties", 2027, "3jaar", 3400],
  ["Dakisolatie aanbrengen", "Energie", 2026, "1jaar", 4200],
  ["Badkamer renovatie", "Sanitair", 2029, "5jaar", 9500],
  ["Schilderwerk totaal", "Bouwkundig", 2028, "3jaar", 2200],
];
for (const [title, category, plannedYear, horizon, estimatedCost] of patrickPlanning) {
  await conn.execute(
    `INSERT INTO maintenancePlanning (propertyId, title, category, plannedYear, horizon, estimatedCost, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [patrickPropertyId, title, category, plannedYear, horizon, estimatedCost]
  );
}
console.log(`✅ ${patrickPlanning.length} planningspunten Patrick aangemaakt`);

// ── Manon ─────────────────────────────────────────────────────────────────────
await conn.execute(
  `INSERT INTO users (name, email, passwordHash, role, isActive, createdAt, updatedAt, lastSignedIn)
   VALUES (?, ?, ?, 'user', 1, NOW(), NOW(), NOW())
   ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), isActive = 1`,
  ["Manon", "manon@demo.nl", manonHash]
);
const [[manonRow]] = await conn.execute(`SELECT id FROM users WHERE email = ?`, ["manon@demo.nl"]);
const manonId = manonRow.id;
console.log(`✅ Gebruiker aangemaakt: manon@demo.nl (id=${manonId})`);

// Klantprofiel Manon
await conn.execute(
  `INSERT INTO customers (userId, type, firstName, lastName, email, phone, isActive, createdAt, updatedAt)
   VALUES (?, 'particulier', 'Manon', '', 'manon@demo.nl', '06-55667788', 1, NOW(), NOW())`,
  [manonId]
);
const [[manonCustomer]] = await conn.execute(`SELECT id FROM customers WHERE userId = ?`, [manonId]);
const manonCustomerId = manonCustomer.id;

// Woning Manon: Cor Bruijnweg 94
const [manonPropResult] = await conn.execute(
  `INSERT INTO properties (customerId, street, houseNumber, postalCode, city, buildYear, propertyType, surfaceM2, residents, energyLabel, subscriptionType, subscriptionActive, createdAt, updatedAt)
   VALUES (?, 'Cor Bruijnweg', '94', '1069 EK', 'Amsterdam', 2003, 'hoekwoning', 98, 2, 'B', 'digital', 1, NOW(), NOW())`,
  [manonCustomerId]
);
const manonPropertyId = manonPropResult.insertId;
console.log(`✅ Woning aangemaakt: Cor Bruijnweg 94, Amsterdam (id=${manonPropertyId})`);

// Onderhoudspunten Manon
const manonIssues = [
  ["Vochtplek slaapkamer", "Vochtplek zichtbaar op binnenmuur slaapkamer, mogelijke condensatie", "Vocht & Ventilatie", "hoog", "open", 800],
  ["Mechanische ventilatie reinigen", "Ventilatieroosters verstopt, luchtverversing onvoldoende", "Installaties", "normaal", "gepland", 150],
  ["Tuinmuur herstellen", "Metselwerk tuinmuur vertoont scheuren aan de westzijde", "Bouwkundig", "laag", "open", 600],
];
for (const [title, description, category, priority, status, estimatedCost] of manonIssues) {
  await conn.execute(
    `INSERT INTO maintenanceIssues (propertyId, title, description, category, priority, status, estimatedCost, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [manonPropertyId, title, description, category, priority, status, estimatedCost]
  );
}
console.log(`✅ ${manonIssues.length} onderhoudspunten Manon aangemaakt`);

// Planning Manon
const manonPlanning = [
  ["Vochtprobleem oplossen", "Vocht & Ventilatie", 2026, "1jaar", 800],
  ["Keuken vernieuwen", "Sanitair", 2028, "3jaar", 7500],
];
for (const [title, category, plannedYear, horizon, estimatedCost] of manonPlanning) {
  await conn.execute(
    `INSERT INTO maintenancePlanning (propertyId, title, category, plannedYear, horizon, estimatedCost, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [manonPropertyId, title, category, plannedYear, horizon, estimatedCost]
  );
}
console.log(`✅ ${manonPlanning.length} planningspunten Manon aangemaakt`);

await conn.end();

console.log("\n✅ Database succesvol gevuld!");
console.log("\n📋 Inloggegevens (wachtwoord voor alle accounts: Comfortabel2025!):");
console.log("   Admin:   info@villavali.nl       → beheerpanel");
console.log("   Patrick: patrick@valpoort.nl     → Top Naeffstraat 21, Amsterdam (Basis)");
console.log("   Manon:   manon@demo.nl           → Cor Bruijnweg 94, Amsterdam (Digital)");

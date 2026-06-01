import mysql from "mysql2/promise";
import { readFileSync } from "fs";

// Read DB URL from .project-config or env
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const config = JSON.parse(readFileSync(".project-config", "utf-8"));
    dbUrl = config.databaseUrl || config.DATABASE_URL;
  } catch {}
}

if (!dbUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const conn = await mysql.createConnection(dbUrl);

console.log("🌱 Seeding demo data for MijnComfortabel...\n");

// ── 5 Demo customers ──────────────────────────────────────────────────────────
const demoCustomers = [
  { type: "particulier", firstName: "Manon", lastName: "de Vries", email: "manon.devries@demo.nl", phone: "06-12345678" },
  { type: "particulier", firstName: "Peter", lastName: "Jansen", email: "peter.jansen@demo.nl", phone: "06-23456789" },
  { type: "bedrijf", companyName: "Vastgoed Groep Noord BV", email: "info@vgnnoord.nl", phone: "020-1234567" },
  { type: "vastgoed", companyName: "Huurwoningen Amsterdam", email: "beheer@huurwon.nl", phone: "020-9876543" },
  { type: "particulier", firstName: "Sophie", lastName: "Bakker", email: "sophie.bakker@demo.nl", phone: "06-34567890" },
];

const customerIds = [];
for (const c of demoCustomers) {
  const [result] = await conn.execute(
    `INSERT INTO customers (type, firstName, lastName, companyName, email, phone, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE email = email`,
    [c.type, c.firstName || null, c.lastName || null, c.companyName || null, c.email, c.phone || null]
  );
  const insertId = result.insertId || (await conn.execute(`SELECT id FROM customers WHERE email = ?`, [c.email]))[0][0]?.id;
  customerIds.push(Number(insertId));
  console.log(`✓ Klant: ${c.firstName || c.companyName} (id: ${insertId})`);
}

// ── 5 Demo properties ─────────────────────────────────────────────────────────
const demoProperties = [
  {
    customerId: customerIds[0],
    street: "Kerkstraat", houseNumber: "12", postalCode: "1017 GA", city: "Amsterdam",
    buildYear: 1965, propertyType: "tussenwoning", surfaceM2: 95, residents: 3,
    energyLabel: "C", subscriptionType: "premium",
  },
  {
    customerId: customerIds[1],
    street: "Molenweg", houseNumber: "45A", postalCode: "3511 BV", city: "Utrecht",
    buildYear: 1988, propertyType: "hoekwoning", surfaceM2: 120, residents: 4,
    energyLabel: "B", subscriptionType: "plus",
  },
  {
    customerId: customerIds[2],
    street: "Industrielaan", houseNumber: "8", postalCode: "1043 BH", city: "Amsterdam",
    buildYear: 2001, propertyType: "bedrijfspand", surfaceM2: 450, residents: null,
    energyLabel: "A", subscriptionType: "vve",
  },
  {
    customerId: customerIds[3],
    street: "Prinsengracht", houseNumber: "234", postalCode: "1016 HJ", city: "Amsterdam",
    buildYear: 1920, propertyType: "appartement", surfaceM2: 68, residents: 2,
    energyLabel: "E", subscriptionType: "verhuur",
  },
  {
    customerId: customerIds[4],
    street: "Dennenlaan", houseNumber: "3", postalCode: "5616 AE", city: "Eindhoven",
    buildYear: 2010, propertyType: "vrijstaand", surfaceM2: 185, residents: 5,
    energyLabel: "A+", subscriptionType: "premium",
  },
];

const propertyIds = [];
for (const p of demoProperties) {
  const [result] = await conn.execute(
    `INSERT INTO properties (customerId, street, houseNumber, postalCode, city, buildYear, propertyType, surfaceM2, residents, energyLabel, subscriptionType, subscriptionActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [p.customerId, p.street, p.houseNumber, p.postalCode, p.city, p.buildYear || null, p.propertyType, p.surfaceM2 || null, p.residents || null, p.energyLabel || null, p.subscriptionType]
  );
  propertyIds.push(Number(result.insertId));
  console.log(`✓ Woning: ${p.street} ${p.houseNumber}, ${p.city} (id: ${result.insertId})`);
}

// ── Demo inspection for first property ────────────────────────────────────────
const [inspResult] = await conn.execute(
  `INSERT INTO inspections (propertyId, type, status, inspectionDate, scoreInstallaties, scoreBouwkundig, scoreVeiligheid, scoreVochtVentilatie, scoreEnergie, totalScore, woningGrade, summary, createdAt, updatedAt)
   VALUES (?, 'nulmeting', 'afgerond', NOW(), 72, 65, 88, 58, 70, 71, 'B', 'Woning in redelijke staat. CV-ketel aan vervanging toe (2026). Dakgoten reinigen aanbevolen. Rookmelders aanwezig en werkend.', NOW(), NOW())`,
  [propertyIds[0]]
);
const inspectionId = Number(inspResult.insertId);
console.log(`✓ Inspectie aangemaakt voor woning 1 (id: ${inspectionId})`);

// ── Demo maintenance issues ────────────────────────────────────────────────────
const demoIssues = [
  { propertyId: propertyIds[0], title: "CV-ketel vervangen", description: "Ketel is 18 jaar oud en aan het einde van zijn levensduur", category: "Installaties", priority: "hoog", status: "open", estimatedCost: 3200 },
  { propertyId: propertyIds[0], title: "Dakgoten reinigen", description: "Dakgoten zijn verstopt met bladeren", category: "Bouwkundig", priority: "normaal", status: "gepland", estimatedCost: 180 },
  { propertyId: propertyIds[0], title: "Schilderwerk kozijnen", description: "Verf bladdert op meerdere kozijnen aan de voorzijde", category: "Bouwkundig", priority: "laag", status: "open", estimatedCost: 850 },
  { propertyId: propertyIds[3], title: "Vochtplek badkamer", description: "Vochtplek zichtbaar in hoek van badkamer, mogelijk lekkage", category: "Vocht & Ventilatie", priority: "urgent", status: "open", estimatedCost: 1500 },
];

for (const issue of demoIssues) {
  await conn.execute(
    `INSERT INTO maintenanceIssues (propertyId, title, description, category, priority, status, estimatedCost, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [issue.propertyId, issue.title, issue.description, issue.category, issue.priority, issue.status, issue.estimatedCost || null]
  );
}
console.log(`✓ ${demoIssues.length} onderhoudspunten aangemaakt`);

// ── Demo planning ─────────────────────────────────────────────────────────────
const demoPlanning = [
  { propertyId: propertyIds[0], title: "CV-ketel vervangen", category: "Installaties", plannedYear: 2026, horizon: "1jaar", estimatedCost: 3200 },
  { propertyId: propertyIds[0], title: "Dakbedekking vernieuwen", category: "Bouwkundig", plannedYear: 2028, horizon: "3jaar", estimatedCost: 8500 },
  { propertyId: propertyIds[0], title: "Badkamer renovatie", category: "Sanitair", plannedYear: 2030, horizon: "5jaar", estimatedCost: 12000 },
  { propertyId: propertyIds[1], title: "Zonnepanelen plaatsen", category: "Energie", plannedYear: 2025, horizon: "1jaar", estimatedCost: 6500 },
];

for (const p of demoPlanning) {
  await conn.execute(
    `INSERT INTO maintenancePlanning (propertyId, title, category, plannedYear, horizon, estimatedCost, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [p.propertyId, p.title, p.category, p.plannedYear, p.horizon, p.estimatedCost || null]
  );
}
console.log(`✓ ${demoPlanning.length} planningspunten aangemaakt`);

await conn.end();
console.log("\n✅ Demo data succesvol geladen!");
console.log("\n📋 Overzicht:");
console.log(`   - ${demoCustomers.length} klanten`);
console.log(`   - ${demoProperties.length} woningen`);
console.log(`   - 1 afgeronde 0-meting (Kerkstraat 12, Amsterdam)`);
console.log(`   - ${demoIssues.length} onderhoudspunten`);
console.log(`   - ${demoPlanning.length} planningspunten`);

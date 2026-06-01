import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await createConnection(DB_URL);

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NULL DEFAULT NULL,
  name VARCHAR(200) NOT NULL DEFAULT '',
  email VARCHAR(320) NOT NULL DEFAULT '',
  loginMethod VARCHAR(64) NULL,
  passwordHash VARCHAR(255) NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  type ENUM('particulier','bedrijf','vastgoed') NOT NULL DEFAULT 'particulier',
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  companyName VARCHAR(200),
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(30),
  notes TEXT,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy INT,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  street VARCHAR(200) NOT NULL,
  houseNumber VARCHAR(20) NOT NULL,
  postalCode VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  buildYear INT,
  propertyType ENUM('tussenwoning','hoekwoning','vrijstaand','appartement','bedrijfspand','overig') DEFAULT 'tussenwoning',
  surfaceM2 INT,
  residents INT,
  energyLabel ENUM('A+++','A++','A+','A','B','C','D','E','F','G'),
  subscriptionType ENUM('basis','plus','premium','vve','verhuur') DEFAULT 'basis',
  subscriptionActive BOOLEAN NOT NULL DEFAULT TRUE,
  lastInspectionDate TIMESTAMP NULL,
  nextInspectionDate TIMESTAMP NULL,
  photoUrl TEXT,
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS inspections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  performedBy INT,
  type ENUM('nulmeting','jaarlijks','tussentijds','calamiteit') NOT NULL DEFAULT 'nulmeting',
  status ENUM('concept','in_uitvoering','afgerond') NOT NULL DEFAULT 'concept',
  inspectionDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  summary TEXT,
  scoreInstallaties INT,
  scoreBouwkundig INT,
  scoreVeiligheid INT,
  scoreVochtVentilatie INT,
  scoreEnergie INT,
  totalScore INT,
  woningGrade ENUM('A','B','C','D','E'),
  pdfUrl TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id),
  FOREIGN KEY (performedBy) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inspectionItems (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inspectionId INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  question TEXT NOT NULL,
  answer ENUM('goed','aandacht','urgent','nvt','onbekend') DEFAULT 'onbekend',
  notes TEXT,
  photoUrl TEXT,
  sortOrder INT DEFAULT 0,
  FOREIGN KEY (inspectionId) REFERENCES inspections(id)
);

CREATE TABLE IF NOT EXISTS maintenanceIssues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  inspectionId INT,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority ENUM('laag','normaal','hoog','urgent') NOT NULL DEFAULT 'normaal',
  status ENUM('open','in_behandeling','gepland','afgerond') NOT NULL DEFAULT 'open',
  dueDate TIMESTAMP NULL,
  resolvedAt TIMESTAMP NULL,
  estimatedCost FLOAT,
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id),
  FOREIGN KEY (inspectionId) REFERENCES inspections(id)
);

CREATE TABLE IF NOT EXISTS maintenancePlanning (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  plannedYear INT,
  horizon ENUM('1jaar','3jaar','5jaar','10jaar','mjop') DEFAULT '3jaar',
  estimatedCost FLOAT,
  status ENUM('gepland','uitgevoerd','uitgesteld') NOT NULL DEFAULT 'gepland',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT,
  inspectionId INT,
  type ENUM('rapport','offerte','factuur','keuring','foto','overig') DEFAULT 'overig',
  title VARCHAR(300) NOT NULL,
  fileUrl TEXT NOT NULL,
  fileKey TEXT,
  mimeType VARCHAR(100),
  uploadedBy INT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id),
  FOREIGN KEY (inspectionId) REFERENCES inspections(id),
  FOREIGN KEY (uploadedBy) REFERENCES users(id)
);
`;

const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    if (match) console.log(`✓ Table ${match[1]} ready`);
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
    console.error(`  Statement: ${stmt.substring(0, 80)}...`);
  }
}

await conn.end();
console.log("\n✅ Migration complete");

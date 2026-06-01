/**
 * Create the first admin account for MijnComfortabel.
 * Usage: node scripts/create-admin.mjs
 *
 * Reads DATABASE_URL from environment.
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set");
  process.exit(1);
}

const ADMIN_NAME = "Comfortabel Admin";
const ADMIN_EMAIL = "admin@comfortabel.nl";
const ADMIN_PASSWORD = "Comfortabel2025!";

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Check if admin already exists
    const [existing] = await connection.execute(
      "SELECT id, email FROM users WHERE email = ?",
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      console.log(`✓ Admin account already exists: ${ADMIN_EMAIL} (id: ${existing[0].id})`);
      console.log("  To reset password, delete the user and re-run this script.");
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    // Insert admin user
    const [result] = await connection.execute(
      `INSERT INTO users (name, email, passwordHash, role, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, 'admin', 1, NOW(), NOW())`,
      [ADMIN_NAME, ADMIN_EMAIL, passwordHash]
    );

    console.log(`✓ Admin account created successfully!`);
    console.log(`  ID:       ${result.insertId}`);
    console.log(`  Naam:     ${ADMIN_NAME}`);
    console.log(`  E-mail:   ${ADMIN_EMAIL}`);
    console.log(`  Wachtwoord: ${ADMIN_PASSWORD}`);
    console.log(``);
    console.log(`  ⚠️  Wijzig het wachtwoord na de eerste login!`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, name, email, role, isActive, LENGTH(passwordHash) as hashLen FROM users ORDER BY id"
);
console.table(rows);
await conn.end();

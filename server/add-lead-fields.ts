/**
 * Migración surgical e idempotente: añade las columnas de atribución/conversión
 * a la tabla users. Aditivo y nullable — no toca datos existentes.
 *
 *   tsx --env-file=.env server/add-lead-fields.ts
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_source text;`);
    console.log("  ✓ users.lead_source");
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS converted_to_customer_at timestamp;`);
    console.log("  ✓ users.converted_to_customer_at");

    const check = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'users' AND column_name IN ('lead_source', 'converted_to_customer_at')`,
    );
    console.log(`\n✅ Columnas presentes: ${check.rows.map((r: any) => r.column_name).join(", ")}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

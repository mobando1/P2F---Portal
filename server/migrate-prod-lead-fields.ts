/**
 * One-off: añade users.lead_source / converted_to_customer_at a la base REAL de la app.
 * Se ejecuta con `railway run` para usar el DATABASE_URL del servicio.
 * GUARDIA: aborta si la base no tiene `email_verified` (señal de que NO es la base de la app).
 */
import pg from "pg";

const url = process.env.DATABASE_URL || "";
const publicUrl = process.env.DATABASE_PUBLIC_URL || "";
const conn = url.includes(".railway.internal") && publicUrl ? publicUrl : url;

if (!conn) {
  console.error("No DATABASE_URL disponible");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const guard = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified'`,
    );
    if (guard.rows.length === 0) {
      console.error("ABORT: 'email_verified' no existe → NO es la base de la app. No se altera nada.");
      process.exit(2);
    }
    const count = await client.query(`SELECT count(*)::int AS n FROM users`);
    console.log(`DB verificada (email_verified presente). users = ${count.rows[0].n}`);

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_source text;`);
    console.log("  ✓ lead_source");
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS converted_to_customer_at timestamp;`);
    console.log("  ✓ converted_to_customer_at");

    const check = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name='users' AND column_name IN ('lead_source','converted_to_customer_at')`,
    );
    console.log(`✅ Columnas presentes: ${check.rows.map((r: any) => r.column_name).join(", ")}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error("Failed:", e?.message || e);
  process.exit(1);
});

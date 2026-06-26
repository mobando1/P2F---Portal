/**
 * Lista / crea / resetea usuarios admin.
 *
 *   npm run admin:reset                              → lista los admins actuales
 *   npm run admin:reset -- <email> <password>        → crea o resetea ese admin
 *
 * Ej: npm run admin:reset -- admin@passport2fluency.com MiClaveSegura123
 *
 * Las contraseñas se guardan hasheadas con bcrypt en users.password — no se
 * pueden recuperar en texto plano, solo reescribir con este script.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const client = await pool.connect();
  try {
    const admins = await client.query(
      `SELECT id, email, username FROM users WHERE user_type = 'admin' ORDER BY id`,
    );
    console.log(`\nAdmins actuales (${admins.rows.length}):`);
    admins.rows.forEach((r: any) => console.log(`  - ${r.email}  (username: ${r.username}, id: ${r.id})`));

    if (!email || !password) {
      console.log("\nPara crear o resetear un admin:");
      console.log("  npm run admin:reset -- <email> <password>");
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users SET password = $1, user_type = 'admin', email_verified = true WHERE email = $2`,
        [hashed, email],
      );
      console.log(`\n✅ Contraseña actualizada y rol 'admin' asignado a ${email}`);
    } else {
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_") + "_admin";
      await client.query(
        `INSERT INTO users (username, email, password, first_name, last_name, user_type, trial_completed, class_credits, level, email_verified)
         VALUES ($1, $2, $3, $4, $5, 'admin', false, 0, 'A1', true)`,
        [username, email, hashed, "Admin", "P2F"],
      );
      console.log(`\n✅ Admin creado: ${email}`);
    }
    console.log(`Inicia sesión con: ${email} / (la contraseña que ingresaste)`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

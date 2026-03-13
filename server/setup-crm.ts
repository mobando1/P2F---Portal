import { Pool, neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
  const client = await pool.connect();
  try {
    // Create CRM tables if they don't exist
    console.log("Creating CRM tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        admin_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("  ✓ crm_notes");

    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        assigned_to INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMP NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("  ✓ crm_tasks");

    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_tags (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#1C7BB1',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("  ✓ crm_tags");

    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_user_tags (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        tag_id INTEGER NOT NULL REFERENCES crm_tags(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("  ✓ crm_user_tags");

    // Create admin user
    console.log("\nCreating admin user...");
    const adminPassword = await bcrypt.hash("admin123", 12);

    const result = await client.query(
      `INSERT INTO users (username, email, password, first_name, last_name, user_type, trial_completed, class_credits, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ["admin_p2f", "admin@p2f.com", adminPassword, "Admin", "P2F", "admin", false, 0, "A1"]
    );

    if (result.rows.length > 0) {
      console.log(`  ✓ Admin user created (id: ${result.rows[0].id})`);
    } else {
      console.log("  ✓ Admin user already exists");
    }

    console.log("\n✅ Setup complete! Login with: admin@p2f.com / admin123");
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(console.error);

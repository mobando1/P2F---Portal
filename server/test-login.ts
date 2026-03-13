import { Pool, neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testLogin() {
  const client = await pool.connect();
  try {
    // Check if session table exists
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log("Tables in database:", tables.rows.map(r => r.table_name));

    // Check admin user
    const admin = await client.query(`SELECT id, email, password, user_type FROM users WHERE email = 'admin@p2f.com'`);
    console.log("\nAdmin user:", admin.rows.length > 0 ? { id: admin.rows[0].id, email: admin.rows[0].email, userType: admin.rows[0].user_type, hasPassword: !!admin.rows[0].password } : "NOT FOUND");

    if (admin.rows.length > 0) {
      const match = await bcrypt.compare("admin123", admin.rows[0].password);
      console.log("Password 'admin123' matches:", match);
    }

    // Check test user
    const testUser = await client.query(`SELECT id, email, password, user_type FROM users WHERE email = 'juan.sanchez@example.com'`);
    console.log("\nTest user:", testUser.rows.length > 0 ? { id: testUser.rows[0].id, email: testUser.rows[0].email, userType: testUser.rows[0].user_type } : "NOT FOUND");

    if (testUser.rows.length > 0) {
      const match = await bcrypt.compare("password123", testUser.rows[0].password);
      console.log("Password 'password123' matches:", match);
    }

    // List all users
    const allUsers = await client.query(`SELECT id, email, user_type FROM users ORDER BY id`);
    console.log("\nAll users:", allUsers.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

testLogin().catch(console.error);

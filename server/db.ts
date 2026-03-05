import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Only create pool/db when DATABASE_URL is available
// This file is only imported by DatabaseStorage, which is only used when DATABASE_URL exists
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL not set - database features unavailable, using in-memory storage");
}

export const pool = connectionString ? new Pool({ connectionString }) : null;
export const db = pool ? drizzle({ client: pool, schema }) : null;

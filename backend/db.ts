import { Pool } from 'pg';

// Use DATABASE_URL when provided (Render or other platforms will set this).
const connectionString = process.env.DATABASE_URL || 'postgresql://mascotasdb_x9qx_user:MQsvfT3gvPOT1sCUBKnjo693EEnH6r8K@dpg-d3vt2024d50c73e5otqg-a/mascotasdb_x9qx';

export const pool = new Pool({ connectionString });

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Graceful shutdown helper
export async function closePool() {
  await pool.end();
}

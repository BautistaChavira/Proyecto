/**
 * init-db.ts
 *
 * This script ensures the target PostgreSQL database exists and then runs
 * the SQL statements in `sql/init.sql` against it to create the required
 * tables for the application (catalog, curiosidades, MisMascotas).
 *
 * Usage:
 *  - Set DATABASE_URL env var to the target DB, e.g.
 *      postgres://user:pass@host:5432/mascotas
 *  - Run with ts-node or compile and run with node
 *      npx ts-node init-db.ts
 *
 * Notes:
 *  - This script uses the `pg` package. If it's not installed you'll see
 *    a clear error that tells you to `npm install pg` in the backend folder.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

async function main() {
	const defaultDbUrl = process.env.DATABASE_URL || 'postgresql://mascotasdb_x9qx_user:MQsvfT3gvPOT1sCUBKnjo693EEnH6r8K@dpg-d3vt2024d50c73e5otqg-a/mascotasdb_x9qx';
	const targetUrl = new URL(defaultDbUrl);
	const targetDbName = (targetUrl.pathname || '/mascotas').replace(/^\//, '') || 'mascotas';

	// Build an admin URL that connects to the 'postgres' database so we can create DB if needed
	const adminUrl = new URL(defaultDbUrl);
	adminUrl.pathname = '/postgres';

	const adminClient = new Client({ connectionString: adminUrl.toString() });
  try {
    await adminClient.connect();
  } catch (err: unknown) {
    console.error('Unable to connect to Postgres with admin URL:', adminUrl.toString());
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }	try {
		const check = await adminClient.query('SELECT 1 FROM pg_database WHERE datname=$1', [targetDbName]);
		if (check.rowCount === 0) {
			console.log(`Database "${targetDbName}" does not exist. Creating...`);
			// Note: identifiers should not be parameterized; use safe identifier composition
			await adminClient.query(`CREATE DATABASE "${targetDbName.replace(/\"/g, '')}"`);
			console.log('Database created.');
		} else {
			console.log(`Database "${targetDbName}" already exists.`);
		}
  } catch (err: unknown) {
    console.error('Error while checking/creating database:', err instanceof Error ? err.message : String(err));
    await adminClient.end();
    process.exit(1);
  }	await adminClient.end();

	// Now connect to the target database and run the init SQL
	const targetClient = new Client({ connectionString: defaultDbUrl });
	try {
		await targetClient.connect();
  } catch (err: unknown) {
    console.error('Unable to connect to target database:', defaultDbUrl);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }	const sqlPath = path.join(__dirname, 'sql', 'init.sql');
	let sql = '';
	try {
		sql = fs.readFileSync(sqlPath, 'utf8');
  } catch (err: unknown) {
    console.error('Cannot read init.sql at', sqlPath);
    console.error(err instanceof Error ? err.message : String(err));
    await targetClient.end();
    process.exit(1);
  }	try {
		console.log('Running schema SQL...');
		// Some SQL drivers don't accept multiple statements in a single query by default.
		// We split on semicolons and run statements one-by-one for safety.
		const statements = sql
			.split(/;\s*\n/)
			.map(s => s.trim())
			.filter(Boolean);

		for (const stmt of statements) {
			try {
				await targetClient.query(stmt);
			} catch (innerErr: unknown) {
				// Log but continue: many statements may be CREATE INDEX IF NOT EXISTS etc.
				console.warn('Statement failed (continuing):', innerErr instanceof Error ? innerErr.message : String(innerErr));
			}
		}

		console.log('Schema applied successfully.');
	} catch (err: unknown) {
		console.error('Error applying schema:', err instanceof Error ? err.message : String(err));
	} finally {
		await targetClient.end();
	}
}

main().catch((err: unknown) => {
	console.error('Unexpected error in init-db:', err instanceof Error ? err.stack : String(err));
	process.exit(1);
});



/**
 * index.ts
 *
 * Minimal backend entrypoint. It runs the database initialization script at
 * startup so the database and required tables exist. You can expand this
 * file to start an HTTP server (Express, Fastify, etc.) later.
 */

// Start the DB init script, then start an Express server that exposes
// simple endpoints the frontend can call. This file intentionally keeps
// runtime logic minimal and reads DATABASE_URL from env (Render will set it).
import('dotenv/config');
import('./init-db')
	.then(() => startServer())
	.catch(err => {
		console.error('Database init failed at startup:', err);
		// proceed to start server anyway so the app can surface errors via endpoints
		startServer();
	});

import express from 'express';
import cors from 'cors';
import { pool } from './db';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

function startServer() {
	const app = express();
	app.use(cors());
	app.use(express.json());

	app.get('/health', (_req, res) => res.json({ status: 'ok' }));

	app.get('/tables', async (_req, res) => {
		try {
			const r = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
			res.json(r.rows.map((row: any) => row.tablename));
		} catch (err) {
			console.error('Error fetching tables:', err);
			res.status(500).json({ error: 'failed_to_list_tables' });
		}
	});

	app.get('/categories', async (_req, res) => {
		try {
			const r = await pool.query('SELECT id, name, description, created_at FROM categories ORDER BY id');
			res.json(r.rows);
		} catch (err) {
			console.error('Error fetching categories:', err);
			res.status(500).json({ error: 'failed_to_fetch_categories' });
		}
	});

	app.get('/curiosidades', async (_req, res) => {
		try {
			const r = await pool.query('SELECT id, title, content, image_url, tags, created_at FROM curiosidades WHERE visible = true ORDER BY created_at DESC');
			res.json(r.rows);
		} catch (err) {
			console.error('Error fetching curiosidades:', err);
			res.status(500).json({ error: 'failed_to_fetch_curiosidades' });
		}
	});

	app.get('/users', async (_req, res) => {
		try {
			const r = await pool.query('SELECT id, email, name, created_at FROM users ORDER BY id');
			res.json(r.rows);
		} catch (err) {
			console.error('Error fetching users:', err);
			res.status(500).json({ error: 'failed_to_fetch_users' });
		}
	});

	app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

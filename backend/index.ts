/**
 * index.ts
 *
 * Minimal backend entrypoint. It runs the database initialization script at
 * startup so the database and required tables exist. You can expand this
 * file to start an HTTP server (Express, Fastify, etc.) later.
 */

// Run DB initialization (non-blocking); errors are logged inside the script
import('./init-db')
	.then(() => console.log('Database init script executed (see logs for details).'))
	.catch(err => console.error('Database init failed at startup:', err));

// Placeholder: start server here in the future.
console.log('Backend initialized.');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import initDb from './init-db';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const app = express();
let server: ReturnType<typeof app.listen>;

// Función principal que inicia la aplicación
async function main() {
  try {
    // Inicializar la base de datos
    await initDb();
    console.log('Database initialization completed successfully');
    
    // Iniciar el servidor Express
    startServer();
  } catch (err) {
    console.error('Error during startup:', err);
    // Si hay un error fatal durante la inicialización, intentamos iniciar el servidor
    // de todos modos para poder exponer el estado del error a través de los endpoints
    startServer();
  }
}

// Manejar señales de terminación para cerrar limpiamente
process.on('SIGTERM', () => {
  console.info('SIGTERM recibido. Iniciando shutdown graceful...');
  shutdown();
});

process.on('SIGINT', () => {
  console.info('SIGINT recibido. Iniciando shutdown graceful...');
  shutdown();
});

// Iniciar la aplicación
main().catch(err => {
  console.error('Error fatal durante el inicio de la aplicación:', err);
  process.exit(1);
});

// Función de shutdown graceful
async function shutdown() {
  console.log('Iniciando shutdown del servidor...');
  
  // Cerrar el servidor HTTP primero
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('Servidor HTTP cerrado.');
        resolve();
      });
    });
  }

  // Cerrar el pool de base de datos
  try {
    await pool.end();
    console.log('Conexiones de base de datos cerradas.');
  } catch (err) {
    console.error('Error cerrando conexiones de base de datos:', err);
  }

  // Dar tiempo para que se completen las operaciones pendientes
  setTimeout(() => {
    console.log('Shutdown completado.');
    process.exit(0);
  }, 1500);
}

function startServer() {
	const app = express();
	// Configuración de CORS para permitir peticiones del frontend
	// FRONTEND_URL puede ser una lista separada por comas de orígenes permitidos.
	const allowedOrigins = (process.env.FRONTEND_URL || 'https://proyecto-tjb5.onrender.com,http://localhost:5173')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);

	// Añadimos Vary: Origin para cachés intermediarios
	app.use((req, res, next) => {
		res.header('Vary', 'Origin');
		next();
	});

	const corsOptions = {
		origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
			// allow server-to-server or tools with no origin
			if (!origin) return callback(null, true);
			if (allowedOrigins.includes(origin)) return callback(null, true);
			return callback(new Error('Not allowed by CORS'));
		},
		credentials: true,
		optionsSuccessStatus: 200
	};

	app.use(cors(corsOptions));
	// Explicit preflight handling
	app.options('*', cors(corsOptions));
	
	// Middleware para parsear JSON y aumentar el límite si es necesario
	app.use(express.json({ limit: '10mb' }));

	// Simple request logger to help debug 404/CORS issues in production
	app.use((req, _res, next) => {
		console.log(`[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl} Origin=${req.headers.origin}`);
		next();
	});

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

	// API-prefixed endpoints for frontend compatibility
	app.get('/api/categories', async (_req, res) => {
		try {
			const r = await pool.query('SELECT id, name, description, created_at FROM categories ORDER BY id');
			res.json(r.rows);
		} catch (err) {
			console.error('Error fetching categories:', err);
			res.status(500).json({ error: 'failed_to_fetch_categories' });
		}
	});

	// Breeds endpoint: returns breeds from DB (optionally filter by category name)
	app.get('/api/breeds', async (req, res) => {
		try {
			const category = req.query.category ? String(req.query.category) : undefined;
			let r;
			if (category) {
				r = await pool.query(
				`SELECT b.id, b.name, b.scientific_name, b.description, b.default_image_url, b.category_id, c.name AS category_name
				 FROM breeds b LEFT JOIN categories c ON b.category_id = c.id
				 WHERE c.name = $1
				 ORDER BY b.name`,
				[category]
				);
			} else {
				r = await pool.query(
					`SELECT b.id, b.name, b.scientific_name, b.description, b.default_image_url, b.category_id, c.name AS category_name
					 FROM breeds b LEFT JOIN categories c ON b.category_id = c.id
					 ORDER BY b.name`
				);
			}
			res.json(r.rows);
		} catch (err) {
			console.error('Error fetching breeds:', err);
			res.status(500).json({ error: 'failed_to_fetch_breeds' });
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

	// 404 fallback (returns JSON so frontend can handle it)
	app.use((_req, res) => {
		res.status(404).json({ error: 'not_found' });
	});

	// Generic error handler
	app.use((err: any, _req: any, res: any, _next: any) => {
		console.error('Unhandled error in request handler:', err && err.stack ? err.stack : err);
		res.status(500).json({ error: 'internal_error' });
	});

	server = app.listen(PORT, () => {
	  console.log(`Server running at http://localhost:${PORT}`);
	  console.log('Press Ctrl+C to stop');
	});
}

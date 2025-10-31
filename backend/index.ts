import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import initDb from './init-db';
import multer from 'multer';
import bcrypt from 'bcrypt';

import type { QueryResult } from 'pg'
import { identifyImageFromBuffer, AiError } from './ai/aiClient'


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
	const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
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

	//Para lo de la IA
	app.post('/api/identify', upload.single('image'), async (req, res) => {
		try {
			const file = req.file;
			if (!file) return res.status(400).json({ error: 'no_image' });

			const result = await identifyImageFromBuffer(file.buffer, file.originalname, file.mimetype);

			// devolver únicamente el nombre de la raza en JSON
			return res.json({ breed: result.breed });
		} catch (err) {
			if (err instanceof AiError) {
				console.error('AI error:', err.message, err.code);
				// Mapear errores a status codes según la clase
				const status = err.code === 'config' ? 500 : err.code === 'provider' ? 502 : 500;
				return res.status(status).json({ error: err.code ?? 'ai_error' });
			}
			console.error('Unexpected identify error:', err);
			return res.status(500).json({ error: 'identify_failed' });
		}
	});


	// Detailed request logger for debugging
	app.use((req, res, next) => {
		const startTime = Date.now();
		const requestId = Math.random().toString(36).substring(7);

		console.log(`[${requestId}] ====== Request Started ======`);
		console.log(`[${requestId}] ${new Date().toISOString()}`);
		console.log(`[${requestId}] ${req.method} ${req.originalUrl}`);
		console.log(`[${requestId}] Origin: ${req.headers.origin || 'No origin'}`);
		console.log(`[${requestId}] Headers:`, req.headers);

		if (Object.keys(req.query).length > 0) {
			console.log(`[${requestId}] Query params:`, req.query);
		}

		if (req.body && Object.keys(req.body).length > 0) {
			console.log(`[${requestId}] Body:`, req.body);
		}

		// Capturar la respuesta
		const originalSend = res.send;
		res.send = function (body: any) {
			const endTime = Date.now();
			console.log(`[${requestId}] Status: ${res.statusCode}`);
			console.log(`[${requestId}] Response time: ${endTime - startTime}ms`);
			console.log(`[${requestId}] ====== Request Ended ======\n`);
			return originalSend.call(this, body);
		};

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

	app.post('/api/login', async (req, res) => {
		try {
			const { username, password_hash_client } = req.body as { username?: string; password_hash_client?: string }

			// Validaciones iniciales
			if (!username || !password_hash_client) {
				return res.status(400).json({ error: 'missing_username_or_password' })
			}
			if (typeof username !== 'string' || username.length < 3 || username.length > 255) {
				return res.status(400).json({ error: 'invalid_username' })
			}
			if (typeof password_hash_client !== 'string' || !/^[a-f0-9]{64}$/i.test(password_hash_client)) {
				return res.status(400).json({ error: 'invalid_password_hash' })
			}

			// Normalizar email/username
			const email = username.trim().toLowerCase()

			// Buscar usuario en la base de datos
			const result = (await pool.query(
				'SELECT id, email, password_hash, name FROM users WHERE email = $1 LIMIT 1',
				[email]
			)) as QueryResult | null

			// Comprobación defensiva
			if (!result || typeof result.rowCount !== 'number') {
				console.warn('Unexpected query result for login check', result)
				return res.status(500).json({ error: 'login_query_failed' })
			}
			if (result.rowCount === 0) {
				return res.status(401).json({ error: 'invalid_credentials' })
			}

			const user = result.rows[0]
			const storedHash = user.password_hash

			// Recombinar el hash cliente con el pepper y comparar con bcrypt
			const pepper = process.env.PEPPER_SECRET || ''
			const combined = password_hash_client + pepper
			const match = await bcrypt.compare(combined, storedHash)

			if (!match) {
				return res.status(401).json({ error: 'invalid_credentials' })
			}

			// Autenticación exitosa
			return res.json({ name: user.email })
		} catch (err) {
			console.error('Login error:', err)
			return res.status(500).json({ error: 'login_failed' })
		}
	})

	app.post('/api/register', async (req, res) => {
		try {
			const { username, password_hash_client } = req.body as { username?: string; password_hash_client?: string }

			// Validaciones iniciales
			if (!username || !password_hash_client) {
				return res.status(400).json({ error: 'missing_username_or_password' })
			}
			if (typeof username !== 'string' || username.length < 3 || username.length > 255) {
				return res.status(400).json({ error: 'invalid_username' })
			}
			if (typeof password_hash_client !== 'string' || !/^[a-f0-9]{64}$/i.test(password_hash_client)) {
				return res.status(400).json({ error: 'invalid_password_hash' })
			}

			// Normalizar email/username
			const email = username.trim().toLowerCase()

			// Ejecutar consulta A CONTINUACIÓN (ya tenemos email)
			const existing = (await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])) as QueryResult | null

			// Comprobación defensiva
			if (!existing || typeof existing.rowCount !== 'number') {
				console.warn('Unexpected query result for existing user check', existing)
				// seguimos adelante como si no existiera; podrías preferir devolver 500 aquí
			} else if (existing.rowCount > 0) {
				return res.status(409).json({ error: 'user_already_exists' })
			}

			// Re-hashear en servidor con pepper + bcrypt
			const pepper = process.env.PEPPER_SECRET || ''
			const combined = password_hash_client + pepper
			const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 12
			const serverHash = await bcrypt.hash(combined, saltRounds)

			// Insertar nuevo usuario
			const insert = (await pool.query(
				`INSERT INTO users (email, password_hash, name, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email, name`,
				[email, serverHash, null]
			)) as QueryResult

			const newUser = insert.rows[0]
			return res.status(201).json({ name: newUser.email })
		} catch (err) {
			console.error('Register error:', err)
			return res.status(500).json({ error: 'register_failed' })
		}
	})

	app.post('/api/analyze-photo', async (req, res) => {
  try {
    console.log('Petición recibida en /api/analyze-photo')

    const { image_base64 } = req.body as { image_base64?: string }
    console.log('image_base64 recibido:', image_base64?.slice(0, 50) + '...')

    // Validación básica
    if (!image_base64 || typeof image_base64 !== 'string' || !image_base64.startsWith('data:image/')) {
      console.warn('image_base64 inválido o ausente')
      return res.status(400).json({ error: 'invalid_image_data' })
    }

    // Extraer metadata del base64
    const match = image_base64.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) {
      console.warn('Formato base64 inválido')
      return res.status(400).json({ error: 'invalid_base64_format' })
    }

    const contentType = match[1] // e.g. image/jpeg
    const base64Data = match[2]
    console.log('contentType extraído:', contentType)

    const buffer = Buffer.from(base64Data, 'base64')
    console.log('Buffer generado. Tamaño:', buffer.length)

    // Validación de tamaño mínimo
    if (buffer.length < 10000) {
      console.warn('Buffer demasiado pequeño para ser imagen válida')
      return res.status(400).json({ error: 'image_too_small' })
    }

    const filename = `upload.${contentType.split('/')[1]}`
    console.log(' Nombre de archivo simulado:', filename)

    console.log('Enviando imagen a IA...')
    const result = await identifyImageFromBuffer(buffer, filename, contentType)
    console.log('Resultado IA recibido:', result)

    return res.json({
      result: result.breed,
      confidence: result.confidence,
    })
  } catch (err) {
    console.error('Error atrapado en /api/analyze-photo')

    if (err instanceof AiError) {
      console.error('AiError:', err.message, '| Código:', err.code)
      return res.status(502).json({ error: err.code || 'ai_error', message: err.message })
    }

    console.error('Error inesperado:', err instanceof Error ? err.message : String(err))
    return res.status(500).json({
      error: 'analyze_failed',
      message: err instanceof Error ? err.message : String(err)
    })
  }
})

	// API-prefixed endpoints for frontend compatibility
	app.get('/api/categories', async (_req, res) => {
		const startQuery = Date.now();
		try {
			console.log('[Categories] Executing query...');
			const r = await pool.query('SELECT id, name, description, created_at FROM categories ORDER BY id');
			const queryTime = Date.now() - startQuery;
			console.log(`[Categories] Query successful - ${r.rows.length} categories found in ${queryTime}ms`);
			res.json(r.rows);
		} catch (err) {
			console.error('[Categories] Error fetching categories:');
			console.error('Query time:', Date.now() - startQuery, 'ms');
			console.error('Error details:', err);
			if (err instanceof Error) {
				console.error('Stack:', err.stack);
			}
			res.status(500).json({ error: 'failed_to_fetch_categories' });
		}
	});

	// Breeds endpoint: returns breeds from DB (optionally filter by category name)
	app.get('/api/breeds', async (req, res) => {
		const startQuery = Date.now();
		try {
			const category = req.query.category ? String(req.query.category) : undefined;
			console.log('[Breeds] Executing query...', category ? `(filtered by category: ${category})` : '(all breeds)');

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

			const queryTime = Date.now() - startQuery;
			console.log(`[Breeds] Query successful - ${r.rows.length} breeds found in ${queryTime}ms`);
			if (category) {
				console.log(`[Breeds] Filtered by category "${category}"`);
			}

			res.json(r.rows);
		} catch (err) {
			console.error('[Breeds] Error fetching breeds:');
			console.error('Query time:', Date.now() - startQuery, 'ms');
			if (req.query.category) {
				console.error('Requested category:', req.query.category);
			}
			console.error('Error details:', err);
			if (err instanceof Error) {
				console.error('Stack:', err.stack);
			}
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

	// Enhanced error handler
	app.use((err: any, req: any, res: any, _next: any) => {
		const errorId = Math.random().toString(36).substring(7);

		console.error(`[${errorId}] ====== Error Detected ======`);
		console.error(`[${errorId}] ${new Date().toISOString()}`);
		console.error(`[${errorId}] ${req.method} ${req.originalUrl}`);
		console.error(`[${errorId}] Error name:`, err.name);
		console.error(`[${errorId}] Error message:`, err.message);

		if (err.stack) {
			console.error(`[${errorId}] Stack trace:`);
			console.error(err.stack);
		}

		if (err.code) {
			console.error(`[${errorId}] Error code:`, err.code);
		}

		console.error(`[${errorId}] ====== Error End ======\n`);

		res.status(500).json({
			error: 'internal_error',
			errorId: errorId // Incluimos el ID del error para poder rastrearlo en los logs
		});
	});

	server = app.listen(PORT, () => {
		console.log(`Server running at http://localhost:${PORT}`);
		console.log('Press Ctrl+C to stop');
	});
}

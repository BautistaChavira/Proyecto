import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import initDb from './init-db';
import multer from 'multer';
import bcrypt from 'bcrypt';

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)


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
			const { username, password_hash_client } = req.body as {
				username?: string
				password_hash_client?: string
			}

			console.log('[LOGIN] Datos recibidos:', { username, password_hash_client })

			// Validaciones iniciales
			if (!username || !password_hash_client) {
				console.warn('[LOGIN] Faltan campos obligatorios')
				return res.status(400).json({ error: 'missing_fields' })
			}

			if (typeof username !== 'string' || username.length < 3 || username.length > 255) {
				console.warn('[LOGIN] Username inválido:', username)
				return res.status(400).json({ error: 'invalid_username' })
			}

			if (typeof password_hash_client !== 'string' || !/^[a-f0-9]{64}$/i.test(password_hash_client)) {
				console.warn('[LOGIN] Hash inválido:', password_hash_client)
				return res.status(400).json({ error: 'invalid_password_hash' })
			}

			const normalizedName = username.trim().toLowerCase()
			console.log('[LOGIN] Nombre normalizado:', normalizedName)

			// Buscar usuario por nombre
			const result = await pool.query(
				'SELECT id, name, password_hash FROM users WHERE LOWER(name) = $1 LIMIT 1',
				[normalizedName]
			)

			console.log('[LOGIN] Resultado de búsqueda de usuario:', result.rowCount)

			if (result.rowCount === 0) {
				console.warn('[LOGIN] Usuario no encontrado:', normalizedName)
				return res.status(401).json({ error: 'invalid_credentials' })
			}

			const user = result.rows[0]
			const storedHash = user.password_hash

			const pepper = process.env.PEPPER_SECRET || ''
			const combined = password_hash_client + pepper

			console.log('[LOGIN] Comparando hash con bcrypt...')
			const match = await bcrypt.compare(combined, storedHash)

			if (!match) {
				console.warn('[LOGIN] Contraseña incorrecta para usuario:', normalizedName)
				return res.status(401).json({ error: 'invalid_credentials' })
			}

			console.log('[LOGIN] Autenticación exitosa para:', user.name)
			return res.json({ id: user.id, name: user.name })
		} catch (err) {
			console.error('[LOGIN] Error inesperado:', err)
			return res.status(500).json({ error: 'login_failed' })
		}
	})

	app.post('/api/register', async (req, res) => {
		try {
			const { email, username, password_hash_client } = req.body as {
				email?: string
				username?: string
				password_hash_client?: string
			}

			console.log('[REGISTER] Datos recibidos:', { email, username, password_hash_client })

			// Validaciones iniciales
			if (!email || !username || !password_hash_client) {
				console.warn('[REGISTER] Faltan campos obligatorios')
				return res.status(400).json({ error: 'missing_fields' })
			}

			if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				console.warn('[REGISTER] Email inválido:', email)
				return res.status(400).json({ error: 'invalid_email' })
			}

			if (typeof username !== 'string' || username.length < 3 || username.length > 255) {
				console.warn('[REGISTER] Username inválido:', username)
				return res.status(400).json({ error: 'invalid_username' })
			}

			if (typeof password_hash_client !== 'string' || !/^[a-f0-9]{64}$/i.test(password_hash_client)) {
				console.warn('[REGISTER] Hash inválido:', password_hash_client)
				return res.status(400).json({ error: 'invalid_password_hash' })
			}

			const normalizedEmail = email.trim().toLowerCase()
			const normalizedName = username.trim()

			console.log('[REGISTER] Email normalizado:', normalizedEmail)
			console.log('[REGISTER] Nombre normalizado:', normalizedName)

			// Verificar si el correo ya existe
			const result = await pool.query(
				'SELECT id FROM users WHERE email = $1 LIMIT 1',
				[normalizedEmail]
			)

			console.log('[REGISTER] Resultado de búsqueda de email:', result.rowCount)

			if (result.rowCount === 0) {
				const pepper = process.env.PEPPER_SECRET || ''
				const combined = password_hash_client + pepper
				const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 12

				console.log('[REGISTER] Generando hash con bcrypt...')
				const serverHash = await bcrypt.hash(combined, saltRounds)
				console.log('[REGISTER] Hash generado')

				// Insertar nuevo usuario
				const insert = await pool.query(
					`INSERT INTO users (email, password_hash, name, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id, email, name`,
					[normalizedEmail, serverHash, normalizedName]
				)

				console.log('[REGISTER] Usuario insertado:', insert.rows[0])
				return res.status(201).json({ id: insert.rows[0].id, name: insert.rows[0].name })
			}

			console.warn('[REGISTER] Usuario ya existe:', normalizedEmail)
			return res.status(409).json({ error: 'user_already_exists' })
		} catch (err) {
			console.error('[REGISTER] Error inesperado:', err)
			return res.status(500).json({ error: 'register_failed' })
		}
	})

	//endpoints para manejar mascotas personales
	app.post('/api/save-pet', async (req, res) => {
		try {
			const { name, breed, description, user_id } = req.body as {
				name?: string
				breed?: string
				description?: string
				user_id?: number
			}

			console.log('[PETS] Datos recibidos:', { name, breed, description, user_id })

			// Validaciones básicas
			if (!name || !breed || !user_id) {
				console.warn('[PETS] Faltan campos obligatorios')
				return res.status(400).json({ error: 'missing_fields' })
			}

			if (typeof name !== 'string' || name.length < 2 || name.length > 255) {
				return res.status(400).json({ error: 'invalid_name' })
			}

			if (typeof breed !== 'string' || breed.length < 2 || breed.length > 255) {
				return res.status(400).json({ error: 'invalid_breed' })
			}

			if (typeof description !== 'string') {
				return res.status(400).json({ error: 'invalid_description' })
			}

			if (typeof user_id !== 'number' || user_id <= 0) {
				return res.status(400).json({ error: 'invalid_user_id' })
			}

			// Inserción en la base de datos
			const result = await pool.query(
				`INSERT INTO pets (name, breed, description, user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
				[name.trim(), breed.trim(), description.trim(), user_id]
			)

			console.log('[PETS] Mascota guardada con ID:', result.rows[0].id)
			return res.status(201).json({ success: true, pet_id: result.rows[0].id })
		} catch (err) {
			console.error('[PETS] Error al guardar mascota:', err)
			return res.status(500).json({ error: 'insert_failed' })
		}
	})

	app.post('/api/delete-pet', async (req, res) => {
  try {
    const { pet_id, user_id } = req.body as {
      pet_id?: number
      user_id?: number
    }

    console.log('[DELETE-PET] Datos recibidos:', { pet_id, user_id })

    // Validaciones iniciales
    if (!pet_id || !user_id) {
      console.warn('[DELETE-PET] Faltan campos obligatorios')
      return res.status(400).json({ error: 'missing_fields' })
    }

    if (typeof pet_id !== 'number' || typeof user_id !== 'number') {
      console.warn('[DELETE-PET] Tipos inválidos:', { pet_id, user_id })
      return res.status(400).json({ error: 'invalid_types' })
    }

    // Verificar que la mascota exista y pertenezca al usuario
    const check = await pool.query(
      'SELECT id FROM pets WHERE id = $1 AND user_id = $2 LIMIT 1',
      [pet_id, user_id]
    )

    console.log('[DELETE-PET] Resultado de búsqueda:', check.rowCount)

    if (check.rowCount === 0) {
      console.warn('[DELETE-PET] Mascota no encontrada o no pertenece al usuario')
      return res.status(404).json({ error: 'pet_not_found_or_unauthorized' })
    }

    // Eliminar la mascota
    await pool.query('DELETE FROM pets WHERE id = $1 AND user_id = $2', [pet_id, user_id])
    console.log('[DELETE-PET] Mascota eliminada:', pet_id)

    return res.status(204).send()
  } catch (err) {
    console.error('[DELETE-PET] Error inesperado:', err)
    return res.status(500).json({ error: 'delete_failed' })
  }
})

	//endpoint para obtener mis macotas
	app.get('/api/pets', async (req, res) => {
		try {
			const user_id = parseInt(req.query.user_id as string)

			if (!user_id || isNaN(user_id) || user_id <= 0) {
				console.warn('[GET /pets] user_id inválido:', req.query.user_id)
				return res.status(400).json({ error: 'invalid_user_id' })
			}

			const result = await pool.query(
				`SELECT id, name, breed, description FROM pets WHERE user_id = $1 ORDER BY id DESC`,
				[user_id]
			)

			console.log(`[GET /pets] Mascotas encontradas para usuario ${user_id}:`, result.rowCount)
			return res.json({ pets: result.rows })
		} catch (err) {
			console.error('[GET /pets] Error al obtener mascotas:', err)
			return res.status(500).json({ error: 'fetch_failed' })
		}
	})

	//endpoints de recuperar contraseña

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
				isPet: result.isPet,
				petStatus: result.status, // ← renombrado aquí para que no truene el pinche frontend mamon
				species: result.species ?? null
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

	app.get('/api/categories', async (_req, res) => {
		try {
			const r = await pool.query('SELECT id, name, description, created_at FROM categories ORDER BY id');
			res.json(r.rows);
		} catch (err) {
			console.error('Error fetching categories:', err);
			res.status(500).json({ error: 'failed_to_fetch_categories' });
		}
	});

	app.get('/api/curiosidades', async (_req, res) => {
        try {
            const query = `
      SELECT id, title, content, image_url, created_at
      FROM curiosidades
      WHERE visible = true
      ORDER BY created_at DESC
    `

            const result = await pool.query(query)

            if (!result || !result.rows) {
                console.warn('[CURIO] Consulta sin resultados o sin estructura válida')
                return res.status(500).json({
                    error: 'empty_response',
                    message: 'No se pudieron obtener las curiosidades.'
                })
            }

            if (result.rowCount === 0) {
                console.info('[CURIO] No hay curiosidades visibles en la base de datos')
                return res.status(200).json([]) // respuesta vacía pero válida
            }

            console.log(`[CURIO] Curiosidades obtenidas: ${result.rowCount}`)
            return res.json(result.rows)
        } catch (err) {
            console.error('[CURIO] Error inesperado al obtener curiosidades:', err)
            return res.status(500).json({
                error: 'failed_to_fetch_curiosidades',
                message: 'Ocurrió un error al obtener las curiosidades. Intenta de nuevo más tarde.'
            })
        }
    })

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

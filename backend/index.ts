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
	app.use(cors({
		origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:4173'],
		credentials: true
	}));
	
	// Middleware para parsear JSON y aumentar el límite si es necesario
	app.use(express.json({ limit: '10mb' }));

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

	server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
  });
}

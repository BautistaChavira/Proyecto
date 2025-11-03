import { Pool } from 'pg';

//URL para la api hacia la base de datos
const connectionString = process.env.DATABASE_URL || 'postgresql://mascotasdb_x9qx_user:MQsvfT3gvPOT1sCUBKnjo693EEnH6r8K@dpg-d3vt2024d50c73e5otqg-a/mascotasdb_x9qx';

// Configuración del pool de conexiones
export const pool = new Pool({
  connectionString,
  max: 20, // máximo número de clientes en el pool
  idleTimeoutMillis: 30000, // tiempo máximo que un cliente puede estar inactivo
  connectionTimeoutMillis: 2000, // tiempo máximo para establecer conexión
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // necesario para render
  } : undefined
});

// Monitoreo de conexiones
pool.on('connect', () => {
  console.log('Base de datos: nueva conexión establecida en el pool');
});

pool.on('remove', () => {
  console.log('Base de datos: cliente removido del pool');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL', err);
});

// Función mejorada para consultas con logging y manejo de errores
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Consulta ejecutada', { 
      text: text.substring(0, 80) + (text.length > 80 ? '...' : ''), 
      duration, 
      rows: res.rowCount 
    });
    return res;
  } catch (error) {
    console.error('Error ejecutando consulta', { 
      text: text.substring(0, 80) + (text.length > 80 ? '...' : ''),
      error 
    });
    throw error;
  }
}

// Función para obtener una conexión directa del pool (para transacciones)
export async function getClient() {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Interceptar el método release
  client.release = () => {
    console.log('Cliente liberado al pool');
    release();
  };

  return client;
}

// Para los timeouts
export async function closePool() {
  console.log('Cerrando pool de conexiones...');
  try {
    await pool.end();
    console.log('Pool de conexiones cerrado correctamente');
  } catch (error) {
    console.error('Error al cerrar el pool:', error);
    throw error;
  }
}

// backend/migrate-to-postgres.js
import sqlite3 from 'sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conexión a SQLite (origen)
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'pos.db'));

// Conexión a PostgreSQL (destino)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrateData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migración de datos de SQLite a PostgreSQL...');

    // Migrar categorías
    const categorias = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM categorias', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const cat of categorias) {
      await client.query(
        'INSERT INTO categorias (id, nombre) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [cat.id, cat.nombre]
      );
    }
    console.log(`✅ ${categorias.length} categorías migradas`);

    // Migrar productos
    const productos = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM productos', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const prod of productos) {
      await client.query(
        'INSERT INTO productos (id, categoria_id, nombre, precio, imagen) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [prod.id, prod.categoria_id, prod.nombre, prod.precio, prod.imagen]
      );
    }
    console.log(`✅ ${productos.length} productos migrados`);

    // Migrar usuarios
    const usuarios = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM usuarios', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const user of usuarios) {
      await client.query(
        'INSERT INTO usuarios (id, nombre, email, password) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
        [user.id, user.nombre, user.email, user.password]
      );
    }
    console.log(`✅ ${usuarios.length} usuarios migrados`);

    // Migrar ventas
    const ventas = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM ventas', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const venta of ventas) {
      await client.query(
        'INSERT INTO ventas (id, total, fecha) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [venta.id, venta.total, venta.fecha]
      );
    }
    console.log(`✅ ${ventas.length} ventas migradas`);

    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    client.release();
    sqliteDb.close();
    process.exit();
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData();
}

export default migrateData;
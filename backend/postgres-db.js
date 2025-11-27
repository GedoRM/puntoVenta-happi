// backend/postgres-db.js
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔗 Configurando PostgreSQL con Aiven...');

// Configuración SSL con tu certificado
const sslConfig = {
  rejectUnauthorized: true,
  ca: fs.readFileSync(path.join(__dirname, 'certs', 'ca.pem')).toString()
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Función para probar la conexión
async function testConnection() {
  let client;
  try {
    console.log('🔄 Probando conexión con Aiven...');
    client = await pool.connect();
    const result = await client.query('SELECT version(), current_database() as db_name');
    
    console.log('✅ CONEXIÓN EXITOSA con Aiven:');
    console.log('   🗄️  Base de datos:', result.rows[0].db_name);
    console.log('   🐘 PostgreSQL:', result.rows[0].version.split(',')[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Error en conexión:', error.message);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    console.log('🚀 Inicializando base de datos Happi Helados...');
    
    const connected = await testConnection();
    if (!connected) {
      throw new Error('No se pudo conectar a PostgreSQL');
    }

    const client = await pool.connect();
    
    // Crear tablas
    console.log('📋 Creando tablas...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        categoria_id INTEGER,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        imagen TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id SERIAL PRIMARY KEY,
        total DECIMAL(10,2) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_venta (
        id SERIAL PRIMARY KEY,
        venta_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

    console.log('✅ Tablas creadas');

    // Insertar datos de Happi Helados
    console.log('🍦 Insertando datos de Happi Helados...');
    
    await client.query(`
      INSERT INTO categorias (id, nombre) 
      VALUES 
      (1, 'Copas de helado'),
      (2, 'Paletas de hielo'), 
      (3, 'Conos de helado'),
      (13, 'Crepas')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO usuarios (id, nombre, email, password) 
      VALUES (3, 'Admin', 'admin@happi.com', '$2b$10$BF9sy9RpCmb/i5W2KeMdleZD7lvVc7ode5PQ1hN4l7HeZpEMKtV4K')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO productos (categoria_id, nombre, precio) 
      VALUES 
      (1, 'Copa de Vainilla', 65.00),
      (1, 'Copa de Chocolate', 70.00),
      (1, 'Copa Mixta', 75.00),
      (2, 'Paleta de Mango', 25.00),
      (2, 'Paleta de Limón', 22.00),
      (3, 'Cono Simple', 40.00),
      (3, 'Cono Doble', 55.00),
      (13, 'Crepa de Nutella', 85.00),
      (13, 'Crepa de Frutas', 75.00)
      ON CONFLICT DO NOTHING
    `);

    // Verificar datos
    const categoriasCount = await client.query('SELECT COUNT(*) FROM categorias');
    const productosCount = await client.query('SELECT COUNT(*) FROM productos');
    
    console.log('📊 Datos insertados:');
    console.log('   🏷️  Categorías:', categoriasCount.rows[0].count);
    console.log('   🍦 Productos:', productosCount.rows[0].count);
    
    client.release();
    console.log('🎉 Base de datos Happi Helados inicializada en PostgreSQL!');
    
  } catch (error) {
    console.error('❌ Error inicializando PostgreSQL:', error.message);
  }
}

// Inicializar automáticamente
if (process.env.DATABASE_URL) {
  initializeDatabase();
}

export default pool;
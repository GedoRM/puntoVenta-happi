// backend/postgres-db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Función para inicializar la base de datos con TU estructura
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL en Aiven');
    
    // Crear tablas EXACTAMENTE como en tu SQLite
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL UNIQUE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        categoria_id INTEGER,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        imagen TEXT,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
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
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS venta_items (
        id VARCHAR(255) PRIMARY KEY,
        venta_id VARCHAR(255),
        producto_id VARCHAR(255),
        cantidad INTEGER,
        subtotal DECIMAL(10,2),
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

    // Insertar TUS datos exactos
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

    // Insertar productos de ejemplo
    await client.query(`
      INSERT INTO productos (categoria_id, nombre, precio, imagen) 
      VALUES 
      (1, 'Copa de Vainilla', 65.00, NULL),
      (1, 'Copa de Chocolate', 70.00, NULL),
      (1, 'Copa Mixta', 75.00, NULL),
      (2, 'Paleta de Mango', 25.00, NULL),
      (2, 'Paleta de Limón', 22.00, NULL),
      (3, 'Cono Simple', 40.00, NULL),
      (3, 'Cono Doble', 55.00, NULL),
      (13, 'Crepa de Nutella', 85.00, NULL),
      (13, 'Crepa de Frutas', 75.00, NULL)
      ON CONFLICT DO NOTHING
    `);

    console.log('✅ Base de datos PostgreSQL inicializada con datos de Happi');
    client.release();
  } catch (error) {
    console.error('❌ Error inicializando PostgreSQL:', error);
  }
}

// Ejecutar inicialización
initializeDatabase();

export default pool;
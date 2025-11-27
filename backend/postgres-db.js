// backend/postgres-db.js
import pkg from 'pg';
const { Pool } = pkg;

// Configuración para Aiven con SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Esto es importante para Aiven
    ca: process.env.SSL_CERT || undefined
  },
  // Configuraciones adicionales para mejor rendimiento
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Función para probar la conexión
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version(), NOW() as current_time');
    console.log('✅ Conectado a PostgreSQL en Aiven:');
    console.log('   📅', result.rows[0].current_time);
    console.log('   🐘', result.rows[0].version.split(',')[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
}

// Función para inicializar la base de datos con TU estructura
async function initializeDatabase() {
  try {
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('No se pudo conectar a la base de datos');
    }

    const client = await pool.connect();
    
    console.log('🔄 Creando tablas en PostgreSQL...');
    
    // Crear tablas EXACTAMENTE como en tu SQLite
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS venta_items (
        id VARCHAR(255) PRIMARY KEY,
        venta_id VARCHAR(255),
        producto_id VARCHAR(255),
        cantidad INTEGER,
        subtotal DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tablas creadas en PostgreSQL');

    // Insertar TUS datos exactos
    console.log('🔄 Insertando datos iniciales...');
    
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
    
    // Verificar datos insertados
    const categoriasCount = await client.query('SELECT COUNT(*) FROM categorias');
    const productosCount = await client.query('SELECT COUNT(*) FROM productos');
    const usuariosCount = await client.query('SELECT COUNT(*) FROM usuarios');
    
    console.log('📊 Datos insertados:');
    console.log('   🏷️  Categorías:', categoriasCount.rows[0].count);
    console.log('   🍦 Productos:', productosCount.rows[0].count);
    console.log('   👤 Usuarios:', usuariosCount.rows[0].count);
    
    client.release();
  } catch (error) {
    console.error('❌ Error inicializando PostgreSQL:', error.message);
    // No lances el error, deja que la app use SQLite como fallback
  }
}

// Ejecutar inicialización solo si estamos en producción con DATABASE_URL
if (process.env.DATABASE_URL) {
  initializeDatabase();
}

export default pool;
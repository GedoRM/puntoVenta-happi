// backend/create-sqlite.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "pos.db");
const db = new sqlite3.Database(dbPath);

console.log('🔄 Creando base de datos SQLite temporal...');

// Crear tablas
db.serialize(() => {
  // Tabla categorías
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER,
      nombre TEXT NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      imagen TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    )
  `);

  // Tabla usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla ventas
  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total DECIMAL(10,2) NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla detalle_venta
  db.run(`
    CREATE TABLE IF NOT EXISTS detalle_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `);

  console.log('✅ Tablas creadas');

  // Insertar datos de Happi Helados
  const passwordHash = bcrypt.hashSync('admin123', 10);
  
  // Categorías
  db.run(`
    INSERT OR IGNORE INTO categorias (id, nombre) 
    VALUES 
    (1, 'Copas de helado'),
    (2, 'Paletas de hielo'), 
    (3, 'Conos de helado'),
    (13, 'Crepas')
  `);

  // Usuario admin
  db.run(`
    INSERT OR IGNORE INTO usuarios (id, nombre, email, password) 
    VALUES (3, 'Admin', 'admin@happi.com', ?)
  `, [passwordHash]);

  // Productos
  db.run(`
    INSERT OR IGNORE INTO productos (categoria_id, nombre, precio) 
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
  `);

  console.log('✅ Datos de Happi Helados insertados');
});

db.close((err) => {
  if (err) {
    console.error('❌ Error cerrando base de datos:', err.message);
  } else {
    console.log('🎉 Base de datos SQLite lista para usar!');
  }
});
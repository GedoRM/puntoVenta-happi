// backend/db.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Obtener ruta absoluta de la base
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "pos.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error abriendo DB:", err.message);
  else {
    console.log("✅ Conectado a la base de datos SQLite:", dbPath);
    initializeDatabase();
  }
});

// Función para inicializar la base de datos con TU estructura exacta
function initializeDatabase() {
  db.serialize(() => {
    console.log("🔄 Inicializando base de datos con tu estructura...");
    
    // Crear tablas EXACTAMENTE como las tienes en DB Browser
    db.run(`
      CREATE TABLE IF NOT EXISTS "categorias" (
        "id" INTEGER,
        "nombre" TEXT NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT)
      )
    `, (err) => {
      if (err) console.error("Error creando tabla categorias:", err);
      else console.log("✅ Tabla 'categorias' creada/verificada");
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS "productos" (
        "id" INTEGER,
        "categoria_id" TEXT,
        "nombre" TEXT NOT NULL,
        "precio" REAL NOT NULL,
        "imagen" TEXT,
        PRIMARY KEY("id" AUTOINCREMENT),
        FOREIGN KEY("categoria_id") REFERENCES "categorias"("id")
      )
    `, (err) => {
      if (err) console.error("Error creando tabla productos:", err);
      else console.log("✅ Tabla 'productos' creada/verificada");
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `, (err) => {
      if (err) console.error("Error creando tabla usuarios:", err);
      else console.log("✅ Tabla 'usuarios' creada/verificada");
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS "ventas" (
        "id" INTEGER,
        "total" REAL NOT NULL, 
        fecha TEXT DEFAULT (datetime('now','localtime')),
        PRIMARY KEY("id" AUTOINCREMENT)
      )
    `, (err) => {
      if (err) console.error("Error creando tabla ventas:", err);
      else console.log("✅ Tabla 'ventas' creada/verificada");
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS detalle_venta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL DEFAULT 1,
        precio REAL NOT NULL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `, (err) => {
      if (err) console.error("Error creando tabla detalle_venta:", err);
      else console.log("✅ Tabla 'detalle_venta' creada/verificada");
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS venta_items (
        id TEXT PRIMARY KEY,
        venta_id TEXT,
        producto_id TEXT,
        cantidad INTEGER,
        subtotal REAL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `, (err) => {
      if (err) console.error("Error creando tabla venta_items:", err);
      else console.log("✅ Tabla 'venta_items' creada/verificada");
    });

    // Insertar TUS datos exactos
    db.run(`
      INSERT OR IGNORE INTO "categorias" ("id", "nombre") 
      VALUES 
      (1, 'Copas de helado'),
      (2, 'Paletas de hielo'), 
      (3, 'Conos de helado'),
      (13, 'Crepas')
    `, (err) => {
      if (err) console.error("Error insertando categorias:", err);
      else console.log("✅ Categorías insertadas");
    });

    db.run(`
      INSERT OR IGNORE INTO "usuarios" ("id", "nombre", "email", "password") 
      VALUES (3, 'Admin', 'admin@happi.com', '$2b$10$BF9sy9RpCmb/i5W2KeMdleZD7lvVc7ode5PQ1hN4l7HeZpEMKtV4K')
    `, (err) => {
      if (err) console.error("Error insertando usuario:", err);
      else console.log("✅ Usuario admin insertado");
    });

    // Insertar productos de ejemplo basados en tus categorías
    db.run(`
      INSERT OR IGNORE INTO "productos" ("categoria_id", "nombre", "precio", "imagen") 
      VALUES 
      ('1', 'Copa de Vainilla', 65.00, NULL),
      ('1', 'Copa de Chocolate', 70.00, NULL),
      ('1', 'Copa Mixta', 75.00, NULL),
      ('2', 'Paleta de Mango', 25.00, NULL),
      ('2', 'Paleta de Limón', 22.00, NULL),
      ('3', 'Cono Simple', 40.00, NULL),
      ('3', 'Cono Doble', 55.00, NULL),
      ('13', 'Crepa de Nutella', 85.00, NULL),
      ('13', 'Crepa de Frutas', 75.00, NULL)
    `, (err) => {
      if (err) console.error("Error insertando productos:", err);
      else console.log("✅ Productos de ejemplo insertados");
    });

    // Verificar datos insertados
    setTimeout(() => {
      console.log("\n📊 VERIFICACIÓN DE DATOS:");
      
      db.get("SELECT COUNT(*) as count FROM categorias", (err, row) => {
        if (!err) console.log(`   Categorías: ${row.count}`);
      });
      
      db.get("SELECT COUNT(*) as count FROM productos", (err, row) => {
        if (!err) console.log(`   Productos: ${row.count}`);
      });
      
      db.get("SELECT COUNT(*) as count FROM usuarios", (err, row) => {
        if (!err) console.log(`   Usuarios: ${row.count}`);
      });
      
      console.log("🎉 Base de datos inicializada con TU estructura exacta!");
    }, 500);
  });
}

export default db;
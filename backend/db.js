// backend/db.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let usingPostgreSQL = false;

// Función para configurar SQLite (fallback)
function setupSQLite() {
  console.log('📊 Usando SQLite como base de datos');
  
  const dbPath = path.join(__dirname, "pos.db");
  const sqliteDB = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("Error abriendo SQLite:", err.message);
    } else {
      console.log("✅ Conectado a SQLite:", dbPath);
      // Tu inicialización de SQLite aquí
    }
  });
  
  return sqliteDB;
}

// Intentar usar PostgreSQL si está configurado
if (process.env.DATABASE_URL) {
  console.log('🔄 Intentando conectar a PostgreSQL...');
  
  import('./postgres-db.js')
    .then(module => {
      db = module.default;
      usingPostgreSQL = true;
      console.log('🎯 PostgreSQL configurado como base de datos principal');
    })
    .catch(err => {
      console.error('❌ Error cargando PostgreSQL, usando SQLite:', err.message);
      db = setupSQLite();
    });
} else {
  db = setupSQLite();
}

// Exportar la base de datos y un indicador de qué estamos usando
export { db as default, usingPostgreSQL };
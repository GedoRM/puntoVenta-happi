// backend/db.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let databaseType = 'SQLite';

// Configuración - PostgreSQL si está disponible
if (process.env.DATABASE_URL) {
  console.log('🔄 Configurando PostgreSQL con Aiven...');
  databaseType = 'PostgreSQL';
  
  import('./postgres-db.js')
    .then(module => {
      db = module.default;
      console.log('✅ PostgreSQL configurado como base de datos principal');
    })
    .catch(error => {
      console.error('❌ Error con PostgreSQL:', error.message);
      console.log('🔄 Usando SQLite como fallback...');
      db = setupSQLite();
      databaseType = 'SQLite (fallback)';
    });
} else {
  db = setupSQLite();
}

function setupSQLite() {
  console.log('📊 Configurando SQLite local...');
  const dbPath = path.join(__dirname, "pos.db");
  const sqliteDB = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("Error con SQLite:", err.message);
    } else {
      console.log("✅ SQLite conectado correctamente");
    }
  });
  return sqliteDB;
}

export { db as default, databaseType };
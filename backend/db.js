// backend/db.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;
let databaseType = 'SQLite';

if (process.env.DATABASE_URL) {
  console.log('🔄 Usando PostgreSQL...');
  databaseType = 'PostgreSQL';
  
  // Importar dinámicamente el módulo PostgreSQL
  import('./postgres-db.js')
    .then(module => {
      db = module.default;
      console.log('✅ PostgreSQL configurado');
    })
    .catch(error => {
      console.error('❌ Error PostgreSQL:', error.message);
      console.log('🔄 Cayendo a SQLite...');
      db = setupSQLite();
    });
} else {
  console.log('🔄 Usando SQLite local (DATABASE_URL no encontrada)');
  db = setupSQLite();
}

function setupSQLite() {
  const dbPath = path.join(__dirname, "pos.db");
  return new sqlite3.Database(dbPath);
}

export { db as default, databaseType };
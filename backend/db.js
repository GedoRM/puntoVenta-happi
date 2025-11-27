import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 Usando SQLite temporalmente (PostgreSQL en mantenimiento)...');

let db = new sqlite3.Database(path.join(__dirname, "pos.db"));
let databaseType = 'SQLite';

// Verificar conexión
db.get("SELECT name FROM sqlite_master WHERE type='table'", (err, row) => {
  if (err) {
    console.error('❌ Error con SQLite:', err.message);
  } else {
    console.log('✅ SQLite conectado correctamente');
  }
});

export { db as default, databaseType };
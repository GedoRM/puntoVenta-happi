// backend/db.js
let db;

if (process.env.DATABASE_URL) {
  // Usar PostgreSQL en producción
  console.log('📊 Usando PostgreSQL en Aiven');
  import('./postgres-db.js').then(module => {
    db = module.default;
  }).catch(err => {
    console.error('Error cargando PostgreSQL, usando SQLite:', err);
    db = setupSQLite();
  });
} else {
  // Usar SQLite en desarrollo
  console.log('📊 Usando SQLite local');
  db = setupSQLite();
}

function setupSQLite() {
  const sqlite3 = require("sqlite3").verbose();
  const path = require("path");
  const { fileURLToPath } = require("url");
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const dbPath = path.join(__dirname, "pos.db");
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error abriendo SQLite:", err.message);
    else {
      console.log("✅ Conectado a SQLite:", dbPath);
      require('./db-initializer.js'); // Tu inicializador actual
    }
  });
  
  return db;
}

export default db;
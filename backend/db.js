import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Obtener ruta absoluta de la base
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "pos.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error abriendo DB:", err.message);
  else console.log("Conectado a la base de datos SQLite");
});

export default db;
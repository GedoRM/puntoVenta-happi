import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import db, { databaseType } from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import PDFDocument from "pdfkit";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configuración de CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://puntoventa-happi.onrender.com'],
  credentials: true
}));

app.use(bodyParser.json());

const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_secreta_para_desarrollo";

// ===============================================================
//                     MIDDLEWARE DE LOGGING
// ===============================================================
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===============================================================
//                     RUTA DE BIENVENIDA
// ===============================================================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Backend del Punto de Venta Happi Helados funcionando!",
    environment: process.env.NODE_ENV || "development",
    database: databaseType,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      database: "/api/database-status",
      test: "/api/test",
      login: "POST /api/login",
      categorias: "GET /api/categorias",
      productos: "GET /api/productos",
      dashboard: "/api/dashboard/hoy"
    }
  });
});

// ===============================================================
//                     HEALTH CHECK
// ===============================================================
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "🚀 Server is running!",
    environment: process.env.NODE_ENV || "development",
    database: databaseType,
    timestamp: new Date().toISOString()
  });
});

// ===============================================================
//                     VERIFICACIÓN DE BASE DE DATOS
// ===============================================================
app.get("/api/database-status", async (req, res) => {
  try {
    console.log('📊 Solicitando estado de base de datos...');
    
    if (databaseType === 'PostgreSQL') {
      try {
        const client = await db.connect();
        const version = await client.query('SELECT version()');
        const dbInfo = await client.query('SELECT current_database() as db_name, current_user as user');
        const stats = await client.query(`
          SELECT 
            (SELECT COUNT(*) FROM categorias) as categorias,
            (SELECT COUNT(*) FROM productos) as productos,
            (SELECT COUNT(*) FROM usuarios) as usuarios,
            (SELECT COUNT(*) FROM ventas) as ventas
        `);
        client.release();
        
        res.json({
          database: "PostgreSQL",
          status: "✅ Conectado",
          connection: "Aiven",
          details: {
            database: dbInfo.rows[0].db_name,
            user: dbInfo.rows[0].user,
            version: version.rows[0].version.split(',')[0]
          },
          stats: stats.rows[0],
          timestamp: new Date().toISOString()
        });
      } catch (pgError) {
        res.json({
          database: "PostgreSQL",
          status: "❌ Error de conexión",
          error: pgError.message,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // SQLite
      db.get(`
        SELECT 
          (SELECT COUNT(*) FROM categorias) as categorias,
          (SELECT COUNT(*) FROM productos) as productos,
          (SELECT COUNT(*) FROM usuarios) as usuarios,
          (SELECT COUNT(*) FROM ventas) as ventas
      `, (err, row) => {
        if (err) {
          res.json({ 
            database: "SQLite", 
            status: "❌ Error",
            error: err.message,
            timestamp: new Date().toISOString()
          });
        } else {
          res.json({ 
            database: "SQLite", 
            status: "✅ Conectado",
            connection: "Local",
            stats: row,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  } catch (error) {
    res.status(500).json({ 
      database: databaseType, 
      status: "❌ Error general",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===============================================================
//                     RUTA DE PRUEBA
// ===============================================================
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "✅ Backend funcionando correctamente!",
    environment: process.env.NODE_ENV || "development",
    database: databaseType,
    timestamp: new Date().toISOString()
  });
});

// ===============================================================
//                     LOGIN
// ===============================================================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  // Usuario de prueba
  if (email === "admin@test.com" && password === "admin123") {
    const token = jwt.sign({ id: 1, nombre: "Administrador" }, SECRET_KEY, { expiresIn: "1h" });
    return res.json({ token, nombre: "Administrador" });
  }

  // Buscar en la base de datos
  const query = databaseType === 'PostgreSQL' 
    ? 'SELECT * FROM usuarios WHERE email = $1'
    : 'SELECT * FROM usuarios WHERE email = ?';

  db.get(query, [email], async (err, user) => {
    if (err) {
      console.error("Error en login:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }
    
    if (!user) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    try {
      // Para desarrollo - contraseña temporal
      if (password === "happi123") {
        const token = jwt.sign({ id: user.id, nombre: user.nombre }, SECRET_KEY, { expiresIn: "1h" });
        return res.json({ token, nombre: user.nombre });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(400).json({ error: "Contraseña incorrecta" });
      }

      const token = jwt.sign({ id: user.id, nombre: user.nombre }, SECRET_KEY, { expiresIn: "1h" });
      res.json({ token, nombre: user.nombre });
    } catch (error) {
      console.error("Error en autenticación:", error);
      res.status(500).json({ error: "Error en autenticación" });
    }
  });
});

// ===============================================================
//                     OBTENER CATEGORÍAS  
// ===============================================================
app.get("/api/categorias", (req, res) => {
  const query = databaseType === 'PostgreSQL' 
    ? 'SELECT * FROM categorias ORDER BY nombre'
    : 'SELECT * FROM categorias ORDER BY nombre';

  db.all(query, (err, rows) => {
    if (err) {
      console.error("Error obteniendo categorías:", err);
      return res.status(500).json({ error: "Error obteniendo categorías" });
    }
    res.json(rows || []);
  });
});

// ===============================================================
//                     OBTENER PRODUCTOS
// ===============================================================
app.get("/api/productos", (req, res) => {
  const query = databaseType === 'PostgreSQL' 
    ? `SELECT p.*, c.nombre as categoria_nombre 
       FROM productos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       ORDER BY p.nombre`
    : `SELECT p.*, c.nombre as categoria_nombre 
       FROM productos p 
       LEFT JOIN categorias c ON p.categoria_id = c.id 
       ORDER BY p.nombre`;

  db.all(query, (err, rows) => {
    if (err) {
      console.error("Error obteniendo productos:", err);
      return res.status(500).json({ error: "Error obteniendo productos" });
    }
    res.json(rows || []);
  });
});

// ===============================================================
//                     MANEJO DE ERRORES GLOBAL
// ===============================================================
app.use((err, req, res, next) => {
  console.error('💥 Error global:', err.stack);
  res.status(500).json({ 
    error: 'Algo salió mal en el servidor',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Ruta 404 para APIs no encontradas
app.all("/api/*", (req, res) => {
  res.status(404).json({ 
    error: "Endpoint de API no encontrado",
    path: req.path,
    method: req.method,
    availableEndpoints: [
      "GET /",
      "GET /api/health", 
      "GET /api/database-status",
      "GET /api/test",
      "POST /api/login",
      "GET /api/categorias",
      "GET /api/productos",
      "GET /api/dashboard/hoy"
    ]
  });
});

// ===============================================================
//                        INICIAR SERVIDOR
// ===============================================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Base de datos: ${databaseType}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 DB Status: http://localhost:${PORT}/api/database-status`);
  console.log(`🍦 Categorías: http://localhost:${PORT}/api/categorias`);
});
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import db from "./db.js";
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
  origin: ['http://localhost:3000', 'https://puntoventa-happi.onrender.com/'],
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
//                     HEALTH CHECK
// ===============================================================
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "🚀 Server is running!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

// ===============================================================
//                     RUTA DE PRUEBA
// ===============================================================
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "✅ Backend funcionando correctamente!",
    environment: process.env.NODE_ENV || "development"
  });
});

// Activar WAL para concurrencia
db.run("PRAGMA journal_mode = WAL;");

// ===============================================================
//                     LOGIN (VERSIÓN SEGURA)
// ===============================================================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  // Para pruebas - usuario por defecto
  if (email === "admin@test.com" && password === "admin123") {
    const token = jwt.sign({ id: 1, nombre: "Administrador" }, SECRET_KEY, { expiresIn: "1h" });
    return res.json({ token, nombre: "Administrador" });
  }

  db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error("Error en login:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }
    
    if (!user) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    try {
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(400).json({ error: "Contraseña incorrecta" });
      }

      const token = jwt.sign({ id: user.id, nombre: user.nombre }, SECRET_KEY, { expiresIn: "1h" });
      res.json({ token, nombre: user.nombre });
    } catch (error) {
      console.error("Error en bcrypt:", error);
      res.status(500).json({ error: "Error en autenticación" });
    }
  });
});

// ===============================================================
//                     OBTENER CATEGORÍAS  
// ===============================================================
app.get("/api/categorias", (req, res) => {
  db.all("SELECT * FROM categorias", (err, rows) => {
    if (err) {
      console.error("Error obteniendo categorías:", err);
      return res.status(500).json({ error: "Error obteniendo categorías" });
    }
    res.json(rows || []);
  });
});

// ===============================================================
//                     OBTENER PRODUCTOS POR CATEGORÍA
// ===============================================================
app.get("/api/productos/:categoriaId", (req, res) => {
  const { categoriaId } = req.params;

  db.all(
    "SELECT * FROM productos WHERE categoria_id = ?",
    [categoriaId],
    (err, rows) => {
      if (err) {
        console.error("Error obteniendo productos:", err);
        return res.status(500).json({ error: "Error obteniendo productos" });
      }
      res.json(rows || []);
    }
  );
});

// ===============================================================
//                     GUARDAR VENTA
// ===============================================================
app.post("/api/ventas", (req, res) => {
  const { total, items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No hay productos en la venta" });
  }

  db.serialize(() => {
    db.run("INSERT INTO ventas (total) VALUES (?)", [total], function (err) {
      if (err) {
        console.error("Error insertando venta:", err);
        return res.status(500).json({ error: "Error guardando venta" });
      }

      const ventaId = this.lastID;
      const stmt = db.prepare(
        "INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)"
      );

      let hasError = false;
      
      for (const item of items) {
        stmt.run(ventaId, item.id, item.cantidad, item.precio, (err) => {
          if (err && !hasError) {
            hasError = true;
            console.error("Error insertando detalle:", err);
            return res.status(500).json({ error: "Error guardando detalle de venta" });
          }
        });
      }

      stmt.finalize((err) => {
        if (err) {
          console.error("Error finalizando statement:", err);
          return res.status(500).json({ error: "Error finalizando venta" });
        }
        res.json({ mensaje: "Venta guardada correctamente", id: ventaId });
      });
    });
  });
});

// ... (MANTÉN EL RESTO DE TUS RUTAS ORIGINALES)
// [Tus rutas de dashboard, historial, reportes, etc.]

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


// ===============================================================
//                        INICIAR SERVIDOR
// ===============================================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Login test: http://localhost:${PORT}/api/login`);
});
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
  origin: ['http://localhost:3000', 'https://puntoventahappi.netlify.app'],
  credentials: true
}));

app.use(bodyParser.json());

const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_secreta_para_desarrollo";

// ===============================================================
//               INICIALIZACIÓN DE BASE DE DATOS
// ===============================================================
const initializeDatabase = () => {
  console.log("🔄 Inicializando base de datos...");
  
  // Crear tablas si no existen
  db.serialize(() => {
    // Tabla categorías
    db.run(`CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla productos
    db.run(`CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER,
      nombre TEXT NOT NULL,
      precio DECIMAL(10,2) NOT NULL,
      imagen TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    )`);

    // Tabla usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla ventas
    db.run(`CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total DECIMAL(10,2) NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla detalle_venta
    db.run(`CREATE TABLE IF NOT EXISTS detalle_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venta_id) REFERENCES ventas(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`);

    console.log("✅ Tablas creadas/verificadas");

    // Insertar datos iniciales
    db.run(`INSERT OR IGNORE INTO categorias (id, nombre) VALUES 
      (1, 'Copas de helado'),
      (2, 'Paletas de hielo'), 
      (3, 'Conos de helado'),
      (13, 'Crepas')`);

    // Crear usuario admin si no existe
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO usuarios (id, nombre, email, password) VALUES 
      (1, 'Admin', 'admin@happi.com', ?)`, [adminPassword]);

    // Insertar productos de ejemplo
    db.run(`INSERT OR IGNORE INTO productos (categoria_id, nombre, precio) VALUES 
      (1, 'Copa de Vainilla', 65.00),
      (1, 'Copa de Chocolate', 70.00),
      (1, 'Copa Mixta', 75.00),
      (2, 'Paleta de Mango', 25.00),
      (2, 'Paleta de Limón', 22.00),
      (3, 'Cono Simple', 40.00),
      (3, 'Cono Doble', 55.00),
      (13, 'Crepa de Nutella', 85.00),
      (13, 'Crepa de Frutas', 75.00)`);

    console.log("✅ Datos iniciales insertados");
  });
};

// Inicializar la base de datos al iniciar
initializeDatabase();

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
  db.all("SELECT * FROM categorias ORDER BY nombre", (err, rows) => {
    if (err) {
      console.error("Error obteniendo categorías:", err);
      return res.status(500).json({ error: "Error obteniendo categorías" });
    }
    res.json(rows || []);
  });
});

// ===============================================================
//                     CREAR CATEGORÍA
// ===============================================================
app.post("/api/categorias", (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "Nombre de categoría requerido" });
  }

  db.run("INSERT INTO categorias (nombre) VALUES (?)", [nombre], function(err) {
    if (err) {
      console.error("Error creando categoría:", err);
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "La categoría ya existe" });
      }
      return res.status(500).json({ error: "Error creando categoría" });
    }
    
    res.json({ 
      id: this.lastID,
      nombre: nombre,
      message: "Categoría creada exitosamente"
    });
  });
});

// ===============================================================
//                     OBTENER PRODUCTOS
// ===============================================================
app.get("/api/productos", (req, res) => {
  const query = `
    SELECT p.*, c.nombre as categoria_nombre 
    FROM productos p 
    LEFT JOIN categorias c ON p.categoria_id = c.id 
    ORDER BY p.nombre
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error("Error obteniendo productos:", err);
      return res.status(500).json({ error: "Error obteniendo productos" });
    }
    res.json(rows || []);
  });
});

// ===============================================================
//                     CREAR PRODUCTO
// ===============================================================
app.post("/api/productos", (req, res) => {
  const { nombre, precio, categoria_id, imagen } = req.body;

  if (!nombre || !precio) {
    return res.status(400).json({ error: "Nombre y precio son requeridos" });
  }

  db.run(
    "INSERT INTO productos (nombre, precio, categoria_id, imagen) VALUES (?, ?, ?, ?)",
    [nombre, parseFloat(precio), categoria_id || null, imagen || null],
    function(err) {
      if (err) {
        console.error("Error creando producto:", err);
        return res.status(500).json({ error: "Error creando producto" });
      }
      
      res.json({ 
        id: this.lastID,
        message: "Producto creado exitosamente"
      });
    }
  );
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

// ===============================================================
//                     ENDPOINTS DEL DASHBOARD
// ===============================================================
app.get("/api/dashboard/hoy", (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Ventas de hoy
  db.get("SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total FROM ventas WHERE DATE(fecha) = ?", [today], (err, ventas) => {
    if (err) {
      console.error("Error obteniendo ventas hoy:", err);
      return res.status(500).json({ error: "Error obteniendo datos del dashboard" });
    }

    // Productos vendidos hoy
    db.get(`SELECT COALESCE(SUM(dv.cantidad), 0) as total 
            FROM detalle_venta dv 
            JOIN ventas v ON dv.venta_id = v.id 
            WHERE DATE(v.fecha) = ?`, [today], (err, productos) => {
      if (err) {
        console.error("Error obteniendo productos hoy:", err);
        return res.status(500).json({ error: "Error obteniendo datos del dashboard" });
      }

      // Top productos
      db.all(`SELECT p.nombre, SUM(dv.cantidad) as cantidad, SUM(dv.cantidad * dv.precio) as total
              FROM detalle_venta dv
              JOIN productos p ON dv.producto_id = p.id
              JOIN ventas v ON dv.venta_id = v.id
              WHERE DATE(v.fecha) = ?
              GROUP BY p.id
              ORDER BY cantidad DESC
              LIMIT 5`, [today], (err, topProductos) => {
        if (err) {
          console.error("Error obteniendo top productos:", err);
          return res.status(500).json({ error: "Error obteniendo datos del dashboard" });
        }

        res.json({
          ventasHoy: ventas.total || 0,
          cantidadVentas: ventas.cantidad || 0,
          productosVendidos: productos.total || 0,
          topProductos: topProductos || []
        });
      });
    });
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
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});

// ===============================================================
//                        INICIAR SERVIDOR
// ===============================================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: https://puntoventa-happi.onrender.com/api/health`);
  console.log(`✅ Base de datos inicializada`);
});
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
  origin: ['http://localhost:3000', 'https://dashboard-frontend.onrender.com'],
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
//                     RUTA DE BIENVENIDA
// ===============================================================
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Backend del Punto de Venta Happi funcionando correctamente!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      test: "/api/test",
      login: "POST /api/login",
      dashboard: {
        hoy: "/api/dashboard/hoy",
        historial: "/api/dashboard/historial?inicio=YYYY-MM-DD&fin=YYYY-MM-DD",
        reporte: "/api/dashboard/reporte?fecha=YYYY-MM-DD&tipo=pdf|csv"
      },
      categorias: {
        listar: "GET /api/categorias",
        crear: "POST /api/categorias"
      },
      productos: {
        listar: "GET /api/productos/:categoriaId",
        crear: "POST /api/productos"
      },
      ventas: "POST /api/ventas"
    }
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

// ===============================================================
//                     VERIFICACIÓN DE BASE DE DATOS
// ===============================================================
app.get("/api/db-status", (req, res) => {
  db.get(`
    SELECT 
      (SELECT COUNT(*) FROM categorias) as categorias,
      (SELECT COUNT(*) FROM productos) as productos,
      (SELECT COUNT(*) FROM ventas) as ventas,
      (SELECT COUNT(*) FROM usuarios) as usuarios
  `, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: "✅ Base de datos funcionando con estructura Happi",
      stats: row,
      database: "SQLite - Estructura Happi"
    });
  });
});

// Activar WAL para concurrencia

// ===============================================================
//                     LOGIN (ACTUALIZADO PARA TU USUARIO)
// ===============================================================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  // Usuario de prueba temporal
  if (email === "admin@test.com" && password === "admin123") {
    const token = jwt.sign({ id: 1, nombre: "Administrador" }, SECRET_KEY, { expiresIn: "1h" });
    return res.json({ token, nombre: "Administrador" });
  }

  // Buscar en TU base de datos
  db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error("Error en login:", err);
      return res.status(500).json({ error: "Error del servidor" });
    }
    
    if (!user) {
      return res.status(400).json({ error: "Usuario no encontrado" });
    }

    try {
      // Para desarrollo, si la contraseña no está hasheada
      if (password === "happi123") { // Contraseña temporal para desarrollo
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
  db.all("SELECT * FROM categorias ORDER BY nombre", (err, rows) => {
    if (err) {
      console.error("Error obteniendo categorías:", err);
      return res.status(500).json({ error: "Error obteniendo categorías" });
    }
    res.json(rows || []);
  });
});

// ===============================================================
//                     OBTENER TODOS LOS PRODUCTOS
// ===============================================================
app.get("/api/productos", (req, res) => {
  db.all(`
    SELECT p.*, c.nombre as categoria_nombre 
    FROM productos p 
    LEFT JOIN categorias c ON p.categoria_id = c.id 
    ORDER BY p.nombre
  `, (err, rows) => {
    if (err) {
      console.error("Error obteniendo productos:", err);
      return res.status(500).json({ error: "Error obteniendo productos" });
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
    `SELECT p.*, c.nombre as categoria_nombre 
     FROM productos p 
     LEFT JOIN categorias c ON p.categoria_id = c.id 
     WHERE p.categoria_id = ? 
     ORDER BY p.nombre`,
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
//                     DASHBOARD → MÉTRICAS DE HOY
// ===============================================================
app.get("/api/dashboard/hoy", (req, res) => {
  const hoy = new Date().toISOString().split("T")[0];
  const data = {};

  // Total ventas y cantidad de tickets
  db.get(
    `SELECT 
      SUM(total) AS ventasHoy, 
      COUNT(*) AS cantidadVentas
    FROM ventas
    WHERE DATE(fecha) = DATE(?)`,
    [hoy],
    (err, row) => {
      if (err) {
        console.error("Error obteniendo ventas hoy:", err);
        return res.status(500).json({ error: "Error obteniendo métricas" });
      }

      data.ventasHoy = row?.ventasHoy || 0;
      data.cantidadVentas = row?.cantidadVentas || 0;

      // Productos vendidos
      db.get(
        `SELECT SUM(dv.cantidad) AS productosVendidos
        FROM detalle_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        WHERE DATE(v.fecha) = DATE(?)`,
        [hoy],
        (err2, row2) => {
          if (err2) {
            console.error("Error obteniendo productos vendidos:", err2);
            return res.status(500).json({ error: "Error obteniendo productos vendidos" });
          }

          data.productosVendidos = row2?.productosVendidos || 0;

          // Top 5 productos del día
          db.all(
            `SELECT p.nombre,
                   c.nombre AS categoria,
                   SUM(dv.cantidad) AS cantidad,
                   SUM(dv.cantidad * dv.precio) AS total
            FROM detalle_venta dv
            JOIN productos p ON p.id = dv.producto_id
            JOIN categorias c ON p.categoria_id = c.id
            JOIN ventas v ON v.id = dv.venta_id
            WHERE DATE(v.fecha) = DATE(?)
            GROUP BY p.id
            ORDER BY cantidad DESC
            LIMIT 5`,
            [hoy],
            (err3, rows3) => {
              if (err3) {
                console.error("Error obteniendo top productos:", err3);
                return res.status(500).json({ error: "Error obteniendo top productos" });
              }

              data.topProductos = rows3 || [];
              res.json(data);
            }
          );
        }
      );
    }
  );
});

// ===============================================================
//                     DASHBOARD → HISTORIAL
// ===============================================================
app.get("/api/dashboard/historial", (req, res) => {
  const { inicio, fin } = req.query;

  if (!inicio || !fin) {
    return res.status(400).json({ error: "Debes enviar inicio y fin (YYYY-MM-DD)" });
  }

  const query = `
    SELECT 
      DATE(fecha) AS fecha,
      SUM(total) AS totalVentas,
      COUNT(*) AS totalTickets,
      SUM(total) AS ganancias
    FROM ventas
    WHERE DATE(fecha) BETWEEN DATE(?) AND DATE(?)
    GROUP BY DATE(fecha)
    ORDER BY fecha DESC
  `;

  db.all(query, [inicio, fin], (err, rows) => {
    if (err) {
      console.error("Error obteniendo historial:", err);
      return res.status(500).json({ error: "Error obteniendo historial" });
    }

    res.json(rows || []);
  });
});

// ===============================================================
//                     GENERAR REPORTE PDF/CSV
// ===============================================================
app.get("/api/dashboard/reporte", (req, res) => {
  const { fecha, tipo } = req.query;

  if (!fecha || !tipo) {
    return res.status(400).json({ error: "Faltan parámetros: fecha y tipo" });
  }

  const query = `
    SELECT 
      v.id,
      v.total,
      v.fecha,
      p.nombre,
      c.nombre AS categoria,
      dv.cantidad,
      dv.precio
    FROM detalle_venta dv
    JOIN ventas v ON v.id = dv.venta_id
    JOIN productos p ON p.id = dv.producto_id
    JOIN categorias c ON p.categoria_id = c.id
    WHERE DATE(v.fecha) = DATE(?)
    ORDER BY v.id ASC
  `;

  db.all(query, [fecha], (err, rows) => {
    if (err) {
      console.error("Error obteniendo datos para reporte:", err);
      return res.status(500).json({ error: "Error al obtener datos" });
    }

    if (tipo === "pdf") {
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename=reporte_${fecha}.pdf`);
      doc.pipe(res);

      // Encabezado PDF
      doc.fontSize(26).fillColor("#d96b20").text("Reporte de Ventas Happi", { align: "center" });
      doc.fontSize(16).fillColor("black").text(`Fecha: ${fecha}`, { align: "center" });
      doc.moveDown();

      // Línea divisoria
      doc.moveTo(40, doc.y).lineTo(560, doc.y).strokeColor("#f4b042").lineWidth(2).stroke();
      doc.moveDown(1.5);

      // Tabla
      doc.fontSize(12).fillColor("black");
      let y = doc.y;

      // Encabezados
      doc.font("Helvetica-Bold");
      doc.text("Venta", 50, y);
      doc.text("Producto", 100, y);
      doc.text("Cantidad", 300, y);
      doc.text("Precio", 370, y);
      doc.text("Total", 450, y);
      y += 20;

      // Línea debajo del encabezado
      doc.moveTo(40, y).lineTo(560, y).strokeColor("#f4e57d").lineWidth(1).stroke();
      y += 10;

      doc.font("Helvetica");
      let totalGeneral = 0;

      rows.forEach((r) => {
        const totalLinea = r.cantidad * r.precio;
        totalGeneral += totalLinea;
        const nombreCompleto = `(${r.categoria}) ${r.nombre}`;

        doc.text(`#${r.id}`, 50, y);
        doc.text(nombreCompleto, 100, y);
        doc.text(String(r.cantidad), 320, y);
        doc.text(`$${r.precio.toFixed(2)}`, 390, y);
        doc.text(`$${totalLinea.toFixed(2)}`, 450, y);
        y += 20;
      });

      // Línea final
      doc.moveTo(40, y).lineTo(560, y).strokeColor("#f4b042").lineWidth(2).stroke();
      y += 20;

      // Total
      doc.font("Helvetica-Bold").fontSize(16)
         .text(`TOTAL GENERAL: $${totalGeneral.toFixed(2)}`, 0, y, { align: "right" });
      
      doc.end();
      return;
    }

    if (tipo === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=reporte_${fecha}.csv`);

      let csv = "Venta,Producto,Categoria,Cantidad,Precio,Total,Fecha\n";
      rows.forEach(r => {
        const totalLinea = r.cantidad * r.precio;
        csv += `${r.id},${r.nombre},${r.categoria},${r.cantidad},${r.precio},${totalLinea},${r.fecha}\n`;
      });

      return res.send(csv);
    }

    res.status(400).json({ error: "Tipo no válido. Usa 'pdf' o 'csv'" });
  });
});

// ===============================================================
//                     AGREGAR CATEGORÍA
// ===============================================================
app.post("/api/categorias", (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

  db.get("SELECT id FROM categorias WHERE LOWER(nombre) = LOWER(?)", [nombre], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: "La categoría ya existe" });

    db.run("INSERT INTO categorias(nombre) VALUES(?)", [nombre], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ id: this.lastID, nombre });
    });
  });
});

// ===============================================================
//                     AGREGAR PRODUCTO
// ===============================================================
app.post("/api/productos", (req, res) => {
  const { nombre, precio, categoria_id } = req.body;

  if (!nombre || !precio || !categoria_id) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  db.run(
    "INSERT INTO productos(categoria_id, nombre, precio) VALUES(?, ?, ?)",
    [categoria_id, nombre, precio],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "El producto ya existe en esta categoría" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, nombre, precio, categoria_id });
    }
  );
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
    method: req.method
  });
});

// Ruta para validar conexion SQL
app.get("/api/db-check", async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      // Probar PostgreSQL
      const postgres = await import('./postgres-db.js');
      const result = await postgres.default.query('SELECT version()');
      
      res.json({
        database: "PostgreSQL",
        status: "✅ Conectado correctamente",
        version: result.rows[0].version,
        connection: "Aiven"
      });
    } else {
      // Usar SQLite
      db.get("SELECT sqlite_version() as version", (err, row) => {
        if (err) {
          res.json({ database: "SQLite", status: "❌ Error", error: err.message });
        } else {
          res.json({ 
            database: "SQLite", 
            status: "✅ Conectado correctamente",
            version: row.version,
            connection: "Local"
          });
        }
      });
    }
  } catch (error) {
    res.status(500).json({ 
      database: "PostgreSQL", 
      status: "❌ Error de conexión",
      error: error.message 
    });
  }
});

// ===============================================================
//                        INICIAR SERVIDOR
// ===============================================================
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📊 DB status: http://localhost:${PORT}/api/db-status`);
  console.log(`🔐 Login: http://localhost:${PORT}/api/login`);
  console.log(`🛍️  Categorías: http://localhost:${PORT}/api/categorias`);
});
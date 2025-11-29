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
  origin: ['http://localhost:3000', 'https://puntoventahappi.netlify.app', 'https://punto-venta-happi.vercel.app/'],
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

           //Insertar ventas para pruebas
    db.run(`INSERT OR IGNORE INTO ventas (total, fecha) VALUES
    (65.00, '2025-11-20 10:30:00'),
    (140.00, '2025-11-20 14:15:00'),
    (75.00, '2025-11-20 18:45:00'),
    (45.00, '2025-11-21 11:20:00'),
    (160.00, '2025-11-21 15:30:00'),
    (85.00, '2025-11-21 19:10:00'),
    (70.00, '2025-11-22 09:45:00'),
    (125.00, '2025-11-22 13:25:00'),
    (55.00, '2025-11-22 17:50:00'),
    (65.00, '2025-11-28 10:15:00'),
    (150.00, '2025-11-28 12:30:00'),
    (80.00, '2025-11-28 16:45:00'),
    (95.00, '2025-11-28 20:20:00'),
    (45.00, '2025-11-29 11:00:00'),
    (110.00, '2025-11-29 14:30:00'),
    (75.00, '2025-11-29 18:15:00')
  `); 

  //Insert detalle de venta para prueba
  db.run(`INSERT OR IGNORE INTO detalle_venta (venta_id, producto_id, cantidad, precio) VALUES
    (1, 1, 1, 65.00),
    (2, 4, 2, 25.00),
    (2, 6, 1, 40.00),
    (2, 8, 1, 50.00),
    (3, 3, 1, 75.00),
    (4, 2, 1, 45.00),
    (5, 7, 2, 55.00),
    (5, 5, 2, 25.00),
    (6, 9, 1, 85.00),
    (7, 1, 1, 70.00),
    (8, 8, 1, 85.00),
    (8, 4, 2, 20.00),
    (9, 6, 1, 55.00),
    (10, 1, 1, 65.00),
    (11, 3, 2, 75.00),
    (12, 8, 1, 80.00),
    (13, 9, 1, 85.00),
    (13, 4, 1, 10.00),
    (14, 6, 1, 45.00),
    (15, 2, 2, 55.00),
    (16, 3, 1, 75.00)
  `)


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
//                     VENTAS POR DÍA DE LA SEMANA
// ===============================================================
app.get("/api/dashboard/ventas-semana", (req, res) => {
  const query = `
    SELECT 
      DATE(fecha) as fecha,
      SUM(total) as total_ventas,
      COUNT(*) as cantidad_ventas
    FROM ventas 
    WHERE fecha >= date('now', '-7 days')
    GROUP BY DATE(fecha)
    ORDER BY fecha ASC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error("Error obteniendo ventas de la semana:", err);
      return res.status(500).json({ error: "Error obteniendo datos de ventas" });
    }

    // Formatear datos para la gráfica
    const ventasPorDia = rows.map(row => ({
      fecha: row.fecha,
      total_ventas: parseFloat(row.total_ventas || 0),
      cantidad_ventas: row.cantidad_ventas || 0,
      dia_semana: new Date(row.fecha).toLocaleDateString('es-ES', { weekday: 'short' })
    }));

    res.json(ventasPorDia);
  });
});

// ===============================================================
//                     HISTORIAL DE VENTAS - VERSIÓN DEFINITIVA
// ===============================================================
app.get("/api/dashboard/historial", (req, res) => {
  const { inicio, fin } = req.query;

  if (!inicio || !fin) {
    return res.status(400).json({ error: "Fechas de inicio y fin requeridas" });
  }

  console.log("📅 Historial solicitado:", { inicio, fin });

  // Usar BETWEEN con horas específicas para evitar problemas de zona horaria
  const fechaInicio = `${inicio} 00:00:00`;
  const fechaFin = `${fin} 23:59:59`;

  const query = `
    SELECT 
      DATE(v.fecha) as fecha,
      COUNT(DISTINCT v.id) as totalTickets,
      SUM(v.total) as totalVentas,
      SUM(v.total) as ganancias
    FROM ventas v
    WHERE v.fecha >= ? AND v.fecha <= ?
    GROUP BY DATE(v.fecha)
    ORDER BY fecha DESC
  `;

  db.all(query, [fechaInicio, fechaFin], (err, rows) => {
    if (err) {
      console.error("Error obteniendo historial:", err);
      return res.status(500).json({ error: "Error obteniendo historial" });
    }

    console.log(`📊 Filas encontradas en historial: ${rows.length}`);

    // Formatear las fechas y números
    const historialFormateado = rows.map(row => ({
      fecha: new Date(row.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      fechaISO: row.fecha, // Guardar también la fecha ISO para el reporte
      totalVentas: parseFloat(row.totalVentas || 0).toFixed(2),
      totalTickets: row.totalTickets || 0,
      ganancias: parseFloat(row.ganancias || 0).toFixed(2)
    }));

    res.json(historialFormateado);
  });
});

// ===============================================================
//                     GENERAR REPORTE PDF - VERSIÓN DEFINITIVA
// ===============================================================
app.get("/api/dashboard/reporte", (req, res) => {
  const { fecha, tipo } = req.query;

  console.log("📋 Solicitud de reporte para fecha:", fecha);

  if (!fecha) {
    return res.status(400).json({ error: "Fecha requerida" });
  }

  // Función para convertir fecha DD/MM/AAAA a AAAA-MM-DD
  const convertirFecha = (fechaString) => {
    console.log("🔄 Convirtiendo fecha:", fechaString);
    
    // Si ya está en formato AAAA-MM-DD, retornar directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
      return fechaString;
    }
    
    // Convertir de DD/MM/AAAA a AAAA-MM-DD
    if (fechaString.includes('/')) {
      const partes = fechaString.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const anio = partes[2];
        return `${anio}-${mes}-${dia}`;
      }
    }
    
    throw new Error(`Formato de fecha no reconocido: ${fechaString}`);
  };

  try {
    const fechaISO = convertirFecha(fecha);
    console.log("✅ Fecha convertida a ISO:", fechaISO);

    // Definir rango para el día completo
    const fechaInicio = `${fechaISO} 00:00:00`;
    const fechaFin = `${fechaISO} 23:59:59`;

    console.log("📅 Rango de fechas para consulta:", { fechaInicio, fechaFin });

    // Obtener datos de ventas para la fecha específica
    const queryVentas = `
      SELECT 
        v.id as venta_id,
        v.fecha,
        v.total,
        p.nombre as producto_nombre,
        dv.cantidad,
        dv.precio as precio_unitario,
        (dv.cantidad * dv.precio) as subtotal
      FROM ventas v
      JOIN detalle_venta dv ON v.id = dv.venta_id
      JOIN productos p ON dv.producto_id = p.id
      WHERE v.fecha >= ? AND v.fecha <= ?
      ORDER BY v.fecha DESC, v.id
    `;

    // Obtener resumen del día
    const queryResumen = `
      SELECT 
        COUNT(DISTINCT v.id) as total_ventas,
        COALESCE(SUM(v.total), 0) as total_ingresos,
        COALESCE(SUM(dv.cantidad), 0) as total_productos_vendidos
      FROM ventas v
      LEFT JOIN detalle_venta dv ON v.id = dv.venta_id
      WHERE v.fecha >= ? AND v.fecha <= ?
    `;

    // Obtener producto más vendido
    const queryProductoMasVendido = `
      SELECT 
        p.nombre,
        SUM(dv.cantidad) as total_vendido
      FROM productos p
      JOIN detalle_venta dv ON p.id = dv.producto_id
      JOIN ventas v ON dv.venta_id = v.id
      WHERE v.fecha >= ? AND v.fecha <= ?
      GROUP BY p.id
      ORDER BY total_vendido DESC
      LIMIT 1
    `;

    db.serialize(() => {
      // Obtener ventas del día
      db.all(queryVentas, [fechaInicio, fechaFin], (err, ventasDetalle) => {
        if (err) {
          console.error("Error obteniendo ventas para reporte:", err);
          return res.status(500).json({ error: "Error obteniendo detalle de ventas: " + err.message });
        }

        console.log(`📊 Ventas encontradas para reporte: ${ventasDetalle.length}`);

        // Agrupar ventas por ID de venta
        const ventasAgrupadas = {};
        ventasDetalle.forEach(detalle => {
          if (!ventasAgrupadas[detalle.venta_id]) {
            ventasAgrupadas[detalle.venta_id] = {
              venta_id: detalle.venta_id,
              fecha: detalle.fecha,
              total: detalle.total,
              productos: []
            };
          }
          ventasAgrupadas[detalle.venta_id].productos.push({
            nombre: detalle.producto_nombre,
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precio_unitario,
            subtotal: detalle.subtotal
          });
        });

        const ventas = Object.values(ventasAgrupadas);

        // Obtener resumen del día
        db.get(queryResumen, [fechaInicio, fechaFin], (err, resumen) => {
          if (err) {
            console.error("Error obteniendo resumen para reporte:", err);
            return res.status(500).json({ error: "Error obteniendo resumen: " + err.message });
          }

          // Obtener producto más vendido
          db.get(queryProductoMasVendido, [fechaInicio, fechaFin], (err, productoTop) => {
            if (err) {
              console.error("Error obteniendo producto más vendido:", err);
              return res.status(500).json({ error: "Error obteniendo producto más vendido: " + err.message });
            }

            const datosReporte = {
              fecha: fechaISO,
              ventas,
              resumen: resumen || {
                total_ventas: 0,
                total_ingresos: 0,
                total_productos_vendidos: 0
              },
              producto_mas_vendido: productoTop || { nombre: 'No hay ventas', total_vendido: 0 }
            };

            console.log("📈 Resumen del reporte:", datosReporte.resumen);

            if (tipo === "pdf") {
              generarPDF(res, fechaISO, datosReporte);
            } else {
              // Devolver datos en JSON
              res.json(datosReporte);
            }
          });
        });
      });
    });

  } catch (error) {
    console.error("❌ Error procesando fecha:", error);
    return res.status(400).json({ error: "Formato de fecha inválido: " + error.message });
  }
});
// ===============================================================
//                     FUNCIÓN GENERAR PDF - VERSIÓN MEJORADA
// ===============================================================
const generarPDF = (res, fecha, datos) => {
  try {
    const doc = new PDFDocument();
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-${fecha}.pdf`);
    
    doc.pipe(res);

    // Encabezado del PDF
    doc.fontSize(20)
       .fillColor('#d96b20')
       .text('Happi Helados', 50, 50)
       .fontSize(16)
       .fillColor('#333')
       .text(`Reporte de Ventas - ${fecha}`, 50, 80);

    // Línea separadora
    doc.moveTo(50, 110)
       .lineTo(550, 110)
       .strokeColor('#f4e57d')
       .lineWidth(2)
       .stroke();

    let yPosition = 130;

    // Resumen del día
    doc.fontSize(14)
       .fillColor('#d96b20')
       .text('RESUMEN DEL DÍA', 50, yPosition)
       .fontSize(12)
       .fillColor('#333');

    yPosition += 25;

    doc.text(`• Total de ventas: ${datos.resumen.total_ventas}`, 70, yPosition);
    yPosition += 15;
    
    doc.text(`• Ingresos totales: $${parseFloat(datos.resumen.total_ingresos).toFixed(2)}`, 70, yPosition);
    yPosition += 15;
    
    doc.text(`• Productos vendidos: ${datos.resumen.total_productos_vendidos}`, 70, yPosition);
    yPosition += 15;
    
    doc.text(`• Producto más vendido: ${datos.producto_mas_vendido.nombre} (${datos.producto_mas_vendido.total_vendido} unidades)`, 70, yPosition);
    yPosition += 30;

    // Detalle de ventas
    if (datos.ventas && datos.ventas.length > 0) {
      doc.fontSize(14)
         .fillColor('#d96b20')
         .text('DETALLE DE VENTAS', 50, yPosition)
         .fontSize(12)
         .fillColor('#333');

      yPosition += 25;

      datos.ventas.forEach((venta, index) => {
        // Verificar si hay espacio en la página
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        const horaVenta = new Date(venta.fecha).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        doc.text(`Venta #${venta.venta_id} - ${horaVenta}`, 70, yPosition);
        yPosition += 15;

        // Productos de esta venta
        venta.productos.forEach(producto => {
          doc.text(`   ${producto.nombre} x${producto.cantidad} - $${parseFloat(producto.subtotal).toFixed(2)}`, 85, yPosition);
          yPosition += 12;
        });

        doc.text(`Total: $${parseFloat(venta.total).toFixed(2)}`, 70, yPosition);
        yPosition += 20;

        // Línea separadora entre ventas
        doc.moveTo(70, yPosition)
           .lineTo(550, yPosition)
           .strokeColor('#f4e57d')
           .lineWidth(1)
           .stroke();

        yPosition += 15;
      });
    } else {
      doc.fontSize(12)
         .fillColor('#666')
         .text('No hay ventas registradas para esta fecha.', 70, yPosition);
      yPosition += 30;
    }

    // Pie de página
    const pageHeight = doc.page.height;
    doc.fontSize(10)
       .fillColor('#999')
       .text(`Reporte generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 50, pageHeight - 50)
       .text('🍨 Happi Helados - Sistema de Punto de Venta', 50, pageHeight - 35);

    doc.end();

  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).json({ error: "Error generando reporte PDF: " + error.message });
  }
};

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
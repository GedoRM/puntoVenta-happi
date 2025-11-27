// backend/server.js
import express from 'express';
import cors from 'cors';
import db, { databaseType } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// JWT Secret (usar variable de entorno o un valor por defecto)
const JWT_SECRET = process.env.JWT_SECRET || 'happi-helados-secret-temporal';

console.log(`🚀 Iniciando Servidor Happi Helados...`);
console.log(`📊 Usando base de datos: ${databaseType}`);

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Routes de autenticación
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Buscar usuario en la base de datos
    const query = 'SELECT * FROM usuarios WHERE email = ?';
    
    db.get(query, [email], async (err, user) => {
      if (err) {
        console.error('Error en login:', err);
        return res.status(500).json({ error: 'Error del servidor' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Generar token
      const token = jwt.sign(
        { id: user.id, email: user.email, nombre: user.nombre },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login exitoso',
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Routes públicas
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor Happi Helados funcionando',
    database: databaseType,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/database-status', (req, res) => {
  res.json({ 
    database: databaseType,
    status: 'connected',
    message: `Usando ${databaseType} temporalmente - PostgreSQL en mantenimiento`,
    timestamp: new Date().toISOString()
  });
});

// Routes de productos
app.get('/api/productos', (req, res) => {
  const query = `
    SELECT p.*, c.nombre as categoria_nombre 
    FROM productos p 
    LEFT JOIN categorias c ON p.categoria_id = c.id 
    ORDER BY p.nombre
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error obteniendo productos:', err);
      return res.status(500).json({ error: 'Error obteniendo productos' });
    }
    res.json(rows);
  });
});

app.post('/api/productos', authenticateToken, (req, res) => {
  const { nombre, precio, categoria_id, imagen } = req.body;

  if (!nombre || !precio) {
    return res.status(400).json({ error: 'Nombre y precio son requeridos' });
  }

  const query = `
    INSERT INTO productos (nombre, precio, categoria_id, imagen) 
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [nombre, precio, categoria_id || null, imagen || null], function(err) {
    if (err) {
      console.error('Error creando producto:', err);
      return res.status(500).json({ error: 'Error creando producto' });
    }
    res.json({ 
      id: this.lastID,
      message: 'Producto creado exitosamente'
    });
  });
});

// Routes de categorías
app.get('/api/categorias', (req, res) => {
  const query = 'SELECT * FROM categorias ORDER BY nombre';

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error obteniendo categorías:', err);
      return res.status(500).json({ error: 'Error obteniendo categorías' });
    }
    res.json(rows);
  });
});

// Routes de ventas
app.get('/api/ventas', authenticateToken, (req, res) => {
  const query = `
    SELECT v.*, COUNT(dv.id) as items 
    FROM ventas v 
    LEFT JOIN detalle_venta dv ON v.id = dv.venta_id 
    GROUP BY v.id 
    ORDER BY v.fecha DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error obteniendo ventas:', err);
      return res.status(500).json({ error: 'Error obteniendo ventas' });
    }
    res.json(rows);
  });
});

app.post('/api/ventas', authenticateToken, (req, res) => {
  const { productos, total } = req.body;

  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Productos son requeridos' });
  }

  // Iniciar transacción
  db.serialize(() => {
    // Insertar venta
    db.run('INSERT INTO ventas (total) VALUES (?)', [total], function(err) {
      if (err) {
        console.error('Error creando venta:', err);
        return res.status(500).json({ error: 'Error creando venta' });
      }

      const ventaId = this.lastID;
      let detallesInsertados = 0;

      // Insertar detalles de venta
      productos.forEach(producto => {
        const subtotal = producto.precio * producto.cantidad;
        
        db.run(
          'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)',
          [ventaId, producto.id, producto.cantidad, producto.precio],
          function(err) {
            if (err) {
              console.error('Error insertando detalle:', err);
            } else {
              detallesInsertados++;
            }

            // Cuando todos los detalles se hayan procesado
            if (detallesInsertados === productos.length) {
              res.json({
                id: ventaId,
                message: 'Venta registrada exitosamente',
                total_venta: total,
                items: productos.length
              });
            }
          }
        );
      });
    });
  });
});

// Route para obtener detalles de una venta específica
app.get('/api/ventas/:id', authenticateToken, (req, res) => {
  const ventaId = req.params.id;

  const query = `
    SELECT dv.*, p.nombre as producto_nombre 
    FROM detalle_venta dv 
    JOIN productos p ON dv.producto_id = p.id 
    WHERE dv.venta_id = ?
  `;

  db.all(query, [ventaId], (err, rows) => {
    if (err) {
      console.error('Error obteniendo detalle de venta:', err);
      return res.status(500).json({ error: 'Error obteniendo detalle de venta' });
    }
    res.json(rows);
  });
});

// Route para el dashboard
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const queries = {
    totalVentas: 'SELECT COUNT(*) as count FROM ventas',
    totalProductos: 'SELECT COUNT(*) as count FROM productos',
    ventasHoy: `SELECT COUNT(*) as count FROM ventas WHERE DATE(fecha) = DATE('now')`,
    totalRecaudado: 'SELECT COALESCE(SUM(total), 0) as total FROM ventas'
  };

  const results = {};
  let queriesCompleted = 0;

  Object.keys(queries).forEach(key => {
    db.get(queries[key], (err, row) => {
      if (err) {
        console.error(`Error en query ${key}:`, err);
        results[key] = key === 'totalRecaudado' ? 0 : 0;
      } else {
        results[key] = row.count !== undefined ? row.count : row.total;
      }

      queriesCompleted++;
      
      if (queriesCompleted === Object.keys(queries).length) {
        res.json(results);
      }
    });
  });
});

// Ruta para servir el frontend
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/public/index.html');
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🎉 Servidor Happi Helados ejecutándose en puerto ${PORT}`);
  console.log(`📊 Base de datos: ${databaseType}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
});

export default app;
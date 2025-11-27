// backend/server.js
import express from 'express';
import cors from 'cors';
import db, { databaseType } from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS ACTUALIZADO para Netlify
app.use(cors({
  origin: [
    'https://puntoventahappi.netlify.app',
    'https://puntoventa-happi.onrender.com',
    'http://localhost:3000', 
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

app.options('*', cors());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'happi-helados-secret-temporal';

console.log(`🚀 Iniciando Servidor Happi Helados...`);
console.log(`📊 Usando base de datos: ${databaseType}`);
console.log(`🌐 CORS configurado para: https://puntoventahappi.netlify.app`);

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

// Routes de autenticación - VERSIÓN TEMPORAL SIN BCRYPT
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // ✅ TEMPORAL: Login simple sin verificación de bcrypt
    if (email === 'admin@happi.com' && password === 'admin123') {
      const token = jwt.sign(
        { 
          id: 3, 
          email: 'admin@happi.com', 
          nombre: 'Admin' 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('✅ Login exitoso (temporal)');

      return res.json({
        message: 'Login exitoso',
        token: token,
        user: {
          id: 3,
          nombre: 'Admin',
          email: 'admin@happi.com'
        }
      });
    }

    // Si no son las credenciales temporales, buscar en la BD
    const query = 'SELECT * FROM usuarios WHERE email = ?';
    
    db.get(query, [email], async (err, user) => {
      if (err) {
        console.error('❌ Error en login DB:', err);
        return res.status(500).json({ error: 'Error del servidor' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Si el usuario existe pero no podemos verificar con bcrypt
      console.log('⚠️ Usuario encontrado pero sin verificación bcrypt:', user);
      return res.status(401).json({ error: 'Error en verificación de contraseña' });
    });

  } catch (error) {
    console.error('💥 Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Endpoint para debug - ver usuarios en la base de datos
app.get('/api/debug-users', (req, res) => {
  const query = 'SELECT id, nombre, email, password FROM usuarios';
  
  db.all(query, (err, rows) => {
    if (err) {
      console.error('Error obteniendo usuarios:', err);
      return res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
    
    res.json({
      total_usuarios: rows.length,
      usuarios: rows
    });
  });
});

// Endpoint para crear usuario temporal
app.post('/api/create-test-user', (req, res) => {
  // Crear usuario de prueba sin bcrypt
  const query = `
    INSERT OR REPLACE INTO usuarios (id, nombre, email, password) 
    VALUES (?, ?, ?, ?)
  `;
  
  const testPassword = 'admin123'; // Contraseña en texto plano temporalmente
  
  db.run(query, [3, 'Admin', 'admin@happi.com', testPassword], function(err) {
    if (err) {
      console.error('Error creando usuario:', err);
      return res.status(500).json({ error: 'Error creando usuario' });
    }
    
    res.json({ 
      message: 'Usuario de prueba creado',
      usuario: {
        id: 3,
        nombre: 'Admin',
        email: 'admin@happi.com',
        password: testPassword
      }
    });
  });
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
    message: `Usando ${databaseType} temporalmente`,
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz - Mensaje de bienvenida
app.get('/', (req, res) => {
  res.json({
    message: '🚀 API Happi Helados funcionando correctamente',
    database: databaseType,
    endpoints: {
      health: '/api/health',
      database: '/api/database-status',
      login: '/api/login (POST)',
      debug_users: '/api/debug-users',
      create_user: '/api/create-test-user (POST)',
      productos: '/api/productos',
      categorias: '/api/categorias',
      ventas: '/api/ventas'
    },
    frontend: 'El frontend está separado del backend',
    login_temporal: 'Usar: admin@happi.com / admin123'
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

  db.serialize(() => {
    db.run('INSERT INTO ventas (total) VALUES (?)', [total], function(err) {
      if (err) {
        console.error('Error creando venta:', err);
        return res.status(500).json({ error: 'Error creando venta' });
      }

      const ventaId = this.lastID;
      let detallesInsertados = 0;

      productos.forEach(producto => {
        db.run(
          'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio) VALUES (?, ?, ?, ?)',
          [ventaId, producto.id, producto.cantidad, producto.precio],
          function(err) {
            if (err) {
              console.error('Error insertando detalle:', err);
            } else {
              detallesInsertados++;
            }

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

// Route para detalles de venta
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

// Route para dashboard
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
  console.log(`🔗 Health check: https://puntoventa-happi.onrender.com/api/health`);
  console.log(`🌐 Frontend: https://puntoventahappi.netlify.app`);
  console.log(`🔒 CORS configurado para Netlify`);
  console.log(`🔐 Login temporal activado: admin@happi.com / admin123`);
});

export default app;
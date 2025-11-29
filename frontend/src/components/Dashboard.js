import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import "../dashboard.css";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

function Dashboard() {
  const [ventasHoy, setVentasHoy] = useState(0);
  const [cantidadVentas, setCantidadVentas] = useState(0);
  const [productosVendidos, setProductosVendidos] = useState(0);
  const [topProductos, setTopProductos] = useState([]);
  const [ventasSemana, setVentasSemana] = useState([]);

  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState("");
  

  // Módulo de categorías y productos
  const [mostrarModuloProductos, setMostrarModuloProductos] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", precio: "", categoria_id: "" });

  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    cargarDatosDashboard();
    cargarCategorias();
    cargarVentasSemana();

    // Establecer fechas por defecto (últimos 7 días)
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const fechaInicioDefault = hace7Dias.toISOString().split('T')[0];

    setFechaInicio(fechaInicioDefault);
    setFechaFin(hoy);
  }, []);

  // Cerrar sidebar al hacer clic en un botón en móviles
  const handleSidebarClick = (action) => {
    action();
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Cerrar sidebar al hacer clic fuera
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  // 📌 Datos de hoy
  const cargarDatosDashboard = async () => {
    try {
      const res = await axios.get("https://puntoventa-happi.onrender.com/api/dashboard/hoy");
      setVentasHoy(res.data.ventasHoy);
      setCantidadVentas(res.data.cantidadVentas);
      setProductosVendidos(res.data.productosVendidos);
      setTopProductos(res.data.topProductos);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    }
  };

    const cargarVentasSemana = async () => {
    try {
      const res = await axios.get("https://puntoventa-happi.onrender.com/api/dashboard/ventas-semana");
      setVentasSemana(res.data);
    } catch (err) {
      console.error("Error cargando ventas de la semana:", err);
    }
  };

    // 📊 Configuración para la gráfica de barras
  const opcionesGrafica = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Ventas de los últimos 7 días',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value;
          }
        }
      }
    }
  };

  const datosGraficaBarras = {
    labels: ventasSemana.map(item => {
      const fecha = new Date(item.fecha);
      return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: 'Ventas Totales ($)',
        data: ventasSemana.map(item => item.total_ventas),
        backgroundColor: 'rgba(217, 107, 32, 0.8)',
        borderColor: 'rgba(217, 107, 32, 1)',
        borderWidth: 2,
        borderRadius: 5,
      },
      {
        label: 'Número de Ventas',
        data: ventasSemana.map(item => item.cantidad_ventas),
        backgroundColor: 'rgba(248, 241, 150, 0.8)',
        borderColor: 'rgba(244, 229, 125, 1)',
        borderWidth: 2,
        borderRadius: 5,
        yAxisID: 'y1',
      }
    ]
  };

  // 📊 Configuración para gráfica de doughnut (productos más vendidos)
  const datosGraficaProductos = {
    labels: topProductos.map(item => item.nombre),
    datasets: [
      {
        data: topProductos.map(item => item.cantidad),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
        ],
        borderColor: [
          '#FFFFFF',
          '#FFFFFF',
          '#FFFFFF',
          '#FFFFFF',
          '#FFFFFF',
        ],
        borderWidth: 2,
      },
    ],
  };

  const opcionesGraficaProductos = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Productos Más Vendidos Hoy',
      },
    },
  };

  // 📌 Historial - Versión mejorada
const cargarHistorial = () => {
  if (!fechaInicio || !fechaFin) {
    setErrorHistorial("Por favor selecciona ambas fechas");
    return;
  }

  setCargandoHistorial(true);
  setErrorHistorial("");

  axios
    .get(`https://puntoventa-happi.onrender.com/api/dashboard/historial?inicio=${fechaInicio}&fin=${fechaFin}`)
    .then((res) => {
      setHistorial(res.data);
      setCargandoHistorial(false);
      if (res.data.length === 0) {
        setErrorHistorial("No hay ventas en el rango de fechas seleccionado");
      }
    })
    .catch((err) => {
      console.error("Error cargando historial:", err);
      setErrorHistorial("Error al cargar el historial. Intenta nuevamente.");
      setCargandoHistorial(false);
    });
};

// 📌 Función para generar reporte PDF - VERSIÓN CORREGIDA
const generarReporte = async (rowData, tipo) => {
  try {
    setToast({ mensaje: "📊 Generando reporte...", tipo: "success" });

    // Asegurarnos de obtener la fecha correcta
    let fechaParaReporte;
    
    if (typeof rowData === 'object' && rowData.fechaISO) {
      // Si es un objeto del historial, usar fechaISO
      fechaParaReporte = rowData.fechaISO;
    } else if (typeof rowData === 'string') {
      // Si es un string (fecha directamente)
      fechaParaReporte = rowData;
    } else {
      console.error("❌ Formato de datos no reconocido:", rowData);
      throw new Error('Formato de fecha no válido');
    }

    console.log("🔄 Generando reporte para fecha:", fechaParaReporte);

    if (tipo === "pdf") {
      const response = await fetch(
        `https://puntoventa-happi.onrender.com/api/dashboard/reporte?fecha=${fechaParaReporte}&tipo=pdf`
      );
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte-${fechaParaReporte}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setToast({ mensaje: "✅ Reporte PDF generado y descargado", tipo: "success" });
    }
  } catch (err) {
    console.error("Error generando reporte:", err);
    setToast({ 
      mensaje: `❌ Error: ${err.message}`, 
      tipo: "error" 
    });
  }
  
  setTimeout(() => setToast(""), 4000);
};
  const limpiarFiltro = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const fechaInicioDefault = hace7Dias.toISOString().split('T')[0];

    setFechaInicio(fechaInicioDefault);
    setFechaFin(hoy);
    setHistorial([]);
    setErrorHistorial("");
  };


  // 📌 Categorías
  const cargarCategorias = async () => {
    try {
      const res = await axios.get("https://puntoventa-happi.onrender.com/api/categorias");
      setCategorias(res.data);
    } catch (err) {
      console.error("Error cargando categorías:", err);
    }
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria) {
      setToast({ mensaje: "❌ Ingresa un nombre para la categoría", tipo: "error" });
      return;
    }
    try {
      const res = await axios.post("https://puntoventa-happi.onrender.com/api/categorias", { nombre: nuevaCategoria });
      setNuevaCategoria("");
      cargarCategorias();
      setToast({ mensaje: `✅ Categoría "${res.data.nombre}" agregada`, tipo: "success" });
    } catch (err) {
      console.error("Error agregando categoría:", err);
      const msg = err.response?.data?.error || "Error agregando categoría";
      setToast({ mensaje: `❌ ${msg}`, tipo: "error" });
    }
    setTimeout(() => setToast(""), 3000);
  };

  const agregarProducto = async () => {
    if (!nuevoProducto.nombre || !nuevoProducto.precio || !nuevoProducto.categoria_id) {
      setToast({ mensaje: "❌ Completa todos los campos del producto", tipo: "error" });
      return;
    }

    try {
      await axios.post("https://puntoventa-happi.onrender.com/api/productos", nuevoProducto);
      setNuevoProducto({ nombre: "", precio: "", categoria_id: "" });
      setToast({ mensaje: `✅ Producto "${nuevoProducto.nombre}" agregado`, tipo: "success" });
    } catch (err) {
      console.error("Error agregando producto:", err);
      const msg = err.response?.data?.error || "Error agregando producto";
      setToast({ mensaje: `❌ ${msg}`, tipo: "error" });
    }
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <div className="layout">
      {/* Toast Notifications */}
      {toast && (
        <div className={`toast ${toast.tipo === "error" ? "toast-error" : "toast-success"}`}>
          {toast.mensaje}
        </div>
      )}

      {/* Botón Hamburguesa para Móviles */}
      {isMobile && (
        <>
          <div
            className={`menu-toggle ${sidebarOpen ? 'mobile-open' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>

          {/* Overlay */}
          <div
            className={`sidebar-overlay ${sidebarOpen ? 'mobile-open' : ''}`}
            onClick={handleOverlayClick}
          ></div>
        </>
      )}

      {/* MENÚ LATERAL */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <h2 className="sidebar-title">🍨 Menú</h2>
        <button
          className="sidebar-btn"
          onClick={() => handleSidebarClick(() => {
            setMostrarHistorial(false);
            setMostrarModuloProductos(false);
          })}
        >
          📊 Dashboard
        </button>
        <button
          className="sidebar-btn"
          onClick={() => handleSidebarClick(() => {
            setMostrarHistorial(true);
            setMostrarModuloProductos(false);
          })}
        >
          📅 Historial
        </button>
        <button
          className="sidebar-btn"
          onClick={() => handleSidebarClick(() => {
            setMostrarModuloProductos(true);
            setMostrarHistorial(false);
          })}
        >
          🏷️ Categorías / Productos
        </button>
      </aside>

      <div className="dashboard-container">
        {/* DASHBOARD */}
        {!mostrarHistorial && !mostrarModuloProductos && (
          <>
            <h2 className="dashboard-title">📊 Dashboard de Ventas</h2>
            <div className="dashboard-cards">
              <div className="dash-card">
                <h3>💵 Ventas del día</h3>
                <p className="dash-number">${ventasHoy.toFixed(2)}</p>
              </div>
              <div className="dash-card">
                <h3>🧾 Cantidad de ventas</h3>
                <p className="dash-number">{cantidadVentas}</p>
              </div>
              <div className="dash-card">
                <h3>🍦 Productos vendidos</h3>
                <p className="dash-number">{productosVendidos}</p>
              </div>
            </div>

             {/* Gráficas */}
      <div className="graficas-container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        
        {/* Gráfica de ventas por día */}
        <div className="grafica-card" style={{
          background: '#fffdea',
          padding: '20px',
          borderRadius: '15px',
          border: '3px solid #f4e57d',
          boxShadow: '0 0 10px rgba(0,0,0,0.12)'
        }}>
          <h3 style={{ textAlign: 'center', color: '#d96b20', marginBottom: '15px' }}>
            📈 Ventas de la Semana
          </h3>
          {ventasSemana.length > 0 ? (
            <Bar data={datosGraficaBarras} options={opcionesGrafica} />
          ) : (
            <p className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
              No hay datos de ventas de la semana
            </p>
          )}
        </div>

        {/* Gráfica de productos más vendidos */}
        <div className="grafica-card" style={{
          background: '#fffdea',
          padding: '20px',
          borderRadius: '15px',
          border: '3px solid #f4e57d',
          boxShadow: '0 0 10px rgba(0,0,0,0.12)'
        }}>
          <h3 style={{ textAlign: 'center', color: '#d96b20', marginBottom: '15px' }}>
            🍦 Productos Más Vendidos
          </h3>
          {topProductos.length > 0 ? (
            <Doughnut data={datosGraficaProductos} options={opcionesGraficaProductos} />
          ) : (
            <p className="no-data" style={{ textAlign: 'center', padding: '40px' }}>
              No hay ventas hoy
            </p>
          )}
        </div>
      </div>

            <div className="dashboard-table">
              <h3>🏆 Top 5 productos más vendidos hoy</h3>
              {topProductos.length === 0 ? (
                <p className="no-data">No hay ventas registradas hoy.</p>
              ) : (
                <div className="dashboard-table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProductos.map((p, i) => (
                        <tr key={i}>
                          <td>{p.nombre}</td>
                          <td>x{p.cantidad}</td>
                          <td>${parseFloat(p.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* HISTORIAL */}
        {mostrarHistorial && (
          <div className="historial-card">
            <h3 className="historial-title">📅 Historial de ventas</h3>

            {/* Mensajes de error */}
            {errorHistorial && (
              <div className="error-message" style={{
                background: '#ffebee',
                color: '#c62828',
                padding: '10px',
                borderRadius: '8px',
                marginBottom: '15px',
                border: '1px solid #ffcdd2'
              }}>
                {errorHistorial}
              </div>
            )}

            <div className="filtro-container">
              <div className="filtro-item">
                <label>Desde:</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="filtro-item">
                <label>Hasta:</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
              <button
                className="btn-filtrar"
                onClick={cargarHistorial}
                disabled={cargandoHistorial}
              >
                {cargandoHistorial ? "Cargando..." : "Filtrar"}
              </button>
              <button className="btn-limpiar" onClick={limpiarFiltro}>
                Limpiar filtro
              </button>
            </div>

            <div className="historial-table-container">
              <table className="historial-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total Ventas</th>
                    <th>Tickets</th>
                    <th>Ganancias</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="no-data">
                        {cargandoHistorial ? "Cargando..." : "No hay datos para mostrar"}
                      </td>
                    </tr>
                  ) : (
                    historial.map((row, i) => (
                      <tr key={i}>
                        <td>{row.fecha}</td>
                        <td>${row.totalVentas}</td>
                        <td>{row.totalTickets}</td>
                        <td>${row.ganancias}</td>
                        <td>
                          <button
                            className="btn-detalles"
                            onClick={() => generarReporte(row.fechaISO, "pdf")}
                            title="Descargar reporte PDF"
                          >
                            📄 Generar reporte
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MÓDULO CATEGORÍAS / PRODUCTOS */}
        {mostrarModuloProductos && (
          <div className="historial-card">
            <h3 className="historial-title">🏷️ Administrar Categorías y Productos</h3>

            {/* NUEVA CATEGORÍA */}
            <div className="filtro-container modulo-productos">
              <div className="filtro-item">
                <label>Nueva categoría:</label>
                <input
                  type="text"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Nombre de la categoría"
                />
              </div>
              <button onClick={agregarCategoria}>Agregar categoría</button>
            </div>

            {/* NUEVO PRODUCTO */}
            <div className="filtro-container modulo-productos">
              <div className="filtro-item">
                <label>Nombre producto:</label>
                <input
                  type="text"
                  value={nuevoProducto.nombre}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                />
              </div>
              <div className="filtro-item">
                <label>Precio:</label>
                <input
                  type="number"
                  value={nuevoProducto.precio}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="filtro-item">
                <label>Categoría:</label>
                <select
                  value={nuevoProducto.categoria_id}
                  onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })}
                >
                  <option value="">Selecciona categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <button onClick={agregarProducto}>Agregar producto</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
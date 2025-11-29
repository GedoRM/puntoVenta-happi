import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../config";
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
  const API_BASE_URL = config.API_BASE_URL;
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

  // Nuevos estados para gestión
  const [productosDetallados, setProductosDetallados] = useState([]);
  const [modalConfirmacion, setModalConfirmacion] = useState({
    abierto: false,
    tipo: '', // 'categoria' o 'producto'
    id: null,
    nombre: '',
    mensaje: ''
  });
  // Nuevos estados para edición y filtrado
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [editandoProducto, setEditandoProducto] = useState(null);
  const [filtrosProductos, setFiltrosProductos] = useState({
    categoria: '',
    busqueda: ''
  });

  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false);
  const [mostrarCategoriasExistentes, setMostrarCategoriasExistentes] = useState(false);

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
    cargarProductosDetallados();

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
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/hoy`);
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
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/ventas-semana`);
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
          callback: function (value) {
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
      .get(`${API_BASE_URL}/api/dashboard/historial?inicio=${fechaInicio}&fin=${fechaFin}`)
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
          `${API_BASE_URL}/api/dashboard/reporte?fecha=${fechaParaReporte}&tipo=pdf`
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
      const res = await axios.get(`${API_BASE_URL}/api/categorias`);
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
      const res = await axios.post(`${API_BASE_URL}/api/categorias`, { nombre: nuevaCategoria });
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
      await axios.post(`${API_BASE_URL}/api/productos`, nuevoProducto);
      setNuevoProducto({ nombre: "", precio: "", categoria_id: "" });
      setToast({ mensaje: `✅ Producto "${nuevoProducto.nombre}" agregado`, tipo: "success" });
    } catch (err) {
      console.error("Error agregando producto:", err);
      const msg = err.response?.data?.error || "Error agregando producto";
      setToast({ mensaje: `❌ ${msg}`, tipo: "error" });
    }
    setTimeout(() => setToast(""), 3000);
  };

  // 📌 Cargar productos detallados
  const cargarProductosDetallados = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/productos-detallados`);
      setProductosDetallados(res.data);
    } catch (err) {
      console.error("Error cargando productos detallados:", err);
    }
  };

  // 📌 Abrir modal de confirmación
  const abrirModalEliminar = (tipo, id, nombre, infoAdicional = '') => {
    let mensaje = '';

    if (tipo === 'categoria') {
      mensaje = `¿Estás seguro de que quieres eliminar la categoría "${nombre}"?`;
      if (infoAdicional) {
        mensaje += `\n\nSe eliminarán también ${infoAdicional} productos asociados.`;
      }
    } else {
      mensaje = `¿Estás seguro de que quieres eliminar el producto "${nombre}"?`;
      if (infoAdicional) {
        mensaje += `\n\n${infoAdicional}`;
      }
    }

    setModalConfirmacion({
      abierto: true,
      tipo,
      id,
      nombre,
      mensaje
    });
  };

  // 📌 Cerrar modal
  const cerrarModal = () => {
    setModalConfirmacion({
      abierto: false,
      tipo: '',
      id: null,
      nombre: '',
      mensaje: ''
    });
  };

  // 📌 Eliminar categoría
  const eliminarCategoria = async (id) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/categorias/${id}`);
      setToast({
        mensaje: `✅ ${res.data.message} (${res.data.productos_eliminados} productos eliminados)`,
        tipo: "success"
      });

      // Recargar datos
      cargarCategorias();
      cargarProductosDetallados();
      cerrarModal();

    } catch (err) {
      console.error("Error eliminando categoría:", err);
      const msg = err.response?.data?.error || "Error eliminando categoría";
      setToast({ mensaje: `❌ ${msg}`, tipo: "error" });
      cerrarModal();
    }
  };

  // 📌 Eliminar producto
  const eliminarProducto = async (id) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/productos/${id}`);
      setToast({
        mensaje: `✅ ${res.data.message}`,
        tipo: "success"
      });

      // Recargar datos
      cargarProductosDetallados();
      cerrarModal();

    } catch (err) {
      console.error("Error eliminando producto:", err);
      const msg = err.response?.data?.error || "Error eliminando producto";
      setToast({ mensaje: `❌ ${msg}`, tipo: "error" });
      cerrarModal();
    }
  };

  // 📌 Confirmar eliminación
  const confirmarEliminacion = () => {
    const { tipo, id } = modalConfirmacion;

    if (tipo === 'categoria') {
      eliminarCategoria(id);
    } else if (tipo === 'producto') {
      eliminarProducto(id);
    }
  };

  // 📌 Obtener productos por categoría para el mensaje
  const obtenerProductosPorCategoria = (categoriaId) => {
    return productosDetallados.filter(p => p.categoria_id == categoriaId).length;
  };

  // 📌 Funciones de edición
  const iniciarEdicionCategoria = (categoria) => {
    setEditandoCategoria({
      id: categoria.id,
      nombre: categoria.nombre
    });
  };

  const cancelarEdicionCategoria = () => {
    setEditandoCategoria(null);
  };

  const guardarCategoria = async () => {
    if (!editandoCategoria.nombre.trim()) {
      setToast({ mensaje: "❌ El nombre de la categoría no puede estar vacío", tipo: "error" });
      return;
    }

    try {
      const res = await axios.put(`${API_BASE_URL}/api/categorias/${editandoCategoria.id}`, {
        nombre: editandoCategoria.nombre
      });

      setToast({ mensaje: `✅ ${res.data.message}`, tipo: "success" });
      setEditandoCategoria(null);
      cargarCategorias();
      cargarProductosDetallados();

    } catch (err) {
      console.error("Error actualizando categoría:", err);
      const msg = err.response?.data?.error || "Error actualizando categoría";
      setToast({ mensaje: `❌ ${msg}`, tipo: "error" });
    }
  };

  const iniciarEdicionProducto = (producto) => {
    setEditandoProducto({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      categoria_id: producto.categoria_id || ''
    });
  };

  const cancelarEdicionProducto = () => {
    setEditandoProducto(null);
  };

  const guardarProducto = async () => {
    if (!editandoProducto.nombre.trim() || !editandoProducto.precio) {
      setToast({ mensaje: "❌ Nombre y precio son requeridos", tipo: "error" });
      return;
    }

    try {
      const res = await axios.put(`${API_BASE_URL}/api/productos/${editandoProducto.id}`, {
        nombre: editandoProducto.nombre,
        precio: editandoProducto.precio,
        categoria_id: editandoProducto.categoria_id || null
      });

      setToast({ mensaje: `✅ ${res.data.message}`, tipo: "success" });
      setEditandoProducto(null);
      cargarProductosDetallados();

    } catch (err) {
      console.error("Error actualizando producto:", err);
      const msg = err.response?.data?.error || "Error actualizando producto";
      setToast({ mensaje: `❌ ${msg}`, tipo: "error" });
    }
  };

  // 📌 Funciones de filtrado
  const handleFiltroChange = (campo, valor) => {
    setFiltrosProductos(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limpiarFiltros = () => {
    setFiltrosProductos({
      categoria: '',
      busqueda: ''
    });
  };

  // 📌 Filtrar productos
  const productosFiltrados = productosDetallados.filter(producto => {
    const coincideCategoria = !filtrosProductos.categoria ||
      producto.categoria_id == filtrosProductos.categoria;

    const coincideBusqueda = !filtrosProductos.busqueda ||
      producto.nombre.toLowerCase().includes(filtrosProductos.busqueda.toLowerCase()) ||
      (producto.categoria_nombre && producto.categoria_nombre.toLowerCase().includes(filtrosProductos.busqueda.toLowerCase()));

    return coincideCategoria && coincideBusqueda;
  });

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

            {/* Gráficas compactas */}
            <div className="graficas-container" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>

              {/* Gráfica de ventas por día - Compacta */}
              <div className="grafica-card" style={{
                background: '#fffdea',
                padding: '15px',
                borderRadius: '12px',
                border: '2px solid #f4e57d',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                height: '280px' // Altura fija reducida
              }}>
                <h3 style={{
                  textAlign: 'center',
                  color: '#d96b20',
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  📈 Ventas de la Semana
                </h3>
                {ventasSemana.length > 0 ? (
                  <div style={{ height: '200px' }}> {/* Contenedor más pequeño */}
                    <Bar
                      data={datosGraficaBarras}
                      options={{
                        ...opcionesGrafica,
                        maintainAspectRatio: false, // Permite controlar la altura
                        plugins: {
                          ...opcionesGrafica.plugins,
                          legend: {
                            position: 'top',
                            labels: {
                              boxWidth: 12,
                              font: { size: 11 }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function (value) {
                                return '$' + value;
                              },
                              font: { size: 10 }
                            }
                          },
                          x: {
                            ticks: {
                              font: { size: 10 }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="no-data" style={{
                    textAlign: 'center',
                    padding: '30px',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    No hay datos de ventas de la semana
                  </p>
                )}
              </div>

              {/* Gráfica de productos más vendidos - Compacta */}
              <div className="grafica-card" style={{
                background: '#fffdea',
                padding: '15px',
                borderRadius: '12px',
                border: '2px solid #f4e57d',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                height: '280px' // Misma altura que la otra gráfica
              }}>
                <h3 style={{
                  textAlign: 'center',
                  color: '#d96b20',
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  🍦 Productos Más Vendidos
                </h3>
                {topProductos.length > 0 ? (
                  <div style={{ height: '200px' }}> {/* Contenedor más pequeño */}
                    <Doughnut
                      data={datosGraficaProductos}
                      options={{
                        ...opcionesGraficaProductos,
                        maintainAspectRatio: false, // Permite controlar la altura
                        plugins: {
                          ...opcionesGraficaProductos.plugins,
                          legend: {
                            position: 'bottom',
                            labels: {
                              boxWidth: 10,
                              font: { size: 10 },
                              padding: 8
                            }
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="no-data" style={{
                    textAlign: 'center',
                    padding: '30px',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    No hay ventas hoy
                  </p>
                )}
              </div>
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
          <div className="historial-card management-container">
            <h3 className="historial-title">🏷️ Administrar Categorías y Productos</h3>

            {/* BOTONES DE ACCIÓN PRINCIPALES */}
            <div className="management-actions">
              <button
                className={`action-btn ${mostrarNuevaCategoria ? 'active' : ''}`}
                onClick={() => setMostrarNuevaCategoria(!mostrarNuevaCategoria)}
              >
                ➕ Nueva Categoría
              </button>
              <button
                className={`action-btn ${mostrarNuevoProducto ? 'active' : ''}`}
                onClick={() => setMostrarNuevoProducto(!mostrarNuevoProducto)}
              >
                📦 Nuevo Producto
              </button>
              <button
                className={`action-btn ${mostrarCategoriasExistentes ? 'active' : ''}`}
                onClick={() => setMostrarCategoriasExistentes(!mostrarCategoriasExistentes)}
              >
                📂 Ver Categorías
              </button>
            </div>

            {/* NUEVA CATEGORÍA - Se muestra debajo del botón */}
            {mostrarNuevaCategoria && (
              <div className="management-section">
                <div className="section-header">
                  <h4>➕ Nueva Categoría</h4>
                  <button
                    className="btn-close"
                    onClick={() => setMostrarNuevaCategoria(false)}
                  >
                    ✖️
                  </button>
                </div>
                <div className="form-container">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre de la categoría:</label>
                      <input
                        type="text"
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                        placeholder="Ej: Bebidas, Snacks, Postres..."
                      />
                    </div>
                    <button className="btn-primary" onClick={agregarCategoria}>
                      Agregar categoría
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NUEVO PRODUCTO - Se muestra debajo del botón */}
            {mostrarNuevoProducto && (
              <div className="management-section">
                <div className="section-header">
                  <h4>📦 Nuevo Producto</h4>
                  <button
                    className="btn-close"
                    onClick={() => setMostrarNuevoProducto(false)}
                  >
                    ✖️
                  </button>
                </div>
                <div className="form-container">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre producto:</label>
                      <input
                        type="text"
                        value={nuevoProducto.nombre}
                        onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
                        placeholder="Nombre del producto"
                      />
                    </div>
                    <div className="form-group">
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
                    <div className="form-group">
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
                    <button className="btn-primary" onClick={agregarProducto}>
                      Agregar producto
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LISTA DE CATEGORÍAS EXISTENTES - Se muestra debajo del botón */}
            {mostrarCategoriasExistentes && (
              <div className="management-section">
                <div className="section-header">
                  <h4>📂 Categorías Existentes</h4>
                  <button
                    className="btn-close"
                    onClick={() => setMostrarCategoriasExistentes(false)}
                  >
                    ✖️
                  </button>
                </div>
                {categorias.length === 0 ? (
                  <p className="empty-state">No hay categorías creadas</p>
                ) : (
                  <div className="categories-grid">
                    {categorias.map(categoria => {
                      const productosEnCategoria = obtenerProductosPorCategoria(categoria.id);

                      if (editandoCategoria?.id === categoria.id) {
                        return (
                          <div key={categoria.id} className="category-card editing">
                            <div className="edit-form">
                              <input
                                type="text"
                                value={editandoCategoria.nombre}
                                onChange={(e) => setEditandoCategoria(prev => ({
                                  ...prev,
                                  nombre: e.target.value
                                }))}
                                placeholder="Nombre de la categoría"
                              />
                              <div className="form-actions">
                                <button
                                  className="btn-success"
                                  onClick={guardarCategoria}
                                >
                                  💾 Guardar
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={cancelarEdicionCategoria}
                                >
                                  ✖️ Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={categoria.id} className="category-card">
                          <div className="category-content">
                            <div className="category-info">
                              <h5 className="category-name">{categoria.nombre}</h5>
                              <span className="category-count">{productosEnCategoria} productos</span>
                            </div>
                            <div className="category-actions">
                              <button
                                onClick={() => iniciarEdicionCategoria(categoria)}
                                className="btn-edit"
                                title="Editar categoría"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => abrirModalEliminar(
                                  'categoria',
                                  categoria.id,
                                  categoria.nombre,
                                  `${productosEnCategoria}`
                                )}
                                className="btn-danger"
                                title="Eliminar categoría y todos sus productos"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FILTROS DE PRODUCTOS */}
            <div className="management-section">
              <div className="section-header">
                <h4>🔍 Filtros de Búsqueda</h4>
              </div>
              <div className="filters-container">
                <div className="filter-group">
                  <label>Filtrar por categoría:</label>
                  <select
                    value={filtrosProductos.categoria}
                    onChange={(e) => handleFiltroChange('categoria', e.target.value)}
                  >
                    <option value="">Todas las categorías</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Buscar por nombre:</label>
                  <input
                    type="text"
                    value={filtrosProductos.busqueda}
                    onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                    placeholder="Nombre del producto o categoría..."
                  />
                </div>

                <button className="btn-secondary" onClick={limpiarFiltros}>
                  🗑️ Limpiar filtros
                </button>
              </div>
            </div>

            {/* LISTA DE PRODUCTOS EXISTENTES */}
            <div className="management-section">
              <div className="section-header">
                <h4>📦 Productos Existentes ({productosFiltrados.length})</h4>
              </div>

              {productosDetallados.length === 0 ? (
                <p className="empty-state">No hay productos creados</p>
              ) : productosFiltrados.length === 0 ? (
                <p className="empty-state">No se encontraron productos con los filtros aplicados</p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Veces Vendido</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltrados.map(producto => {
                        if (editandoProducto?.id === producto.id) {
                          return (
                            <tr key={producto.id} className="editing">
                              <td>
                                <input
                                  type="text"
                                  value={editandoProducto.nombre}
                                  onChange={(e) => setEditandoProducto(prev => ({
                                    ...prev,
                                    nombre: e.target.value
                                  }))}
                                  placeholder="Nombre del producto"
                                />
                              </td>
                              <td>
                                <select
                                  value={editandoProducto.categoria_id}
                                  onChange={(e) => setEditandoProducto(prev => ({
                                    ...prev,
                                    categoria_id: e.target.value
                                  }))}
                                >
                                  <option value="">Sin categoría</option>
                                  {categorias.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={editandoProducto.precio}
                                  onChange={(e) => setEditandoProducto(prev => ({
                                    ...prev,
                                    precio: e.target.value
                                  }))}
                                  step="0.01"
                                  min="0"
                                />
                              </td>
                              <td>
                                {producto.veces_vendido || 0}
                              </td>
                              <td>
                                <div className="form-actions">
                                  <button
                                    className="btn-success"
                                    onClick={guardarProducto}
                                  >
                                    💾
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    onClick={cancelarEdicionProducto}
                                  >
                                    ✖️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={producto.id}>
                            <td>
                              <strong>{producto.nombre}</strong>
                            </td>
                            <td>
                              {producto.categoria_nombre || 'Sin categoría'}
                            </td>
                            <td className="price-cell">
                              ${parseFloat(producto.precio).toFixed(2)}
                            </td>
                            <td className="center-cell">
                              {producto.veces_vendido || 0}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  onClick={() => iniciarEdicionProducto(producto)}
                                  className="btn-edit"
                                  title="Editar producto"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => abrirModalEliminar(
                                    'producto',
                                    producto.id,
                                    producto.nombre,
                                    producto.veces_vendido > 0 ?
                                      `Este producto ha sido vendido ${producto.veces_vendido} veces.` :
                                      ''
                                  )}
                                  className="btn-danger"
                                  title="Eliminar producto"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
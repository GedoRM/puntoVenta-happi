import React, { useState, useEffect } from "react";
import axios from "axios";
import CategoryList from "./categoryList";
import ProductList from "./productList";

function POS() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [ventaPendiente, setVentaPendiente] = useState(null);
  // 🟢 Cargar categorías al inicio
  useEffect(() => {
    axios
      .get("http://localhost:4000/api/categorias")
      .then((res) => setCategorias(res.data))
      .catch((err) => console.error("Error cargando categorias:", err));
  }, []);

  // 🟢 Cuando seleccionas una categoría, cargar productos
  const seleccionarCategoria = (cat) => {
    setCategoriaSeleccionada(cat); // cat = { id, nombre }

    axios
      .get(`http://localhost:4000/api/productos/${cat.id}`)
      .then((res) => setProductos(res.data))
      .catch((err) => console.error("Error cargando productos:", err));
  };

  // 🟢 Agregar producto al ticket
  const agregarProducto = (producto) => {
    const itemExistente = items.find((item) => item.id === producto.id);

    if (itemExistente) {
      // Si ya existe, solo aumenta la cantidad
      const nuevosItems = items.map((item) =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      );

      setItems(nuevosItems);
      setTotal(total + producto.precio);
    } else {
      // Si no existe, lo agrega con cantidad = 1
      setItems([...items, { ...producto, cantidad: 1 }]);
      setTotal(total + producto.precio);
    }
  };

  // 🟢 Eliminar producto del ticket
  const eliminarProducto = (id) => {
    const item = items.find((i) => i.id === id);

    if (!item) return;

    if (item.cantidad > 1) {
      // Reducir cantidad
      const nuevosItems = items.map((i) =>
        i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i
      );
      setItems(nuevosItems);
    } else {
      // Eliminar del ticket
      const nuevosItems = items.filter((i) => i.id !== id);
      setItems(nuevosItems);
    }

    setTotal(total - item.precio);
  };

  // 🟢 Guardar venta
  const finalizarVenta = () => {
    if (items.length === 0) {
      return alert("No hay productos en el ticket");
    }

    // Preparamos la venta pero NO la enviamos todavía
    const itemsFormateados = items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
    }));

    setVentaPendiente({
      total,
      items: itemsFormateados,
    });

    setMostrarConfirmacion(true); // abrir modal
  };

  //Confirmar venta
  const confirmarEnvioVenta = async () => {
    try {
      await axios.post("http://localhost:4000/api/ventas", ventaPendiente);

      setMostrarConfirmacion(false);
      alert("Venta guardada correctamente");
      limpiarVenta();
    } catch (err) {
      console.error("Error guardando venta:", err);
      alert("Error al guardar venta");
    }
  };

  // 🟢 Reiniciar
  const limpiarVenta = () => {
    setItems([]);
    setTotal(0);
    setCategoriaSeleccionada(null);
  };

  return (
    <div className="pos-container">
      <div className="container-product-category">
        <div className="category">
          <CategoryList
            categorias={categorias}
            onSelect={seleccionarCategoria}
            categorySelect={categoriaSeleccionada?.id} // 🔥 ID CORRECTO
          />
        </div>

        <div className="productos">
          {!categoriaSeleccionada ? null : (
            <ProductList
              productos={productos}
              onAgregar={agregarProducto}
              onBack={() => setCategoriaSeleccionada(null)}
              category={categoriaSeleccionada?.id} // 🔥 ID CORRECTO
            />
          )}
        </div>
      </div>

      <div className="ticket">
        <h2>Ticket</h2>

        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <div className="item-info">
                <span className="item-nombre">{item.nombre}</span>
                <span className="item-cantidad">x{item.cantidad}</span>
              </div>

              <div className="item-precio">
                ${(item.precio * item.cantidad).toFixed(2)}
              </div>

              <button
                onClick={() => eliminarProducto(item.id)}
                className="btn-eliminar"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>
        <h3 className="total-box">Total: ${total}</h3>
        <div>
          <button className="btn-final" onClick={finalizarVenta}>
            💾 Cobrar / Guardar venta
          </button>

          <button className="btn-final" onClick={limpiarVenta}>
            🧾 Nueva venta
          </button>
        </div>
      </div>
      {mostrarConfirmacion && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Confirmar venta</h2>
            <p>¿Deseas finalizar la venta por un total de:</p>
            <h3 className="modal-total">${total}</h3>

            <div className="modal-buttons">
              <button className="modal-confirm" onClick={confirmarEnvioVenta}>
                ✔ Confirmar
              </button>
              <button
                className="modal-cancel"
                onClick={() => setMostrarConfirmacion(false)}
              >
                ✖ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POS;

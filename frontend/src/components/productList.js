import React from "react";

function ProductList({ productos, onAgregar, onBack, category }) {
  return (
    <div className="product-grid">

      {productos.map((prod) => (
        <div
          key={prod.id}
          className="product-card"
          onClick={() => onAgregar(prod)}
        >
          {prod.imagen && (
            <img src={prod.imagen} alt={prod.nombre} className="product-img" />
          )}

          <h3>{prod.nombre}</h3>
          <p>${prod.precio}</p>
        </div>
      ))}

    </div>
  );
}

export default ProductList;
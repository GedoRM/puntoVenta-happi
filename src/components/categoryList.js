import React from "react";

function CategoryList({ categorias, onSelect, categorySelect }) {
  return (
    <div className="category-list">
      <div className="categories-grid">

        {categorias.map((cat) => (
          <button
            key={cat.id}
            className={`category-btn ${categorySelect === cat.id ? "seleccionada" : ""}`}
            onClick={() => onSelect(cat)}
          >
            <span>{cat.nombre}</span>
          </button>
        ))}

      </div>
    </div>
  );
}

export default CategoryList;
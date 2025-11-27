import React, { useState, useEffect, useRef } from "react";
import POS from "./components/POS";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import "./App.css";

function App() {
  const [vista, setVista] = useState("pos");
  const [usuarioLogeado, setUsuarioLogeado] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    if (usuarioGuardado) {
      setUsuarioLogeado(JSON.parse(usuarioGuardado));
    }
  }, []);

  // Cerrar dropdown si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    setUsuarioLogeado(null);
  };

  return (
    <div className="App">
      {!usuarioLogeado ? (
        <Login
          onLogin={(user) => {
            setUsuarioLogeado(user);
            localStorage.setItem("usuario", JSON.stringify(user));
          }}
        />
      ) : (
        <>
          <header className="main-header">
            <div className="header-title">
              <h1>Happi Helados</h1>
            </div>

            <nav className="header-nav">
              <button
                className={`nav-btn ${vista === "pos" ? "active" : ""}`}
                onClick={() => setVista("pos")}
              >
                🧾 Punto de Venta
              </button>
              <button
                className={`nav-btn ${vista === "dashboard" ? "active" : ""}`}
                onClick={() => setVista("dashboard")}
              >
                📊 Dashboard
              </button>
            </nav>

            <div className="header-user" ref={dropdownRef}>
              <span
                className="user-name"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                Bienvenido, <strong>{usuarioLogeado.nombre}</strong> ▼
              </span>

              {dropdownOpen && (
                <div className={`dropdown-menu ${dropdownOpen ? "open" : ""}`}>
                  <button onClick={handleLogout} className="dropdown-item">
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </header>

          {vista === "pos" && <POS />}
          {vista === "dashboard" && <Dashboard />}
        </>
      )}
    </div>
  );
}

export default App;
